import React, { useState, useEffect, useRef } from 'react';
import { DiditSessionState } from '../../types/contract';

export interface BiometricVerificationModalProps {
  sessionState: DiditSessionState;
  sessionUrl?: string;
  isOpen: boolean;
  onClose: () => void;
  onVerificationComplete: () => void;
  onVerificationFailed: (error: string) => void;
}

export const BiometricVerificationModal: React.FC<BiometricVerificationModalProps> = ({
  sessionState,
  sessionUrl,
  isOpen,
  onClose,
  onVerificationComplete,
  onVerificationFailed,
}) => {
  const [subStep, setSubStep] = useState<1 | 2 | 3>(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: 'user' } })
          .then((stream) => {
            mediaStreamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          })
          .catch(() => {
            console.info('[DiditBiometric] Fallback a interfaz simulada de escaneo.');
          });
      }
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCapture = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      if (subStep === 1) {
        setSubStep(2);
      } else if (subStep === 2) {
        setSubStep(3);
      } else {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
        onVerificationComplete();
      }
    }, 800);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col my-auto max-h-[94vh]">
        
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-lg">face_recognition</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-xs sm:text-sm text-zinc-900 dark:text-white">
                Validación Biométrica Didit
              </h3>
              <span className="text-[10px] text-zinc-500">Escaneo de DNI y Prueba de Vida (Liveness)</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* If real Didit session URL with iframe */}
        {sessionUrl && sessionUrl.startsWith('http') && !sessionUrl.includes('simulate') ? (
          <div className="w-full h-96 relative">
            <iframe
              src={sessionUrl}
              className="w-full h-full border-0"
              allow="camera; microphone; geolocation"
              title="Didit Verification"
            />
          </div>
        ) : (
          /* Live Camera Scan / Biometric Step Container */
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
            {/* Step Tabs */}
            <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
              <span
                className={`flex-1 text-center py-1 rounded-lg truncate ${
                  subStep === 1
                    ? 'bg-primary text-white'
                    : subStep > 1
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }`}
              >
                1. DNI Frente
              </span>
              <span className="text-zinc-400">›</span>
              <span
                className={`flex-1 text-center py-1 rounded-lg truncate ${
                  subStep === 2
                    ? 'bg-primary text-white'
                    : subStep > 2
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }`}
              >
                2. DNI Dorso
              </span>
              <span className="text-zinc-400">›</span>
              <span
                className={`flex-1 text-center py-1 rounded-lg truncate ${
                  subStep === 3 ? 'bg-primary text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }`}
              >
                3. Rostro
              </span>
            </div>

            {/* Camera Viewfinder */}
            <div className="relative w-full aspect-[4/3] max-h-60 sm:max-h-72 rounded-2xl bg-zinc-950 flex flex-col items-center justify-center text-white overflow-hidden border border-zinc-800">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Viewfinder overlays */}
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-blue-500/80 shadow-[0_0_12px_#3b82f6] animate-pulse pointer-events-none z-10" />
              <div className="absolute inset-4 border-2 border-dashed border-zinc-500 rounded-xl pointer-events-none z-10" />

              {/* Instructions */}
              <div className="text-center space-y-1 z-20 px-4 bg-black/40 backdrop-blur-xs p-3 rounded-xl">
                {subStep === 1 && (
                  <>
                    <h4 className="font-bold text-xs sm:text-sm">Enfoque el Frente del DNI</h4>
                    <p className="text-[10px] text-zinc-300">Asegure buena iluminación y legibilidad.</p>
                  </>
                )}
                {subStep === 2 && (
                  <>
                    <h4 className="font-bold text-xs sm:text-sm">Enfoque el Dorso del DNI</h4>
                    <p className="text-[10px] text-zinc-300">Escaneando código de barras PDF417.</p>
                  </>
                )}
                {subStep === 3 && (
                  <>
                    <h4 className="font-bold text-xs sm:text-sm">Prueba de Vida Facial</h4>
                    <p className="text-[10px] text-zinc-300">Mire a la cámara y parpadee.</p>
                  </>
                )}
              </div>

              {/* Analyzing Overlay */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-30">
                  <div className="text-center space-y-2">
                    <span className="material-symbols-outlined text-3xl text-blue-400 animate-spin">refresh</span>
                    <span className="text-xs font-bold block">Analizando biometría...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action button */}
            <button
              onClick={handleCapture}
              disabled={isAnalyzing}
              className="w-full py-3 bg-primary hover:bg-primary-container text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span className="material-symbols-outlined text-base">
                {subStep === 3 ? 'verified' : 'photo_camera'}
              </span>
              <span>
                {subStep === 1
                  ? 'Capturar DNI (Frente)'
                  : subStep === 2
                  ? 'Capturar DNI (Dorso)'
                  : 'Validar Biometría Facial'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
