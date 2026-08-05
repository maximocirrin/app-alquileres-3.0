/**
 * TypeScript Interfaces for Pasaporte Hábitat Records & Scraper Integration
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

export interface VerifyLegalRequest {
  participant_id: number | string;
  cuit_cuil: string;
  full_name: string;
}

export interface VerifyLegalResponse {
  success: boolean;
  status: 'completed' | 'pending_manual_review' | 'failed';
  data?: LegalRecord;
  message?: string;
  error?: string;
}
