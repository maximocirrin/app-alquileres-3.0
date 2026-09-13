# Despliegue de seguridad — 2026-09-12

Estas correcciones deben aplicarse primero en una copia o rama de staging y luego en producción. No despliegues el código de aplicación antes de completar las migraciones: los endpoints nuevos dependen de las columnas y RPC nuevas.

## 1. Respaldo y migraciones

1. Generá un backup desde Supabase antes de modificar permisos.
2. Abrí **SQL Editor** en el proyecto `djhwqttaiggjaxmswggr`.
3. Ejecutá estos archivos, uno por uno y en este orden. Cada archivo usa una transacción y revierte completo si falla:

   1. `supabase/migrations/20260912000000_emergency_security_containment.sql`
   2. `supabase/migrations/20260912010000_secure_auth_provisioning.sql`
   3. `supabase/migrations/20260912015000_secure_guarantor_tokens.sql`
   4. `supabase/migrations/20260912020000_atomic_contract_activation.sql`
   5. `supabase/migrations/20260912030000_api_rate_limits.sql`

4. Ejecutá `supabase/verification/20260912_security_post_deploy.sql`. Los chequeos 1, 2, 4 y 5 deben devolver cero filas; el 3 debe mostrar los buckets con `contratos_firmados.public = false`; el chequeo de tokens debe devolver tres ceros.

La primera migración corta el acceso anónimo a las tablas privadas y deja públicas solamente las tablas de catálogo y las publicaciones disponibles. También convierte `contratos_firmados` en un bucket privado. Es esperable que revele dependencias antiguas que confiaban en permisos demasiado amplios.

## 2. Variables y configuración de proveedores

### Vercel

Conservá estas variables en Vercel para producción y staging. Las rutas de `api/` y `services/` se ejecutan en Vercel y leen estos valores desde su propio entorno:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL=https://vivat.com.ar`
- `ALLOWED_ORIGINS=https://vivat.com.ar,https://www.vivat.com.ar`
- `DIDIT_API_KEY`
- `DIDIT_WORKFLOW_ID`: workflow de identidad completo con documento, liveness y face match
- `DIDIT_WORKFLOW_ID_SIGNATURE`: workflow separado de firma con liveness obligatorio
- `DIDIT_WEBHOOK_SECRET`
- `DIDIT_SIGNATURE_WEBHOOK_SECRET` (puede compartir el secreto anterior, aunque se recomienda separarlo)
- `TSA_SERVER_URL` y `TSA_SERVER_API_KEY`
- `ARCA_PADRON_GATEWAY_URL` y `ARCA_PADRON_GATEWAY_TOKEN`, si se habilita ARCA

No expongas `SUPABASE_SERVICE_ROLE_KEY` ni los secretos de Didit, TSA o ARCA mediante variables con prefijo público o código enviado al navegador.

### Supabase Edge Functions

Configurá en **Edge Functions > Secrets** solamente los valores adicionales que consumen las funciones desplegadas:

- `ALLOWED_ORIGINS=https://vivat.com.ar,https://www.vivat.com.ar`
- `WALK_SCORE_API_KEY`
- `BCRA_SYNC_SECRET`: secreto aleatorio y exclusivo para autorizar la sincronización programada

Supabase proporciona automáticamente `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` dentro de sus Edge Functions; no hace falta volver a cargarlas manualmente. `ALLOWED_ORIGINS` aparece en ambos entornos porque lo usan tanto los endpoints de Vercel como `get-walk-score` en Supabase. Los secretos de Didit, TSA y ARCA permanecen únicamente en Vercel mientras esos handlers sigan alojados allí.

`BCRA_SYNC_SECRET` es una credencial compartida entre el programador y `sync-indices-bcra`; no es una clave suministrada por BCRA. Generá 32 bytes aleatorios y guardá exactamente el mismo valor:

1. como `BCRA_SYNC_SECRET` en **Edge Functions > Secrets**;
2. como una entrada en **Database Vault**, con el nombre `bcra_sync_secret`, para que el Cron pueda enviarlo en el header `x-bcra-sync-secret`.

No hay que crear otro proyecto ni una bóveda independiente. Vault pertenece al mismo proyecto de Supabase y cifra el valor con una clave administrada por Supabase. En el Dashboard, buscá **Vault** y elegí **Add secret**; usá `bcra_sync_secret` como nombre y el mismo valor cargado en `BCRA_SYNC_SECRET`. Si la opción visual no aparece, se puede crear desde SQL Editor con `vault.create_secret(valor, nombre, descripción)`.

No guardes el valor directamente en una migración, en Git ni como texto visible dentro de la definición del Cron. Antes de crear un trabajo nuevo, revisá **Integrations > Cron** y editá el existente si ya invoca `sync-indices-bcra`, para evitar ejecuciones duplicadas.

En Didit, configurá destinos webhook v3 para:

- `https://vivat.com.ar/api/webhook`
- `https://vivat.com.ar/api/firmas/webhook-didit`

Configuración requerida en Didit:

1. Seleccioná la aplicación de producción correspondiente a Vivat.
2. En **Workflows**, creá o verificá un workflow KYC con documento, liveness y face match. Copiá su UUID a `DIDIT_WORKFLOW_ID` en Vercel.
3. Creá un segundo workflow de autenticación biométrica para firma, separado del KYC, con liveness obligatorio. Copiá su UUID a `DIDIT_WORKFLOW_ID_SIGNATURE` en Vercel.
4. En **API & Webhooks**, copiá la API Key de la aplicación a `DIDIT_API_KEY` en Vercel.
5. Creá un destino webhook versión `v3`, suscripto a `status.updated`, para `https://vivat.com.ar/api/webhook`. Guardá el `secret_shared_key` de ese destino como `DIDIT_WEBHOOK_SECRET` en Vercel.
6. Creá otro destino webhook versión `v3`, suscripto a `status.updated`, para `https://vivat.com.ar/api/firmas/webhook-didit`. Guardá su propio `secret_shared_key` como `DIDIT_SIGNATURE_WEBHOOK_SECRET` en Vercel.
7. Volvé a desplegar Vercel y usá **Try Webhook** en cada destino. Un webhook de prueba genérico puede responder `200` e ignorarse porque no corresponde a una sesión real; después hacé una prueba completa desde la aplicación y confirmá en **Deliveries** que responde `200`.

El `secret_shared_key` de cada destino debe coincidir exactamente con su variable de entorno, sin espacios agregados. Los handlers verifican `X-Signature-V2`, el timestamp firmado y una ventana máxima de cinco minutos.

## 3. Edge Functions y aplicación

Después de las migraciones, desplegá las Edge Functions modificadas:

```text
supabase functions deploy get-walk-score --project-ref djhwqttaiggjaxmswggr
supabase functions deploy sync-indices-bcra --project-ref djhwqttaiggjaxmswggr
```

Luego desplegá la aplicación. El build debe instalar las dependencias de desarrollo y ejecutar `npm run build` para regenerar `css/tailwind.css`; el compilador CDN fue retirado de las páginas.

## 4. Rotación y revisión operativa

- Rotá `SUPABASE_SERVICE_ROLE_KEY`, claves Didit, secreto webhook, TSA, gateway ARCA y claves Google que hayan estado en equipos, historial Git o carpetas sincronizadas. Actualizá primero el entorno desplegado y luego eliminá copias antiguas.
- Restringí las claves Google por dominio/API desde Google Cloud.
- Revisá los perfiles que la migración devuelve a KYC no verificado y exigí una nueva verificación cuando no exista evidencia completa.
- Las invitaciones de garantes existentes conservan validez por siete días mediante su hash, pero el token en claro deja de almacenarse. Reemití las invitaciones que todavía necesites copiar o compartir.
- Revisá logs de acceso a `contratos_firmados`. Si una ruta histórica fue expuesta, renombrá el objeto y actualizá su referencia en una operación controlada.

## 5. Pruebas mínimas posteriores

Usá dos cuentas sin relación y una cuenta propietaria:

- anónimo no puede leer perfiles, contratos, pagos, KYC ni documentos;
- una cuenta no puede leer datos de la otra;
- el dueño ve su publicación privada y el visitante solo publicaciones activas;
- confirmar email no activa KYC;
- un workflow de firma no activa KYC de identidad;
- ambas firmas aprobadas activan el contrato una sola vez;
- un contrato cancelado no puede reactivarse ni generar un PDF final nuevo;
- un inventario con alguna firma no admite modificaciones;
- un enlace de garante usado o vencido es rechazado;
- los límites de frecuencia devuelven HTTP 429 al superar la cuota.
