import type {Metadata, Viewport} from 'next';
import './globals.css';
import { SwRegister } from '@/components/sw-register';
import { PrivacyConsent } from '@/components/privacy-consent';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'ChargeWay',
  description: 'Smart EV Trip Planner',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ChargeWay',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#22c55e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* โหลดฟอนต์แบบ non-blocking: เริ่มด้วย media="print" (ไม่บล็อกการแสดงผล/hydration)
            แล้วสลับเป็น all เมื่อโหลดเสร็จ — ถ้าเน็ตช้า/โหลดฟอนต์ไม่ได้ แอปยังใช้งานได้ปกติ
            (แบบเดิมเป็น render-blocking: ฟอนต์ค้าง = ทั้งหน้ากดอะไรไม่ได้) */}
        <link
          id="gfonts"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
          media="print"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var l=document.getElementById('gfonts');if(!l)return;var done=function(){l.media='all'};if(l.sheet){done()}else{l.addEventListener('load',done)}})();`,
          }}
        />
      </head>
      <body className="font-body antialiased selection:bg-primary/20 bg-background text-foreground">
        {children}
        <SwRegister />
        <PrivacyConsent />
        {/* จุดแสดงผล toast ของทั้งแอป — ไม่มีตัวนี้ toast จะไม่ขึ้นเลย */}
        <Toaster />
      </body>
    </html>
  );
}
