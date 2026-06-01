import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'ChargeWay — Smart EV Journey Planner',
    short_name: 'ChargeWay',
    description: 'วางแผนทริป EV หาสถานีชาร์จ คำนวณจุดแวะและค่าไฟ — สำหรับ BYD ATTO 3 และ EV อื่น ๆ',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    lang: 'th',
    background_color: '#0a1428',
    theme_color: '#22c55e',
    categories: ['travel', 'navigation', 'utilities'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
