// จำ "ทริปล่าสุดที่วางแผนไว้" (ต้นทาง/ปลายทาง) เพื่อกู้คืนอัตโนมัติเมื่อเปิด/รีโหลดหน้า
// คู่กับ prefs.ts (ที่จำ 'การตั้งค่า') — ทำให้แผนไม่หายเวลามือถือรีโหลดกลางทาง
// (เก็บเฉพาะทริปที่ผู้ใช้ "กดคำนวณ" จริง ไม่ใช่ที่พิมพ์ค้างไว้)

export interface LastTrip {
  origin: string;
  destination: string;
}

const KEY = 'chargeway_last_trip';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 ชม. — เก่ากว่านี้ไม่ auto-restore

export function saveLastTrip(trip: LastTrip): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...trip, ts: Date.now() }));
  } catch {
    /* storage เต็ม/ปิด — ข้ามไป */
  }
}

export function loadLastTrip(now: number = Date.now()): LastTrip | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || !p.origin || !p.destination || typeof p.ts !== 'number') return null;
    if (now - p.ts > TTL_MS) return null;
    return { origin: p.origin, destination: p.destination };
  } catch {
    return null;
  }
}

export function clearLastTrip(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
