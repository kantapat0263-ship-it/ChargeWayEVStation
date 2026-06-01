export const ATTO3_RANGE_KM = 410; // WLTP range mix
export const SAFETY_MARGIN_PERCENT = 15; // 15% battery safety margin

// ===== EV Range Standards =====
// แต่ละมาตรฐานวัดระยะวิ่งต่างกัน NEDC จะมองโลกสวยสุด ส่วน EPA ใกล้เคียงการขับจริงสุด
export type RangeStandard = 'NEDC' | 'WLTP' | 'EPA' | 'CLTC';

// ตัวคูณแปลงค่าที่ผู้ผลิตเคลม -> ระยะวิ่งจริง (EPA)
// อ้างอิงสูตรเดียวกับ ev-range-converter (NEDC 480 -> WLTP 408 -> EPA 349.3)
export const RANGE_STANDARD_TO_EPA: Record<RangeStandard, number> = {
  EPA: 1,
  WLTP: 0.856,
  NEDC: 0.7277,
  CLTC: 0.70,
};

export const RANGE_STANDARDS: RangeStandard[] = ['NEDC', 'WLTP', 'EPA', 'CLTC'];

// แปลงระยะวิ่งจากมาตรฐานใด ๆ เป็นระยะวิ่งจริงแบบ EPA
export function toEpaRange(range: number, standard: RangeStandard): number {
  return Math.round(range * (RANGE_STANDARD_TO_EPA[standard] ?? 1));
}

// ===== EV Vehicle Presets =====
export interface VehicleModel {
  id: string;
  name: string;
  rangeKm: number;          // ระยะที่ผู้ผลิตเคลม (ตามมาตรฐานด้านล่าง)
  standard: RangeStandard;  // มาตรฐานของค่าที่เคลม
  batteryKwh: number;       // ความจุแบตเตอรี่ใช้งานจริง (kWh)
  maxDcKw: number;          // กำลังชาร์จ DC โดยประมาณที่ใช้คำนวณ (kW)
}

export const VEHICLE_MODELS: VehicleModel[] = [
  { id: 'atto3',    name: 'BYD ATTO 3 (Standard)', rangeKm: 410, standard: 'NEDC', batteryKwh: 49.9, maxDcKw: 80 },
  { id: 'atto3ext', name: 'BYD ATTO 3 Extended',   rangeKm: 480, standard: 'NEDC', batteryKwh: 60.5, maxDcKw: 88 },
  { id: 'dolphin',  name: 'BYD Dolphin',           rangeKm: 410, standard: 'NEDC', batteryKwh: 44.9, maxDcKw: 60 },
  { id: 'seal',     name: 'BYD Seal Extended',     rangeKm: 650, standard: 'NEDC', batteryKwh: 82.5, maxDcKw: 150 },
  { id: 'm3',       name: 'Tesla Model 3 RWD',     rangeKm: 513, standard: 'WLTP', batteryKwh: 60,   maxDcKw: 170 },
  { id: 'my',       name: 'Tesla Model Y RWD',     rangeKm: 455, standard: 'WLTP', batteryKwh: 60,   maxDcKw: 170 },
  { id: 'goodcat',  name: 'ORA Good Cat (Tech)',   rangeKm: 401, standard: 'NEDC', batteryKwh: 47.8, maxDcKw: 64 },
  { id: 'netav',    name: 'NETA V',                rangeKm: 384, standard: 'NEDC', batteryKwh: 38.5, maxDcKw: 55 },
  { id: 'mg4',      name: 'MG4 Electric',          rangeKm: 425, standard: 'WLTP', batteryKwh: 51,   maxDcKw: 117 },
  { id: 'custom',   name: 'กำหนดเอง (Custom)',      rangeKm: 410, standard: 'NEDC', batteryKwh: 60,   maxDcKw: 60 },
];

// ค่าไฟชาร์จ DC โดยเฉลี่ยในไทย (บาท/kWh) และเป้าหมายชาร์จกลับต่อครั้ง (%)
export const DEFAULT_PRICE_PER_KWH = 7.5;
export const DEFAULT_TARGET_CHARGE = 80;

// ===== Charging Tariffs (Peak / Off-peak) =====
// ราคา DC โดยประมาณต่อเครือข่าย (อ้างอิงข้อมูลปี 2025 — อาจเปลี่ยนแปลง ควรตรวจสอบกับแอปของแต่ละค่าย)
export interface NetworkTariff {
  peak: number;    // บาท/kWh ช่วง Peak
  offPeak: number; // บาท/kWh ช่วง Off-peak
  note?: string;
}

export const NETWORK_TARIFFS: Record<string, NetworkTariff> = {
  ptt:   { peak: 7.5, offPeak: 5.5, note: 'EV Station PluZ' },
  pea:   { peak: 7.5, offPeak: 5.8, note: 'อ้างอิงหัวชาร์จ 120kW' },
  elexa: { peak: 7.5, offPeak: 6.5, note: 'EGAT 6.5 / ในปั๊ม PT 7.5' },
  spark: { peak: 5.9, offPeak: 5.9, note: 'ราคาเดียวทุกช่วงเวลา' },
};

export type TariffMode = 'auto' | 'peak' | 'offpeak';

// Peak: จันทร์-ศุกร์ 09:00-22:00 / นอกนั้นเป็น Off-peak (รวมเสาร์-อาทิตย์ทั้งวัน)
export function isPeakTime(d: Date = new Date()): boolean {
  const day = d.getDay(); // 0 = อาทิตย์, 6 = เสาร์
  if (day === 0 || day === 6) return false;
  const h = d.getHours();
  return h >= 9 && h < 22;
}

// คืนค่าราคา บาท/kWh ตามโหมดและเวลาที่กำหนด
export function getTariffRate(networkId: string, mode: TariffMode, at: Date = new Date()): number {
  const t = NETWORK_TARIFFS[networkId] ?? { peak: DEFAULT_PRICE_PER_KWH, offPeak: DEFAULT_PRICE_PER_KWH };
  if (mode === 'peak') return t.peak;
  if (mode === 'offpeak') return t.offPeak;
  return isPeakTime(at) ? t.peak : t.offPeak; // auto
}

export interface ChargingNetwork {
  id: string;
  name: string;
  short: string; // ตัวย่อแบรนด์ที่แสดงบนหมุด
  color: string;
  queries: string[]; // รายการคีย์เวิร์ดที่ใช้ค้นหาจริง
  brandMatch: string[]; // คำสำคัญที่ใช้กรองยืนยันแบรนด์
}

export const CHARGING_NETWORKS: ChargingNetwork[] = [
  {
    id: 'ptt',
    name: 'PTT EV STATION',
    short: 'PTT',
    color: '#004A99',
    queries: ['PTT EV Station', 'PTT Charging Station', 'ปตท EV', 'PTT EV', 'EV Station Pluz'],
    brandMatch: ['ptt', 'ปตท', 'pluz']
  },
  {
    id: 'pea',
    name: 'PEA VOLTA',
    short: 'PEA',
    color: '#7B2CBF',
    queries: ['PEA VOLTA', 'PEA Volta', 'โวลต้า', 'VOLTA charging'],
    brandMatch: ['pea', 'volta', 'โวลต้า']
  },
  {
    id: 'elexa',
    name: 'ELEXA',
    short: 'EleX',
    color: '#00BFA5',
    queries: ['ELEXA', 'EleXA', 'EleX by EGAT', 'EGAT EV'],
    brandMatch: ['elexa', 'egat', 'elex']
  },
  {
    id: 'spark',
    name: 'SPARK EV',
    short: 'SPARK',
    color: '#E31937',
    queries: ['SPARK EV', 'Spark Charging'],
    brandMatch: ['spark']
  },
];

// เครือข่ายอื่น ๆ ที่ไม่รู้จัก ใช้สีกลางและไอคอนทั่วไป
export const UNKNOWN_NETWORK = {
  id: 'other',
  name: 'สถานีชาร์จอื่น ๆ',
  short: 'EV',
  color: '#1F8C8C',
} as const;

// จับคู่ชื่อสถานี (จาก Google Places) กับเครือข่ายที่รู้จัก
export function matchStationNetwork(name?: string): ChargingNetwork | null {
  if (!name) return null;
  const n = name.toLowerCase();
  return CHARGING_NETWORKS.find(net => net.brandMatch.some(m => n.includes(m.toLowerCase()))) ?? null;
}

export const DEFAULT_SEARCH_KEYWORDS = [
  'EV Charging Station',
  'EV Charger',
  'สถานีชาร์จ',
  'charging station'
];
