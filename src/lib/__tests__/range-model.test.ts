import { describe, it, expect } from 'vitest';
import { speedRangeFactor, tempRangeFactor, chargePowerFraction, chargeMinutes } from '../range-model';

describe('speedRangeFactor', () => {
  it('อ้างอิง 90 กม./ชม. = 1.0', () => {
    expect(speedRangeFactor(90)).toBe(1.0);
  });
  it('ขับช้ากว่า 90 ได้ระยะเพิ่ม, เร็วกว่าได้ระยะลด', () => {
    expect(speedRangeFactor(70)).toBeGreaterThan(1);
    expect(speedRangeFactor(120)).toBeLessThan(1);
  });
  it('clamp ที่ขอบตาราง (ต่ำสุด 50 / สูงสุด 130)', () => {
    expect(speedRangeFactor(20)).toBe(speedRangeFactor(50));
    expect(speedRangeFactor(200)).toBe(speedRangeFactor(130));
  });
  it('ค่าไม่สมเหตุผลคืน 1 (ไม่ปรับ)', () => {
    expect(speedRangeFactor(0)).toBe(1);
    expect(speedRangeFactor(-5)).toBe(1);
    expect(speedRangeFactor(NaN)).toBe(1);
  });
});

describe('tempRangeFactor', () => {
  it('ช่วง 20–23°C คือจุดที่ดีที่สุด (1.0)', () => {
    expect(tempRangeFactor(20)).toBe(1.0);
    expect(tempRangeFactor(23)).toBe(1.0);
  });
  it('อากาศร้อนแบบไทย (35°C) ระยะลดลง', () => {
    expect(tempRangeFactor(35)).toBeLessThan(1);
    expect(tempRangeFactor(35)).toBeGreaterThan(0.8);
  });
  it('ยิ่งร้อนยิ่งลด (monotonic ฝั่งร้อน)', () => {
    expect(tempRangeFactor(40)).toBeLessThan(tempRangeFactor(30));
  });
  it('ค่าไม่สมเหตุผลคืน 1', () => {
    expect(tempRangeFactor(NaN)).toBe(1);
  });
});

describe('chargePowerFraction', () => {
  it('ชาร์จแรงสุดช่วงแบตน้อย และช้าลงหลัง 80%', () => {
    expect(chargePowerFraction(15)).toBe(1.0);
    expect(chargePowerFraction(85)).toBeLessThan(0.4);
  });
});

describe('chargeMinutes', () => {
  it('ช่วง SoC สูง (taper) ใช้เวลานานกว่าช่วง SoC ต่ำ ที่ปริมาณ % เท่ากัน', () => {
    const low = chargeMinutes(60, 100, 10, 40);   // 30% ช่วงต้น
    const high = chargeMinutes(60, 100, 60, 90);  // 30% ช่วงท้าย
    expect(high).toBeGreaterThan(low);
  });
  it('อินพุตไม่สมเหตุผลคืน 0', () => {
    expect(chargeMinutes(0, 100, 10, 80)).toBe(0);
    expect(chargeMinutes(60, 0, 10, 80)).toBe(0);
    expect(chargeMinutes(60, 100, 80, 80)).toBe(0); // from == to
    expect(chargeMinutes(60, 100, 90, 20)).toBe(0); // from > to
  });
  it('ค่าประมาณสมเหตุผล: 60kWh @100kW จาก 15→80% ราว 30–70 นาที', () => {
    const min = chargeMinutes(60, 100, 15, 80);
    expect(min).toBeGreaterThan(30);
    expect(min).toBeLessThan(70);
  });
});
