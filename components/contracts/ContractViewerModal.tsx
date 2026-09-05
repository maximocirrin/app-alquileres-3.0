import React, { useState } from 'react';
import { Contract, UserRole, DeviceMetadata } from '../../types/contract';

export interface ContractViewerModalProps {
  contract: Contract;
  userRole: 'TENANT' | 'OWNER' | 'BROKER';
  deviceMetadata: DeviceMetadata;
  isLoadingGeo?: boolean;
  onRequestGeo?: () => void;
  isOpen: boolean;
  onClose: () => void;
  onStartSignature: () => void;
}

export const ContractViewerModal: React.FC<ContractViewerModalProps> = ({
  contract,
  userRole,
  deviceMetadata,
  isLoadingGeo = false,
  onRequestGeo,
  isOpen,
  onClose,
  onStartSignature,
}) => {
  const [consentChecked, setConsentChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<'clauses' | 'fullText' | 'forensics'>('clauses');

  if (!isOpen) return null;

  const isSigner = userRole === 'TENANT' || userRole === 'OWNER';
  const hasUserSigned = userRole === 'TENANT' ? contract.tenant.hasSigned : contract.owner.hasSigned;
  const isPendingSignature = isSigner && !hasUserSigned;

  const formatCurrency = (val: number, cur: string = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (d: string) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[94vh] my-auto">
        
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">description</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {contract.contractNumber}
                </span>
                <span className="text-[10px] font-semibold text-zinc-400 hidden xs:inline">
                  Ley 25.506 Firma Digital
                </span>
              </div>
              <h2 className="text-xs sm:text-base font-headline font-bold text-zinc-900 dark:text-white truncate">
                {contract.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-4 sm:px-6 gap-3 sm:gap-6 bg-white dark:bg-zinc-900 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('clauses')}
            className={`py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'clauses'
                ? 'border-primary text-primary'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <span className="material-symbols-outlined text-sm sm:text-base">fact_check</span>
            Cláusulas
          </button>

          <button
            onClick={() => setActiveTab('fullText')}
            className={`py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'fullText'
                ? 'border-primary text-primary'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <span className="material-symbols-outlined text-sm sm:text-base">article</span>
            Texto Completo
          </button>

          <button
            onClick={() => setActiveTab('forensics')}
            className={`py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'forensics'
                ? 'border-primary text-primary'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <span className="material-symbols-outlined text-sm sm:text-base">security</span>
            Metadatos Forenses
          </button>
        </div>

        {/* Modal Body / Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          
          {/* Tab 1: Cláusulas y Resumen Estructurado */}
          {activeTab === 'clauses' && (
            <div className="space-y-4">
              {/* Inmueble y Ubicación */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shrink-0">
                    <span className="material-symbols-outlined text-xl">apartment</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Inmueble Locado</span>
                    <h3 className="font-bold text-zinc-900 dark:text-white text-xs sm:text-sm truncate">{contract.propertyAddress}</h3>
                    <p className="text-[11px] text-zinc-500">{contract.propertyCity || 'Buenos Aires'}</p>
                  </div>
                </div>

                <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block">Canon Locativo</span>
                  <div className="text-base sm:text-lg font-extrabold text-primary dark:text-red-400">
                    {formatCurrency(contract.monthlyRent, contract.currency)}
                  </div>
                  <span className="text-[10px] text-zinc-500">Vencimiento día {contract.paymentDueDay}</span>
                </div>
              </div>

              {/* Grid de Partes Intervinientes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Inquilino */}
                <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase text-zinc-400">Locatario (Inquilino)</span>
                    {contract.tenant.hasSigned ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ Firmado</span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">⏳ Pendiente</span>
                    )}
                  </div>
                  <h4 className="font-bold text-zinc-900 dark:text-white">{contract.tenant.name}</h4>
                  <p className="text-[11px] text-zinc-500">CUIL: {contract.tenant.cuil}</p>
                </div>

                {/* Propietario */}
                <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase text-zinc-400">Locador (Propietario)</span>
                    {contract.owner.hasSigned ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ Firmado</span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">⏳ Pendiente</span>
                    )}
                  </div>
                  <h4 className="font-bold text-zinc-900 dark:text-white">{contract.owner.name}</h4>
                  <p className="text-[11px] text-zinc-500">CUIL: {contract.owner.cuil}</p>
                </div>
              </div>

              {/* Garantes Intervinientes */}
              {contract.guarantors && contract.guarantors.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {contract.guarantors.map((g, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase text-zinc-400">
                          {g.roleLabel || `Garante ${idx + 1} (Codeudor)`}
                        </span>
                        {g.hasSigned ? (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ Firmado</span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">⏳ Pendiente</span>
                        )}
                      </div>
                      <h4 className="font-bold text-zinc-900 dark:text-white">{g.name}</h4>
                      <p className="text-[11px] text-zinc-500">CUIL: {g.cuil}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Parámetros Legales */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase block">Plazo</span>
                  <div className="font-bold text-zinc-900 dark:text-white text-xs mt-0.5">
                    {contract.durationMonths} Meses
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase block">Ajuste</span>
                  <div className="font-bold text-blue-600 dark:text-blue-400 text-xs mt-0.5">
                    {contract.adjustmentIndex} ({contract.adjustmentFrequencyMonths}m)
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase block">Depósito</span>
                  <div className="font-bold text-zinc-900 dark:text-white text-xs mt-0.5 truncate">
                    {formatCurrency(contract.depositAmount || contract.monthlyRent, contract.currency)}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase block">CBU Alias</span>
                  <div className="font-bold text-zinc-900 dark:text-white text-xs mt-0.5 truncate">
                    {contract.aliasCbu || 'VIVAT.MP'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Texto Legal Completo */}
          {activeTab === 'fullText' && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono leading-relaxed space-y-2.5 text-zinc-800 dark:text-zinc-200 max-h-48 sm:max-h-56 overflow-y-auto">
              <p className="font-bold text-center border-b pb-1.5 border-zinc-200 dark:border-zinc-800">
                CONTRATO DE LOCACIÓN INMOBILIARIA DIGITAL (LEY 25.506)
              </p>
              <p>
                <b>PRIMERA (OBJETO):</b> El LOCADOR entrega en locación al LOCATARIO el inmueble ubicado en <b>{contract.propertyAddress}</b>.
              </p>
              <p>
                <b>SEGUNDA (PLAZO):</b> El término del contrato se fija en <b>{contract.durationMonths} meses</b> corridos desde el {formatDate(contract.startDate)} hasta el {formatDate(contract.endDate)}.
              </p>
              <p>
                <b>TERCERA (PRECIO Y REAJUSTE):</b> El canon locativo es de <b>{formatCurrency(contract.monthlyRent, contract.currency)}</b> ajustables periódicamente cada <b>{contract.adjustmentFrequencyMonths} meses</b> mediante el índice oficial <b>{contract.adjustmentIndex}</b>.
              </p>
              <p>
                <b>CUARTA (FIRMA ELECTRÓNICA Y VALIDEZ PROBATORIA):</b> Las partes consienten libre y expresamente la celebración del presente contrato mediante firma electrónica y validación de identidad biométrica conforme a la <b>Ley 25.506</b>, reconociendo plena validez jurídica e inalterabilidad al documento sellado con sellado de tiempo TSA y Hash SHA-256.
              </p>
            </div>
          )}

          {/* Tab 3: Metadatos Forenses */}
          {activeTab === 'forensics' && (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Metadatos del Dispositivo</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[9px] text-zinc-400 block font-bold uppercase">User-Agent</span>
                    <span className="font-mono text-[10px] break-all">{deviceMetadata.userAgent}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[9px] text-zinc-400 block font-bold uppercase">Dispositivo</span>
                    <span className="font-medium">{deviceMetadata.screenResolution} ({deviceMetadata.platform})</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Checkbox de Consentimiento Obligatorio */}
          {isPendingSignature && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border-2 border-primary/20">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded text-primary focus:ring-primary border-zinc-300 dark:border-zinc-700 cursor-pointer"
                />
                <div className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                  <span className="font-bold text-zinc-900 dark:text-white block">
                    Consentimiento Expreso de Firma Electrónica y Validación Biométrica
                  </span>
                  He leído y acepto íntegramente los términos y condiciones del Contrato de Locación. Consiento libremente el uso de firma electrónica y verificación biométrica conforme a la <b>Ley Nacional N° 25.506 de Firma Digital</b>.
                </div>
              </label>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <button
            onClick={onClose}
            className="py-2.5 px-4 text-xs font-bold rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-center"
          >
            Cerrar
          </button>

          {isPendingSignature && (
            <button
              disabled={!consentChecked}
              onClick={onStartSignature}
              className={`py-2.5 px-5 text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                consentChecked
                  ? 'bg-primary hover:bg-primary-container text-white cursor-pointer hover:shadow-lg'
                  : 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-base">face</span>
              <span>Revisar y Validar con Didit</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
