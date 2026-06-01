'use client';

import { useEffect } from 'react';

// ลงทะเบียน Service Worker เพื่อให้แอปติดตั้งเป็น PWA/APK ได้
export function SwRegister() {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* ลงทะเบียนไม่สำเร็จ — ข้ามไป ไม่กระทบการใช้งาน */
      });
    }
  }, []);

  return null;
}
