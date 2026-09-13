# Desarrollo local

Ejecutá `npm start` desde la raíz del proyecto para iniciar Express en el puerto 3000. El servidor carga las variables de `.env` antes de inicializar los módulos de autenticación.

Podés abrir la aplicación desde `http://localhost:3000/tu-alquiler.html`. Si usás Live Server en `http://localhost:5500` o `http://127.0.0.1:5500`, mantené Express ejecutándose: el panel dirige las consultas y acciones de pagos al mismo host en el puerto 3000. En producción los pagos usan `/api/pagos` en el propio dominio.

Las credenciales necesarias para el backend están documentadas en `.env.example`. Las claves de servicio se utilizan únicamente en el servidor.

El proceso de Express necesita acceso HTTPS a Supabase para validar las sesiones. Si se inicia desde un entorno con red restringida, la validación puede fallar con `EACCES`. En ese caso, iniciá `npm start` desde una terminal con acceso de red. La API de pagos distingue una sesión inválida (401) de un servicio de autenticación inaccesible (503).

La migración `supabase/migrations/20260913054050_payment_confirmation_workflow.sql` ya está aplicada en el proyecto Supabase configurado. En otras bases debe aplicarse antes de usar el flujo de pagos. Iniciar Express no aplica migraciones automáticamente.

La verificación SQL está en `supabase/tests/payment_confirmation_workflow.sql`: usa un pago temporal del contrato de prueba indicado y revierte todos los cambios, incluidas las notificaciones, con `ROLLBACK`.

Los estilos se compilan con `npm run build:css` usando `tailwind.config.js`. Las páginas cargan `css/tailwind.css`; no necesitan el script CDN de Tailwind ni asignaciones a `tailwind.config` en el navegador.
