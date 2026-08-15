import React, { useState } from 'react';
import { UserRole, Contract } from '../../types/contract';
import { useContracts } from '../../hooks/useContracts';
import { useContractSignature } from '../../hooks/useContractSignature';
import { ContractsDashboard } from './ContractsDashboard';
import { ContractViewerModal } from './ContractViewerModal';
import { BiometricVerificationModal } from './BiometricVerificationModal';
import { CryptographicProcessingModal } from './CryptographicProcessingModal';
import { SignatureSuccessModal } from './SignatureSuccessModal';

export interface ContractsManagerProps {
  initialRole?: UserRole;
  onContractUpdated?: (contract: Contract) => void;
}

export const ContractsManager: React.FC<ContractsManagerProps> = ({
  initialRole = 'TENANT',
  onContractUpdated,
}) => {
  const [currentRole, setCurrentRole] = useState<UserRole>(initialRole);
  const [activeModalContract, setActiveModalContract] = useState<Contract | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const {
    contracts,
    filteredContracts,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    updateContract,
  } = useContracts(currentRole);

  // Active signature flow state machine
  const signatureFlow = useContractSignature({
    contract: activeModalContract || contracts[0],
    userRole: currentRole === 'BROKER' ? 'TENANT' : currentRole,
    onSuccess: (updated) => {
      updateContract(updated);
      setActiveModalContract(updated);
      if (onContractUpdated) onContractUpdated(updated);
    },
  });

  const handleOpenContract = (contract: Contract) => {
    setActiveModalContract(contract);
    setIsViewerOpen(true);
  };

  const handleStartSignatureFromViewer = () => {
    setIsViewerOpen(false);
    signatureFlow.initiateSignature();
  };

  const handleDownloadContract = (contract: Contract) => {
    if (typeof window !== 'undefined' && (window as any).ContractsManager?.downloadSignedContract) {
      (window as any).ContractsManager.downloadSignedContract(contract.id);
    } else {
      alert(`Descargando Contrato de Locación Digital Firmado (ID: ${contract.contractNumber})...`);
    }
  };

  const handleDownloadAuditTrail = (contract: Contract) => {
    if (typeof window !== 'undefined' && (window as any).ContractsManager?.downloadAuditTrail) {
      (window as any).ContractsManager.downloadAuditTrail(contract.id);
    } else {
      alert(`Descargando Certificado Oficial de Evidencia y Audit Trail (ID: ${contract.contractNumber})...`);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Dashboard View */}
      <ContractsDashboard
        contracts={filteredContracts}
        currentRole={currentRole}
        onChangeRole={(role) => setCurrentRole(role)}
        statusFilter={statusFilter}
        onChangeStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        onChangeSearchQuery={setSearchQuery}
        onOpenContract={handleOpenContract}
        onDownloadContract={handleDownloadContract}
        onDownloadAuditTrail={handleDownloadAuditTrail}
      />

      {/* 1. Contract Viewer & Consent Modal */}
      {activeModalContract && isViewerOpen && (
        <ContractViewerModal
          contract={activeModalContract}
          userRole={currentRole}
          deviceMetadata={signatureFlow.metadata}
          isLoadingGeo={signatureFlow.isLoadingGeo}
          onRequestGeo={signatureFlow.requestGeolocation}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          onStartSignature={handleStartSignatureFromViewer}
        />
      )}

      {/* 2. Biometric Didit Verification Modal */}
      <BiometricVerificationModal
        isOpen={signatureFlow.currentStep === 'BIOMETRIC_VERIFICATION'}
        state={signatureFlow.didit.state}
        verificationUrl={signatureFlow.didit.verificationUrl}
        errorMessage={signatureFlow.didit.errorMessage}
        isSimulated={signatureFlow.didit.isSimulated}
        onSimulateSuccess={signatureFlow.didit.simulateSuccess}
        onSimulateFailure={signatureFlow.didit.simulateFailure}
        onRetry={signatureFlow.didit.retryVerification}
        onClose={signatureFlow.retryFlow}
      />

      {/* 3. Cryptographic Processing Modal */}
      <CryptographicProcessingModal
        isOpen={signatureFlow.currentStep === 'CRYPTOGRAPHIC_PROCESSING'}
        progress={signatureFlow.cryptoProgress}
        message={signatureFlow.cryptoMessage}
        activeStep={signatureFlow.activeCryptoStep}
      />

      {/* 4. Signature Success & Direct Download Modal */}
      {activeModalContract && (
        <SignatureSuccessModal
          isOpen={signatureFlow.currentStep === 'SUCCESS'}
          contract={signatureFlow.activeContract || activeModalContract}
          onDownloadContract={() => handleDownloadContract(signatureFlow.activeContract || activeModalContract)}
          onDownloadAuditTrail={() => handleDownloadAuditTrail(signatureFlow.activeContract || activeModalContract)}
          onReturnToDashboard={signatureFlow.retryFlow}
        />
      )}

    </div>
  );
};

export default ContractsManager;
