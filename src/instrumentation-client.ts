// Crash reporting ฝั่ง client ด้วย Sentry — เปิดใช้เมื่อตั้ง NEXT_PUBLIC_SENTRY_DSN เท่านั้น
// (ไม่ตั้ง = no-op ทั้งหมด ไม่มีการส่งข้อมูลออก) สมัครฟรีได้ที่ sentry.io แล้วเอา DSN มาใส่ env
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // เก็บ performance trace แค่บางส่วนพอเห็นแนวโน้ม — ไม่เปลือง quota ฟรี
    tracesSampleRate: 0.1,
    // ไม่เปิด session replay (แอปมีข้อมูลตำแหน่งผู้ใช้ ไม่ควรอัดหน้าจอ)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
