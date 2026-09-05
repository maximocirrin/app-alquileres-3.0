/**
 * TypeScript Interfaces & Types for Electronic Signature & Contract Management Module
 * Vivat Real Estate Platform (Ley 25.506 de Firma Digital)
 */

export type UserRole = 'TENANT' | 'OWNER' | 'BROKER';

export type ContractStatus = 
  | 'DRAFT' 
  | 'WAITING_TENANT' 
  | 'WAITING_OWNER' 
  | 'SIGNED_AND_SEALED' 
  | 'REJECTED';

export type SignatureSessionState = 
  | 'READY' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'ERROR';

export type CryptographicStep = 
  | 'ID_VERIFICATION' 
  | 'SHA256_HASHING' 
  | 'TSA_TIMESTAMPING' 
  | 'AUDIT_TRAIL_GENERATION' 
  | 'COMPLETED' 
  | 'ERROR';

export interface DeviceMetadata {
  userAgent: string;
  platform: string;
  screenResolution: string;
  language: string;
  timezone: string;
  timestamp: string;
  ip?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number | null;
    timestamp?: number;
  } | null;
}

export interface ContractSigner {
  role: 'TENANT' | 'OWNER' | 'GUARANTOR';
  name: string;
  email: string;
  cuil: string;
  dni?: string;
  phone?: string;
  roleLabel?: string;
  isKycVerified?: boolean;
  hasSigned: boolean;
  signedAt?: string;
  diditSessionId?: string;
  ipAddress?: string;
  deviceMetadata?: DeviceMetadata;
  verificationDetails?: {
    dniFrontVerified?: boolean;
    dniBackVerified?: boolean;
    facialLivenessScore?: number;
    verificationStatus?: 'APPROVED' | 'REJECTED' | 'REVIEW';
  };
}

export interface AuditTrailEvent {
  id: string;
  timestamp: string;
  action: string;
  actorRole: UserRole | 'SYSTEM' | 'TSA';
  actorName: string;
  actorIp?: string;
  details: string;
  sha256Digest?: string;
}

export interface Contract {
  id: string | number;
  contractNumber: string;
  title: string;
  propertyAddress: string;
  propertyId?: string | number;
  propertyCity?: string;
  propertyImage?: string;
  monthlyRent: number;
  currency: 'ARS' | 'USD';
  status: ContractStatus;
  
  // Terms
  startDate: string;
  endDate: string;
  durationMonths: number;
  paymentDueDay: number;
  adjustmentIndex: 'IPC' | 'ICL' | 'FIJO';
  adjustmentFrequencyMonths: number;
  depositAmount?: number;
  aliasCbu?: string;
  
  // Parties
  tenant: ContractSigner;
  owner: ContractSigner;
  guarantors?: ContractSigner[];
  garantes?: ContractSigner[];
  broker?: {
    name: string;
    license: string;
    agencyName: string;
    email: string;
    phone?: string;
  };

  // Legal & Cryptographic Assets
  draftPdfUrl?: string;
  signedPdfUrl?: string;
  auditTrailPdfUrl?: string;
  sha256Hash?: string;
  tsaTimestamp?: string;
  tsaCertificateId?: string;
  qrVerificationUrl?: string;
  
  // Audit Trail Events History
  auditTrailEvents?: AuditTrailEvent[];
  
  createdAt: string;
  updatedAt: string;
}

export interface StartSignatureRequest {
  contractId: string | number;
  role: 'TENANT' | 'OWNER';
  signerName?: string;
  signerEmail?: string;
  signerCuil?: string;
  consentGiven: boolean;
  consentTimestamp: string;
  deviceMetadata: DeviceMetadata;
}

export interface StartSignatureResponse {
  success: boolean;
  sessionId: string;
  verificationUrl: string;
  isMock?: boolean;
  contractStatus?: ContractStatus;
  message?: string;
}

export interface SignatureStatusResponse {
  success: boolean;
  contractId: string | number;
  status: ContractStatus;
  step: CryptographicStep;
  progress: number;
  message: string;
  isComplete: boolean;
  signedPdfUrl?: string;
  auditTrailPdfUrl?: string;
  sha256Hash?: string;
  tsaTimestamp?: string;
  qrVerificationUrl?: string;
  error?: string;
}

export interface CompleteSignatureRequest {
  contractId: string | number;
  sessionId: string;
  role: 'TENANT' | 'OWNER';
  diditStatus: 'APPROVED' | 'REJECTED' | 'FAILED';
  verificationToken?: string;
}
