import React from 'react';
import { Contract } from '../../types/contract';

export interface SignatureSuccessModalProps {
  isOpen: boolean;
  contract: Contract;
  onDownloadContract: () => void;
  onDownloadAuditTrail: () => void;
  onReturnToDashboard: () => void;
}

export const SignatureSuccessModal: React.FC<SignatureSuccessModalProps> = ({
  isOpen,
  contract,
  onDownloadContract,
  onDownloadAuditTrail,
  onReturnToDashboard,
}) => {
  if (!isOpen) return null;

  const formatDate = (d?: string) => {
    if (!d) return new Date().toLocaleString('es-AR');
    try {
      return new Date(d).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return d;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
        
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-8 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none" />
          
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="material-symbols-outlined text-3xl">verified</span>
          </div>

          <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-[11px] font-extrabold uppercase tracking-wider mb-1">
            Firma Digital Certificada
          </span>

          <h2 className="text-xl sm:text-2xl font-headline font-extrabold">
            ¡Contrato Firmado y Sellado!
          </h2>
          <p className="text-xs text-white/90 max-w-sm mx-auto mt-1">
            La transacción fue validada biométricamente y estampada con sello de tiempo legal (TSA).
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">

          {/* Legal Details Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700/60 pb-2">
              <span className="text-xs font-bold text-zinc-500 uppercase">Inmueble / Contrato</span>
              <span className="text-xs font-bold font-mono text-primary dark:text-red-400">{contract.contractNumber}</span>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{contract.title}</h4>
              <p className="text-xs text-zinc-500">{contract.propertyAddress}</p>
            </div>

            {/* Cryptographic Proof Badges */}
            <div className="grid grid-cols-1 gap-2 pt-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Hash Criptográfico SHA-256</span>
                <span className="text-emerald-600 dark:text-emerald-400 break-all text-[11px]">
                  {contract.sha256Hash || 'a78f3c9e4210d5718a24c29c8789bc4410985a11df30e8c6114e9b986b245e33'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Sellado de Tiempo TSA</span>
                  <span className="text-zinc-800 dark:text-zinc-200 text-[11px] font-sans font-medium">
                    {formatDate(contract.tsaTimestamp)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Marco Jurídico</span>
                  <span className="text-zinc-800 dark:text-zinc-200 text-[11px] font-sans font-medium">
                    Ley Nacional 25.506
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={onDownloadContract}
                className="py-3 px-4 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">download</span>
                Descargar Contrato (PDF)
              </button>

              <button
                onClick={onDownloadAuditTrail}
                className="py-3 px-4 bg-zinc-900 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-zinc-700"
              >
                <span className="material-symbols-outlined text-base">verified_user</span>
                Certificado de Evidencia (PDF)
              </button>
            </div>

            <button
              onClick={onReturnToDashboard}
              className="w-full py-2.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-colors text-center cursor-pointer"
            >
              Volver al Panel Principal
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
