import { describe, it, expect } from 'vitest';
import {
  toEpaRange,
  isPeakTime,
  getTariffRate,
  matchStationNetwork,
  NETWORK_TARIFFS,
  VEHICLE_MODELS,
} from '../constants';

describe('toEpaRange', () => {
  it('EPA คงเดิม', () => {
    expect(toEpaRange(400, 'EPA')).toBe(400);
  });
  it('NEDC ถูกลดลงมากสุด (มองโลกสวยสุด)', () => {
    expect(toEpaRange(480, 'NEDC')).toBe(349); // 480 × 0.7277
    expect(toEpaRange(480, 'NEDC')).toBeLessThan(toEpaRange(480, 'WLTP'));
  });
});

describe('isPeakTime', () => {
  it('เสาร์-อาทิตย์เป็น Off-peak ทั้งวัน', () => {
    expect(isPeakTime(new Date(2025, 5, 14, 12, 0))).toBe(false); // เสาร์เที่ยง
    expect(isPeakTime(new Date(2025, 5, 15, 12, 0))).toBe(false); // อาทิตย์เที่ยง
  });
  it('จันทร์-ศุกร์ 09:00–21:59 เป็น Peak', () => {
    expect(isPeakTime(new Date(2025, 5, 16, 9, 0))).toBe(true);   // จันทร์ 09:00
    expect(isPeakTime(new Date(2025, 5, 16, 21, 59))).toBe(true); // จันทร์ 21:59
  });
  it('นอกช่วงเป็น Off-peak', () => {
    expect(isPeakTime(new Date(2025, 5, 16, 8, 59))).toBe(false); // จันทร์ 08:59
    expect(isPeakTime(new Date(2025, 5, 16, 22, 0))).toBe(false); // จันทร์ 22:00
  });
});

describe('getTariffRate', () => {
  it('โหมด peak/offpeak บังคับอัตราตามโหมด', () => {
    expect(getTariffRate('ptt', 'peak')).toBe(NETWORK_TARIFFS.ptt.peak);
    expect(getTariffRate('ptt', 'offpeak')).toBe(NETWORK_TARIFFS.ptt.offPeak);
  });
  it('โหมด auto เลือกตามเวลาที่ส่งเข้ามา', () => {
    const monNoon = new Date(2025, 5, 16, 12, 0);
    const monNight = new Date(2025, 5, 16, 23, 0);
    expect(getTariffRate('pea', 'auto', monNoon)).toBe(NETWORK_TARIFFS.pea.peak);
    expect(getTariffRate('pea', 'auto', monNight)).toBe(NETWORK_TARIFFS.pea.offPeak);
  });
  it('เครือข่ายที่ไม่รู้จักใช้ราคา default', () => {
    expect(getTariffRate('unknown-network', 'peak')).toBe(7.5);
  });
});

describe('matchStationNetwork', () => {
  it('จับคู่ชื่อจาก Google Places เข้าเครือข่ายที่รู้จัก', () => {
    expect(matchStationNetwork('PTT EV Station ประชาชื่น')?.id).toBe('ptt');
    expect(matchStationNetwork('EV Station PluZ - บางนา')?.id).toBe('ptt');
    expect(matchStationNetwork('PEA VOLTA สระบุรี')?.id).toBe('pea');
    expect(matchStationNetwork('EleX by EGAT')?.id).toBe('elexa');
    expect(matchStationNetwork('SHARGE SPARK สยาม')?.id).toBe('spark');
  });
  it('ชื่อไม่รู้จัก/ว่าง คืน null', () => {
    expect(matchStationNetwork('Tesla Supercharger')).toBeNull();
    expect(matchStationNetwork(undefined)).toBeNull();
  });
});

describe('VEHICLE_MODELS', () => {
  it('ทุกรุ่นมีข้อมูลครบและสมเหตุผล', () => {
    for (const v of VEHICLE_MODELS) {
      expect(v.rangeKm).toBeGreaterThan(100);
      expect(v.batteryKwh).toBeGreaterThan(20);
      expect(v.maxDcKw).toBeGreaterThan(0);
    }
  });
  it('id ไม่ซ้ำกัน', () => {
    const ids = VEHICLE_MODELS.map(v => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
