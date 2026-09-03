// ===== ศูนย์รวมการจัดการข้อมูลส่วนบุคคล (PDPA/GDPR) =====
// แอปนี้เก็บข้อมูลทั้งหมดไว้บนเครื่องผู้ใช้ (localStorage) ไม่ส่งขึ้นเซิร์ฟเวอร์ของเรา
// ไฟล์นี้รวบรวม "รายการ key ทั้งหมด" ไว้ที่เดียว เพื่อให้สิทธิ์ลบข้อมูล/ส่งออกข้อมูลทำได้ครบ

// รายการ key ของข้อมูลผู้ใช้ทั้งหมดในแอป (ต้องอัปเดตเมื่อเพิ่มที่เก็บใหม่)
export const STORAGE_KEYS = [
  'chargeway_theme',          // การตั้งค่าธีมสว่าง/มืด
  'chargeway_recent_places',  // ปลายทางที่ค้นหาล่าสุด
  'chargeway_fav_places',     // รายการโปรด (บ้าน/ที่ทำงาน)
  'chargeway_saved_trips',    // ทริปที่บันทึกไว้
  'chargeway_prefs',          // การตั้งค่ารถ/พลังงาน/ราคา/เครือข่าย (prefs.ts)
  'chargeway_last_trip',      // ทริปล่าสุดที่กดคำนวณ — ต้นทาง/ปลายทาง (last-trip.ts)
] as const;

// key ที่ตั้งชื่อแบบ prefix (มีหลาย key ต่อประเภท) — แคชผลค้นหาสถานีตามพิกัดจุดแวะ (station-cache.ts)
export const STORAGE_KEY_PREFIXES = [
  'chargeway_stations_',
] as const;

// prefix กลางของทุก key ที่แอปนี้เขียนลง localStorage — ใช้เป็นตาข่ายสุดท้ายตอน "ลบข้อมูลทั้งหมด"
// เพื่อให้สิทธิ์ลบ (PDPA/GDPR) ยังครบแม้มีคนเพิ่มที่เก็บใหม่แล้วลืมอัปเดตรายการด้านบน
const APP_KEY_PREFIX = 'chargeway_';

// รวบรวมชื่อ key ทั้งหมดที่เป็นข้อมูลผู้ใช้ซึ่งมีอยู่จริงใน localStorage ตอนนี้
function collectUserDataKeys(): string[] {
  const keys = new Set<string>();
  for (const k of STORAGE_KEYS) keys.add(k);
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && STORAGE_KEY_PREFIXES.some(p => k.startsWith(p))) keys.add(k);
    }
  } catch {
    /* storage ถูกปิด — ใช้เฉพาะรายการคงที่ */
  }
  return Array.from(keys);
}

export const CONSENT_KEY = 'chargeway_privacy_consent';
export const CONSENT_VERSION = '1'; // เพิ่มเลขนี้เมื่อแก้นโยบาย เพื่อขอ consent ใหม่

// ผู้ใช้เคยให้ความยินยอม (เวอร์ชันปัจจุบัน) แล้วหรือยัง
export function hasConsent(): boolean {
  if (typeof window === 'undefined') return true; // กัน SSR เด้ง
  try {
    return window.localStorage.getItem(CONSENT_KEY) === CONSENT_VERSION;
  } catch {
    return true;
  }
}

// บันทึกความยินยอม
export function setConsent(): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, CONSENT_VERSION);
  } catch {
    /* โหมดส่วนตัว/บล็อก storage — ข้ามไป */
  }
}

// ส่งออกข้อมูลทั้งหมดของผู้ใช้ (สิทธิ์เข้าถึง/พกพาข้อมูลตาม PDPA/GDPR)
export function exportMyData(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof window === 'undefined') return out;
  for (const key of collectUserDataKeys()) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) continue;
      try {
        out[key] = JSON.parse(raw);
      } catch {
        out[key] = raw;
      }
    } catch {
      /* ข้าม key ที่อ่านไม่ได้ */
    }
  }
  return out;
}

// ลบข้อมูลส่วนบุคคลทั้งหมดออกจากเครื่อง (สิทธิ์ในการลบ/ถูกลืม)
// คืนค่า: จำนวน key ที่ถูกลบจริง
export function clearMyData(): number {
  if (typeof window === 'undefined') return 0;
  let removed = 0;
  const targets = new Set<string>(collectUserDataKeys());
  // ตาข่ายสุดท้าย: กวาดทุก key ที่ขึ้นต้นด้วย chargeway_ (รวม consent ด้วย — ลบแล้วถือว่าเริ่มใหม่ทั้งหมด)
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(APP_KEY_PREFIX)) targets.add(k);
    }
  } catch {
    /* ข้าม */
  }
  for (const key of targets) {
    try {
      if (window.localStorage.getItem(key) != null) {
        window.localStorage.removeItem(key);
        removed++;
      }
    } catch {
      /* ข้าม */
    }
  }
  return removed;
}
