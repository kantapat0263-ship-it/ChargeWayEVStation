# รายงานความปลอดภัย & ความเป็นส่วนตัว — ChargeWay

> ปรับปรุง: 21 มิ.ย. 2026 · ขอบเขต: เว็บแอป Next.js (client-side) ที่ deploy บน Vercel

---

## 1. บทสรุปผู้บริหาร (Executive Summary)

ChargeWay เป็นเว็บแอป **ฝั่ง client ล้วน** ไม่มี backend, ฐานข้อมูล, หรือระบบ login
ข้อมูลผู้ใช้ทั้งหมด (ตำแหน่ง, ทริป, รายการโปรด) เก็บใน `localStorage` บนเครื่องผู้ใช้
และ **ไม่ถูกส่งออกไปยังเซิร์ฟเวอร์ของเรา** จึงมีพื้นที่การโจมตี (attack surface) ต่ำโดยธรรมชาติ

ความเสี่ยงหลักที่เหลืออยู่ 2 เรื่อง:
1. **Dependency เก่า/ไม่ได้ใช้** ที่ดึงช่องโหว่เข้ามาจำนวนมาก (รายละเอียดข้อ 4)
2. การ **จำกัดสิทธิ์ Google Maps API key** ฝั่ง Google Cloud (ต้องทำใน console)

| ระดับ | ก่อนรอบนี้ | หลังรอบนี้ |
|---|---|---|
| OWASP Secure Headers | ❌ ไม่มี | ✅ มี CSP + 6 headers |
| API key ใน source | 🔴 ฮาร์ดโค้ดทิ้งไว้ | ✅ ใช้ env เท่านั้น |
| PDPA/GDPR พื้นฐาน | ❌ ไม่มี | ✅ policy + consent + สิทธิ์ลบ/ส่งออก |
| Dependency vulns | 🔴 95 รายการ | ✅ **0 รายการ** (ดูข้อ 4) |

---

## 2. สิ่งที่แก้ไขแล้วในรอบนี้

### 2.1 Google Maps API key (OWASP A02/A05)
- ถอด key ที่ฮาร์ดโค้ดไว้ใน `src/app/page.tsx` ออก → อ่านจาก `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` เท่านั้น
- **ต้องทำต่อด้วยตนเอง (สำคัญ):**
  1. **Rotate** key เดิมที่เคยหลุดใน git history ทิ้ง (สร้างใหม่ใน Google Cloud)
  2. ตั้ง **Application restrictions → HTTP referrers** ใส่โดเมนจริง เช่น `https://<app>.vercel.app/*`, `http://localhost:3000/*`
  3. ตั้ง **API restrictions** ให้เหลือเฉพาะ Maps JavaScript / Places / Geocoding / Directions
  4. ตั้งค่า env ใน Vercel → Project Settings → Environment Variables

> หมายเหตุ: key ของ Maps เป็น client-side โดยธรรมชาติ (มองเห็นในเบราว์เซอร์เสมอ)
> การ "ซ่อน" จึงไม่ใช่การป้องกัน — การ **จำกัดสิทธิ์ key** คือการป้องกันที่แท้จริง

### 2.2 HTTP Security Headers + CSP (OWASP A05 Security Misconfiguration)
เพิ่มใน `next.config.ts`:
- `Content-Security-Policy` — จำกัดแหล่ง script/img/connect เฉพาะ Google Maps + Open-Meteo
- `X-Frame-Options: DENY` + `frame-ancestors 'none'` — กัน clickjacking
- `X-Content-Type-Options: nosniff` — กัน MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — เปิดเฉพาะ geolocation/microphone (เฉพาะ self), ปิด camera/payment
- `Strict-Transport-Security` (HSTS) — บังคับ HTTPS

> ⚠️ CSP อนุญาต `'unsafe-inline'/'unsafe-eval'` เฉพาะ `script-src` เพราะ Google Maps SDK
> ต้องใช้ — เป็นข้อจำกัดของ SDK ควรทดสอบแผนที่บน production จริงหลัง deploy
> ถ้าแผนที่ผิดเพี้ยน ให้ปรับ allowlist โดเมนเพิ่มทีละรายการ

### 2.3 ความเป็นส่วนตัว (PDPA / GDPR)
- หน้า `/privacy` — นโยบายความเป็นส่วนตัว (ภาษาไทย) ระบุข้อมูลที่เก็บ + บริการภายนอก
- Consent banner ตอนเข้าครั้งแรก (`src/components/privacy-consent.tsx`)
- ศูนย์จัดการสิทธิ์เจ้าของข้อมูล: **ส่งออกข้อมูล (.json)** และ **ลบข้อมูลทั้งหมด** (`src/lib/privacy.ts`)
- ขอ geolocation/ไมโครโฟน **เฉพาะตอนผู้ใช้สั่งงาน** (on-demand) ไม่ขอดักไว้ล่วงหน้า

---

## 3. การแมปกับมาตรฐานที่ร้องขอ

| มาตรฐาน | ใช้กับเราไหม | สถานะ / หมายเหตุ |
|---|---|---|
| **OWASP Top 10 (2021)** | ✅ ใช่ | A02/A05 จัดการแล้ว · A06 (deps) ดูข้อ 4 · A01/A03/A07 ส่วนใหญ่ N/A เพราะไม่มี backend/auth |
| **SANS/CWE Top 25** | ✅ ใช่ | ครอบด้วย CSP + dependency scan + ไม่มี server-side input |
| **PDPA (ไทย) / GDPR (EU)** | ✅ ใช่ | มี policy, consent, สิทธิ์เข้าถึง/ส่งออก/ลบ ครบขั้นพื้นฐาน — ยังขาด DPA กับ Google (ดูข้อ 6) |
| **HIPAA** | ❌ ไม่ใช่ | ไม่มีข้อมูลสุขภาพ (PHI) — ไม่อยู่ในขอบเขต ไม่ต้องทำ |
| **ISMS / ISO 27001** | ⚠️ เชิงองค์กร | เป็นระบบบริหารทั้งองค์กร ไม่ใช่โค้ด — ต้องมีนโยบาย/risk register/ผู้รับผิดชอบ/audit ภายนอก |
| **ISO 27701 (Privacy)** | ⚠️ เชิงองค์กร | ส่วนขยายของ ISO 27001 ต้องมี ISMS ก่อน |

> สรุป: ส่วนที่เป็น "โค้ด/เทคนิค" ทำได้และทำไปแล้วเป็นส่วนใหญ่
> ส่วน ISMS/ISO เป็นงานเอกสาร+กระบวนการระดับองค์กร แอป/ทีมเล็กยัง certify ไม่ได้และยังไม่จำเป็น

---

## 4. ผลสแกน Dependency (`npm audit`) — ✅ แก้เสร็จแล้ว

**เริ่มต้น: 95 ช่องโหว่ (critical 3 · high 20 · moderate 70 · low 2) → ปัจจุบัน: `found 0 vulnerabilities`**

### สาเหตุหลัก: dependency ที่ "ไม่ได้ใช้งานจริง"
ตรวจสอบพบว่า `src/ai/` (genkit.ts, dev.ts) **ไม่ถูก import จากที่ใดในแอปเลย**
และ `firebase` ก็ไม่ถูกใช้ — แต่ทั้งสองดึง dependency หนักเข้ามา ซึ่งเป็นต้นตอของช่องโหว่ส่วนใหญ่
(handlebars, protobufjs, fast-xml-parser [critical]; express, axios, lodash, node-forge, @opentelemetry/*, @grpc/grpc-js [high])

### สิ่งที่ทำ
1. **ลบ dependency ที่ไม่ได้ใช้:** `genkit`, `@genkit-ai/google-genai`, `firebase`, `genkit-cli`
   พร้อมลบโฟลเดอร์ `src/ai/` และ script `genkit:dev` / `genkit:watch` → 95 → 10 ช่องโหว่
2. **`npm audit fix`** (ไม่ breaking) → 10 → 2
3. **อัป `next` 15.5.9 → 15.5.20** (patch ใน 15.x ปิด DoS/request-smuggling advisories) → 2 → 2 (postcss)
4. **`overrides.postcss = $postcss`** บังคับ postcss ที่ next bundle มาให้เป็น 8.5.18 → **0**

> ไม่ใช้ `npm audit fix --force` เพราะมันจะ **ดาวน์เกรด next → 9.3.3 (breaking)** ซึ่งผิด

### ยืนยันด้วย Chrome (Chromium headless)
- Security headers + CSP ถูกเสิร์ฟจริงครบทุกตัว (ตรวจด้วย `curl -I`)
- หน้า `/` และ `/privacy` render ได้, consent banner แสดง, ปุ่มส่งออก/ลบข้อมูลอยู่ครบ
- **ไม่พบ CSP violation / console error** — CSP อนุญาต Google Maps โหลดได้ตามปกติ

---

## 5. ความเสี่ยงที่ยอมรับได้ / ข้อจำกัดที่ทราบ

- CSP ใช้ `unsafe-eval` ที่ `script-src` — จำเป็นสำหรับ Google Maps SDK (ยอมรับความเสี่ยง)
- ข้อมูลใน `localStorage` ไม่เข้ารหัส — แต่เป็นข้อมูลบนเครื่องผู้ใช้เอง ไม่ใช่ข้อมูลอ่อนไหวสูง (ยอมรับได้)
- ไม่มี backend = ไม่มี server-side logging/monitoring (เหมาะกับสเกลปัจจุบัน)

---

## 6. แผนปรับปรุงถัดไป (เรียงตามความสำคัญ)

| ลำดับ | งาน | ผล | ใคร |
|---|---|---|---|
| 🔴 P0 | **Rotate** Google Maps key เก่า (ยังอยู่ใน git history `80215fa`) + จำกัดสิทธิ์ใน Google Cloud | กันค่าใช้จ่าย/abuse | **ผู้ดูแล (manual — สำคัญสุด)** |
| 🔴 P0 | ตั้ง `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` ใน Vercel | แอป/แผนที่ทำงานหลังถอด hardcode | ผู้ดูแล (manual) |
| ✅ P1 | ลบ genkit/firebase/`src/ai` ที่ไม่ได้ใช้ | กำจัด vulns | **เสร็จแล้ว** |
| ✅ P1 | ทดสอบ CSP บน Chrome | ยืนยันแผนที่ไม่เพี้ยน | **เสร็จแล้ว** |
| ✅ P2 | `npm audit fix` + อัป next + override postcss | ปิด vuln ที่เหลือ → 0 | **เสร็จแล้ว** |
| P2 | เพิ่ม Dependabot/CI audit ใน GitHub | เฝ้าระวังอัตโนมัติ | dev |
| P3 | เอกสาร ISMS แบบ lite (data inventory, นโยบาย) | ตั้งต้นสู่ ISO ถ้าโตขึ้น | องค์กร |

> ⚠️ **สำคัญ:** การถอด key ออกจาก source **ไม่ได้ลบมันจาก git history** — key เดิม
> `AIzaSyBkAJ…` ยังดึงได้จาก commit `80215fa` ต้อง rotate ทิ้งใน Google Cloud เท่านั้นถึงจะปลอดภัยจริง

---

*รายงานนี้สะท้อนสภาพ ณ วันที่ระบุ ควรรันสแกนซ้ำเมื่อมีการเปลี่ยน dependency หรือเพิ่มฟีเจอร์ที่รับข้อมูลผู้ใช้*
