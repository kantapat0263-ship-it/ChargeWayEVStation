import type {NextConfig} from 'next';

// ===== Content Security Policy =====
// อนุญาตเฉพาะแหล่งที่แอปใช้จริง: Google Maps + Open-Meteo + รูปจาก host ที่อนุญาต
// หมายเหตุ: Google Maps JS ต้องใช้ 'unsafe-inline'/'unsafe-eval' กับ script และ blob: worker
// จึงผ่อนปรนเฉพาะส่วนนี้ (เป็นข้อจำกัดของ Maps SDK) — ส่วนอื่นล็อกแน่น
// Sentry (ถ้าตั้ง NEXT_PUBLIC_SENTRY_DSN) ส่ง error ไปที่ host ใน DSN — ต้องอยู่ใน connect-src
// ไม่งั้น CSP จะบล็อกรายงานเงียบ ๆ (crash reporting ใช้ไม่ได้ทั้งที่ตั้งค่าแล้ว)
// อ่านเฉพาะ origin จาก DSN ไม่เอา public key ไปโผล่ใน header
function sentryIngestOrigin(): string | null {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    return u.protocol === 'https:' ? `https://${u.host}` : null;
  } catch {
    return null;
  }
}

const connectSrc = [
  "'self'",
  'https://maps.googleapis.com',
  'https://*.googleapis.com',
  'https://api.open-meteo.com',
  sentryIngestOrigin(),
].filter(Boolean).join(' ');

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.google.com https://placehold.co https://images.unsplash.com https://picsum.photos",
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src ${connectSrc}`,
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

// HTTP security headers ตามแนวทาง OWASP Secure Headers
const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },                       // กัน clickjacking
  { key: 'X-Content-Type-Options', value: 'nosniff' },             // กัน MIME sniffing
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(self), microphone=(self), camera=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // ตัด opener ระหว่างแท็บที่เราเปิด (Google Maps/Store) กับหน้าแอป — กัน tab-nabbing/XS-Leaks
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  typescript: {
    // เปิด typecheck ตอน build — อย่ากลับไปปิดอีก บั๊กจะเล็ดรอดขึ้น production
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
