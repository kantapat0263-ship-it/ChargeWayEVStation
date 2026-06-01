'use client';

import { useEffect, useRef, useState } from 'react';

export interface GeoState {
  lat: number;
  lng: number;
  heading: number | null; // องศาตามเข็มจากทิศเหนือ
  accuracy: number | null;
  ready: boolean;
  error: 'denied' | 'unavailable' | 'timeout' | 'unsupported' | null;
}

const INITIAL: GeoState = {
  lat: 0, lng: 0, heading: null, accuracy: null, ready: false, error: null,
};

// ติดตามตำแหน่ง GPS แบบต่อเนื่อง (watchPosition) ขณะ active
// heading: ใช้ค่าจากอุปกรณ์ถ้ามี ไม่งั้นคำนวณจากตำแหน่งก่อนหน้า
export function useGeoWatch(active: boolean) {
  const [state, setState] = useState<GeoState>(INITIAL);
  const prevRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!active) {
      prevRef.current = null;
      setState(INITIAL);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState(s => ({ ...s, error: 'unsupported' }));
      return;
    }

    const onPos = (pos: GeolocationPosition) => {
      const { latitude, longitude, heading, accuracy } = pos.coords;
      let hdg: number | null =
        heading != null && !Number.isNaN(heading) ? heading : null;

      // fallback: คำนวณทิศจากตำแหน่งก่อนหน้า เมื่อขยับพอประมาณ (กัน jitter)
      const prev = prevRef.current;
      const geom = (window as any).google?.maps?.geometry?.spherical;
      if (hdg == null && prev && geom) {
        try {
          const a = new google.maps.LatLng(prev.lat, prev.lng);
          const b = new google.maps.LatLng(latitude, longitude);
          if (geom.computeDistanceBetween(a, b) > 5) {
            hdg = geom.computeHeading(a, b);
          }
        } catch {
          /* ignore */
        }
      }

      prevRef.current = { lat: latitude, lng: longitude };
      setState(s => ({
        lat: latitude,
        lng: longitude,
        heading: hdg ?? s.heading,
        accuracy: accuracy ?? null,
        ready: true,
        error: null,
      }));
    };

    const onErr = (err: GeolocationPositionError) => {
      const code =
        err.code === err.PERMISSION_DENIED ? 'denied'
        : err.code === err.TIMEOUT ? 'timeout'
        : 'unavailable';
      // เก็บตำแหน่งล่าสุดไว้ แค่ตั้ง error
      setState(s => ({ ...s, error: code }));
    };

    const id = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15000,
    });

    return () => navigator.geolocation.clearWatch(id);
  }, [active]);

  return state;
}
