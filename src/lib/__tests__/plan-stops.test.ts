import { describe, it, expect } from 'vitest';
import { planStopIndices } from '../plan-stops';

// เส้นทางจำลอง: segment ละ 10 กม.
const seg = (n: number, km = 10) => Array(n).fill(km);

describe('planStopIndices', () => {
  it('ทริปสั้นกว่าระยะเลกแรก → ไม่มีจุดแวะ', () => {
    expect(planStopIndices(seg(5), 100, 200)).toEqual([]); // 50 กม. < 100
  });

  it('วางจุดแวะแรกเมื่อสะสมครบระยะเลกแรก', () => {
    const stops = planStopIndices(seg(20), 100, 200); // 200 กม., เลกแรก 100
    expect(stops).toHaveLength(1);
    expect(stops[0].atKm).toBe(100);
    expect(stops[0].index).toBe(10); // segment ที่ 10 (10 กม. × 10)
  });

  it('เลกถัดไปใช้ระยะ nextLegKm ไม่ใช่ firstLegKm', () => {
    const stops = planStopIndices(seg(50), 100, 150); // 500 กม.
    // จุดแรกที่ 100 กม., จุดต่อไปทุก 150 กม. → 250, 400
    expect(stops.map(s => s.atKm)).toEqual([100, 250, 400]);
  });

  it('เลกแรก 0 (แบตเริ่มต้น = จุดเริ่มชาร์จ) → ไม่วางจุดแวะเลย (caller ต้อง validate เอง)', () => {
    expect(planStopIndices(seg(50), 0, 200)).toEqual([]);
  });

  it('เส้นทางว่าง → ไม่มีจุดแวะ', () => {
    expect(planStopIndices([], 100, 200)).toEqual([]);
  });

  it('segment ยาวเกินเลกในก้าวเดียวก็ยังวางจุดแวะ (ไม่ข้าม)', () => {
    const stops = planStopIndices([300], 100, 200);
    expect(stops).toHaveLength(1);
    expect(stops[0].index).toBe(1);
  });
});
