/**
 * TypeScript Interfaces for Garantes & Recibos de Sueldo
 * Hábitat Platform - Pasaporte Hábitat Module
 */

export type EstadoGarante = 'pendiente' | 'invitado' | 'cargado';

export interface ReciboArchivo {
  id: string;
  nombre: string;
  tamano: number; // Bytes
  tipo: string;   // 'application/pdf' | 'image/png' | 'image/jpeg'
  url: string;    // Supabase Storage Public URL or Signed URL
  uploadedAt?: string;
}

export interface Garante {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  token: string;             // Invitation UUID token
  estado: EstadoGarante;
  recibos: ReciboArchivo[];
  createdAt: string;
}

export interface CreateGaranteDTO {
  nombre: string;
  email: string;
  telefono?: string;
}

export interface UploadRecibosDTO {
  token: string;
  files: File[];
  consentAccepted: boolean;
}

export interface OverallGarantesStatus {
  status: 'sin_garantes' | 'incompleto' | 'listo';
  label: string;
  color: 'zinc' | 'amber' | 'emerald';
}
