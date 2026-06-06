// ปรับระยะวิ่ง EPA ให้สมจริงขึ้นด้วย "อุณหภูมิเฉลี่ย" และ "ความเร็วเฉลี่ย"
// เป็นโมเดลประมาณการ (heuristic) — แม่นกว่า EPA เปล่า ๆ แต่ไม่ใช่ฟิสิกส์เป๊ะ

// interpolate เชิงเส้นจากตาราง (clamp ที่ขอบ)
function lerpTable(x: number, pts: [number, number][]): number {
  if (x <= pts[0][0]) return pts[0][1];
  const last = pts[pts.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (x >= x0 && x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  return 1;
}

// ตัวคูณตามความเร็วเฉลี่ย (อ้างอิง 90 กม./ชม. = 1.0) — ยิ่งเร็ว ลมต้านมาก กินไฟขึ้น
const SPEED_PTS: [number, number][] = [
  [50, 1.08], [70, 1.05], [90, 1.0], [100, 0.95], [110, 0.89], [120, 0.83], [130, 0.78],
];
export function speedRangeFactor(avgKmh: number): number {
  if (!isFinite(avgKmh) || avgKmh <= 0) return 1;
  return lerpTable(avgKmh, SPEED_PTS);
}

// ตัวคูณตามอุณหภูมิเฉลี่ย (เหมาะสุด ~20°C = 1.0) — ร้อนเปิดแอร์/หนาวอุ่นแบต ลดระยะ
const TEMP_PTS: [number, number][] = [
  [-10, 0.6], [0, 0.72], [10, 0.86], [20, 1.0], [23, 1.0], [30, 0.95], [35, 0.91], [40, 0.87], [45, 0.83],
];
export function tempRangeFactor(celsius: number): number {
  if (!isFinite(celsius)) return 1;
  return lerpTable(celsius, TEMP_PTS);
}

// ดึงอุณหภูมิปัจจุบันจาก Open-Meteo (ฟรี ไม่ต้องมี API key)
export async function fetchTemperature(lat: number, lng: number): Promise<number | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&current=temperature_2m`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = await res.json();
    const t = j?.current?.temperature_2m;
    return typeof t === 'number' ? t : null;
  } catch {
    return null;
  }
}
