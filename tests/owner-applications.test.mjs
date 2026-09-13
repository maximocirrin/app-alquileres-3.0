import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.SUPABASE_URL = 'https://owner-applications-test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'public-test-key';
process.env.NODE_ENV = 'test';

const {
  getOwnerApplicationsForProfile,
  normalizeOwnerApplication
} = await import('../lib/owner-applications.js');

const sourceApplication = {
  id_solicitud: 91,
  fecha_solicitud: '2026-09-13T12:00:00Z',
  id_perfil: 18,
  ingreso_mensual_declarado: '1700000',
  mensaje: 'Me interesa la propiedad.',
  comprobante_ingreso: 'Pasaporte Vivat',
  telefono: '+54 9 261 555-0101',
  id_publicacion: 55,
  private_note: 'must-not-leak',
  Historial_estado_solicitud: [{
    id_historial_estado_solicitud: 7,
    id_estado_solicitud: 2,
    fecha_inicio: '2026-09-13T13:00:00Z',
    Estado_solicitud: { id_estado_solicitud: 2, nombre: 'Aceptada' }
  }],
  Publicacion: {
    id_publicacion: 55,
    id_propiedad: 31,
    id_perfil: 7,
    precio: '450000',
    descripcion: 'Departamento luminoso | Detalles: {"ambientes":2}',
    Multimedia: [
      { url_archivo: 'https://cdn.example/second.jpg', orden_visualizacion: 2, private_path: 'hidden' },
      { url_archivo: 'https://cdn.example/first.jpg', orden_visualizacion: 1 }
    ],
    Propiedad: {
      id_propiedad: 31,
      id_perfil_propietario: 7,
      calle: 'San Martín',
      numero: '123',
      expensas_mensuales: '25000',
      superficie_cubierta: '65',
      habitaciones_total: 3,
      dormitorios: 2,
      banos_completos: 1
    },
    Contrato: [{
      id_contrato: 81,
      id_propiedad: 31,
      id_publicacion: 55,
      id_perfil_inquilino: 18
    }]
  },
  Perfil: {
    id_perfil: 18,
    nombre_completo: 'Ana Pérez',
    mail: 'ana@example.com',
    telefono: '+54 9 261 555-9999',
    dni: '12345678',
    user_id: 'private-auth-id',
    Pasaporte_habitat: [{
      id_pasaporte: 44,
      codigo_pasaporte: 'VIVAT-44',
      cuit: '27123456789',
      condicion_fiscal: 'Monotributista',
      situacion_crediticia: 'Situación 1',
      secret_score: 'must-not-leak-either'
    }]
  }
};

test('normalizes an authorized applicant with real identity and passport details', () => {
  const application = normalizeOwnerApplication(sourceApplication);

  assert.equal(application.tenant_name, 'Ana Pérez');
  assert.equal(application.tenant_email, 'ana@example.com');
  assert.equal(application.passport_id, 44);
  assert.equal(application.status, 'aceptada');
  assert.equal(application.contract_id, 'CTR-2026-0081');
  assert.deepEqual(application.property_photos, [
    'https://cdn.example/first.jpg',
    'https://cdn.example/second.jpg'
  ]);

  const serialized = JSON.stringify(application);
  assert.doesNotMatch(serialized, /private-auth-id|private_path|must-not-leak/);
});

test('constrains the service-role applicant query to the authenticated publication owner', async () => {
  const calls = [];
  const query = {
    select(selection) {
      calls.push(['select', selection]);
      return this;
    },
    eq(column, value) {
      calls.push(['eq', column, value]);
      return this;
    },
    order(column, options) {
      calls.push(['order', column, options]);
      return Promise.resolve({ data: [sourceApplication], error: null });
    }
  };
  const supabase = {
    from(table) {
      calls.push(['from', table]);
      return query;
    }
  };

  const applications = await getOwnerApplicationsForProfile(supabase, '7');

  assert.equal(applications.length, 1);
  assert.deepEqual(calls[0], ['from', 'Solicitud']);
  assert.deepEqual(calls.find(([method]) => method === 'eq'), ['eq', 'Publicacion.id_perfil', 7]);
  assert.deepEqual(calls.find(([method]) => method === 'order'), [
    'order',
    'fecha_solicitud',
    { ascending: false }
  ]);
});
