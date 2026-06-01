export const ATTO3_RANGE_KM = 410; // WLTP range mix
export const SAFETY_MARGIN_PERCENT = 15; // 15% battery safety margin

// ===== EV Vehicle Presets =====
export interface VehicleModel {
  id: string;
  name: string;
  rangeKm: number;    // ระยะวิ่งสูงสุดที่แบต 100% (โดยประมาณ)
  batteryKwh: number; // ความจุแบตเตอรี่ใช้งานจริง (kWh)
  maxDcKw: number;    // กำลังชาร์จ DC เฉลี่ยที่ใช้คำนวณ (kW)
}

export const VEHICLE_MODELS: VehicleModel[] = [
  { id: 'atto3',   name: 'BYD ATTO 3',        rangeKm: 410, batteryKwh: 60,   maxDcKw: 80 },
  { id: 'dolphin', name: 'BYD Dolphin',       rangeKm: 410, batteryKwh: 44.9, maxDcKw: 80 },
  { id: 'seal',    name: 'BYD Seal',          rangeKm: 510, batteryKwh: 82.5, maxDcKw: 110 },
  { id: 'm3',      name: 'Tesla Model 3 RWD', rangeKm: 513, batteryKwh: 60,   maxDcKw: 120 },
  { id: 'my',      name: 'Tesla Model Y RWD', rangeKm: 455, batteryKwh: 60,   maxDcKw: 120 },
  { id: 'goodcat', name: 'ORA Good Cat',      rangeKm: 400, batteryKwh: 47.8, maxDcKw: 60 },
  { id: 'netav',   name: 'NETA V',            rangeKm: 384, batteryKwh: 38.5, maxDcKw: 55 },
  { id: 'mg4',     name: 'MG4 Electric',      rangeKm: 425, batteryKwh: 51,   maxDcKw: 100 },
  { id: 'custom',  name: 'กำหนดเอง (Custom)',  rangeKm: 410, batteryKwh: 60,   maxDcKw: 60 },
];

// ค่าไฟชาร์จ DC โดยเฉลี่ยในไทย (บาท/kWh) และเป้าหมายชาร์จกลับต่อครั้ง (%)
export const DEFAULT_PRICE_PER_KWH = 7.5;
export const DEFAULT_TARGET_CHARGE = 80;

export interface ChargingNetwork {
  id: string;
  name: string;
  color: string;
  queries: string[]; // รายการคีย์เวิร์ดที่ใช้ค้นหาจริง
  brandMatch: string[]; // คำสำคัญที่ใช้กรองยืนยันแบรนด์
}

export const CHARGING_NETWORKS: ChargingNetwork[] = [
  { 
    id: 'ptt', 
    name: 'PTT EV STATION', 
    color: '#004A99', 
    queries: ['PTT EV Station', 'PTT Charging Station', 'ปตท EV', 'PTT EV', 'EV Station Pluz'],
    brandMatch: ['ptt', 'ปตท', 'pluz'] 
  },
  { 
    id: 'pea', 
    name: 'PEA VOLTA', 
    color: '#7B2CBF', 
    queries: ['PEA VOLTA', 'PEA Volta', 'โวลต้า', 'VOLTA charging'],
    brandMatch: ['pea', 'volta', 'โวลต้า'] 
  },
  { 
    id: 'elexa', 
    name: 'ELEXA', 
    color: '#00BFA5', 
    queries: ['ELEXA', 'EleXA', 'EleX by EGAT', 'EGAT EV'],
    brandMatch: ['elexa', 'egat', 'elex'] 
  },
  { 
    id: 'spark', 
    name: 'SPARK EV', 
    color: '#E31937', 
    queries: ['SPARK EV', 'Spark Charging'],
    brandMatch: ['spark'] 
  },
];

export const DEFAULT_SEARCH_KEYWORDS = [
  'EV Charging Station',
  'EV Charger',
  'สถานีชาร์จ',
  'charging station'
];
