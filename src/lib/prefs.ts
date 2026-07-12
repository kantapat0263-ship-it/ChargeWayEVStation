// จำ "การตั้งค่า" ที่ผู้ใช้ตั้งไว้ (รถ + ค่าพลังงาน/ราคา/เครือข่าย) ใน localStorage
// เพื่อไม่ต้องเลือกใหม่ทุกครั้ง — ไม่รวมต้นทาง/ปลายทาง (นั่นเป็นของ "บันทึกทริป")
import type { RangeStandard, TariffMode } from './constants';

export interface Prefs {
  vehicleId: string;
  fullRange: number;
  rangeStandard: RangeStandard;
  minBatteryThreshold: number;
  startSoc: number;
  targetCharge: number;
  searchRadius: number;
  pricingNetworkId: string;
  tariffMode: TariffMode;
  selectedNetworks: string[];
  tempMode: 'auto' | 'manual';
  manualTemp: number;
  roundTrip: boolean;
}

const PREFS_KEY = 'chargeway_prefs';

export function loadPrefs(): Partial<Prefs> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* storage เต็มหรือถูกปิด — ข้ามไป */
  }
}
