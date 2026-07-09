// ลอจิกวางจุดแวะชาร์จตามระยะของแต่ละเลก — แยกเป็นฟังก์ชัน pure เพื่อให้เขียน unit test ได้
// (ตัวเรียกใน page.tsx แปลงเส้นทางเป็นรายการระยะทางต่อ segment ก่อนส่งเข้ามา)

export interface StopPoint {
  /** index ของจุดบนเส้นทาง (path[index]) ที่ควรวางจุดแวะ */
  index: number;
  /** ระยะสะสมจากต้นทางถึงจุดแวะ (กม. ปัดเป็นจำนวนเต็ม) */
  atKm: number;
}

/**
 * คำนวณตำแหน่งจุดแวะชาร์จจากระยะของแต่ละ segment บนเส้นทาง
 * @param segmentKms ระยะทาง (กม.) ของ segment ที่ i → i+1 บนเส้นทาง
 * @param firstLegKm ระยะวิ่งได้ของเลกแรก (จาก %แบตเริ่มต้น ถึงจุดเริ่มชาร์จ)
 * @param nextLegKm  ระยะวิ่งได้ของเลกถัด ๆ ไป (จาก %เป้าหมายชาร์จ ถึงจุดเริ่มชาร์จ)
 */
export function planStopIndices(segmentKms: number[], firstLegKm: number, nextLegKm: number): StopPoint[] {
  const stops: StopPoint[] = [];
  let currentLegKm = 0;
  let cumulativeKm = 0;

  for (let i = 0; i < segmentKms.length; i++) {
    currentLegKm += segmentKms[i];
    cumulativeKm += segmentKms[i];

    const legLimit = stops.length === 0 ? firstLegKm : nextLegKm;
    if (legLimit > 0 && currentLegKm >= legLimit) {
      stops.push({ index: i + 1, atKm: Math.round(cumulativeKm) });
      currentLegKm = 0;
    }
  }

  return stops;
}
