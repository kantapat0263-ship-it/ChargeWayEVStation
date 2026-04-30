export const ATTO3_RANGE_KM = 410; // WLTP range mix
export const SAFETY_MARGIN_PERCENT = 15; // 15% battery safety margin

export interface ChargingNetwork {
  id: string;
  name: string;
  color: string;
  query: string;
  brandMatch: string; // คำสั้นๆ ที่ใช้ยืนยันแบรนด์ในการ Filter
}

export const CHARGING_NETWORKS: ChargingNetwork[] = [
  { id: 'ptt', name: 'PTT EV STATION', color: '#004A99', query: 'PTT EV ปตท EV EV Station Pluz', brandMatch: 'ptt' },
  { id: 'pea', name: 'PEA VOLTA', color: '#7B2CBF', query: 'PEA VOLTA VOLTA', brandMatch: 'volta' },
  { id: 'elexa', name: 'ELEXA', color: '#00BFA5', query: 'Elexa EGAT EV', brandMatch: 'elexa' },
  { id: 'spark', name: 'SPARK EV', color: '#E31937', query: 'Spark EV Charging', brandMatch: 'spark' },
];
