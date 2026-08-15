import React from 'react';
import { CryptographicStep } from '../../types/contract';

export interface CryptographicProcessingModalProps {
  isOpen: boolean;
  progress: number;
  message: string;
  activeStep: CryptographicStep;
}

export const CryptographicProcessingModal: React.FC<CryptographicProcessingModalProps> = ({
  isOpen,
  progress,
  message,
  activeStep,
}) => {
  if (!isOpen) return null;

  const steps: Array<{
    id: CryptographicStep;
    label: string;
    description: string;
    icon: string;
  }> = [
    {
      id: 'ID_VERIFICATION',
      label: 'Validación Biométrica',
      description: 'Cotejo facial y token de verificación Didit.',
      icon: 'how_to_reg',
    },
    {
      id: 'SHA256_HASHING',
      label: 'Digest Criptográfico SHA-256',
      description: 'Cálculo de huella digital inmutable del contrato.',
      icon: 'tag',
    },
    {
      id: 'TSA_TIMESTAMPING',
      label: 'Sello de Tiempo TSA Legal',
      description: 'Estampado por Autoridad Certificante (Ley 25.506).',
      icon: 'verified_user',
    },
    {
      id: 'AUDIT_TRAIL_GENERATION',
      label: 'Generación de Audit Trail',
      description: 'Consolidación de evidencias forenses y metadatos.',
      icon: 'receipt_long',
    },
  ];

  const getStepStatus = (stepId: CryptographicStep) => {
    const order: CryptographicStep[] = [
      'ID_VERIFICATION',
      'SHA256_HASHING',
      'TSA_TIMESTAMPING',
      'AUDIT_TRAIL_GENERATION',
      'COMPLETED',
    ];
    const currentIndex = order.indexOf(activeStep);
    const stepIndex = order.indexOf(stepId);

    if (stepIndex < currentIndex || activeStep === 'COMPLETED') return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-zinc-900 text-white rounded-3xl shadow-2xl border border-zinc-800 p-6 sm:p-8 space-y-6 overflow-hidden">
        
        {/* Glowing background halo */}
        <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        {/* Header & Icon */}
        <div className="text-center space-y-3 relative z-10">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-primary to-amber-500 animate-spin blur-sm opacity-70" />
            <div className="relative w-full h-full rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-3xl animate-pulse">lock_clock</span>
            </div>
          </div>

          <div>
            <h3 className="font-headline font-bold text-lg sm:text-xl text-white">
              Procesamiento Criptográfico
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Sellado de tiempo y firma conforme a la <b>Ley 25.506</b>
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 relative z-10">
          <div className="flex justify-between text-xs font-mono text-zinc-400">
            <span>Progreso Criptográfico</span>
            <span className="text-emerald-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-red-500 to-emerald-400 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-center text-zinc-300 font-medium animate-pulse min-h-[20px]">
            {message}
          </p>
        </div>

        {/* Steps List */}
        <div className="space-y-3 relative z-10 pt-2 border-t border-zinc-800">
          {steps.map((s, idx) => {
            const status = getStepStatus(s.id);
            return (
              <div
                key={s.id}
                className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                  status === 'completed'
                    ? 'bg-zinc-800/60 border-emerald-500/40 text-white'
                    : status === 'current'
                    ? 'bg-zinc-800 border-primary/60 text-white shadow-md'
                    : 'bg-zinc-950/40 border-zinc-800/60 text-zinc-500'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${
                    status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : status === 'current'
                      ? 'bg-primary/20 text-red-400 animate-spin'
                      : 'bg-zinc-800 text-zinc-600'
                  }`}
                >
                  {status === 'completed' ? (
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                  ) : status === 'current' ? (
                    <span className="material-symbols-outlined text-lg">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-lg">{s.icon}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate">{s.label}</span>
                    <span className="text-[10px] uppercase font-mono">
                      {status === 'completed' && <span className="text-emerald-400 font-bold">Completado</span>}
                      {status === 'current' && <span className="text-amber-400 font-bold">En curso...</span>}
                      {status === 'pending' && <span className="text-zinc-600">Pendiente</span>}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate">{s.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Footer Notice */}
        <div className="text-[10px] text-center text-zinc-500 border-t border-zinc-800 pt-3 flex items-center justify-center gap-1.5">
          <span className="material-symbols-outlined text-xs text-emerald-400">shield_lock</span>
          <span>Firma encriptada SHA-256 + TSA Token no repudiable.</span>
        </div>

      </div>
    </div>
  );
};
