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
  // ===== BYD =====
  { id: 'atto3',    name: 'BYD ATTO 3 (Standard)', rangeKm: 410, standard: 'NEDC', batteryKwh: 49.9, maxDcKw: 80 },
  { id: 'atto3ext', name: 'BYD ATTO 3 Extended',   rangeKm: 480, standard: 'NEDC', batteryKwh: 60.5, maxDcKw: 88 },
  { id: 'dolphin',  name: 'BYD Dolphin',           rangeKm: 410, standard: 'NEDC', batteryKwh: 44.9, maxDcKw: 60 },
  { id: 'seal',     name: 'BYD Seal Extended',     rangeKm: 650, standard: 'NEDC', batteryKwh: 82.5, maxDcKw: 150 },
  { id: 'sealion7', name: 'BYD Sealion 7',         rangeKm: 567, standard: 'CLTC', batteryKwh: 82.5, maxDcKw: 150 },
  // ===== Tesla =====
  { id: 'm3',       name: 'Tesla Model 3 RWD',     rangeKm: 513, standard: 'WLTP', batteryKwh: 60,   maxDcKw: 170 },
  { id: 'my',       name: 'Tesla Model Y RWD',     rangeKm: 455, standard: 'WLTP', batteryKwh: 60,   maxDcKw: 175 },
  // ===== MG =====
  { id: 'mg4',      name: 'MG4 Electric',          rangeKm: 425, standard: 'WLTP', batteryKwh: 51,   maxDcKw: 117 },
  { id: 'mgs5',     name: 'MG S5 EV (64kWh)',      rangeKm: 480, standard: 'CLTC', batteryKwh: 64,   maxDcKw: 140 },
  { id: 'mgep',     name: 'MG EP (Wagon)',         rangeKm: 380, standard: 'NEDC', batteryKwh: 50.3, maxDcKw: 76 },
  // ===== GAC AION =====
  { id: 'aionyplus',name: 'GAC AION Y Plus',       rangeKm: 490, standard: 'NEDC', batteryKwh: 63.2, maxDcKw: 90 },
  { id: 'aionv',    name: 'GAC AION V',            rangeKm: 600, standard: 'CLTC', batteryKwh: 75,   maxDcKw: 180 },
  // ===== Deepal =====
  { id: 'deepals07',name: 'Deepal S07 EV',         rangeKm: 530, standard: 'CLTC', batteryKwh: 79.97,maxDcKw: 92 },
  { id: 'deepals05',name: 'Deepal S05 EV',         rangeKm: 515, standard: 'CLTC', batteryKwh: 56,   maxDcKw: 92 },
  // ===== JAECOO =====
  { id: 'jaecoo6',  name: 'JAECOO 6 EV',           rangeKm: 501, standard: 'CLTC', batteryKwh: 60,   maxDcKw: 80 },
  // ===== XPENG =====
  { id: 'xpengg6',  name: 'XPENG G6 (Long Range)', rangeKm: 755, standard: 'CLTC', batteryKwh: 87.5, maxDcKw: 215 },
  // ===== Zeekr =====
  { id: 'zeekrx',   name: 'Zeekr X',               rangeKm: 560, standard: 'CLTC', batteryKwh: 66,   maxDcKw: 150 },
  { id: 'zeekr7x',  name: 'Zeekr 7X',              rangeKm: 615, standard: 'CLTC', batteryKwh: 75,   maxDcKw: 360 },
  // ===== GWM / ORA & NETA =====
  { id: 'goodcat',  name: 'ORA Good Cat (Tech)',   rangeKm: 401, standard: 'NEDC', batteryKwh: 47.8, maxDcKw: 64 },
  { id: 'netav',    name: 'NETA V',                rangeKm: 384, standard: 'NEDC', batteryKwh: 38.5, maxDcKw: 55 },
  // ===== Volvo =====
  { id: 'volvoex30',name: 'Volvo EX30',            rangeKm: 476, standard: 'WLTP', batteryKwh: 64,   maxDcKw: 153 },
  { id: 'volvoex40',name: 'Volvo EX40',            rangeKm: 460, standard: 'WLTP', batteryKwh: 78,   maxDcKw: 200 },
  // ===== BMW =====
  { id: 'bmwix1',   name: 'BMW iX1 eDrive20',      rangeKm: 440, standard: 'WLTP', batteryKwh: 64.7, maxDcKw: 130 },
  { id: 'bmwi4',    name: 'BMW i4 eDrive40',       rangeKm: 590, standard: 'WLTP', batteryKwh: 83.9, maxDcKw: 205 },
  // ===== ญี่ปุ่น =====
  { id: 'hondaen1', name: 'Honda e:N1',            rangeKm: 412, standard: 'WLTP', batteryKwh: 68.8, maxDcKw: 78 },
  { id: 'bz4x',     name: 'Toyota bZ4X',           rangeKm: 411, standard: 'WLTP', batteryKwh: 71.4, maxDcKw: 150 },
  { id: 'leaf',     name: 'Nissan Leaf e+',        rangeKm: 385, standard: 'WLTP', batteryKwh: 59,   maxDcKw: 50 },
  // ===== กำหนดเอง =====
  { id: 'custom',   name: 'กำหนดเอง (Custom)',      rangeKm: 410, standard: 'NEDC', batteryKwh: 60,   maxDcKw: 60 },
];

// ค่าไฟชาร์จ DC โดยเฉลี่ยในไทย (บาท/kWh) และเป้าหมายชาร์จกลับต่อครั้ง (%)
export const DEFAULT_PRICE_PER_KWH = 7.5;
export const DEFAULT_TARGET_CHARGE = 80;

// ===== Charging Tariffs (Peak / Off-peak) =====
// ราคา DC โดยประมาณต่อเครือข่าย (อาจเปลี่ยนแปลง ควรตรวจสอบกับแอปของแต่ละค่าย)
// ⚠️ ทุกครั้งที่อัปเดตตัวเลขราคา ให้อัปเดต TARIFF_REFERENCE ด้วย — ค่านี้แสดงบน UI
export const TARIFF_REFERENCE = 'ปี 2025';
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
  appUrl?: string; // ลิงก์เปิดแอป/หน้าดาวน์โหลดของเครือข่าย (fallback ไป Store)
  androidPackage?: string; // ชื่อแพ็กเกจแอป Android ไว้เปิดแอปตรง ๆ ถ้าติดตั้งแล้ว
}

export const CHARGING_NETWORKS: ChargingNetwork[] = [
  {
    id: 'ptt',
    name: 'PTT EV STATION',
    short: 'PTT',
    color: '#004A99',
    queries: ['PTT EV Station', 'PTT Charging Station', 'ปตท EV', 'PTT EV', 'EV Station Pluz'],
    brandMatch: ['ptt', 'ปตท', 'pluz'],
    appUrl: 'https://play.google.com/store/apps/details?id=com.pttor.evstationpluz',
    androidPackage: 'com.pttor.evstationpluz',
  },
  {
    id: 'pea',
    name: 'PEA VOLTA',
    short: 'PEA',
    color: '#7B2CBF',
    queries: ['PEA VOLTA', 'PEA Volta', 'โวลต้า', 'VOLTA charging'],
    brandMatch: ['pea', 'volta', 'โวลต้า'],
    appUrl: 'https://play.google.com/store/apps/details?id=com.pea.peavolta',
    androidPackage: 'com.pea.peavolta',
  },
  {
    id: 'elexa',
    name: 'ELEXA',
    short: 'EleX',
    color: '#00BFA5',
    queries: ['ELEXA', 'EleXA', 'EleX by EGAT', 'EGAT EV'],
    brandMatch: ['elexa', 'egat', 'elex'],
    appUrl: 'https://play.google.com/store/apps/details?id=egat.smd.ev',
    androidPackage: 'egat.smd.ev',
  },
  {
    id: 'spark',
    name: 'SPARK EV',
    short: 'SPARK',
    color: '#E31937',
    queries: ['SPARK EV', 'Spark Charging'],
    brandMatch: ['spark'],
    appUrl: 'https://play.google.com/store/apps/details?id=hk.com.cstl.evcs.intl.spark',
    androidPackage: 'hk.com.cstl.evcs.intl.spark',
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
