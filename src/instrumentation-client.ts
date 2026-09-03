// Crash reporting ฝั่ง client ด้วย Sentry — เปิดใช้เมื่อตั้ง NEXT_PUBLIC_SENTRY_DSN เท่านั้น
// (ไม่ตั้ง = no-op ทั้งหมด ไม่มีการส่งข้อมูลออก) สมัครฟรีได้ที่ sentry.io แล้วเอา DSN มาใส่ env
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// ตัด query string ที่อาจพก API key / พิกัดผู้ใช้ ออกจาก URL ก่อนส่งขึ้น Sentry
// (Maps/Places/Open-Meteo ส่ง key=… และ latitude=… ใน URL — ไม่ควรไปกองอยู่ในระบบภายนอก)
function stripSensitiveQuery(url: unknown): unknown {
  if (typeof url !== 'string') return url;
  const i = url.indexOf('?');
  return i === -1 ? url : url.slice(0, i);
}

if (dsn) {
  Sentry.init({
    dsn,
    // เก็บ performance trace แค่บางส่วนพอเห็นแนวโน้ม — ไม่เปลือง quota ฟรี
    tracesSampleRate: 0.1,
    // ไม่เปิด session replay (แอปมีข้อมูลตำแหน่งผู้ใช้ ไม่ควรอัดหน้าจอ)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // ไม่ส่ง IP / user agent ผูกตัวตน (ค่า default ก็ false — ระบุไว้ให้ชัดว่าตั้งใจ)
    sendDefaultPii: false,
    beforeBreadcrumb(crumb) {
      if (crumb.data?.url) crumb.data.url = stripSensitiveQuery(crumb.data.url);
      return crumb;
    },
    beforeSend(event) {
      if (event.request?.url) event.request.url = stripSensitiveQuery(event.request.url) as string;
      return event;
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
