import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'นโยบายความเป็นส่วนตัว — ChargeWay',
  description: 'Privacy Policy ของแอป ChargeWay — Smart EV Journey Planner',
};

// หน้านโยบายความเป็นส่วนตัว — ใช้เป็น Privacy Policy URL ตอนส่งแอปขึ้น Google Play
// (Play Console → App content → Privacy policy)
export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12 text-foreground">
      <h1 className="text-2xl font-extrabold mb-1">นโยบายความเป็นส่วนตัว (Privacy Policy)</h1>
      <p className="text-sm text-muted-foreground mb-8">ChargeWay — Smart EV Journey Planner · อัปเดตล่าสุด: กรกฎาคม 2026</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-base font-bold mb-2">1. ข้อมูลที่แอปใช้งาน</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>ตำแหน่งที่ตั้ง (Location)</strong> — ใช้เพื่อกำหนดจุดเริ่มต้นการเดินทาง
              และติดตามตำแหน่งระหว่างโหมดขับขี่เพื่อแจ้งเตือนเมื่อใกล้จุดชาร์จ
              ข้อมูลตำแหน่งถูกประมวลผลบนอุปกรณ์ของคุณเท่านั้น เราไม่จัดเก็บหรือส่งตำแหน่งของคุณไปยังเซิร์ฟเวอร์ของเรา
            </li>
            <li>
              <strong>ไมโครโฟน (Microphone)</strong> — ใช้เฉพาะเมื่อคุณกดปุ่มค้นหาด้วยเสียง
              เสียงถูกแปลงเป็นข้อความโดยบริการรู้จำเสียงของเบราว์เซอร์/ระบบปฏิบัติการ เราไม่บันทึกเสียงของคุณ
            </li>
            <li>
              <strong>ข้อมูลทริปและการตั้งค่า</strong> — ทริปที่บันทึก รายการโปรด ปลายทางล่าสุด และธีม
              ถูกเก็บไว้ในอุปกรณ์ของคุณ (localStorage) เท่านั้น ไม่ถูกส่งออกไปภายนอก
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-bold mb-2">2. บริการภายนอกที่แอปเรียกใช้</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Google Maps Platform</strong> (แผนที่ ค้นหาสถานที่ เส้นทาง) — เมื่อใช้งานแผนที่
              ข้อมูลคำค้นและพิกัดที่เกี่ยวข้องจะถูกส่งไปยัง Google ตาม{' '}
              <a href="https://policies.google.com/privacy" className="text-primary underline" target="_blank" rel="noopener noreferrer">
                นโยบายความเป็นส่วนตัวของ Google
              </a>
            </li>
            <li>
              <strong>Open-Meteo</strong> (อุณหภูมิตามเส้นทาง) — ส่งเฉพาะพิกัดกลางเส้นทาง (ปัดทศนิยม)
              เพื่อขอข้อมูลอุณหภูมิ ไม่มีข้อมูลระบุตัวตน
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-bold mb-2">3. สิ่งที่เราไม่ทำ</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>ไม่มีระบบบัญชีผู้ใช้ — เราไม่เก็บชื่อ อีเมล หรือข้อมูลระบุตัวตนใด ๆ</li>
            <li>ไม่ขายหรือแบ่งปันข้อมูลของคุณให้บุคคลที่สาม</li>
            <li>ไม่ติดตามพฤติกรรมการใช้งานข้ามแอป/เว็บไซต์อื่น</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-bold mb-2">4. การลบข้อมูล</h2>
          <p>
            ข้อมูลทั้งหมดอยู่บนอุปกรณ์ของคุณ — ลบได้ทุกเมื่อโดยล้างข้อมูลแอป/เบราว์เซอร์
            (Clear site data) หรือถอนการติดตั้งแอป
          </p>
        </div>

        <div>
          <h2 className="text-base font-bold mb-2">5. ติดต่อเรา</h2>
          <p>
            หากมีคำถามเกี่ยวกับนโยบายนี้ ติดต่อได้ที่{' '}
            <a href="mailto:kantapat0263@gmail.com" className="text-primary underline">kantapat0263@gmail.com</a>
          </p>
        </div>
      </section>
    </main>
  );
}
