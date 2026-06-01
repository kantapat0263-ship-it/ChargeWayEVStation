// จัดการทริปที่บันทึกไว้ใน localStorage
import type { RangeStandard, TariffMode } from './constants';

export interface SavedTrip {
  id: string;
  name: string;
  createdAt: number;
  origin: string;
  destination: string;
  vehicleId: string;
  fullRange: number;
  rangeStandard: RangeStandard;
  minBatteryThreshold: number;
  targetCharge: number;
  searchRadius: number;
  pricingNetworkId: string;
  tariffMode: TariffMode;
  selectedNetworks: string[];
}

const STORAGE_KEY = 'chargeway_saved_trips';

export function loadTrips(): SavedTrip[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(trips: SavedTrip[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  } catch {
    /* storage เต็มหรือถูกปิด — ข้ามไป */
  }
}

// บันทึกทริปใหม่ (คืนรายการล่าสุด) — เก็บไว้สูงสุด 20 รายการ
export function saveTrip(trip: Omit<SavedTrip, 'id' | 'createdAt'>): SavedTrip[] {
  const trips = loadTrips();
  const entry: SavedTrip = {
    ...trip,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  const next = [entry, ...trips].slice(0, 20);
  persist(next);
  return next;
}

export function deleteTrip(id: string): SavedTrip[] {
  const next = loadTrips().filter(t => t.id !== id);
  persist(next);
  return next;
}
