'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { hasConsent, setConsent } from '@/lib/privacy';

// แบนเนอร์ขอความยินยอมการใช้ข้อมูล (PDPA/GDPR) — แสดงครั้งแรกที่เข้าใช้งาน
// แอปเก็บข้อมูลบนเครื่องผู้ใช้เท่านั้น จึงเป็น consent แบบเบา ไม่บล็อกการใช้งาน
export function PrivacyConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // เช็คฝั่ง client หลัง mount เพื่อกัน hydration mismatch
    if (!hasConsent()) setShow(true);
  }, []);

  if (!show) return null;

  const accept = () => {
    setConsent();
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="การใช้ข้อมูลส่วนบุคคล"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md rounded-2xl border border-border/60 bg-white/95 dark:bg-card/95 backdrop-blur-md shadow-xl p-4"
    >
      <p className="text-[12px] leading-relaxed text-foreground/90">
        แอปนี้เก็บข้อมูล (ตำแหน่ง ทริป รายการโปรด) ไว้<b>บนเครื่องของคุณเท่านั้น</b>{' '}
        ไม่ส่งขึ้นเซิร์ฟเวอร์ของเรา และขอใช้ตำแหน่ง/ไมโครโฟนเฉพาะตอนคุณสั่งงานเท่านั้น{' '}
        <Link href="/privacy" className="font-bold text-primary underline underline-offset-2">
          อ่านนโยบายความเป็นส่วนตัว
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={accept}
          className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-[12px] font-bold"
        >
          รับทราบและยอมรับ
        </button>
        <Link
          href="/privacy"
          className="h-9 px-3 grid place-items-center rounded-xl border border-border text-[12px] font-bold text-foreground"
        >
          จัดการข้อมูล
        </Link>
      </div>
    </div>
  );
}
