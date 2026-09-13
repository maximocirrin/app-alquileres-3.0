import assert from 'node:assert/strict';
import { test } from 'node:test';

const {
  default: ownerContracts,
  getOwnerContractsForProfile,
  normalizeOwnerContract
} = await import('../api/owner-contracts.js');

function response() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(statusCode) { this.statusCode = statusCode; return this; },
    json(body) { this.body = body; return this; }
  };
}

const sourceContract = {
  id_contrato: 81,
  id_propiedad: 31,
  id_publicacion: 55,
  id_perfil_inquilino: 18,
  id_perfil_propietario: 7,
  fecha_inicio_contrato: '2026-09-01',
  fecha_fin_contrato: '2028-09-01',
  monto_cierre: '450000',
  monto_deposito: '450000',
  deposito_devuelto: false,
  id_moneda: 1,
  id_Indice: 1,
  periodo_aumento_meses: 3,
  dia_vencimiento_mensual: 10,
  tasa_punitoria_diaria: '0.5',
  alias_cbu: 'VIVAT.ALQUILER',
  url_contrato_original_pdf: 'https://storage.example/private-original.pdf',
  url_contrato_final_pdf: 'https://storage.example/private-final.pdf',
  hash_original_sha256: 'sensitive-hash-not-returned',
  clausulas_adicionales: { aliasCbu: 'VIVAT.ALQUILER', secret: 'must-not-leak' },
  Propiedad: {
    calle: 'San Martín',
    numero: 123,
    piso_dpto: '4 A',
    expensas_mensuales: '25000',
    Publicacion: [
      {
        id_publicacion: 55,
        descripcion: 'Departamento luminoso',
        precio: '450000',
        Multimedia: [
          { url_archivo: 'https://cdn.example/second.jpg', orden_visualizacion: 2, path_privado: 'hidden' },
          { url_archivo: 'https://cdn.example/first.jpg', orden_visualizacion: 1 }
        ]
      }
    ]
  },
  Inquilino: {
    id_perfil: 18,
    nombre_completo: 'Ana Pérez',
    mail: 'ana@example.com',
    telefono: '+54 9 261 555-0101',
    dni: '12345678',
    cbu: '0000000000000000000000'
  },
  Firma_contrato: [
    { rol_firmante: 'inquilino', estado_firma: 'sellada', didit_status: 'APPROVED', id_firma: 42 }
  ],
  Historial_Estado_Contrato: [
    { id_historial_contrato: 2, id_estado_contrato: 1, fecha_inicio: '2026-09-02', fecha_fin: null },
    { id_historial_contrato: 1, id_estado_contrato: 5, fecha_inicio: '2026-09-01', fecha_fin: '2026-09-02' }
  ]
};

test('normalizes the owner dashboard DTO and removes sensitive nested columns', () => {
  const contract = normalizeOwnerContract(sourceContract);

  assert.equal(contract.tenant.nombre_completo, 'Ana Pérez');
  assert.equal(contract.alias_cbu, 'VIVAT.ALQUILER');
  assert.equal(contract.property_image, 'https://cdn.example/first.jpg');
  assert.deepEqual(contract.photos, ['https://cdn.example/first.jpg', 'https://cdn.example/second.jpg']);
  assert.deepEqual(contract.publication.Multimedia, [
    { url_archivo: 'https://cdn.example/first.jpg', orden_visualizacion: 1 },
    { url_archivo: 'https://cdn.example/second.jpg', orden_visualizacion: 2 }
  ]);
  assert.equal(contract.history[0].id_historial_contrato, 2);

  const serialized = JSON.stringify(contract);
  assert.doesNotMatch(serialized, /12345678|0000000000000000000000|must-not-leak|sensitive-hash-not-returned|private-original\.pdf|private-final\.pdf|path_privado/);
});

test('constrains the service-role query to the authenticated owner profile', async () => {
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
      return Promise.resolve({ data: [sourceContract], error: null });
    }
  };
  const supabase = {
    from(table) {
      calls.push(['from', table]);
      return query;
    }
  };

  const contracts = await getOwnerContractsForProfile(supabase, '7');

  assert.equal(contracts.length, 1);
  assert.deepEqual(calls[0], ['from', 'Contrato']);
  assert.deepEqual(calls.find(([method]) => method === 'eq'), ['eq', 'id_perfil_propietario', 7]);
  assert.deepEqual(calls.find(([method]) => method === 'order'), ['order', 'id_contrato', { ascending: false }]);
});

test('rejects an unauthenticated owner-contract request before creating a service client', async () => {
  const res = response();
  await ownerContracts({
    method: 'GET',
    headers: { origin: 'http://127.0.0.1:5500' }
  }, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.error, 'Unauthorized');
});
