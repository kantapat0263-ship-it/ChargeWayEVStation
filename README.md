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
| `NEXT_PUBLIC_SENTRY_DSN` | (ไม่บังคับ) DSN จาก [sentry.io](https://sentry.io) สำหรับ crash reporting — ไม่ตั้ง = ปิด |

## คำสั่งที่ใช้บ่อย

```bash
npm run dev        # รันแบบ dev (port 9002)
npm test           # unit tests (logic คำนวณระยะ/ชาร์จ/จุดแวะ/ราคา)
npm run typecheck  # เช็ค TypeScript
npm run build      # build production (typecheck เปิดอยู่ — error = build ไม่ผ่าน)
```

> 🚨 **key เดิมหลุดแล้ว — อย่านำกลับมาใช้**
> key ที่เคยถูกฝังในโค้ดยังอยู่ใน **ประวัติ git** ตลอดไป ถือว่าหลุดถาวร
> key ที่ใช้อยู่ตอนนี้เป็นตัวใหม่ที่จำกัดสิทธิ์แล้ว และตั้งผ่าน env variable เท่านั้น (โค้ดไม่มี fallback)
> ถ้าคุณ fork repo นี้ ให้[สร้าง key ของคุณเอง](https://console.cloud.google.com/apis/credentials) แล้วจำกัดสิทธิ์ตามด้านล่าง
>
> ⚠️ **เรื่องความปลอดภัยของ API key**
> key ของ Google Maps JS API เป็น **client-side** — ผู้ใช้มองเห็นได้ในเบราว์เซอร์เสมอ
> ซ่อนไม่ได้ การป้องกันที่แท้จริงคือ **จำกัดสิทธิ์ key** ใน Google Cloud Console:
> 1. **Application restrictions → HTTP referrers**: ใส่เฉพาะโดเมนของคุณ
>    เช่น `https://charge-way-ev-station.vercel.app/*` และ `http://localhost:9002/*`
>    (`npm run dev` รันที่พอร์ต **9002** ไม่ใช่ 3000 — ใส่ผิดพอร์ตแล้วแผนที่จะไม่ขึ้นตอน dev)
>    หมายเหตุ: Google ไม่รับ `*` กลางชื่อโดเมน จึงครอบ preview URL ของ Vercel ที่สุ่มรหัสไม่ได้
> 2. **API restrictions**: เปิดเฉพาะ Maps JavaScript API, Places API (New), Places API, Geocoding API, Directions API

## Deploy ขึ้น Vercel

1. เข้า [vercel.com](https://vercel.com) ล็อกอินด้วย GitHub
2. **Add New → Project** → import repo นี้
3. ตั้ง Environment Variable: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` = key ของคุณ
4. **Deploy** → ได้ URL `xxx.vercel.app` (ทุกครั้งที่ push เข้า `main` จะ deploy อัตโนมัติ)

## ติดตั้งเป็นแอป (PWA / APK)

แอปเป็น PWA ติดตั้งได้: เปิด URL ในเบราว์เซอร์ที่รองรับ → เมนู → "ติดตั้งแอป"
หรือสร้างไฟล์ APK ผ่าน [PWABuilder](https://www.pwabuilder.com) (วาง URL → Package For Stores → Android)

## เช็คลิสต์ก่อนส่งขึ้น Google Play

1. Deploy เว็บขึ้นโดเมนจริง (Vercel) — TWA ต้องชี้ไปที่ URL ที่ออนไลน์อยู่
2. สร้างแพ็กเกจ Android ผ่าน PWABuilder → ได้ `.aab` + ไฟล์ `assetlinks.json`
3. วาง `assetlinks.json` ไว้ที่ `public/.well-known/assetlinks.json` แล้ว deploy ใหม่
   (ยืนยันความเป็นเจ้าของโดเมน — ถ้าไม่ทำ แอปจะเปิดแบบมีแถบเบราว์เซอร์)
4. ใน Play Console → **App content → Privacy policy** ใส่ URL `https://<โดเมนของคุณ>/privacy`
   (หน้านี้มีในแอปแล้วที่ `/privacy`)
5. กรอก **Data safety form**: ประกาศว่าใช้ Location (ไม่เก็บ/ไม่แชร์) และ Microphone (ค้นหาด้วยเสียง)
6. ตรวจว่า API key ใหม่จำกัด HTTP referrer เฉพาะโดเมนจริงแล้ว
