// Service Worker ของ ChargeWay — ทำให้ติดตั้งเป็น PWA/APK ได้และเปิดเร็วขึ้น
// หมายเหตุ: การค้นหาสถานี/แผนที่ของ Google เป็น request ข้ามโดเมน เราปล่อยให้วิ่งเน็ตปกติเสมอ
// v2: บั๊มเวอร์ชันเพื่อบังคับล้างแคชเก่า — ผู้ใช้ที่ค้างบันเดิลยุคก่อนตั้ง API key
// จะได้ตัวใหม่อัตโนมัติ (activate ด้านล่างลบแคชที่ชื่อไม่ตรงทิ้งทั้งหมด)
const CACHE = 'chargeway-v2';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // ข้าม request ข้ามโดเมน (Google Maps/Places/Fonts ฯลฯ) — ต้องใช้ข้อมูลสดเสมอ
  if (url.origin !== self.location.origin) return;

  // หน้าเว็บ (navigation): เอาจากเน็ตก่อน ถ้าออฟไลน์ค่อยใช้แคช
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  // ไฟล์ static (js/css/icon): เอาจากแคชก่อน เร็วกว่า
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
    )
  );
});
