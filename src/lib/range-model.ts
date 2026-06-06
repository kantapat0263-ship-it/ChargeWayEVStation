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

// ===== กราฟชาร์จ (Charging Curve / Taper) =====
// เส้นโค้งมาตรฐาน: สัดส่วนของกำลังชาร์จสูงสุด เทียบกับ %แบต (SoC)
// แรงตอนแบตน้อย แล้วค่อย ๆ ลดลง โดยเฉพาะหลัง 80% (BMS หรี่ไฟกันแบตเสื่อม)
const CHARGE_CURVE: [number, number][] = [
  [0, 0.85], [10, 1.0], [20, 1.0], [30, 0.95], [40, 0.85], [50, 0.72],
  [60, 0.60], [70, 0.48], [80, 0.38], [90, 0.25], [100, 0.15],
];

// ประมาณกำลังชาร์จเฉลี่ยที่ SoC หนึ่ง ๆ (สัดส่วนของ kW สูงสุด)
export function chargePowerFraction(soc: number): number {
  return lerpTable(soc, CHARGE_CURVE);
}

// เวลาชาร์จ (นาที) จาก fromSoc -> toSoc โดยรวมผลของกราฟชาร์จที่ค่อย ๆ ช้าลง
// คำนวณทีละช่วง SoC แล้วบวกเวลารวมกัน (integrate)
export function chargeMinutes(batteryKwh: number, maxDcKw: number, fromSoc: number, toSoc: number): number {
  if (maxDcKw <= 0 || batteryKwh <= 0 || toSoc <= fromSoc) return 0;
  const step = 1; // เดินทีละ 1% SoC
  let minutes = 0;
  for (let soc = fromSoc; soc < toSoc; soc += step) {
    const frac = chargePowerFraction(soc + step / 2);
    const power = Math.max(maxDcKw * frac, 1);   // kW จริงในช่วงนี้
    const energy = batteryKwh * (step / 100);     // kWh ที่เติมในช่วงนี้
    minutes += (energy / power) * 60;
  }
  return minutes;
}

