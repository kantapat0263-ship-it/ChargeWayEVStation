export const ATTO3_RANGE_KM = 410; // WLTP range mix
export const SAFETY_MARGIN_PERCENT = 15; // 15% battery safety margin

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
