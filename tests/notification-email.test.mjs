import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const migrationUrl = new URL('../supabase/migrations/20260913213156_durable_email_notifications.sql', import.meta.url);
const workerUrl = new URL('../supabase/functions/send-notification-email/index.ts', import.meta.url);
const dataManagerUrl = new URL('../js/data.js', import.meta.url);
const notificationsUrl = new URL('../js/notifications.js', import.meta.url);
const settingsUrl = new URL('../js/account-settings.js', import.meta.url);

test('all requested business events create durable notifications', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  const expectedTriggers = [
    'vivat_notify_application_created',
    'vivat_notify_application_status',
    'vivat_notify_punitive_interest_waived',
    'vivat_notify_maintenance_ticket_created',
    'vivat_notify_maintenance_ticket_updated',
    'vivat_notify_visit_created',
    'vivat_notify_visit_updated',
    'vivat_notify_first_contract_message',
    'vivat_notify_contract_signature'
  ];
  expectedTriggers.forEach((trigger) => assert.match(sql, new RegExp(`CREATE TRIGGER ${trigger}\\b`)));

  [
    'postulacion_nueva', 'postulacion_aceptada', 'postulacion_rechazada',
    'pago_informado', 'pago_aceptado', 'pago_rechazado', 'interes_perdonado',
    'mantenimiento_nuevo', 'mantenimiento_actualizado',
    'visita_nueva', 'visita_programada', 'visita_actualizada',
    'primer_mensaje', 'mensaje_chat', 'firma_completada'
  ].forEach((eventType) => assert.ok(sql.includes(`'${eventType}'`), `missing ${eventType}`));
});

test('email queue is private to the service and safely retryable', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON TABLE public\."Email_notificacion_cola" FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /FOR UPDATE SKIP LOCKED/);
  assert.match(sql, /intentos < 6/);
  assert.match(sql, /notificacion_clave_deduplicacion_uidx/);
  assert.match(sql, /vivat-notification-email-worker/);
  assert.match(sql, /vivat-rent-due-notifications/);
});

test('email worker authenticates the scheduler and uses provider idempotency', async () => {
  const source = await readFile(workerUrl, 'utf8');
  assert.match(source, /NOTIFICATION_EMAIL_WEBHOOK_SECRET/);
  assert.match(source, /secureEqual\(receivedSecret, expectedSecret\)/);
  assert.match(source, /"Idempotency-Key": `vivat-notification\/\$\{row\.id_email\}`/);
  assert.match(source, /claim_notification_email_batch/);
  assert.match(source, /complete_notification_email/);
  assert.match(source, /target\.origin === base\.origin/);
  assert.match(source, /https:\/\/vivat\.com\.ar\/img\/logo-lite\.png/);
  assert.match(source, /<img src="\$\{logoUrl\}" width="104" alt="Vivat"/);
});

test('in-app notification actions match the business event', async () => {
  const source = await readFile(notificationsUrl, 'utf8');
  assert.match(source, /type === 'pago_informado'\) return 'Revisar pago'/);
  assert.match(source, /type\.startsWith\('pago_'\).*return 'Ver pago'/);
  assert.doesNotMatch(source, /Ver y Firmar/);
});

test('browser no longer calls the removed ephemeral notification helper', async () => {
  const dataManager = await readFile(dataManagerUrl, 'utf8');
  assert.doesNotMatch(dataManager, /await this\.createNotification\(/);
});

test('new email categories are persisted in user preferences', async () => {
  const settings = await readFile(settingsUrl, 'utf8');
  for (const preference of ['notif_mantenimiento', 'notif_mensajes', 'notif_operativas']) {
    assert.match(settings, new RegExp(`${preference}: document\\.getElementById\\('${preference}'\\)`));
  }
});
