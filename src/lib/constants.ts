export const ATTO3_RANGE_KM = 410; // WLTP range mix
export const SAFETY_MARGIN_PERCENT = 15; // 15% battery safety margin

export interface ChargingNetwork {
  id: string;
  name: string;
  color: string;
  query: string;
}

export const CHARGING_NETWORKS: ChargingNetwork[] = [
  { id: 'ptt', name: 'PTT EV STATION', color: '#004A99', query: 'PTT EV Station Pluz' },
  { id: 'pea', name: 'PEA VOLTA', color: '#7B2CBF', query: 'PEA Volta' },
  { id: 'elexa', name: 'ELEXA', color: '#00BFA5', query: 'Elexa' },
  { id: 'spark', name: 'SPARK EV', color: '#E31937', query: 'Spark EV' },
];