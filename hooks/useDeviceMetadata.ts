import { useState, useEffect, useCallback } from 'react';
import { DeviceMetadata } from '../types/contract';

/**
 * Hook to securely extract device forensic metadata and optional GPS coordinates
 * for the legal Audit Trail (Ley 25.506).
 */
export function useDeviceMetadata() {
  const [metadata, setMetadata] = useState<DeviceMetadata>({
    userAgent: '',
    platform: '',
    screenResolution: '',
    language: '',
    timezone: '',
    timestamp: new Date().toISOString(),
    geolocation: null,
  });

  const [isLoadingGeo, setIsLoadingGeo] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Capture synchronous browser metadata
  const getBasicMetadata = useCallback((): DeviceMetadata => {
    if (typeof window === 'undefined') {
      return {
        userAgent: 'SSR',
        platform: 'Server',
        screenResolution: '0x0',
        language: 'es-AR',
        timezone: 'America/Argentina/Buenos_Aires',
        timestamp: new Date().toISOString(),
        geolocation: null,
      };
    }

    const screenRes = `${window.screen.width || 0}x${window.screen.height || 0}`;
    const nav = window.navigator as any;
    const platform = nav.userAgentData?.platform || nav.platform || 'Unknown';
    const lang = nav.language || 'es-AR';
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires';

    return {
      userAgent: nav.userAgent || 'Unknown',
      platform,
      screenResolution: screenRes,
      language: lang,
      timezone,
      timestamp: new Date().toISOString(),
      geolocation: null,
    };
  }, []);

  // Request GPS coordinates (non-blocking, graceful fallback if declined)
  const requestGeolocation = useCallback(async (): Promise<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number | null;
    timestamp?: number;
  } | null> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoError('Geolocalización no soportada por el navegador.');
      return null;
    }

    setIsLoadingGeo(true);
    setGeoError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLoadingGeo(false);
          const coords = {
            latitude: Number(position.coords.latitude.toFixed(6)),
            longitude: Number(position.coords.longitude.toFixed(6)),
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            timestamp: position.timestamp,
          };
          setMetadata((prev) => ({
            ...prev,
            geolocation: coords,
            timestamp: new Date().toISOString(),
          }));
          resolve(coords);
        },
        (error) => {
          setIsLoadingGeo(false);
          let message = 'Permiso de ubicación denegado u omitido.';
          if (error.code === error.TIMEOUT) message = 'Tiempo de espera de GPS agotado.';
          if (error.code === error.POSITION_UNAVAILABLE) message = 'Señal GPS no disponible.';
          setGeoError(message);
          console.info(`[DeviceMetadata] GPS info: ${message} (continuando sin GPS estricto)`);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000,
        }
      );
    });
  }, []);

  // Refresh entire metadata including timestamp and optional GPS
  const captureFullMetadata = useCallback(async (): Promise<DeviceMetadata> => {
    const base = getBasicMetadata();
    let geo = metadata.geolocation;
    
    if (!geo && typeof window !== 'undefined' && navigator.geolocation) {
      geo = await requestGeolocation();
    }

    const full: DeviceMetadata = {
      ...base,
      timestamp: new Date().toISOString(),
      geolocation: geo,
    };
    
    setMetadata(full);
    return full;
  }, [getBasicMetadata, metadata.geolocation, requestGeolocation]);

  useEffect(() => {
    setMetadata(getBasicMetadata());
  }, [getBasicMetadata]);

  return {
    metadata,
    isLoadingGeo,
    geoError,
    requestGeolocation,
    captureFullMetadata,
  };
}
