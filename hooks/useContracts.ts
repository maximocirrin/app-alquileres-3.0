import { useState, useEffect, useCallback, useMemo } from 'react';
import { Contract, ContractStatus, UserRole } from '../types/contract';

const INITIAL_MOCK_CONTRACTS: Contract[] = [
  {
    id: 'CTR-2026-0891',
    contractNumber: 'CTR-2026-0891',
    title: 'Departamento 3 Ambientes con Balcón Aterrazado',
    propertyAddress: 'Av. Santa Fe 2450, Piso 7 "B", Recoleta, CABA',
    propertyCity: 'Recoleta, Buenos Aires',
    propertyImage: 'img/hero-marketplace.jpg',
    monthlyRent: 420000,
    currency: 'ARS',
    status: 'WAITING_TENANT',
    startDate: '2026-09-01',
    endDate: '2028-08-31',
    durationMonths: 24,
    paymentDueDay: 10,
    adjustmentIndex: 'IPC',
    adjustmentFrequencyMonths: 3,
    depositAmount: 420000,
    aliasCbu: 'HABITAT.RECOLETA.MP',
    tenant: {
      role: 'TENANT',
      name: 'Carlos Gómez',
      email: 'carlos.gomez@gmail.com',
      cuil: '20-38491029-4',
      hasSigned: false,
    },
    owner: {
      role: 'OWNER',
      name: 'María Florencia Rossi',
      email: 'mflorencia.rossi@outlook.com',
      cuil: '27-33918274-8',
      hasSigned: false,
    },
    broker: {
      name: 'Martín Palermo',
      license: 'CUCICBA Mat. 6842',
      agencyName: 'Palermo & Asociados Propiedades',
      email: 'contacto@palermoprop.com',
      phone: '+54 11 4821-9988',
    },
    draftPdfUrl: '#',
    sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    createdAt: '2026-08-12T14:30:00Z',
    updatedAt: '2026-08-15T10:00:00Z',
    auditTrailEvents: [
      {
        id: 'EVT-01',
        timestamp: '2026-08-12T14:30:00Z',
        action: 'CONTRATO_CREADO',
        actorRole: 'BROKER',
        actorName: 'Martín Palermo (CUCICBA 6842)',
        details: 'Generación del borrador oficial bajo ley 25.506 y Código Civil y Comercial.',
      },
      {
        id: 'EVT-02',
        timestamp: '2026-08-12T15:00:00Z',
        action: 'SOLICITUD_FIRMA_ENVIADA',
        actorRole: 'SYSTEM',
        actorName: 'Habitat Platform',
        details: 'Notificación de firma electrónica despachada a inquilino (carlos.gomez@gmail.com).',
      }
    ]
  },
  {
    id: 'CTR-2026-0742',
    contractNumber: 'CTR-2026-0742',
    title: 'Semipiso 4 Ambientes en Torre con Amenities',
    propertyAddress: 'Av. del Libertador 4820, Piso 14, Belgrano, CABA',
    propertyCity: 'Belgrano, Buenos Aires',
    propertyImage: 'img/hero-marketplace.jpg',
    monthlyRent: 850000,
    currency: 'ARS',
    status: 'WAITING_OWNER',
    startDate: '2026-08-01',
    endDate: '2028-07-31',
    durationMonths: 24,
    paymentDueDay: 5,
    adjustmentIndex: 'ICL',
    adjustmentFrequencyMonths: 6,
    depositAmount: 850000,
    aliasCbu: 'HABITAT.BELGRANO.MP',
    tenant: {
      role: 'TENANT',
      name: 'Lucía Fernández',
      email: 'lucia.fernandez@tech.io',
      cuil: '27-39201948-3',
      hasSigned: true,
      signedAt: '2026-08-14T18:22:10Z',
      ipAddress: '181.44.120.55',
    },
    owner: {
      role: 'OWNER',
      name: 'Esteban Morales',
      email: 'esteban.morales@inversiones.com.ar',
      cuil: '20-29183746-1',
      hasSigned: false,
    },
    broker: {
      name: 'Valeria Sotomayor',
      license: 'CUCICBA Mat. 5120',
      agencyName: 'Habitat Real Estate Network',
      email: 'valeria@habitat.ar',
    },
    draftPdfUrl: '#',
    sha256Hash: '9f83c6b29f7988319f390076a91176b9dfa5fae8e60408544c4897c8d94e2402',
    createdAt: '2026-08-10T09:15:00Z',
    updatedAt: '2026-08-14T18:22:10Z',
    auditTrailEvents: [
      {
        id: 'EVT-01',
        timestamp: '2026-08-10T09:15:00Z',
        action: 'CONTRATO_CREADO',
        actorRole: 'BROKER',
        actorName: 'Valeria Sotomayor',
        details: 'Borrador confeccionado y revisado.',
      },
      {
        id: 'EVT-02',
        timestamp: '2026-08-14T18:22:10Z',
        action: 'FIRMA_INQUILINO_COMPLETADA',
        actorRole: 'TENANT',
        actorName: 'Lucía Fernández (CUIL 27-39201948-3)',
        actorIp: '181.44.120.55',
        details: 'Validación biométrica Didit aprobada y consentimiento registrado.',
      }
    ]
  },
  {
    id: 'CTR-2026-0518',
    contractNumber: 'CTR-2026-0518',
    title: 'Loft Moderno en Palermo Hollywood',
    propertyAddress: 'Humboldt 1940, Piso 3 "A", Palermo, CABA',
    propertyCity: 'Palermo, Buenos Aires',
    propertyImage: 'img/hero-marketplace.jpg',
    monthlyRent: 390000,
    currency: 'ARS',
    status: 'SIGNED_AND_SEALED',
    startDate: '2026-07-01',
    endDate: '2028-06-30',
    durationMonths: 24,
    paymentDueDay: 10,
    adjustmentIndex: 'IPC',
    adjustmentFrequencyMonths: 4,
    depositAmount: 390000,
    aliasCbu: 'HABITAT.PALERMO.MP',
    tenant: {
      role: 'TENANT',
      name: 'Matías Rossi',
      email: 'matias.rossi@dev.com',
      cuil: '20-37829104-5',
      hasSigned: true,
      signedAt: '2026-06-28T11:15:00Z',
      ipAddress: '190.220.44.12',
    },
    owner: {
      role: 'OWNER',
      name: 'Gonzalo Benítez',
      email: 'gonzalo.benitez@empresa.com',
      cuil: '20-26491028-7',
      hasSigned: true,
      signedAt: '2026-06-29T16:40:00Z',
      ipAddress: '186.138.89.210',
    },
    broker: {
      name: 'Martín Palermo',
      license: 'CUCICBA Mat. 6842',
      agencyName: 'Palermo & Asociados Propiedades',
      email: 'contacto@palermoprop.com',
    },
    sha256Hash: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
    tsaTimestamp: '2026-06-29T16:40:12Z',
    tsaCertificateId: 'TSA-AR-2026-981042',
    qrVerificationUrl: 'https://habitat.ar/verificar/CTR-2026-0518',
    signedPdfUrl: '/api/contracts/CTR-2026-0518/download-signed',
    auditTrailPdfUrl: '/api/contracts/CTR-2026-0518/download-audit-trail',
    createdAt: '2026-06-25T10:00:00Z',
    updatedAt: '2026-06-29T16:40:12Z',
    auditTrailEvents: [
      {
        id: 'EVT-01',
        timestamp: '2026-06-25T10:00:00Z',
        action: 'CONTRATO_CREADO',
        actorRole: 'BROKER',
        actorName: 'Martín Palermo',
        details: 'Generación del documento legal.',
      },
      {
        id: 'EVT-02',
        timestamp: '2026-06-28T11:15:00Z',
        action: 'FIRMA_INQUILINO_COMPLETADA',
        actorRole: 'TENANT',
        actorName: 'Matías Rossi',
        actorIp: '190.220.44.12',
        details: 'Biometría Didit aprobada y consentimiento asentado.',
      },
      {
        id: 'EVT-03',
        timestamp: '2026-06-29T16:40:00Z',
        action: 'FIRMA_PROPIETARIO_COMPLETADA',
        actorRole: 'OWNER',
        actorName: 'Gonzalo Benítez',
        actorIp: '186.138.89.210',
        details: 'Biometría Didit aprobada y consentimiento asentado.',
      },
      {
        id: 'EVT-04',
        timestamp: '2026-06-29T16:40:12Z',
        action: 'SELLADO_TSA_COMPLETADO',
        actorRole: 'TSA',
        actorName: 'Autoridad Certificante TSA (Ley 25.506)',
        details: 'Estampado de tiempo inmutable y generación de hash SHA-256 definitivo.',
      }
    ]
  }
];

export function useContracts(currentRole: UserRole = 'TENANT') {
  const [contracts, setContracts] = useState<Contract[]>(INITIAL_MOCK_CONTRACTS);
  const [selectedContractId, setSelectedContractId] = useState<string | number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch contracts from API or Supabase with fallback
  const fetchContracts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/contracts?role=${currentRole}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setContracts(data);
        }
      }
    } catch (err) {
      console.info('[useContracts] Usando registros locales de contratos.');
    } finally {
      setIsLoading(false);
    }
  }, [currentRole]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Update a single contract
  const updateContract = useCallback((updated: Contract) => {
    setContracts((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  }, []);

  // Filtered list
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      // Role filter check
      if (statusFilter !== 'ALL' && c.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAddress = c.propertyAddress.toLowerCase().includes(q);
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesTenant = c.tenant.name.toLowerCase().includes(q);
        const matchesOwner = c.owner.name.toLowerCase().includes(q);
        const matchesNumber = c.contractNumber.toLowerCase().includes(q);
        return matchesAddress || matchesTitle || matchesTenant || matchesOwner || matchesNumber;
      }

      return true;
    });
  }, [contracts, statusFilter, searchQuery]);

  const selectedContract = useMemo(() => {
    return contracts.find((c) => c.id === selectedContractId) || null;
  }, [contracts, selectedContractId]);

  return {
    contracts,
    filteredContracts,
    selectedContract,
    selectedContractId,
    setSelectedContractId,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    isLoading,
    fetchContracts,
    updateContract,
  };
}
