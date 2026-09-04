/**
 * TypeScript Interfaces for Garantes, Garantías & Pasaporte Vivat
 * Vivat Platform - Módulo de Garantías y Scoring
 */

export type EstadoGaranteCode = 
  | 'BORRADOR' 
  | 'INVITADO' 
  | 'KYC_PENDIENTE' 
  | 'DOCUMENTACION_SUBIDA' 
  | 'EN_REVISION' 
  | 'APROBADO' 
  | 'RECHAZADO';

export type TipoGarantiaCode = 
  | 'PROPIETARIA' 
  | 'RECIBO_SUELDO' 
  | 'SEGURO_CAUCION';

export interface DocumentoGaranteItem {
  id: string;
  tipoDocumento: string; // 'escritura' | 'dni_titular' | 'impuesto_inmobiliario' | 'recibo_sueldo_1' | 'recibo_sueldo_2' | 'recibo_sueldo_3' | 'poliza_caucion' | 'certificado_aval' | 'otro'
  nombre: string;
  tamanoBytes: number;
  url: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  uploadedAt?: string;
  observacion?: string;
}

export interface GarantiaPropietariaData {
  tipoInmueble?: string;
  direccionInmueble?: string;
  provincia?: string;
  matriculaRegistro?: string;
  tomo?: string;
  folio?: string;
  partidaInmobiliaria?: string;
  porcentajeTitularidad?: number; // 100% o menor
  inhibicionLibre?: boolean;
}

export interface ReciboSueldoData {
  empleadorNombre?: string;
  empleadorCuit?: string;
  antiguedadMeses?: number;
  ingresoNetoMensual?: number;
  puestoCargo?: string;
  rubroEmpresa?: string;
}

export interface SeguroCaucionData {
  aseguradoraNombre?: string; // Finaer, Hoggax, Woranz, Premiar, etc.
  numeroPoliza?: string;
  montoCobertura?: number;
  vigenciaHasta?: string;
  estadoFianza?: string; // 'Pre-aprobado' | 'Emitido' | 'En revisión'
}

export interface Garante {
  id: string;
  idPasaporte: string | number;
  idPasaporteGarante?: string | number | null;
  idPerfil?: string | number | null;
  idTipoGarantia: number; // 1: Propietaria, 2: Caución, 3: Recibo de Sueldo
  tipoGarantiaCodigo: TipoGarantiaCode;
  nombreCompleto: string;
  email: string;
  telefono?: string;
  relacionInquilino: string;
  tokenInvitacion: string;
  estadoCodigo: EstadoGaranteCode;
  idEstadoGarante: number; // 1 a 7
  dni?: string;
  cuit?: string;
  kycVerificado: boolean;
  diditSessionId?: string;
  scoring: number;
  datosGarantia: GarantiaPropietariaData | ReciboSueldoData | SeguroCaucionData | Record<string, any>;
  documentos: DocumentoGaranteItem[];
  aceptoConsentimiento: boolean;
  fechaConsentimiento?: string;
  observacionesRevision?: string;
  motivoRechazo?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateGaranteDTO {
  idTipoGarantia: number;
  nombreCompleto: string;
  email: string;
  telefono?: string;
  relacionInquilino: string;
  datosGarantia?: Record<string, any>;
}

export interface SubmitGuarantorPortalDTO {
  tokenInvitacion: string;
  dni?: string;
  cuit?: string;
  datosGarantia: Record<string, any>;
  files: {
    tipoDocumento: string;
    file: File | Blob;
    nombre: string;
  }[];
  aceptoConsentimiento: boolean;
}

export interface OverallGarantesStatus {
  status: 'sin_garantes' | 'incompleto' | 'en_revision' | 'listo';
  label: string;
  color: 'zinc' | 'amber' | 'blue' | 'emerald';
  totalGarantes: number;
  garantesAprobados: number;
  coberturaPorcentaje: number;
}

