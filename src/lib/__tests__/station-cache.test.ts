import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  readStationCache,
  writeStationCache,
  clearStationCache,
  stationCacheKey,
  STATION_CACHE_TTL_MS,
  type CachedStation,
} from '../station-cache';

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

const sample: CachedStation[] = [
  { place_id: 'a', name: 'PTT Station', lat: 13.736, lng: 100.523, rating: 4.2, user_ratings_total: 10, vicinity: 'BKK' },
];

describe('station-cache', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', fakeStorage());
  });

  it('เขียนแล้วอ่านคืนได้ค่าเดิม (พิกัดในบั๊กเก็ตเดียวกัน)', () => {
    writeStationCache(13.7364, 100.5231, 20, sample, 1000);
    // ปัด 3 ตำแหน่งแล้วตรงกัน → hit
    expect(readStationCache(13.736, 100.5234, 20, 2000)).toEqual(sample);
  });

  it('คีย์แยกตามรัศมี', () => {
    writeStationCache(13.736, 100.523, 20, sample, 1000);
    expect(readStationCache(13.736, 100.523, 10, 2000)).toBeNull();
  });

  it('หมดอายุตาม TTL → miss', () => {
    writeStationCache(13.736, 100.523, 20, sample, 1000);
    expect(readStationCache(13.736, 100.523, 20, 1000 + STATION_CACHE_TTL_MS + 1)).toBeNull();
  });

  it('ยังไม่ถึง TTL → hit', () => {
    writeStationCache(13.736, 100.523, 20, sample, 1000);
    expect(readStationCache(13.736, 100.523, 20, 1000 + STATION_CACHE_TTL_MS - 1)).toEqual(sample);
  });

  it('clearStationCache ลบเฉพาะคีย์แคชสถานี ไม่แตะคีย์อื่น', () => {
    localStorage.setItem('chargeway_prefs', 'keep-me');
    writeStationCache(13.736, 100.523, 20, sample, 1000);
    writeStationCache(18.79, 98.98, 20, sample, 1000);
    expect(clearStationCache()).toBe(2);
    expect(readStationCache(13.736, 100.523, 20, 1000)).toBeNull();
    expect(localStorage.getItem('chargeway_prefs')).toBe('keep-me');
  });

  it('stationCacheKey ปัดพิกัด 3 ตำแหน่งให้ตรงกัน', () => {
    expect(stationCacheKey(13.7361, 100.5231, 20)).toBe(stationCacheKey(13.7363, 100.5233, 20));
  });
});
