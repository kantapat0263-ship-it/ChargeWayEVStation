'use client';

import { useState } from 'react';
import Link from 'next/link';
import { clearMyData, exportMyData } from '@/lib/privacy';

// หน้านโยบายความเป็นส่วนตัว + ศูนย์จัดการสิทธิ์เจ้าของข้อมูล (PDPA/GDPR)
export default function PrivacyPage() {
  const [msg, setMsg] = useState<string | null>(null);

  const onExport = () => {
    const data = exportMyData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chargeway-my-data.json';
    a.click();
    URL.revokeObjectURL(url);
    setMsg('ดาวน์โหลดข้อมูลของคุณแล้ว');
  };

  const onDelete = () => {
    if (!window.confirm('ยืนยันลบข้อมูลทั้งหมดของคุณออกจากเครื่องนี้? การกระทำนี้ย้อนกลับไม่ได้')) return;
    const n = clearMyData();
    setMsg(`ลบข้อมูลเรียบร้อย (${n} รายการ) — รีเฟรชหน้าเพื่อเริ่มใหม่`);
  };

  return (
    <main className="mx-auto max-w-2xl px-5 py-8 text-foreground">
      <Link href="/" className="text-[13px] font-bold text-primary">&larr; กลับหน้าแผนที่</Link>
      <h1 className="mt-3 text-2xl font-black">นโยบายความเป็นส่วนตัว</h1>
      <p className="mt-1 text-[12px] text-muted-foreground">ปรับปรุงล่าสุด: 3 ก.ย. 2026</p>

      <section className="mt-6 space-y-4 text-[13px] leading-relaxed">
        <div>
          <h2 className="font-black text-base mb-1">1. เราเก็บข้อมูลอะไรบ้าง</h2>
          <p>ChargeWay เก็บข้อมูลต่อไปนี้ไว้<b>บนเครื่องของคุณ (localStorage)</b> เท่านั้น:</p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li>ตำแหน่ง GPS — ใช้แสดงตำแหน่งบนแผนที่และค้นหาสถานีใกล้เคียง (ขอเฉพาะตอนใช้งาน)</li>
            <li>ทริปที่บันทึก จุดเริ่มต้น/ปลายทาง (รวมทริปล่าสุดที่คำนวณ เก็บไว้ 24 ชม.) และรายการโปรด (บ้าน/ที่ทำงาน)</li>
            <li>การตั้งค่ารถ/พลังงาน/ราคา/เครือข่าย และธีม (สว่าง/มืด)</li>
            <li>แคชผลค้นหาสถานีชาร์จตามพิกัดจุดแวะ (เก็บไว้ 24 ชม. เพื่อลดการเรียก Google)</li>
            <li>เสียงพูดค้นหา — ประมวลผลผ่านเบราว์เซอร์ ไม่ถูกบันทึกไว้</li>
          </ul>
        </div>

        <div>
          <h2 className="font-black text-base mb-1">2. เราไม่ทำอะไรกับข้อมูล</h2>
          <p>
            เรา<b>ไม่มีเซิร์ฟเวอร์ฐานข้อมูล ไม่ส่งข้อมูลของคุณออกนอกเครื่อง ไม่ขาย ไม่แชร์</b>{' '}
            กับบุคคลที่สาม และไม่ติดตามตัวตนของคุณ
          </p>
        </div>

        <div>
          <h2 className="font-black text-base mb-1">3. บริการภายนอกที่แอปเรียกใช้</h2>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li><b>Google Maps</b> — แสดงแผนที่ ค้นหาสถานี และนำทาง (อยู่ภายใต้นโยบายของ Google)</li>
            <li><b>Open-Meteo</b> — อุณหภูมิเพื่อประมาณระยะวิ่ง (ส่งเฉพาะพิกัดคร่าว ๆ ไม่มีตัวตน)</li>
            <li><b>Sentry</b> (เฉพาะเมื่อผู้ดูแลเปิดใช้) — รายงานข้อผิดพลาดของแอป ไม่ส่ง IP/ตัวตน และตัด API key/พิกัดออกจาก URL ก่อนส่ง</li>
          </ul>
        </div>

        <div>
          <h2 className="font-black text-base mb-1">4. สิทธิ์ของคุณ (PDPA / GDPR)</h2>
          <p>
            เนื่องจากข้อมูลอยู่บนเครื่องคุณ คุณควบคุมได้เต็มที่ — ส่งออกสำเนา หรือลบทั้งหมดได้ทันที
            ด้วยปุ่มด้านล่าง
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border/60 p-4">
        <h2 className="font-black text-base mb-2">ศูนย์จัดการข้อมูลของฉัน</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onExport}
            className="h-9 px-4 rounded-xl border border-border text-[13px] font-bold"
          >
            ส่งออกข้อมูลของฉัน (.json)
          </button>
          <button
            onClick={onDelete}
            className="h-9 px-4 rounded-xl bg-red-600 text-white text-[13px] font-bold"
          >
            ลบข้อมูลของฉันทั้งหมด
          </button>
        </div>
        {msg && <p className="mt-3 text-[12px] font-bold text-primary">{msg}</p>}
      </section>

      <p className="mt-6 text-[12px] text-muted-foreground">
        มีคำถามด้านความเป็นส่วนตัว ติดต่อผู้ดูแลแอปได้ที่อีเมลที่ระบุในหน้าโปรเจกต์
      </p>
    </main>
  );
}
