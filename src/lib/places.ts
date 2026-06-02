// จัดการ "ปลายทางล่าสุด" และ "รายการโปรด (บ้าน/ที่ทำงาน)" ใน localStorage

const RECENT_KEY = 'chargeway_recent_places';
const FAV_KEY = 'chargeway_fav_places';
const MAX_RECENTS = 6;

export type FavKind = 'home' | 'work';
export type Favorites = { home?: string; work?: string };

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage เต็มหรือถูกปิด — ข้ามไป */
  }
}

// ===== ปลายทางล่าสุด =====
export function loadRecents(): string[] {
  const arr = read<string[]>(RECENT_KEY, []);
  return Array.isArray(arr) ? arr.filter(s => typeof s === 'string') : [];
}

export function addRecent(address: string): string[] {
  const a = address.trim();
  if (!a) return loadRecents();
  const existing = loadRecents().filter(x => x.toLowerCase() !== a.toLowerCase());
  const next = [a, ...existing].slice(0, MAX_RECENTS);
  write(RECENT_KEY, next);
  return next;
}

export function clearRecents(): string[] {
  write(RECENT_KEY, []);
  return [];
}

// ===== รายการโปรด (บ้าน/ที่ทำงาน) =====
export function loadFavorites(): Favorites {
  const f = read<Favorites>(FAV_KEY, {});
  return f && typeof f === 'object' ? f : {};
}

export function setFavorite(kind: FavKind, address: string): Favorites {
  const favs = loadFavorites();
  favs[kind] = address.trim();
  write(FAV_KEY, favs);
  return favs;
}

export function clearFavorite(kind: FavKind): Favorites {
  const favs = loadFavorites();
  delete favs[kind];
  write(FAV_KEY, favs);
  return favs;
}
