// แคชผลค้นหาสถานีชาร์จ (Places Nearby Search) ไว้ใน localStorage
// คีย์ = พิกัดจุดแวะ (ปัด ~100 ม.) + รัศมีค้นหา
// เหตุผล: การวางแผน "เส้นทางเดิม" ซ้ำ (เช่น หลังมือถือรีโหลดหน้าจอกลางทางแล้วกดคำนวณใหม่)
//   จะยิง Nearby Search 1 ครั้งต่อจุดแวะทุกครั้ง — เส้นทางไกลมีหลายจุดแวะ = ค่า API พุ่ง
//   แคชนี้ทำให้รอบถัด ๆ ไปดึงจาก localStorage แทน (แทบไม่ยิง API) — TTL กันข้อมูลค้างข้ามวัน

export interface CachedStation {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  rating?: number;
  user_ratings_total?: number;
  vicinity?: string;
}

interface CacheEntry {
  ts: number;
  stations: CachedStation[];
}

const PREFIX = 'chargeway_stations_';
export const STATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 ชม.

function getStore(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // SSR / โหมดที่ปิด storage
  }
}

// ปัดพิกัด 3 ตำแหน่ง (≈100 ม.) เพื่อให้จุดแวะเดิมของเส้นทางเดิม hit คีย์เดียวกัน
export function stationCacheKey(lat: number, lng: number, radiusKm: number): string {
  return `${PREFIX}${lat.toFixed(3)},${lng.toFixed(3)},${radiusKm}`;
}

export function readStationCache(
  lat: number,
  lng: number,
  radiusKm: number,
  now: number = Date.now(),
): CachedStation[] | null {
  const store = getStore();
  if (!store) return null;
  try {
    const raw = store.getItem(stationCacheKey(lat, lng, radiusKm));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (!entry || typeof entry.ts !== 'number' || !Array.isArray(entry.stations)) return null;
    if (now - entry.ts > STATION_CACHE_TTL_MS) return null; // เก่าเกิน → ถือเป็น miss
    return entry.stations;
  } catch {
    return null;
  }
}

export function writeStationCache(
  lat: number,
  lng: number,
  radiusKm: number,
  stations: CachedStation[],
  now: number = Date.now(),
): void {
  const store = getStore();
  if (!store) return;
  try {
    const entry: CacheEntry = { ts: now, stations };
    store.setItem(stationCacheKey(lat, lng, radiusKm), JSON.stringify(entry));
  } catch {
    /* localStorage เต็ม/ถูกปิด — ข้ามไป ไม่ให้กระทบการวางแผน */
  }
}

// ล้างแคชสถานีทั้งหมด (ใช้ตอนผู้ใช้กด "รีเฟรชสถานี") — คืนจำนวนคีย์ที่ลบ
export function clearStationCache(): number {
  const store = getStore();
  if (!store) return 0;
  let removed = 0;
  try {
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => {
      store.removeItem(k);
      removed++;
    });
  } catch {
    /* ignore */
  }
  return removed;
}
