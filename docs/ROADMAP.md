# ChargeWay — Roadmap การพัฒนา

> เอกสารสรุปสถานะปัจจุบันของโปรเจค และทิศทางการพัฒนาต่อ
> อัปเดตล่าสุด: 2026-06-01

---

## 1. ภาพรวมโปรเจค

**ChargeWay** เป็นเว็บแอปวางแผนทริปสำหรับรถ EV ในประเทศไทย
ช่วยคำนวณจุดที่ต้องแวะชาร์จระหว่างทาง และค้นหาสถานีชาร์จที่อยู่ใกล้จุดนั้น

### Tech Stack
| ส่วน | เทคโนโลยี |
|------|-----------|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS + shadcn/ui (Radix) |
| Map | `@vis.gl/react-google-maps` + Google Maps / Places API |
| AI | Genkit + Gemini 2.5 Flash *(ติดตั้งแล้วแต่ยังไม่ได้ใช้งาน)* |
| Hosting | Firebase App Hosting |

### ฟีเจอร์ปัจจุบัน
- กรอกต้นทาง/ปลายทาง (มี autocomplete, ใช้ตำแหน่งปัจจุบัน, ปักหมุดบนแผนที่)
- ตั้งค่าระยะวิ่งสูงสุด + เปอร์เซ็นต์แบตที่เริ่มชาร์จ → คำนวณระยะวิ่งจริงแบบ EPA
- คำนวณจุดที่ต้องแวะชาร์จตลอดเส้นทาง
- ค้นหาสถานีชาร์จ (PTT EV / PEA VOLTA / ELEXA / SPARK) ในรัศมี 20 กม. รอบจุดแวะ
- แสดงเส้นทาง + หมุดสถานีบนแผนที่ และเปิด Google Maps เพื่อนำทาง

---

## 2. หนี้ทางเทคนิค (ควรเก็บก่อนต่อยอด)

| # | ปัญหา | ตำแหน่ง | ความสำคัญ |
|---|-------|---------|-----------|
| 1 | Google Maps API Key hardcode อยู่ในซอร์ส ควรย้ายไป `.env` และ restrict key | `src/app/page.tsx:46` | 🔴 สูงมาก (ความปลอดภัย) |
| 2 | โค้ดทั้งหมดรวมอยู่ใน `page.tsx` ไฟล์เดียว (746 บรรทัด) | `src/app/page.tsx` | 🟠 สูง |
| 3 | ใช้ `any` แทบทุกที่ (tripData, stations, station) เสีย type-safety | `src/app/page.tsx` | 🟠 สูง |
| 4 | Genkit/Gemini ติดตั้งไว้แต่ไม่มี flow ใด ๆ | `src/ai/` | 🟡 กลาง |
| 5 | ใช้ Places API แบบเก่า (`PlacesService.nearbySearch`) ที่กำลังถูก deprecate | `page.tsx:443` | 🟡 กลาง |
| 6 | ไฟล์สะกดผิด/ซ้ำซ้อน `public/maifest.json` (มี `manifest.ts` อยู่แล้ว) | `public/` | 🟢 ต่ำ |
| 7 | ปุ่ม "เลือกสถานีนี้" ใน InfoWindow ยัง set ค่าทับตัวเอง ไม่เกิดผล | `page.tsx:629` | 🟢 ต่ำ |

---

## 3. ทิศทางการพัฒนา (Roadmap)

### Phase 1 — รากฐาน (Foundation)
เป้าหมาย: ทำให้โค้ดพร้อมขยายและปลอดภัยสำหรับ production
- [ ] ย้าย API Key ไป environment variable + restrict ใน Google Cloud Console
- [ ] แยก `TripForm`, `MapView` และ logic คำนวณออกเป็นไฟล์/คอมโพเนนต์ย่อย
- [ ] นิยาม TypeScript types (`TripData`, `Station`, `PlannedStop`) แทน `any`
- [ ] เพิ่ม error/empty state และ loading state ที่ครบถ้วน
- [ ] ลบไฟล์ซ้ำ/สะกดผิด และจัด PWA manifest ให้ถูกต้อง

### Phase 2 — ต่อยอดฟีเจอร์ผู้ใช้ (Core UX)
- [ ] **รองรับรถ EV หลายรุ่น** — เลือกรุ่น (ATTO3 / Tesla / ORA / Neta ...) พร้อมค่าระยะวิ่ง preset
- [ ] แสดงรายละเอียดสถานี: ประเภทหัวชาร์จ, กำลังไฟ (kW), ราคา, สถานะว่าง, เรตติ้ง/รีวิว
- [ ] รองรับ **หลายจุดแวะ** ใน Google Maps navigation (ปัจจุบันส่งได้ waypoint เดียว)
- [ ] คำนวณ **เวลาชาร์จโดยประมาณ + เวลาเดินทางรวม + ค่าไฟ**
- [ ] บันทึกทริป / รถที่ชอบ (ต้องมี Firebase Auth — `firebase` ติดตั้งแล้ว)

### Phase 3 — เพิ่มความฉลาดด้วย AI (Gemini)
- [ ] ผู้ช่วยวางแผนทริปแบบแชต (เช่น "ขับ กทม.→เชียงใหม่ แบตเหลือ 80% อยากแวะกินข้าว")
- [ ] สรุป/วิเคราะห์รีวิวสถานีชาร์จเป็นภาษาไทย
- [ ] แนะนำจุดแวะ (ร้านอาหาร/ห้องน้ำ/คาเฟ่) ใกล้สถานีระหว่างชาร์จ

### Phase 4 — Production & Quality
- [ ] PWA ติดตั้งบนมือถือได้จริง + offline shell
- [ ] Unit/integration test สำหรับ logic คำนวณระยะ EPA
- [ ] วิเคราะห์ performance ของการยิง Places API หลาย keyword พร้อมกัน (caching/debounce)
- [ ] Analytics + error monitoring

---

## 4. แนวคิดต่อยอดระยะยาว
- เทียบราคาค่าชาร์จข้ามเครือข่าย
- แจ้งเตือน real-time สถานะหัวชาร์จว่าง/ไม่ว่าง
- โหมดวางแผนทริปแบบไปกลับ / หลายวัน
- รองรับหลายภาษา (TH/EN)
