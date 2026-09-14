# Firma de contratos: puesta en producción

Estado al 14 de septiembre de 2026: cambios locales preparados. No se desplegó la aplicación ni se aplicó la migración a producción. No se ejecutaron verificaciones biométricas ni firmas reales.

La última consulta remota a Supabase fue bloqueada por la revisión automática al alcanzar su límite de uso. No se intentó eludir ese bloqueo.

## Cambios implementados

- `/api/firmas/partes` devuelve exclusivamente la identidad de las partes de contratos del usuario autenticado. No amplía las políticas de acceso a `Perfil`.
- La bandeja de notificaciones se consulta por destinatario y se conserva por cuenta, sin filtrar por el panel activo. La lectura se guarda en Supabase y se sincroniza entre paneles.
- Firma con consentimiento, sesión Didit vinculada al contrato y al perfil, comprobación de documento, prueba de vida, comparación facial y coincidencia del DNI. Webhooks y consultas de estado confirman la decisión contra Didit.
- Las sesiones pendientes se pueden retomar. Las sesiones antiguas sin versión del contrato se reemplazan conservando sus registros.
- El PDF usa las cláusulas guardadas. No inventa DNI, CUIL, importe, sesión, IP ni puntaje biométrico. Los certificados descargados provienen del servidor.
- La vista previa genera el PDF completo con sus anexos antes de habilitar el consentimiento. El inicio reconstruye el documento y compara su SHA-256 con el PDF aceptado; si cambió, exige revisarlo otra vez. La firma guarda la huella y la ruta del archivo, y el sellado descarga y verifica esos mismos bytes. Previsualizar no modifica el contrato ni inicia Didit.
- Se verifica que las firmas correspondan al mismo PDF y que los archivos no hayan cambiado antes de consolidarlos. Se comprueban también las firmas de garantes antes de activar el contrato.

## Didit

El identificador de firma que estaba en la configuración local devolvía HTTP 404. Se consultaron los workflows de la cuenta mediante la API de lectura. El flujo existente `firma electronica` es de autenticación biométrica y requiere una referencia facial. Su uso con una foto del pasaporte quedó descartado por una restricción de aprobación automática sobre reutilización de datos biométricos.

El código implementado utiliza una **verificación nueva de documento y rostro**, aportados directamente por el firmante a Didit. La configuración local apunta al workflow KYC completo y publicado de la cuenta (`pasaporte`); sus identificadores permanecen en `.env`, fuera del código y de Git. Para producción se debe configurar `DIDIT_WORKFLOW_ID_SIGNATURE` con un workflow que incluya OCR/documento, LIVENESS y FACE_MATCH.

Configurar en el entorno de despliegue:

- `DIDIT_API_KEY`: clave privada de la cuenta.
- `DIDIT_WORKFLOW_ID_SIGNATURE`: UUID del workflow KYC completo que se usará para la firma.
- `DIDIT_SIGNATURE_WEBHOOK_SECRET`: secreto de la entrega del webhook (o el secreto compartido existente mediante `DIDIT_WEBHOOK_SECRET`).
- `APP_URL`: origen público canónico de la aplicación.
- Webhook: `/api/firmas/webhook-didit` del origen público. Comprobar la entrega y sus firmas HMAC en Didit. La consulta de estado puede confirmar decisiones aunque el webhook se demore.

Referencias: [crear sesión](https://docs.didit.me/sessions-api/create-session), [consultar decisión](https://docs.didit.me/sessions-api/retrieve-session), [webhooks](https://docs.didit.me/integration/webhooks).

## Cómo obtener el TSA

El TSA es una capa de evidencia temporal independiente; no identifica al firmante ni transforma por sí solo la firma electrónica en firma digital. El artículo 5 de la [Ley 25.506](https://www.argentina.gob.ar/normativa/nacional/70749/texto) establece que, si se desconoce la firma electrónica, quien la invoca debe acreditar su validez. El requerimiento de TSA del código es una decisión técnica, no una conclusión de obligatoriedad legal universal. Para un piloto puede evaluarse un circuito sin TSA con revisión jurídica y mensajes transparentes; esa modalidad no se habilitó en este cambio. Para contratos operados a escala se recomienda conservar evidencia temporal independiente.

Para Vivat se puede solicitar una propuesta de integración a [CertiSur](https://www.certisur.com/servicio-timestamp/), que ofrece automatización del sellado de documentos. Como alternativa, [GlobalSign](https://www.globalsign.com/en/timestamp-service) ofrece un servicio de timestamp compatible con RFC 3161.

Texto para solicitar una cotización (no enviado):

> Necesitamos integrar sellado de tiempo en una plataforma de contratos de alquiler. Solicitamos acceso de pruebas y producción compatible con RFC 3161 y SHA-256, documentación de API, autenticación, cadena de certificados, política de sellado, SLA, límites y precio por sello. Nuestro backend utiliza Node.js en Vercel. Buscamos enviar únicamente la huella del documento y conservar el token para verificación independiente.

Solicitar y guardar:

1. Endpoint de pruebas y producción, documentación y método de autenticación.
2. Certificados raíz e intermedios confiables, política de sellado y procedimiento de renovación.
3. Condiciones de disponibilidad, límites, costos y retención de evidencia.

**La aplicación actual espera un gateway JSON, no una URL RFC 3161 binaria.** `TSA_SERVER_URL` y `TSA_SERVER_API_KEY` no son credenciales universales de cualquier TSA. Una vez elegido el proveedor, hay que adaptar `issueTrustedTimestamp` en `services/firmas/sellar.js`, o implementar el gateway del siguiente contrato:

```http
POST /timestamp
Authorization: Bearer <secreto del gateway>
Content-Type: application/json

{"hash_algorithm":"SHA-256","hash":"<64 caracteres hexadecimales>"}
```

```json
{
  "timestamp_token": "<token RFC 3161 codificado>",
  "gen_time": "<fecha emitida por el TSA>",
  "authority": "<autoridad verificada>",
  "serial_number": "<número emitido por el TSA>"
}
```

El gateway debe verificar el estado de la respuesta RFC 3161, la firma criptográfica, el certificado de la autoridad y su uso de timestamp, la cadena de confianza y la coincidencia del hash y nonce. No basta con devolver estos campos como texto. No enviar contratos, documentos de identidad ni imágenes al TSA: la solicitud de timestamp solo necesita la huella.

El servicio aún no está contratado ni configurado. La aplicación bloquea el inicio cuando falta esta configuración para evitar que el usuario complete Didit y falle recién al sellar. No hay tokens TSA de ejemplo ni un modo de aprobación simulada.

## Pendientes antes de habilitar contratos

1. Contratar y conectar el TSA con verificación criptográfica real de su respuesta. El gateway anterior sigue siendo una dependencia externa sin implementar/configurar.
2. Aplicar `supabase/migrations/20260914150119_signature_session_integrity.sql`. Impide duplicados en sesiones nuevas con evidencia de consentimiento. Se detectaron dos grupos históricos de sesiones/firmantes duplicados y no se alteraron sus registros.
3. Completar el circuito de firma autenticada de garantes. El endpoint actual de inicio autoriza a propietario e inquilino; el portal de garantes existente verifica identidad, pero no completa una firma contractual. Un contrato con garantes pendientes no se activa. También se necesita definir una asociación estable de garantes por contrato; el modelo actual los obtiene a través del pasaporte del inquilino.
4. Verificar en un contrato de prueba la vista previa, documento e identidades del primer firmante, la firma de todas las partes y la descarga final. Revisar recuperación tras cierre de la pantalla, webhook repetido, caída del TSA y doble solicitud simultánea.
5. Verificar retención y descarga independiente del token TSA y su asociación con el certificado de auditoría. Actualmente se guarda en `Firma_contrato.tsa_sello_tiempo`; no se inserta como firma PAdES ni como DocTimeStamp de Adobe dentro del PDF.
6. Desplegar código y variables de entorno. Los resultados locales no demuestran el funcionamiento del entorno de producción.
7. Los contratos con un PDF original de la implementación anterior requieren revisión de versión; no se sobrescribe su evidencia. Un PDF aceptado que difiera de las condiciones actuales bloquea una nueva firma hasta revisar el contrato y conservar correctamente sus antecedentes.

## Verificación realizada

Pruebas automatizadas con datos simulados: decisiones Didit incompletas, workflow incorrecto, DNI distinto, rechazo, expiración, autenticidad y antigüedad de webhook, sesiones selladas, revisión contractual, integridad de PDFs, reintentos de carga, identidad de participantes, bandeja entre roles, cambio de cuenta, bandeja vacía y fallo al guardar lectura. También se ejecuta la suite previa del proyecto.

Se respeta `AGENTS.md`: no se abrió Chrome ni se realizaron pruebas automáticas de navegador. La revisión visual en escritorio y móvil y la prueba con proveedores reales permanecen pendientes.

Resultado local: 35 pruebas aprobadas y `npm run build` completado. Incluye rechazo de consentimiento sin PDF o sobre un PDF modificado y conservación de un documento ya aceptado frente a intentos concurrentes. El compilador avisó que su base Browserslist está desactualizada; no impidió la compilación.
