import type {NextConfig} from 'next';

// ===== Content Security Policy =====
// อนุญาตเฉพาะแหล่งที่แอปใช้จริง: Google Maps + Open-Meteo + รูปจาก host ที่อนุญาต
// หมายเหตุ: Google Maps JS ต้องใช้ 'unsafe-inline'/'unsafe-eval' กับ script และ blob: worker
// จึงผ่อนปรนเฉพาะส่วนนี้ (เป็นข้อจำกัดของ Maps SDK) — ส่วนอื่นล็อกแน่น
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.google.com https://placehold.co https://images.unsplash.com https://picsum.photos",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://maps.googleapis.com https://*.googleapis.com https://api.open-meteo.com",
  "worker-src 'self' blob:",
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
