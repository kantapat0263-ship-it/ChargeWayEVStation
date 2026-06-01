'use client';

import { useEffect, useRef, useState } from 'react';

// เปิด Screen Wake Lock เพื่อกันจอดับขณะขับ (ใช้ในโหมดขับขี่)
// คืน { supported, active, error } — degrade อย่างนุ่มนวลถ้าเบราว์เซอร์ไม่รองรับ
export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<any>(null);
  const [held, setHeld] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  useEffect(() => {
    if (!active || !supported) return;

    let cancelled = false;

    const acquire = async () => {
      try {
        const sentinel = await (navigator as any).wakeLock.request('screen');
        if (cancelled) {
          sentinel.release?.();
          return;
        }
        sentinelRef.current = sentinel;
        setHeld(true);
        setError(null);
        sentinel.addEventListener?.('release', () => {
          sentinelRef.current = null;
          setHeld(false);
        });
      } catch (e: any) {
        setError(e?.message || 'wake lock failed');
        setHeld(false);
      }
    };

    // wake lock จะหลุดเองเมื่อแท็บถูกซ่อน — ขอใหม่เมื่อกลับมา visible
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && active && !sentinelRef.current) {
        acquire();
      }
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      try {
        sentinelRef.current?.release?.();
      } catch {
        /* ignore */
      }
      sentinelRef.current = null;
      setHeld(false);
    };
  }, [active, supported]);

  return { supported, active: held, error };
}
