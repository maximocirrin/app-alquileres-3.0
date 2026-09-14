import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';

const MAX_INVENTORY_IMAGE_BYTES = 10 * 1024 * 1024;

async function fetchTrustedInventoryImage(value) {
  const storageOrigin = new URL(
    process.env.SUPABASE_URL
  ).origin;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.origin !== storageOrigin ||
      !url.pathname.startsWith('/storage/v1/object/sign/contratos_firmados/')) {
    throw new Error('Untrusted inventory image URL.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'error' });
    if (!response.ok) throw new Error('Inventory image could not be downloaded.');
    const contentType = String(response.headers.get('content-type') || '').split(';')[0].toLowerCase();
    if (!['image/jpeg', 'image/png'].includes(contentType)) {
      throw new Error('Unsupported inventory image type.');
    }
    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > MAX_INVENTORY_IMAGE_BYTES) throw new Error('Inventory image is too large.');

    const chunks = [];
    let total = 0;
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Inventory image body is unavailable.');
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      total += chunk.byteLength;
      if (total > MAX_INVENTORY_IMAGE_BYTES) {
        await reader.cancel();
        throw new Error('Inventory image is too large.');
      }
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks, total);
  } finally {
    clearTimeout(timer);
  }
}

// Diccionario de números ordinales en español
const ORDINAL_NAMES = [
  'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA',
  'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA',
  'DÉCIMA PRIMERA', 'DÉCIMA SEGUNDA', 'DÉCIMA TERCERA', 'DÉCIMA CUARTA', 'DÉCIMA QUINTA',
  'DÉCIMA SEXTA', 'DÉCIMA SÉPTIMA', 'DÉCIMA OCTAVA', 'DÉCIMA NOVENA', 'VIGÉSIMA',
  'VIGÉSIMA PRIMERA', 'VIGÉSIMA SEGUNDA', 'VIGÉSIMA TERCERA', 'VIGÉSIMA CUARTA', 'VIGÉSIMA QUINTA',
  'VIGÉSIMA SEXTA', 'VIGÉSIMA SÉPTIMA', 'VIGÉSIMA OCTAVA', 'VIGÉSIMA NOVENA', 'TRIGÉSIMA'
];

function getOrdinalName(idx) {
  return ORDINAL_NAMES[idx] || `CLÁUSULA ${idx + 1}`;
}

/**
 * 1. Genera el PDF del Contrato Original (Texto Base Inmutable sin Audit Trail)
 */
export async function generateOriginalContractPdf({
  contractId,
  contrato = {},
  propiedad = {},
  inquilino = {},
  propietario = {},
  garantes = [],
  inventario = null
}) {
  const pdfDoc = await PDFDocument.create();
  // Stable metadata makes simultaneous attempts on the same contract byte-identical.
  const documentDate = new Date(contrato.created_at || contrato.fecha_inicio_contrato);
  if (!Number.isFinite(documentDate.getTime())) throw new Error('Contract date is missing.');
  pdfDoc.setCreationDate(documentDate);
  pdfDoc.setModificationDate(documentDate);
  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const primaryColor = rgb(0, 0, 0);
  const darkColor = rgb(0, 0, 0);
  const lightBg = rgb(0.96, 0.96, 0.96);

  let currentY = height - 105;

  const checkPageSpace = (requiredSpace) => {
    if (currentY - requiredSpace < 50) {
      page = pdfDoc.addPage([595.28, 841.89]);
      currentY = height - 50;
    }
  };

  const drawParagraph = (title, textHtml) => {
    const text = String(textHtml || '').replace(/<[^>]*>?/gm, '');

    checkPageSpace(30);
    page.drawText(title, { x: 45, y: currentY, size: 8.5, font: fontBold, color: primaryColor });
    currentY -= 13;
    
    const words = text.split(' ');
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).length > 88) {
        checkPageSpace(15);
        page.drawText(line, { x: 45, y: currentY, size: 8, font: fontRegular, color: darkColor });
        currentY -= 11;
        line = w;
      } else {
        line = line ? `${line} ${w}` : w;
      }
    }
    if (line) {
      checkPageSpace(15);
      page.drawText(line, { x: 45, y: currentY, size: 8, font: fontRegular, color: darkColor });
      currentY -= 15;
    } else {
      currentY -= 5;
    }
  };

  // Encabezado Pág 1
  page.drawRectangle({
    x: 30,
    y: height - 85,
    width: width - 60,
    height: 55,
    color: lightBg
  });

  page.drawText('CONTRATO DE LOCACION INMOBILIARIA CON FIRMA ELECTRONICA', {
    x: 45,
    y: height - 52,
    size: Math.min(13, (width - 90) / fontBold.widthOfTextAtSize('CONTRATO DE LOCACION INMOBILIARIA CON FIRMA ELECTRONICA', 1)),
    font: fontBold,
    color: primaryColor
  });

  const numDisplay = `CTR-${String(contractId).padStart(4, '0')}`;
  page.drawText(`Identificador Legal: ${numDisplay} | Ley Nacional 25.506 y DNU 70/2023`, {
    x: 45,
    y: height - 68,
    size: 7.8,
    font: fontBold,
    color: darkColor
  });

  const ownerName = propietario.nombre_completo || propietario.name || 'Propietario';
  const ownerDni = propietario.dni || 'No registrado';
  const ownerCuil = propietario.cuit_cuil || propietario.cuit || 'No registrado';
  const ownerMail = propietario.mail || propietario.email || 'No registrado';

  const tenantName = inquilino.nombre_completo || inquilino.name || 'Inquilino';
  const tenantDni = inquilino.dni || 'No registrado';
  const tenantCuil = inquilino.cuit_cuil || inquilino.cuit || 'No registrado';
  const tenantMail = inquilino.mail || inquilino.email || 'No registrado';

  const propAddress = `${propiedad.calle || 'Inmueble'} ${propiedad.numero || ''}`.trim();
  
  const cFlags = contrato.clausulas_adicionales || {};
  if (!Number.isFinite(Number(contrato.monto_cierre)) || Number(contrato.monto_cierre) <= 0) throw new Error('Contract rent is missing or invalid.');
  const todayStr = contrato.fecha_inicio_contrato || 'No registrada';

  // Introducción
  let partesIntervinientesText = `En la República Argentina, entre ${ownerName} (DNI ${ownerDni}, CUIL ${ownerCuil}, Email: ${ownerMail}), en adelante denominado "EL LOCADOR"; y por la otra ${tenantName} (DNI ${tenantDni}, CUIL ${tenantCuil}, Email: ${tenantMail}), en adelante denominado "EL LOCATARIO"`;
  if (Array.isArray(garantes) && garantes.length > 0) {
    const garantesListTxt = garantes.map((g, idx) => {
      const gNom = g.nombre_completo || g.name || `Garante ${idx + 1}`;
      const gDni = g.dni ? `DNI ${g.dni}` : '';
      const gCuil = (g.cuit || g.cuil) ? `CUIL ${g.cuit || g.cuil}` : '';
      const gDoc = [gDni, gCuil].filter(Boolean).join(', ');
      const gMail = (g.mail || g.email) ? `Email: ${g.mail || g.email}` : '';
      const gRol = g.roleLabel ? `, en calidad de ${g.roleLabel}` : '';
      const gDet = [gDoc, gMail].filter(Boolean).join(', ');
      return `${gNom}${gDet ? ` (${gDet})` : ''}${gRol}`;
    }).join('; ');
    partesIntervinientesText += `; y en calidad de FIADORES Y CODEUDORES SOLIDARIOS: ${garantesListTxt}`;
  }
  partesIntervinientesText += `, convienen en celebrar el presente contrato de locación sujeto a las siguientes cláusulas consecutivas:`;
  drawParagraph('PARTES INTERVINIENTES:', partesIntervinientesText);


  // Renderizar Cláusulas
  let savedClauses = cFlags.activeClausesList;
  if (typeof savedClauses === 'string') savedClauses = JSON.parse(savedClauses);
  if (!Array.isArray(savedClauses) || !savedClauses.length || savedClauses.some(c => !c?.tag || !c?.body)) {
    throw new Error('Save the agreed contract clauses before signing.');
  }
  // Render precisely the agreed, persisted clauses shown by the contract editor.
  savedClauses.forEach((clause, idx) => {
    drawParagraph(`${getOrdinalName(idx)} (${clause.tag}):`, clause.body);
  });

  // Renderizar Anexo I si existe
  if (inventario && inventario.items && inventario.items.length > 0) {
    page = pdfDoc.addPage([595.28, 841.89]);
    currentY = height - 50;

    page.drawText('ANEXO I - INVENTARIO DEL INMUEBLE', {
      x: 45,
      y: currentY,
      size: 13,
      font: fontBold,
      color: primaryColor
    });
    currentY -= 20;

    const fechaInventario = inventario.fecha_inspeccion 
      ? new Date(inventario.fecha_inspeccion).toLocaleDateString('es-AR') 
      : todayStr;

    drawParagraph('VINCULACIÓN LEGAL:', `Anexo I al Contrato de Locación del inmueble ${propAddress}, con fecha ${fechaInventario}, entre ${ownerName} y ${tenantName}. Las partes declaran que el presente detalla el estado de conservación e inventario del inmueble, sus instalaciones y bienes muebles.`);
    currentY -= 10;

    // Agrupar items por ambiente
    const ambientes = {};
    inventario.items.forEach(item => {
      const amb = item.ambiente || 'General';
      if (!ambientes[amb]) ambientes[amb] = [];
      ambientes[amb].push(item);
    });

    for (const amb of Object.keys(ambientes)) {
      checkPageSpace(40);
      page.drawText(`AMBIENTE: ${amb.toUpperCase()}`, { x: 45, y: currentY, size: 9.5, font: fontBold, color: darkColor });
      currentY -= 15;

      for (const item of ambientes[amb]) {
        checkPageSpace(20);
        const itemName = item.Item?.nombre || item.nombre_item || 'Ítem';
        const estado = item.Estado_item?.nombre || item.estado || 'No especificado';
        const obs = item.observaciones ? ` - Obs: ${item.observaciones}` : '';
        
        page.drawText(`• ${itemName}:`, { x: 55, y: currentY, size: 8, font: fontBold, color: darkColor });
        page.drawText(`${estado}${obs}`, { x: 55 + (itemName.length * 4.5) + 5, y: currentY, size: 8, font: fontRegular, color: darkColor });
        currentY -= 12;
      }
      currentY -= 10;
    }

    if (inventario.observaciones_generales) {
      drawParagraph('OBSERVACIONES GENERALES:', inventario.observaciones_generales);
    }

    // Apéndice Visual (Fotos)
    const itemsWithPhotos = inventario.items.filter(it => it.fotos_urls && it.fotos_urls.length > 0);
    if (itemsWithPhotos.length > 0) {
      page = pdfDoc.addPage([595.28, 841.89]);
      currentY = height - 50;

      page.drawText('APÉNDICE VISUAL DEL INVENTARIO', {
        x: 45, y: currentY, size: 13, font: fontBold, color: primaryColor
      });
      currentY -= 20;

      for (const item of itemsWithPhotos) {
        checkPageSpace(150);
        const itemName = item.Item?.nombre || item.nombre_item || 'Ítem';
        const amb = item.ambiente || 'General';
        page.drawText(`Ambiente: ${amb.toUpperCase()} - Elemento: ${itemName}`, { x: 45, y: currentY, size: 10, font: fontBold, color: darkColor });
        currentY -= 15;

        let xPos = 45;
        let maxHeightInRow = 0;

        for (const photoUrl of item.fotos_urls) {
          try {
            const imgBytes = await fetchTrustedInventoryImage(photoUrl);
            let image;
            try {
              image = await pdfDoc.embedJpg(imgBytes);
            } catch (e) {
              image = await pdfDoc.embedPng(imgBytes);
            }
            
            const fixedHeight = 120;
            const dims = image.scaleToFit(width, fixedHeight);
            
            if (xPos + dims.width > width - 45) {
              xPos = 45;
              currentY -= (maxHeightInRow + 15);
              checkPageSpace(fixedHeight + 30);
              maxHeightInRow = 0;
            }
            
            page.drawImage(image, { x: xPos, y: currentY - dims.height, width: dims.width, height: dims.height });
            xPos += dims.width + 10;
            if (dims.height > maxHeightInRow) maxHeightInRow = dims.height;
          } catch (err) {
            throw new Error('No se pudo incorporar una foto del inventario al documento.', { cause: err });
          }
        }
        currentY -= (maxHeightInRow + 25);
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * 2. Genera el PDF del Audit Trail Forense (Solo auditoría, sin el contrato base)
 */
export async function generateAuditTrailPdf({
  contractId,
  firmaId,
  propiedad = {},
  rol,
  signerName,
  signerDni,
  email,
  ip,
  userAgent,
  diditSessionId,
  diditScores = {},
  originalPdfHash = null
}) {
  const pdfDoc = await PDFDocument.create();
  
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const primaryColor = rgb(0, 0, 0);
  const darkColor = rgb(0, 0, 0);
  const grayColor = rgb(0.30, 0.30, 0.30);
  const lightBg = rgb(0.96, 0.96, 0.96);
  const emeraldColor = rgb(0, 0, 0);

  // --- PÁGINA: SECCIÓN AUDIT TRAIL Y FIRMAS DIGITALES ---
  let page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  let currentY = height - 50;

  const checkPageSpace = (requiredSpace) => {
    if (currentY - requiredSpace < 50) {
      page = pdfDoc.addPage([595.28, 841.89]);
      currentY = height - 50;
    }
  };

  const nowArg = new Date().toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'full',
    timeStyle: 'long'
  });

  const propAddress = `${propiedad.calle || 'Inmueble'} ${propiedad.numero || ''}`.trim();

  // Banner Header Audit Trail
  page.drawRectangle({ x: 30, y: height - 90, width: width - 60, height: 60, color: lightBg });
  page.drawText('VIVAT - REGISTRO DE FIRMA ELECTRONICA', { x: 45, y: height - 55, size: 13, font: fontBold, color: primaryColor });
  page.drawText('CERTIFICADO OFICIAL DE EVIDENCIA Y AUDITORIA DE FIRMA ELECTRONICA', { x: 45, y: height - 72, size: 8.5, font: fontBold, color: darkColor });
  page.drawText('Validez Legal: Ley Nacional 25.506, Art. 286-288 CCyCN y DNU 70/2023', { x: 45, y: height - 83, size: 7.5, font: fontRegular, color: grayColor });
  
  currentY = height - 115;

  const drawRow = (label, val, isMono = false, customColor = darkColor) => {
    checkPageSpace(15);
    page.drawText(label, { x: 45, y: currentY, size: 8.5, font: fontBold, color: darkColor });
    page.drawText(String(val || '-'), { x: 200, y: currentY, size: isMono ? 7.5 : 8.5, font: isMono ? fontMono : fontRegular, color: customColor });
    currentY -= 15;
  };

  // 1. Integridad Criptográfica del Contrato Base
  page.drawText('1. REGISTRO CRIPTOGRAFICO DEL DOCUMENTO BASE', { x: 45, y: currentY, size: 10, font: fontBold, color: primaryColor });
  currentY -= 18;

  drawRow('ID Contrato Legal:', `CTR-2026-${String(contractId).padStart(4, '0')}`);
  drawRow('Hash SHA-256 Base (Original):', originalPdfHash || 'No disponible aún', true, emeraldColor);
  drawRow('Inmueble Objeto:', propAddress);

  currentY -= 8;

  // 2. Datos de la Transacción Actual
  page.drawText('2. DATOS DEL FIRMANTE Y ACTO DE FIRMA', { x: 45, y: currentY, size: 10, font: fontBold, color: primaryColor });
  currentY -= 18;

  drawRow('ID Transaccion Firma:', `HAB-FIRMA-${firmaId}`);
  drawRow('Rol del Firmante:', String(rol || 'INQUILINO').toUpperCase());
  drawRow('Nombre Completo:', signerName || 'Titular Validado');
  drawRow('DNI / Identificacion:', signerDni || 'Validado por Didit KYC');
  drawRow('Email Registrado:', email || '-');
  drawRow('Fecha y Hora Oficial (UTC-3):', nowArg);

  currentY -= 8;

  // 3. Metadatos Técnicos y Contexto Digital
  page.drawText('3. METADATOS TECNICOS Y CONTEXTO DIGITAL', { x: 45, y: currentY, size: 10, font: fontBold, color: primaryColor });
  currentY -= 18;

  drawRow('Direccion IP de Origen:', ip || 'No registrada');
  drawRow('User-Agent:', (userAgent || 'No registrado').substring(0, 50));
  drawRow('Zona Horaria Registrada:', 'America/Argentina/Buenos_Aires (UTC-3)');

  currentY -= 8;

  // 4. Verificación Biométrica Didit
  page.drawText('4. RESULTADO DE VERIFICACION BIOMETRICA FACIAL (DIDIT KYC)', { x: 45, y: currentY, size: 10, font: fontBold, color: primaryColor });
  currentY -= 18;

  drawRow('Proveedor Biometrico:', 'Didit');
  drawRow('ID Sesion Didit:', diditSessionId || 'No registrada', true);
  drawRow('Prueba Facial (Face Match):', diditScores.face_match_status || 'No verificada');
  drawRow('Prueba de Vida (Liveness):', diditScores.liveness_status || 'No verificada');
  drawRow('Validacion Documental:', diditScores.document_status || 'No verificada');

  currentY -= 8;

  // 5. Sellado de Tiempo TSA
  page.drawText('5. SELLADO DE TIEMPO Y CUSTODIA (TSA RFC 3161)', { x: 45, y: currentY, size: 10, font: fontBold, color: primaryColor });
  currentY -= 18;

  drawRow('Sello de tiempo:', 'Token externo asociado al hash de este certificado.');
  drawRow('Algoritmo Criptografico:', 'SHA-256');

  // Footer
  page.drawRectangle({ x: 30, y: 35, width: width - 60, height: 45, color: lightBg });
  page.drawText('DOCUMENTO AUDITABLE CUSTODIADO POR VIVAT PLATAFORMA INMOBILIARIA', { x: 45, y: 62, size: 7.5, font: fontBold, color: darkColor });
  page.drawText('Este documento certifica la inmutabilidad y autoria del contrato bajo apercibimiento del Codigo Civil y Comercial.', { x: 45, y: 48, size: 6.8, font: fontRegular, color: grayColor });

  const auditTrailBytes = Buffer.from(await pdfDoc.save());
  const auditTrailHash = crypto.createHash('sha256').update(auditTrailBytes).digest('hex');

  return {
    auditTrailBytes,
    auditTrailHash
  };
}

/**
 * 3. Fusiona el Contrato Original con los Audit Trails para crear el Contrato Final
 */
export async function mergeFinalContractPdf({ originalPdfBytes, inquilinoAuditBytes, propietarioAuditBytes, garantesAuditBytes = [] }) {
  const finalDoc = await PDFDocument.create();

  if (originalPdfBytes) {
    const origDoc = await PDFDocument.load(originalPdfBytes);
    const copiedPages = await finalDoc.copyPages(origDoc, origDoc.getPageIndices());
    copiedPages.forEach(p => finalDoc.addPage(p));
  }

  if (inquilinoAuditBytes) {
    const inqDoc = await PDFDocument.load(inquilinoAuditBytes);
    const copiedPages = await finalDoc.copyPages(inqDoc, inqDoc.getPageIndices());
    copiedPages.forEach(p => finalDoc.addPage(p));
  }

  if (propietarioAuditBytes) {
    const propDoc = await PDFDocument.load(propietarioAuditBytes);
    const copiedPages = await finalDoc.copyPages(propDoc, propDoc.getPageIndices());
    copiedPages.forEach(p => finalDoc.addPage(p));
  }

  if (Array.isArray(garantesAuditBytes) && garantesAuditBytes.length > 0) {
    for (const gBytes of garantesAuditBytes) {
      if (gBytes) {
        const gDoc = await PDFDocument.load(gBytes);
        const copiedPages = await finalDoc.copyPages(gDoc, gDoc.getPageIndices());
        copiedPages.forEach(p => finalDoc.addPage(p));
      }
    }
  }

  const finalPdfBytes = Buffer.from(await finalDoc.save());
  const finalPdfHash = crypto.createHash('sha256').update(finalPdfBytes).digest('hex');

  return {
    finalPdfBytes,
    finalPdfHash
  };
}
