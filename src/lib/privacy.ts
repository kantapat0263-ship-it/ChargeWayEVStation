// ===== ศูนย์รวมการจัดการข้อมูลส่วนบุคคล (PDPA/GDPR) =====
// แอปนี้เก็บข้อมูลทั้งหมดไว้บนเครื่องผู้ใช้ (localStorage) ไม่ส่งขึ้นเซิร์ฟเวอร์ของเรา
// ไฟล์นี้รวบรวม "รายการ key ทั้งหมด" ไว้ที่เดียว เพื่อให้สิทธิ์ลบข้อมูล/ส่งออกข้อมูลทำได้ครบ

// รายการ key ของข้อมูลผู้ใช้ทั้งหมดในแอป (ต้องอัปเดตเมื่อเพิ่มที่เก็บใหม่)
export const STORAGE_KEYS = [
  'chargeway_theme',          // การตั้งค่าธีมสว่าง/มืด
  'chargeway_recent_places',  // ปลายทางที่ค้นหาล่าสุด
  'chargeway_fav_places',     // รายการโปรด (บ้าน/ที่ทำงาน)
  'chargeway_saved_trips',    // ทริปที่บันทึกไว้
] as const;

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
  for (const key of STORAGE_KEYS) {
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
  for (const key of STORAGE_KEYS) {
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
