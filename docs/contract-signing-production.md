# Firma de contratos: producción y operación

Estado verificado el 15 de septiembre de 2026.

## Despliegue realizado

Publicado en https://vivat.com.ar. Despliegue Vercel: `dpl_GngYc4vQNvqJJ4SCdRPeivc48h66`, proyecto `app-alquileres-3-0`, equipo Vivat. Se compiló primero sin cambiar el dominio y se promovió después de comprobar los controles de acceso, la clave pública y el webhook.

Se aplicaron y verificaron las migraciones:
- `signature_session_integrity`: unicidad de nuevas sesiones y firmantes activos.
- `contract_signing_evidence_and_guarantors`: participantes fijos por contrato, protección de evidencia sellada y activación que exige todas las firmas.
- `secure_marketplace_update_rpc`: corrección adicional de una función de publicaciones que no validaba la propiedad del recurso. Ahora exige los mismos permisos de propiedad que las tablas y rechaza llamadas anónimas.

Las claves privadas y secretos se cargaron como secretos de producción en Vercel. Los archivos locales de configuración, las claves y los scripts de aprovisionamiento se excluyeron del paquete de despliegue. Las rutas inexistentes devuelven la portada por la configuración de Vercel; se comprobó que las rutas de secretos devolvieran exactamente esa página pública, sin el contenido del archivo privado.

El despliegue usa el contenido local de este trabajo. Conservar estos cambios en Git antes del próximo despliegue automático para no reemplazar el código publicado por una versión anterior.

## Qué hace la firma

1. El participante autenticado abre el contrato y revisa el PDF completo con sus anexos.
2. El servidor registra la versión del consentimiento y compara la huella SHA-256 con el PDF revisado.
3. Didit solicita nuevos documentos y capturas directamente al firmante. El servidor exige aprobación de documento, prueba de vida y comparación facial, workflow correcto y DNI coincidente.
4. La sesión queda vinculada al contrato, perfil, participación y huella del PDF.
5. El servidor genera la auditoría y un registro de evidencia firmado por Vivat mediante Ed25519.
6. Cuando firman inquilino, propietario y todos los garantes fijados para el contrato, se consolida el PDF y se activa el contrato.

Las sesiones pendientes pueden retomarse. Repetir una firma sellada conserva su evidencia. Los archivos se guardan con nombres derivados de su contenido; un conflicto de carga solo se admite si los bytes coinciden.

La tarjeta del propietario usa su perfil real a través del endpoint autorizado de participantes. Las notificaciones se consultan por destinatario, sin depender del panel activo, y la lectura se guarda y sincroniza por cuenta.

## Registro propio sin AC ni TSA externo

El circuito está configurado **sin autoridad certificante ni TSA externo**. El registro firmado declara expresamente:
- Emisor: Vivat.
- Fecha: reloj del servidor de Vivat.
- Tipo: `vivat.server-evidence.v1`.
- `independent_timestamp: false`.

La firma criptográfica permite comprobar que una copia de la evidencia fue emitida con la clave de Vivat y que sus datos y PDFs asociados no cambiaron. **No demuestra por sí sola la hora real frente a Vivat**, que controla tanto el reloj como la clave. Una autoridad externa añade independencia temporal.

No se presenta este registro como token RFC 3161, firma PAdES, certificado licenciado o firma digital personal del firmante. El PDF contiene el contrato y las auditorías; la evidencia criptográfica se descarga por separado como JSON. Adobe no mostrará una firma digital certificada por este mecanismo.

El campo histórico de base de datos `tsa_sello_tiempo` conserva su nombre por compatibilidad, pero para nuevas firmas guarda la estructura explícita de evidencia interna. No contiene un token TSA inventado.

El TSA ya no es una dependencia técnica del circuito. La [Ley 25.506, artículo 5](https://www.argentina.gob.ar/normativa/nacional/ley-25506-70749/actualizacion) contempla que quien invoca una firma electrónica debe acreditar su validez si es desconocida. Esta implementación no transforma automáticamente esa firma en firma digital licenciada. Los requisitos operativos de un servicio de tiempo confiable incluyen más que firmar una fecha; véase [RFC 3628](https://www.rfc-editor.org/rfc/rfc3628.html).

## Didit: configurado y cómo administrarlo

El workflow de firma configurado está publicado y contiene OCR, LIVENESS, FACE_MATCH e IP_ANALYSIS. Se usa el KYC completo existente de la cuenta. No se reutiliza ni exporta una fotografía anterior del pasaporte como referencia facial.

Se creó y activó el destino:
- URL: `https://vivat.com.ar/api/firmas/webhook-didit`.
- Versión: v3.
- Eventos: `status.updated` y `data.updated`.
- Secreto: el `secret_shared_key` de ese destino, guardado en `DIDIT_SIGNATURE_WEBHOOK_SECRET`.
- El destino anterior de identidad permanece configurado.

Para administrar la configuración:
1. Ingresar en [Didit Business Console](https://business.didit.me/).
2. En Workflows, abrir el flujo KYC completo, comprobar OCR/documento, Liveness y Face Match y que esté publicado. Copiar su UUID.
3. En Settings → API & Webhooks, administrar la clave privada de la aplicación y el destino de contratos.
4. En Vercel → proyecto → Settings → Environment Variables → Production, mantener los siguientes valores:

| Variable | Valor que corresponde |
| --- | --- |
| `DIDIT_API_KEY` | Clave privada de la aplicación Didit |
| `DIDIT_WORKFLOW_ID_SIGNATURE` | UUID del KYC completo publicado |
| `DIDIT_SIGNATURE_WEBHOOK_SECRET` | Secreto del destino de contratos, no el de otro destino |
| `APP_URL` | `https://vivat.com.ar` |
| `SIGNATURE_EVIDENCE_PRIVATE_KEY_B64` | Clave Ed25519 privada generada para Vivat |
| `SIGNATURE_EVIDENCE_ARCHIVED_PUBLIC_KEYS` | Array JSON de claves públicas antiguas; inicialmente `[]` |

Los cambios de variables requieren un nuevo despliegue. No poner secretos en código, en el frontend, en Git ni en mensajes.

En Vercel se verificó el HMAC V2 sobre JSON canónico; acepta el mensaje firmado de una sesión sintética inexistente como ignorado y rechaza una firma alterada. Didit envía `X-Signature-V2`; se utiliza porque el entorno puede entregar el cuerpo JSON ya procesado. El backend también consulta la decisión auténtica de Didit, por lo que un mensaje del navegador no puede aprobar una firma.

Referencias: [crear sesión](https://docs.didit.me/sessions-api/create-session), [destinos de webhook](https://docs.didit.me/management-api/webhook/create-destination), [firmas HMAC](https://docs.didit.me/integration/webhooks).

## Garantes

La pantalla `/firmar.html` permite firmar a las tres clases de participantes. Los garantes acceden con una cuenta cuyo email fue confirmado por Supabase Auth y coincide con la invitación; antes de vincularla definitivamente se comprueba el DNI.

Al iniciar la primera firma se fijan los garantes del contrato. Agregar o modificar garantes del pasaporte después no modifica el instrumento ya aceptado. Cada garante debe ser una persona distinta de las partes y de los otros garantes, con nombre, DNI y email completos.

No se inventan los datos faltantes. Un garante de prueba o incompleto debe corregirse antes de iniciar la firma. Los contratos con documentos aceptados de la implementación anterior exigen revisión de versión; no se sobrescribe ni se borra su evidencia histórica.

## Custodia y verificación independiente

La clave privada inicial está en `.env.signing.local`, ignorado por Git, y en los secretos de producción de Vercel. Conservar una copia segura bajo control de Vivat. No regenerarla en cada despliegue.

La clave pública puede descargarse desde la pantalla de firma o consultarse en `/api/firmas/claves`. Huella SHA-256 de la clave inicial:
`e952a0376368ddef5069d0b0af09fe9d5624d6806f9825ad0dde16ee330c8045`.

Cada parte debe conservar juntos:
- PDF original.
- PDF de auditoría de cada firmante.
- JSON de evidencia correspondiente.
- Clave pública de Vivat obtenida y retenida por un canal confiable.
- PDF final consolidado.

Verificar una evidencia desde la carpeta del proyecto:

```powershell
node scripts/verify-signature-evidence.mjs evidencia.json clave-publica.pem contrato-original.pdf auditoria.pdf
```

El verificador exige una clave pública confiable proporcionada por separado; no confía automáticamente en la clave incluida en el JSON. Comprueba firma criptográfica y huellas de los archivos. Esto no certifica la independencia de la fecha.

Al rotar la clave, conservar la pública anterior en `SIGNATURE_EVIDENCE_ARCHIVED_PUBLIC_KEYS` para seguir verificando contratos existentes. Mantener copias de seguridad de la base de datos y de los objetos almacenados; una clave pública sola no recupera documentos perdidos.

## Verificación y límites pendientes

- 52 pruebas del circuito de firma, permisos, notificaciones, correos, carga de iconos y límite de funciones: aprobadas.
- Prueba integrada con servicios simulados: tres participantes, mismo PDF, espera del garante, reintentos, consentimiento incorrecto, DNI distinto, contrato cancelado y archivo alterado.
- PDF sintético generado y revisado visualmente: contrato y auditoría legibles, sin recortes.
- Compilación local y compilación en Vercel: correctas. Aviso no bloqueante de Browserslist desactualizado.
- Comprobaciones HTTP en el dominio público: página, clave pública, endpoints protegidos, HMAC válido/inválido y ausencia de exposición de archivos privados.
- Permisos y migraciones comprobados en Supabase. La nueva tabla de garantes tiene RLS y no concede acceso directo a `anon` o `authenticated`.
- No se crearon firmas reales ni se modificaron contratos de usuarios durante las comprobaciones.
- La suite general del repositorio conserva 16 fallos en pruebas de la portada: selectores de tarjetas, simulación de temporizadores/resize y orden de carga. Sus archivos de prueba y de implementación no fueron cambiados por este trabajo. No se declara esa suite completamente aprobada.
- Falta una prueba de aceptación con un firmante real completando Didit, regreso a Vivat y descarga final desde la interfaz. `AGENTS.md` impide las pruebas automáticas de navegador; no se abrió Chrome para probar.
- La comprobación HMAC sintética no equivale a una entrega real de Didit. Revisar la entrega en la consola después de la primera verificación real.
- Supabase mantiene otros avisos preexistentes: extensión `pg_net` en public y protección contra contraseñas filtradas desactivada. La ausencia de políticas en `Contrato_Garante` es intencional: solo el backend con autorización de participantes accede a ella. Referencias del asesor: [RLS sin política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [extensiones](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## CLI de Vercel

No hace falta descargar un instalador separado. Con Node.js instalado, PowerShell puede ejecutar:

```powershell
npx --yes vercel login
```

Funciona desde cualquier carpeta e inicia sesión para el usuario de Windows. La sesión de `maximocirrin` quedó comprobada y este proyecto ya está vinculado. Documentación: [Vercel CLI](https://vercel.com/docs/cli). Si falta Node.js, usar el [instalador oficial](https://nodejs.org/en/download).
