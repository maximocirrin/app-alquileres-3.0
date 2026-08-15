import { useState, useEffect, useCallback, useRef } from 'react';
import { SignatureSessionState } from '../types/contract';

export interface DiditVerificationConfig {
  sessionId?: string;
  verificationUrl?: string;
  onSuccess?: (details: { sessionId: string; token?: string }) => void;
  onError?: (error: { code: string; message: string }) => void;
  onStateChange?: (state: SignatureSessionState) => void;
}

/**
 * Hook to manage Didit Biometric Verification state machine (READY -> IN_PROGRESS -> COMPLETED | FAILED | ERROR).
 * Strictly complies with security standards: no raw biometric images or camera feeds stored in local state.
 */
export function useDiditVerification(config: DiditVerificationConfig = {}) {
  const [state, setState] = useState<SignatureSessionState>('READY');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(config.verificationUrl || null);
  const [sessionId, setSessionId] = useState<string | null>(config.sessionId || null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const popupRef = useRef<Window | null>(null);
  const pollIntervalRef = useRef<any>(null);

  const updateState = useCallback((newState: SignatureSessionState) => {
    setState(newState);
    if (config.onStateChange) {
      config.onStateChange(newState);
    }
  }, [config]);

  // Handle postMessage events from Didit embedded iframe or popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin if coming from Didit
      const isDiditOrigin = event.origin.includes('didit.me') || 
                            event.origin.includes('verification.didit.me') || 
                            event.origin.includes(window.location.origin);

      if (!isDiditOrigin) return;

      const data = event.data;
      if (!data) return;

      if (data.type === 'DIDIT_SESSION_COMPLETED' || data.status === 'COMPLETED' || data.event === 'verification.completed') {
        console.log('[useDiditVerification] Biometric verification completed successfully.');
        updateState('COMPLETED');
        if (config.onSuccess) {
          config.onSuccess({
            sessionId: data.sessionId || sessionId || 'didit_sess_' + Date.now(),
            token: data.token || data.verificationToken,
          });
        }
      } else if (data.type === 'DIDIT_SESSION_FAILED' || data.status === 'FAILED' || data.event === 'verification.failed') {
        console.warn('[useDiditVerification] Biometric verification failed.');
        updateState('FAILED');
        setErrorMessage(data.message || 'La verificación biométrica no pudo ser completada. Reintente con buena iluminación.');
        if (config.onError) {
          config.onError({
            code: data.code || 'BIOMETRIC_FAILED',
            message: data.message || 'Verificación facial no aprobada.',
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [sessionId, updateState, config]);

  // Start the verification session
  const startVerification = useCallback((url: string, targetSessionId?: string, mode: 'embedded' | 'popup' | 'redirect' = 'embedded') => {
    if (!url) {
      updateState('ERROR');
      setErrorMessage('URL de verificación no provista.');
      return;
    }

    setVerificationUrl(url);
    if (targetSessionId) setSessionId(targetSessionId);
    setErrorMessage(null);
    updateState('IN_PROGRESS');

    const isMock = url.includes('mock=true') || url.startsWith('#mock') || !url.startsWith('http');
    setIsSimulated(isMock);

    if (isMock) {
      console.log('[useDiditVerification] Inició modo simulación interactivo Didit.');
      return;
    }

    if (mode === 'popup') {
      const width = 500;
      const height = 750;
      const left = Math.max(0, (window.innerWidth - width) / 2 + window.screenX);
      const top = Math.max(0, (window.innerHeight - height) / 2 + window.screenY);
      
      const popup = window.open(
        url,
        'HabitatDiditVerification',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
      );
      popupRef.current = popup;

      // Monitor popup closure
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(pollIntervalRef.current);
          if (state === 'IN_PROGRESS') {
            console.log('[useDiditVerification] Popup cerrado por el usuario.');
          }
        }
      }, 1000);
    } else if (mode === 'redirect') {
      window.location.href = url;
    }
  }, [state, updateState]);

  // Complete simulation manually for testing/development
  const simulateSuccess = useCallback(() => {
    updateState('COMPLETED');
    const mockSessionId = sessionId || `mock_didit_${Date.now()}`;
    if (config.onSuccess) {
      config.onSuccess({
        sessionId: mockSessionId,
        token: `mock_tok_${Math.random().toString(36).substring(2)}`,
      });
    }
  }, [sessionId, updateState, config]);

  const simulateFailure = useCallback((msg?: string) => {
    updateState('FAILED');
    const err = msg || 'Falla de prueba de vida (Liveness check: movimiento insuficiente).';
    setErrorMessage(err);
    if (config.onError) {
      config.onError({
        code: 'SIMULATED_FAILURE',
        message: err,
      });
    }
  }, [updateState, config]);

  const retryVerification = useCallback(() => {
    setErrorMessage(null);
    updateState('READY');
  }, [updateState]);

  const resetVerification = useCallback(() => {
    setState('READY');
    setErrorMessage(null);
    setVerificationUrl(null);
    setSessionId(null);
    setIsSimulated(false);
  }, []);

  return {
    state,
    errorMessage,
    verificationUrl,
    sessionId,
    isSimulated,
    startVerification,
    simulateSuccess,
    simulateFailure,
    retryVerification,
    resetVerification,
  };
}
