'use client';

import { useEffect, useRef, useState } from 'react';

export interface GeoState {
  lat: number;
  lng: number;
  heading: number | null; // องศาตามเข็มจากทิศเหนือ
  speed: number | null;   // กม./ชม.
  accuracy: number | null;
  ready: boolean;
  error: 'denied' | 'unavailable' | 'timeout' | 'unsupported' | null;
}

const INITIAL: GeoState = {
  lat: 0, lng: 0, heading: null, speed: null, accuracy: null, ready: false, error: null,
};

// ติดตามตำแหน่ง GPS แบบต่อเนื่อง (watchPosition) ขณะ active
// heading: ใช้ค่าจากอุปกรณ์ถ้ามี ไม่งั้นคำนวณจากตำแหน่งก่อนหน้า
export function useGeoWatch(active: boolean) {
  const [state, setState] = useState<GeoState>(INITIAL);
  const prevRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);

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
      const { latitude, longitude, heading, accuracy, speed } = pos.coords;
      const ts = pos.timestamp || Date.now();
      let hdg: number | null =
        heading != null && !Number.isNaN(heading) ? heading : null;
      let spd: number | null =
        speed != null && !Number.isNaN(speed) && speed >= 0 ? speed * 3.6 : null;

      // fallback: คำนวณทิศ + ความเร็วจากตำแหน่งก่อนหน้า เมื่อขยับพอประมาณ (กัน jitter)
      const prev = prevRef.current;
      const geom = (window as any).google?.maps?.geometry?.spherical;
      if (prev && geom) {
        try {
          const a = new google.maps.LatLng(prev.lat, prev.lng);
          const b = new google.maps.LatLng(latitude, longitude);
          const meters = geom.computeDistanceBetween(a, b);
          const dtSec = (ts - prev.ts) / 1000;
          if (hdg == null && meters > 5) hdg = geom.computeHeading(a, b);
          if (spd == null && dtSec > 0.5) spd = (meters / dtSec) * 3.6;
        } catch {
          /* ignore */
        }
      }

      prevRef.current = { lat: latitude, lng: longitude, ts };
      setState(s => ({
        lat: latitude,
        lng: longitude,
        heading: hdg ?? s.heading,
        speed: spd != null ? Math.max(0, Math.round(spd)) : s.speed,
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
