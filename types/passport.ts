/**
 * TypeScript Interfaces for Pasaporte Hábitat Records
 */

export interface LegalRecordSummary {
  status: 'clean' | 'has_issues' | 'pending_manual_review';
  total_causes?: number;
  eviction_causes_count?: number;
  details?: Array<{
    caratula?: string;
    numero_expediente?: string;
    tribunal?: string;
    materia?: string;
    tipo?: string;
    fecha?: string;
  }>;
  error?: string;
  raw_response?: any;
}

export interface LegalRecord {
  id: string;
  participant_id: number | string;
  has_legal_issues: boolean;
  has_eviction_history: boolean;
  summary: LegalRecordSummary;
  checked_at: string;
}

export interface AtmRecord {
  id: string;
  participant_id: number | string;
  has_debt: boolean;
  total_debt_amount: number;
  checked_at: string;
}

export interface EmploymentRecord {
  id: string;
  participant_id: number | string;
  employer_name: string;
  seniority_months: number;
  net_income: number;
  checked_at: string;
}

export interface BonoSueldoArchivo {
  id?: string;
  nombre: string;
  tamano: number; // Bytes
  tipo: string;   // 'application/pdf' | 'image/png' | 'image/jpeg'
  url?: string;
  data?: string;  // Data URL / Base64 for offline/preview
  uploaded_at: string;
}

export interface DatosIngresosPassport {
  ingreso_mensual?: number;
  condicion_fiscal?: string;
  empresa?: string;
  bono_sueldo?: BonoSueldoArchivo | null;
}
