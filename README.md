# ChargeWay — Smart EV Journey Planner

แอปวางแผนทริปรถ EV สำหรับเมืองไทย: คำนวณระยะวิ่งจริง (EPA), หาจุดแวะชาร์จตามเครือข่าย
(PTT / PEA VOLTA / EleX / SPARK), คำนวณค่าไฟ Peak/Off-peak, เวลาถึง (ETA),
บันทึก/โหลดทริป, Dark mode, และโหมดขับขี่สด (GPS + เตือนใกล้จุดชาร์จ)

โค้ดหลักอยู่ที่ `src/app/page.tsx`

## เริ่มใช้งาน (Local)

```bash
npm install
cp .env.example .env.local   # แล้วใส่ Google Maps API key ของคุณ
npm run dev
```

## ตัวแปรสภาพแวดล้อม (Environment Variables)

| ตัวแปร | คำอธิบาย |
|--------|----------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key |

> ⚠️ **เรื่องความปลอดภัยของ API key**
> key ของ Google Maps JS API เป็น **client-side** — ผู้ใช้มองเห็นได้ในเบราว์เซอร์เสมอ
> ซ่อนไม่ได้ การป้องกันที่แท้จริงคือ **จำกัดสิทธิ์ key** ใน Google Cloud Console:
> 1. **Application restrictions → HTTP referrers**: ใส่เฉพาะโดเมนของคุณ
>    เช่น `https://your-app.vercel.app/*` และ `http://localhost:3000/*`
> 2. **API restrictions**: เปิดเฉพาะ Maps JavaScript API, Places API, Geocoding API, Directions API
>
> หาก key เคยถูก commit ลงโค้ด/ประวัติ git แนะนำให้ **สร้าง key ใหม่ (rotate)** แล้วจำกัดสิทธิ์

## Deploy ขึ้น Vercel

1. เข้า [vercel.com](https://vercel.com) ล็อกอินด้วย GitHub
2. **Add New → Project** → import repo นี้
3. ตั้ง Environment Variable: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` = key ของคุณ
4. **Deploy** → ได้ URL `xxx.vercel.app` (ทุกครั้งที่ push เข้า `main` จะ deploy อัตโนมัติ)

## ติดตั้งเป็นแอป (PWA / APK)

แอปเป็น PWA ติดตั้งได้: เปิด URL ในเบราว์เซอร์ที่รองรับ → เมนู → "ติดตั้งแอป"
หรือสร้างไฟล์ APK ผ่าน [PWABuilder](https://www.pwabuilder.com) (วาง URL → Package For Stores → Android)
