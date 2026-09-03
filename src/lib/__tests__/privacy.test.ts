import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearMyData, exportMyData, hasConsent, setConsent, CONSENT_KEY } from '../privacy';

// localStorage จำลองแบบ in-memory (เทสต์รันบน node ไม่มี DOM)
function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => {
      m.set(k, v);
    },
    removeItem: (k: string) => {
      m.delete(k);
    },
    clear: () => {
      m.clear();
    },
  } as Storage;
}

describe('privacy — สิทธิ์ส่งออก/ลบข้อมูล (PDPA/GDPR)', () => {
  let store: Storage;
  beforeEach(() => {
    store = fakeStorage();
    vi.stubGlobal('localStorage', store);
    vi.stubGlobal('window', { localStorage: store });
  });

  it('ส่งออกครอบคลุม prefs / last_trip / แคชสถานี ไม่ใช่แค่ทริปกับรายการโปรด', () => {
    store.setItem('chargeway_saved_trips', JSON.stringify([{ id: '1' }]));
    store.setItem('chargeway_prefs', JSON.stringify({ vehicleId: 'atto3' }));
    store.setItem('chargeway_last_trip', JSON.stringify({ origin: 'A', destination: 'B', ts: 1 }));
    store.setItem('chargeway_stations_13.736,100.523,5', JSON.stringify({ ts: 1, stations: [] }));
    store.setItem('unrelated_key', 'x');

    const out = exportMyData();
    expect(Object.keys(out).sort()).toEqual([
      'chargeway_last_trip',
      'chargeway_prefs',
      'chargeway_saved_trips',
      'chargeway_stations_13.736,100.523,5',
    ]);
    expect(out['chargeway_prefs']).toEqual({ vehicleId: 'atto3' });
  });

  it('ลบข้อมูลทั้งหมด = ทุก key ที่ขึ้นต้น chargeway_ รวม consent แต่ไม่แตะ key ของคนอื่น', () => {
    store.setItem('chargeway_theme', 'dark');
    store.setItem('chargeway_last_trip', '{}');
    store.setItem('chargeway_stations_1,2,3', '{}');
    store.setItem('chargeway_future_store', '{}'); // ที่เก็บใหม่ที่ลืมลงทะเบียน — ต้องโดนลบด้วย
    setConsent();
    store.setItem('unrelated_key', 'x');

    const n = clearMyData();
    expect(n).toBe(5);
    expect(store.length).toBe(1);
    expect(store.getItem('unrelated_key')).toBe('x');
    expect(store.getItem(CONSENT_KEY)).toBeNull();
    expect(hasConsent()).toBe(false);
  });
});
