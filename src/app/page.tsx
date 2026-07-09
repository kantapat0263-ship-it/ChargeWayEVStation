
"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  APIProvider, 
  Map, 
  useMapsLibrary, 
  useMap, 
  AdvancedMarker,
  InfoWindow,
  MapMouseEvent
} from '@vis.gl/react-google-maps';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Battery, 
  MapPin, 
  Navigation, 
  Zap, 
  Route, 
  ChevronRight,
  Info,
  Car,
  LocateFixed,
  Map as MapIcon,
  Search,
  Crosshair,
  Target,
  AlertCircle,
  Star,
  ArrowRight,
  Loader2,
  GripVertical,
  Phone,
  Globe,
  Timer,
  Coins,
  Gauge,
  CircleDot,
  Save,
  FolderOpen,
  Trash2,
  Moon,
  Sun,
  Share2,
  Copy,
  Check,
  X,
  Volume2,
  VolumeX,
  Gauge as GaugeIcon,
  ChevronDown,
  Mic,
  Home,
  Briefcase,
  Clock,
  Compass,
  Thermometer,
  Smartphone,
} from 'lucide-react';
import {
  CHARGING_NETWORKS,
  VEHICLE_MODELS,
  DEFAULT_TARGET_CHARGE,
  RANGE_STANDARDS,
  toEpaRange,
  type RangeStandard,
  NETWORK_TARIFFS,
  getTariffRate,
  isPeakTime,
  type TariffMode,
  matchStationNetwork,
  UNKNOWN_NETWORK,
} from '@/lib/constants';
import { type SavedTrip, loadTrips, saveTrip, deleteTrip } from '@/lib/trips';
import { type Favorites, type FavKind, loadRecents, addRecent, loadFavorites, setFavorite, clearFavorite } from '@/lib/places';
import { speedRangeFactor, tempRangeFactor, fetchTemperature, chargeMinutes } from '@/lib/range-model';
import { useGeoWatch } from '@/hooks/use-geo-watch';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { cn } from '@/lib/utils';

// ตั้งค่า NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ใน .env.local / Vercel (ดู README)
// ห้ามฝัง key ในโค้ด — key เดิมที่เคยอยู่ตรงนี้หลุดใน git history แล้ว ต้อง rotate ใน Google Cloud Console
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// จัดการธีมสว่าง/มืด เก็บค่าใน localStorage และสลับคลาส .dark บน <html>
function useTheme(): [boolean, () => void] {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('chargeway_theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const dark = saved ? saved === 'dark' : !!prefersDark;
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  const toggle = () => {
    setIsDark(prev => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      window.localStorage.setItem('chargeway_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  return [isDark, toggle];
}

function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onToggle}
      title={isDark ? 'โหมดสว่าง' : 'โหมดมืด'}
      className="h-9 w-9 rounded-xl shrink-0"
    >
      {isDark ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-primary" />}
    </Button>
  );
}

// ไทยขับเลนซ้าย → สถานีที่เข้าได้ง่าย = ฝั่งซ้ายของทิศทางที่รถวิ่ง
const DRIVER_SIDE: 'left' | 'right' = 'left';
// ปั๊มที่อยู่ใกล้แนวเส้นทางกว่านี้ถือว่า "ก้ำกึ่ง" (เช่น หมุดตกกลางเกาะกลาง) ไม่ฟันธงซ้าย/ขวา
const NEAR_ROUTE_M = 15;

type RouteSide = 'left' | 'right' | 'near';

// หาว่าจุด (สถานี) อยู่ฝั่งซ้าย/ขวา/ก้ำกึ่ง ของเส้นทาง เทียบกับช่วงที่ใกล้ที่สุด
// คำนวณบนระบบพิกัด "เมตรท้องถิ่น" (คูณ lng ด้วย cos(lat) เพื่อตัด distortion)
// cross > 0 = ซ้ายของทิศวิ่ง, < 0 = ขวา; ถ้าใกล้เส้นมากให้ผลเป็น 'near'
function sideOfRoute(loc: google.maps.LatLng, path: google.maps.LatLng[]): RouteSide {
  const px = loc.lng(), py = loc.lat();
  const mPerLat = 111320;
  const mPerLng = 111320 * Math.cos(py * Math.PI / 180);
  // วางจุดปั๊มไว้ที่ origin (0,0) ของระบบเมตร แล้วเทียบเซกเมนต์รอบ ๆ
  let bestDist = Infinity;
  let crossAtBest = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const ax = (path[i].lng() - px) * mPerLng, ay = (path[i].lat() - py) * mPerLat;
    const bx = (path[i + 1].lng() - px) * mPerLng, by = (path[i + 1].lat() - py) * mPerLat;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy || 1e-9;
    let t = -(ax * dx + ay * dy) / len2; // โปรเจกต์ origin ลงบนเซกเมนต์
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx, cy = ay + t * dy;
    const dist = Math.hypot(cx, cy); // ระยะจากปั๊มถึงเส้น (เมตร)
    if (dist < bestDist) {
      bestDist = dist;
      crossAtBest = dx * (-ay) - dy * (-ax); // cross(ทิศเซกเมนต์, a→ปั๊ม)
    }
  }
  if (bestDist < NEAR_ROUTE_M) return 'near';
  return crossAtBest >= 0 ? 'left' : 'right';
}

// แปลงนาทีเป็นข้อความ เช่น "1 ชม. 20 นาที"
function formatMinutes(min: number): string {
  if (min <= 0) return '0 นาที';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} นาที`;
  if (m === 0) return `${h} ชม.`;
  return `${h} ชม. ${m} นาที`;
}

// แปลง timestamp เป็นเวลานาฬิกาแบบไทย เช่น "14:35 น."
function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
}

// ตรวจสถานะเปิด/ปิดของสถานี (รองรับทั้ง isOpen() และ open_now แบบเดิม)
function getOpenStatus(station: any): boolean | undefined {
  const oh = station?.opening_hours;
  if (!oh) return undefined;
  try {
    if (typeof oh.isOpen === 'function') return oh.isOpen();
  } catch { /* ignore */ }
  if (typeof oh.open_now === 'boolean') return oh.open_now;
  return undefined;
}

// ให้คะแนนสถานีเพื่อเลือก "ปั๊มที่ดีสุด" อัตโนมัติในโหมดนำทาง
// เกณฑ์: อยู่ฝั่งเดียวกับทิศเดินทาง (เข้าง่าย) > เรตติ้งสูง > รีวิวเยอะ > เปิดอยู่
function stationScore(s: any): number {
  let score = (s?.rating || 0);
  score += Math.log10((s?.user_ratings_total || 0) + 1) * 0.3;
  if (!s?.side || s.side === DRIVER_SIDE) score += 1;        // ฝั่งเดินทาง = เข้าสะดวก
  else if (s.side === 'near') score += 0.5;                  // ก้ำกึ่ง = อาจเข้าได้
  const open = getOpenStatus(s);
  if (open === true) score += 0.4;
  if (open === false) score -= 0.4;
  return score;
}

// เลือกปั๊มที่ดีสุดจากรายการตัวเลือกของจุดนั้น
function pickBestStation(candidates: any[]): any | null {
  if (!candidates || candidates.length === 0) return null;
  return [...candidates].sort((a, b) => stationScore(b) - stationScore(a))[0];
}


function StationRating({ rating, total }: { rating?: number; total?: number }) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center gap-1 text-amber-500 font-bold tabular-nums">
      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
      {rating.toFixed(1)}
      {total ? <span className="text-muted-foreground font-medium">({total})</span> : null}
    </span>
  );
}

export default function ChargeWayApp() {
  const [tripData, setTripData] = useState<any>(null);
  const [isPickingOnMap, setIsPickingOnMap] = useState<'origin' | 'destination' | null>(null);
  const [isDark, toggleTheme] = useTheme();

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="text-lg font-black text-foreground">ยังไม่ได้ตั้งค่า Google Maps API key</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            ตั้งค่า <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{' '}
            ใน <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">.env.local</code> (local)
            หรือ Environment Variables ของโฮสต์ แล้ว build ใหม่ — ดูวิธีใน README
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'geocoding', 'routes', 'geometry']}>
      <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen w-full bg-background overflow-x-hidden font-body selection:bg-primary/20">
        {/* Left Control Panel */}
        <div className="w-full lg:w-[420px] h-auto lg:h-full flex flex-col border-r border-border bg-card z-20 shadow-2xl relative lg:overflow-hidden">
          <header className="p-6 pb-4 border-b border-border/50 bg-white/50 dark:bg-card/50 backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-2xl">
                  <Zap className="text-primary w-6 h-6 fill-primary/20" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-primary">ChargeWay</h1>
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em]">Smart EV Journey Planner</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-full bg-secondary/5 text-secondary border-secondary/20 font-bold px-3 hidden sm:inline-flex">
                  EPA Standard
                </Badge>
                <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
              </div>
            </div>
          </header>

          <ScrollArea className="flex-1 h-auto lg:h-full">
            <main className="p-6 space-y-8">
              <TripForm 
                onPlanTrip={setTripData} 
                isPickingOnMap={isPickingOnMap}
                setIsPickingOnMap={setIsPickingOnMap}
              />
            </main>
          </ScrollArea>

          <footer className="p-4 border-t border-border/50 bg-muted/20 text-center hidden lg:block">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
              Powered by Google Places API • TH ·{' '}
              <a href="/privacy" className="underline hover:text-primary">นโยบายความเป็นส่วนตัว</a>
            </p>
          </footer>
        </div>

        {/* Right Map Panel & Summary */}
        <div className="flex-1 relative flex flex-col h-auto lg:h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto lg:overflow-hidden">
          <MapView 
            tripData={tripData} 
            isPickingOnMap={isPickingOnMap} 
            setIsPickingOnMap={setIsPickingOnMap}
          />
          {isPickingOnMap && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
              <div className="bg-primary/90 text-white px-6 py-3 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-3 animate-pulse">
                <Target className="w-5 h-5" />
                <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-center">
                  คลิกที่แผนที่เพื่อเลือก {isPickingOnMap === 'origin' ? 'จุดเริ่มต้น' : 'ปลายทาง'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </APIProvider>
  );
}

function TripForm({ 
  onPlanTrip, 
  isPickingOnMap, 
  setIsPickingOnMap 
}: { 
  onPlanTrip: (data: any) => void;
  isPickingOnMap: 'origin' | 'destination' | null;
  setIsPickingOnMap: (val: 'origin' | 'destination' | null) => void;
}) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [vehicleId, setVehicleId] = useState(VEHICLE_MODELS[0].id);
  const [fullRange, setFullRange] = useState(VEHICLE_MODELS[0].rangeKm);
  const [rangeStandard, setRangeStandard] = useState<RangeStandard>(VEHICLE_MODELS[0].standard);
  const [minBatteryThreshold, setMinBatteryThreshold] = useState(15);
  const [startSoc, setStartSoc] = useState(100); // % แบตตอนออกเดินทาง
  const [targetCharge, setTargetCharge] = useState(DEFAULT_TARGET_CHARGE);
  const [searchRadius, setSearchRadius] = useState(20); // กม.
  const [pricingNetworkId, setPricingNetworkId] = useState('ptt');
  const [tariffMode, setTariffMode] = useState<TariffMode>('auto');
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>(CHARGING_NETWORKS.map(n => n.id));
  const [isLocating, setIsLocating] = useState(false);
  const [tempMode, setTempMode] = useState<'auto' | 'manual'>('auto'); // อุณหภูมิเฉลี่ย: อัตโนมัติ/กำหนดเอง
  const [manualTemp, setManualTemp] = useState(32); // °C (ใช้เมื่อ tempMode = manual)

  const selectedVehicle = VEHICLE_MODELS.find(v => v.id === vehicleId) ?? VEHICLE_MODELS[0];

  const handleVehicleChange = (id: string) => {
    setVehicleId(id);
    const v = VEHICLE_MODELS.find(m => m.id === id);
    if (v && id !== 'custom') {
      setFullRange(v.rangeKm);
      setRangeStandard(v.standard);
    }
  };
  
  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');
  const { toast } = useToast();

  // ===== ปลายทางง่ายขึ้น: เสียง / ล่าสุด / โปรด =====
  const [recents, setRecents] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Favorites>({});
  const [listening, setListening] = useState<'origin' | 'destination' | null>(null);
  useEffect(() => { setRecents(loadRecents()); setFavorites(loadFavorites()); }, []);

  // ตั้งค่า/ล้าง รายการโปรด (บ้าน/ที่ทำงาน) จากค่าปลายทางปัจจุบัน
  const handleSetFavorite = (kind: FavKind) => {
    const addr = destination.trim();
    if (!addr) {
      toast({ variant: 'destructive', title: 'ยังไม่มีปลายทาง', description: 'ใส่ปลายทางก่อน แล้วกดบันทึกเป็นรายการโปรด' });
      return;
    }
    setFavorites(setFavorite(kind, addr));
    toast({ title: kind === 'home' ? 'บันทึกเป็นบ้านแล้ว' : 'บันทึกเป็นที่ทำงานแล้ว', description: addr });
  };
  const handleClearFavorite = (kind: FavKind) => setFavorites(clearFavorite(kind));

  // ค้นหาด้วยเสียง (Web Speech Recognition)
  const startVoice = (target: 'origin' | 'destination') => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({ variant: 'destructive', title: 'อุปกรณ์ไม่รองรับเสียง', description: 'เบราว์เซอร์นี้ยังไม่รองรับการค้นหาด้วยเสียง ลองพิมพ์แทนนะครับ' });
      return;
    }
    try {
      const rec = new SR();
      rec.lang = 'th-TH';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      setListening(target);
      rec.onresult = (e: any) => {
        const text = e.results?.[0]?.[0]?.transcript?.trim();
        if (text) {
          if (target === 'origin') setOrigin(text); else setDestination(text);
        }
      };
      rec.onerror = () => {
        setListening(null);
        toast({ variant: 'destructive', title: 'ฟังเสียงไม่สำเร็จ', description: 'ลองใหม่อีกครั้ง หรืออนุญาตไมโครโฟน' });
      };
      rec.onend = () => setListening(null);
      rec.start();
    } catch {
      setListening(null);
    }
  };

  const actualEpaRange = toEpaRange(fullRange, rangeStandard);
  // ระยะวิ่งได้จริงในเลกแรก = จาก %แบตเริ่มต้น ลงมาถึงจุดเริ่มชาร์จ
  const usableRange = Math.round(actualEpaRange * Math.max(0, startSoc - minBatteryThreshold) / 100);

  useEffect(() => {
    const handleLocationUpdate = (e: any) => {
      if (e.detail.type === 'origin') setOrigin(e.detail.address);
      if (e.detail.type === 'destination') setDestination(e.detail.address);
    };
    window.addEventListener('google-map-picker-update', handleLocationUpdate);
    return () => window.removeEventListener('google-map-picker-update', handleLocationUpdate);
  }, []);

  useEffect(() => {
    if (!placesLib || !originInputRef.current || !destinationInputRef.current) return;

    const options = {
      componentRestrictions: { country: "th" },
      fields: ["geometry", "formatted_address"],
    };

    const originAutocomplete = new placesLib.Autocomplete(originInputRef.current, options);
    const destinationAutocomplete = new placesLib.Autocomplete(destinationInputRef.current, options);

    originAutocomplete.addListener("place_changed", () => {
      const place = originAutocomplete.getPlace();
      if (place.formatted_address) setOrigin(place.formatted_address);
    });

    destinationAutocomplete.addListener("place_changed", () => {
      const place = destinationAutocomplete.getPlace();
      if (place.formatted_address) setDestination(place.formatted_address);
    });
  }, [placesLib]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Geolocation not supported",
        description: "เบราว์เซอร์ของคุณไม่รองรับการดึงตำแหน่งปัจจุบัน"
      });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (!geocodingLib) {
          setIsLocating(false);
          return;
        }

        const geocoder = new geocodingLib.Geocoder();
        geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
          setIsLocating(false);
          if (status === 'OK' && results && results[0]) {
            setOrigin(results[0].formatted_address);
          }
        });
      },
      () => {
        setIsLocating(false);
        toast({
          variant: "destructive",
          title: "Location Permission Denied",
          description: "ไม่สามารถเข้าถึงตำแหน่งของคุณได้ โปรดอนุญาตสิทธิ์การเข้าถึงตำแหน่ง"
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const toggleNetwork = (id: string) => {
    setSelectedNetworks(prev => 
      prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
    );
  };

  const handlePlanTrip = () => {
    if (!origin || !destination) return;
    setRecents(addRecent(destination)); // จำปลายทางล่าสุด
    onPlanTrip({
      origin,
      destination,
      fullRange,
      rangeStandard,
      epaRange: actualEpaRange,
      minBatteryThreshold,
      startSoc,
      selectedNetworks,
      vehicleName: selectedVehicle.name,
      batteryKwh: selectedVehicle.batteryKwh,
      chargingKw: selectedVehicle.maxDcKw,
      targetCharge,
      searchRadius,
      pricingNetworkId,
      tariffMode,
      tempMode,
      manualTemp,
    });
  };

  // ===== บันทึก/โหลดทริป =====
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [tripName, setTripName] = useState("");
  useEffect(() => { setSavedTrips(loadTrips()); }, []);

  // ตั้งชื่อเริ่มต้นแบบสั้น (เอาเฉพาะส่วนแรกของที่อยู่)
  const shortPlace = (addr: string) => addr.split(',')[0].trim().slice(0, 28);

  const openSaveDialog = () => {
    if (!origin || !destination) {
      toast({ variant: 'destructive', title: 'บันทึกไม่ได้', description: 'กรอกจุดเริ่มต้นและปลายทางก่อน' });
      return;
    }
    setTripName(`${shortPlace(origin)} → ${shortPlace(destination)}`);
    setSaveDialogOpen(true);
  };

  const confirmSaveTrip = () => {
    const name = tripName.trim() || `${shortPlace(origin)} → ${shortPlace(destination)}`;
    setSavedTrips(saveTrip({
      name, origin, destination, vehicleId, fullRange, rangeStandard,
      minBatteryThreshold, startSoc, targetCharge, searchRadius, pricingNetworkId, tariffMode, selectedNetworks,
    }));
    setSaveDialogOpen(false);
    toast({ title: 'บันทึกทริปแล้ว', description: name });
  };

  const handleLoadTrip = (t: SavedTrip) => {
    setOrigin(t.origin);
    setDestination(t.destination);
    setVehicleId(t.vehicleId);
    setFullRange(t.fullRange);
    setRangeStandard(t.rangeStandard);
    setMinBatteryThreshold(t.minBatteryThreshold);
    setStartSoc(t.startSoc ?? 100);
    setTargetCharge(t.targetCharge);
    setSearchRadius(t.searchRadius);
    setPricingNetworkId(t.pricingNetworkId);
    setTariffMode(t.tariffMode);
    setSelectedNetworks(t.selectedNetworks);
    const veh = VEHICLE_MODELS.find(v => v.id === t.vehicleId) ?? VEHICLE_MODELS[0];
    onPlanTrip({
      origin: t.origin,
      destination: t.destination,
      fullRange: t.fullRange,
      rangeStandard: t.rangeStandard,
      epaRange: toEpaRange(t.fullRange, t.rangeStandard),
      minBatteryThreshold: t.minBatteryThreshold,
      startSoc: t.startSoc ?? 100,
      selectedNetworks: t.selectedNetworks,
      vehicleName: veh.name,
      batteryKwh: veh.batteryKwh,
      chargingKw: veh.maxDcKw,
      targetCharge: t.targetCharge,
      searchRadius: t.searchRadius,
      pricingNetworkId: t.pricingNetworkId,
      tariffMode: t.tariffMode,
    });
    toast({ title: 'โหลดทริปแล้ว', description: t.name });
  };

  const handleDeleteTrip = (id: string) => setSavedTrips(deleteTrip(id));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
      <section className="space-y-3 min-w-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1.5 h-4 bg-primary rounded-full shrink-0" />
            <h2 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground truncate">ทริปของฉัน</h2>
          </div>
          <Button variant="outline" size="sm" onClick={openSaveDialog} className="h-8 rounded-xl gap-1.5 text-[11px] font-bold shrink-0">
            <Save className="w-3.5 h-3.5" /> บันทึก
          </Button>
        </div>
        {savedTrips.length > 0 ? (
          <div className="space-y-1.5 min-w-0">
            {savedTrips.map(t => (
              <div key={t.id} className="flex items-center gap-2 bg-muted/30 rounded-xl p-2 border border-border/40 hover:bg-muted/50 transition-colors min-w-0">
                <button onClick={() => handleLoadTrip(t)} className="flex-1 min-w-0 text-left flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold truncate block">{t.name}</span>
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(t.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => handleDeleteTrip(t.id)}
                  title="ลบทริป"
                  className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic px-1">ยังไม่มีทริปที่บันทึก — กด “บันทึก” เพื่อเก็บไว้ใช้ภายหลัง</p>
        )}

        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent className="rounded-3xl max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Save className="w-4 h-4 text-primary" /> บันทึกทริป
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">ตั้งชื่อทริป</Label>
              <Input
                value={tripName}
                onChange={e => setTripName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmSaveTrip(); }}
                placeholder="เช่น บ้าน → ที่ทำงาน"
                maxLength={60}
                autoFocus
                className="h-11 rounded-xl"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)} className="rounded-xl font-bold">ยกเลิก</Button>
              <Button onClick={confirmSaveTrip} className="rounded-xl font-bold gap-1.5">
                <Save className="w-4 h-4" /> บันทึก
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-4 bg-primary rounded-full" />
          <h2 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">เส้นทางเดินทาง</h2>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2 group">
            <div className="relative flex-1">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <MapPin className="w-4.5 h-4.5" />
              </div>
              <Input
                ref={originInputRef}
                placeholder="จุดเริ่มต้น"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                className="pl-11 pr-11 h-13 rounded-2xl border-border/80 focus:ring-primary/20 bg-background/50 text-sm font-medium transition-all"
              />
              <button
                type="button"
                title="ค้นหาด้วยเสียง"
                onClick={() => startVoice('origin')}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors",
                  listening === 'origin' ? "text-red-500 bg-red-500/10 animate-pulse" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                )}
              >
                <Mic className="w-4.5 h-4.5" />
              </button>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="icon"
                disabled={isLocating}
                className={cn("h-13 w-13 rounded-2xl", isLocating && "animate-pulse")}
                onClick={handleUseMyLocation}
              >
                {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <LocateFixed className="w-5 h-5 text-primary" />}
              </Button>
              <Button
                variant={isPickingOnMap === 'origin' ? 'default' : 'outline'}
                size="icon"
                className="h-13 w-13 rounded-2xl"
                onClick={() => setIsPickingOnMap(isPickingOnMap === 'origin' ? null : 'origin')}
              >
                <Crosshair className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 group">
            <div className="relative flex-1">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-secondary transition-colors">
                <Navigation className="w-4.5 h-4.5" />
              </div>
              <Input
                ref={destinationInputRef}
                placeholder="ปลายทาง"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                className="pl-11 pr-11 h-13 rounded-2xl border-border/80 focus:ring-secondary/20 bg-background/50 text-sm font-medium transition-all"
              />
              <button
                type="button"
                title="ค้นหาด้วยเสียง"
                onClick={() => startVoice('destination')}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors",
                  listening === 'destination' ? "text-red-500 bg-red-500/10 animate-pulse" : "text-muted-foreground hover:text-secondary hover:bg-secondary/10"
                )}
              >
                <Mic className="w-4.5 h-4.5" />
              </button>
            </div>
            <Button
              variant={isPickingOnMap === 'destination' ? 'default' : 'outline'}
              size="icon"
              className="h-13 w-13 rounded-2xl shrink-0"
              onClick={() => setIsPickingOnMap(isPickingOnMap === 'destination' ? null : 'destination')}
            >
              <Crosshair className="w-5 h-5" />
            </Button>
          </div>

          {/* ทางลัดใส่ปลายทาง: รายการโปรด + ปลายทางล่าสุด */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {/* บ้าน */}
            {favorites.home ? (
              <button
                type="button"
                onClick={() => setDestination(favorites.home!)}
                title={favorites.home}
                className="group inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-xl bg-secondary/10 text-secondary text-[11px] font-bold hover:bg-secondary/20 transition-colors max-w-[48%]"
              >
                <Home className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">บ้าน</span>
                <span onClick={(e) => { e.stopPropagation(); handleClearFavorite('home'); }} className="opacity-50 hover:opacity-100"><X className="w-3 h-3" /></span>
              </button>
            ) : (
              <button type="button" onClick={() => handleSetFavorite('home')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-dashed border-border text-muted-foreground text-[11px] font-bold hover:bg-muted/40 transition-colors">
                <Home className="w-3.5 h-3.5" /> ตั้งบ้าน
              </button>
            )}
            {/* ที่ทำงาน */}
            {favorites.work ? (
              <button
                type="button"
                onClick={() => setDestination(favorites.work!)}
                title={favorites.work}
                className="group inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-xl bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition-colors max-w-[48%]"
              >
                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">ที่ทำงาน</span>
                <span onClick={(e) => { e.stopPropagation(); handleClearFavorite('work'); }} className="opacity-50 hover:opacity-100"><X className="w-3 h-3" /></span>
              </button>
            ) : (
              <button type="button" onClick={() => handleSetFavorite('work')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-dashed border-border text-muted-foreground text-[11px] font-bold hover:bg-muted/40 transition-colors">
                <Briefcase className="w-3.5 h-3.5" /> ตั้งที่ทำงาน
              </button>
            )}
            {/* ปลายทางล่าสุด */}
            {recents.slice(0, 4).map((addr, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setDestination(addr)}
                title={addr}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted/50 text-foreground/80 text-[11px] font-medium hover:bg-muted transition-colors max-w-[48%]"
              >
                <Clock className="w-3 h-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{addr.split(',')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-4 bg-primary rounded-full" />
          <h2 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">การตั้งค่าพลังงาน (EPA Standard)</h2>
        </div>

        <div className="space-y-3 bg-muted/30 p-5 rounded-[1.5rem] border border-border/40">
          <Label className="flex items-center gap-2.5 text-sm font-bold text-foreground/80">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
              <Car className="w-4 h-4" />
            </div>
            เลือกรุ่นรถ EV
          </Label>
          <Select value={vehicleId} onValueChange={handleVehicleChange}>
            <SelectTrigger className="h-12 rounded-2xl bg-background/50 font-bold text-sm">
              <SelectValue placeholder="เลือกรุ่นรถ" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {VEHICLE_MODELS.map(v => (
                <SelectItem key={v.id} value={v.id} className="font-medium">
                  {v.name}
                  {v.id !== 'custom' && (
                    <span className="text-muted-foreground"> · {v.rangeKm} {v.standard} · {v.batteryKwh} kWh</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {vehicleId !== 'custom' && (
            <div className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground pt-1">
              <span className="flex items-center gap-1"><Battery className="w-3.5 h-3.5 text-secondary" /> {selectedVehicle.batteryKwh} kWh</span>
              <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5 text-secondary" /> ~{selectedVehicle.maxDcKw} kW DC</span>
            </div>
          )}
        </div>

        <div className="space-y-5 bg-muted/30 p-5 rounded-[1.5rem] border border-border/40 hover:bg-muted/40 transition-colors">
          <div className="flex justify-between items-center">
            <Label className="flex items-center gap-2.5 text-sm font-bold text-foreground/80">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <Car className="w-4 h-4" />
              </div>
              ระยะวิ่งสูงสุด (แบต 100%)
            </Label>
            <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1 rounded-xl tabular-nums">{fullRange} กม.</span>
          </div>
          <Slider
            value={[fullRange]}
            onValueChange={v => { setFullRange(v[0]); setVehicleId('custom'); }}
            max={1000}
            step={10}
            className="py-1 cursor-pointer"
          />

          <div className="flex items-center gap-1.5 pt-1">
            {RANGE_STANDARDS.map(std => (
              <button
                key={std}
                onClick={() => setRangeStandard(std)}
                className={cn(
                  "flex-1 py-1.5 rounded-xl text-[10px] font-black transition-all border",
                  rangeStandard === std
                    ? "bg-primary text-white border-primary shadow"
                    : "bg-background text-muted-foreground border-border/60 hover:border-primary/40"
                )}
              >
                {std}
              </button>
            ))}
          </div>
          <p className="text-[10px] font-medium text-muted-foreground text-center">
            มาตรฐานของตัวเลขที่กรอก · วิ่งจริงโดยประมาณ{" "}
            <span className="font-black text-green-600">{actualEpaRange} กม.</span> (EPA)
          </p>
        </div>

        <div className="space-y-5 bg-muted/30 p-5 rounded-[1.5rem] border border-border/40 hover:bg-muted/40 transition-colors">
          <div className="flex justify-between items-center">
            <Label className="flex items-center gap-2.5 text-sm font-bold text-foreground/80">
              <div className="p-1.5 bg-green-500/10 rounded-lg text-green-600">
                <Battery className="w-4 h-4" />
              </div>
              แบตตอนเริ่มเดินทาง (%)
            </Label>
            <span className="text-sm font-black text-green-600 bg-green-500/10 px-3 py-1 rounded-xl tabular-nums">{startSoc}%</span>
          </div>
          <Slider
            value={[startSoc]}
            onValueChange={v => setStartSoc(Math.max(v[0], minBatteryThreshold + 5))}
            max={100}
            min={20}
            step={5}
            className="py-1 cursor-pointer"
          />
        </div>

        <div className="space-y-5 bg-muted/30 p-5 rounded-[1.5rem] border border-border/40 hover:bg-muted/40 transition-colors">
          <div className="flex justify-between items-center">
            <Label className="flex items-center gap-2.5 text-sm font-bold text-foreground/80">
              <div className="p-1.5 bg-secondary/10 rounded-lg text-secondary">
                <Zap className="w-4 h-4" />
              </div>
              จุดเริ่มชาร์จ (แบตเหลือ %)
            </Label>
            <span className="text-sm font-black text-secondary bg-secondary/10 px-3 py-1 rounded-xl tabular-nums">{minBatteryThreshold}%</span>
          </div>
          <Slider
            value={[minBatteryThreshold]}
            // ดันแบตเริ่มต้นตามขึ้นไปด้วย กันกรณี "จุดเริ่มชาร์จ" สูงกว่าแบตที่มี (จะคำนวณจุดแวะไม่ได้)
            onValueChange={v => { setMinBatteryThreshold(v[0]); setStartSoc(s => Math.max(s, Math.min(100, v[0] + 5))); }}
            max={50}
            min={5}
            step={1}
            className="py-1 cursor-pointer"
          />
          
          <div className="pt-2 border-t border-border/40 mt-4 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <div className="bg-green-500/10 p-1 rounded-md">
                   <Route className="w-3.5 h-3.5 text-green-600" />
                </div>
                <div>
                   <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">ระยะวิ่งจริง (EPA Estimated)</span>
                </div>
             </div>
             <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-green-600 tabular-nums">{usableRange} กม.</span>
                <span className="text-[10px] font-bold text-muted-foreground italic">/ ชาร์จ</span>
             </div>
          </div>
        </div>

        <div className="space-y-5 bg-muted/30 p-5 rounded-[1.5rem] border border-border/40 hover:bg-muted/40 transition-colors">
          <div className="flex justify-between items-center">
            <Label className="flex items-center gap-2.5 text-sm font-bold text-foreground/80">
              <div className="p-1.5 bg-secondary/10 rounded-lg text-secondary">
                <Battery className="w-4 h-4" />
              </div>
              ชาร์จกลับถึง (เป้าหมาย %)
            </Label>
            <span className="text-sm font-black text-secondary bg-secondary/10 px-3 py-1 rounded-xl tabular-nums">{targetCharge}%</span>
          </div>
          <Slider
            value={[targetCharge]}
            onValueChange={v => setTargetCharge(v[0])}
            max={100}
            min={50}
            step={5}
            className="py-1 cursor-pointer"
          />
        </div>

        {/* ปรับระยะวิ่งตามอุณหภูมิ + ความเร็ว (ความเร็วเฉลี่ยดึงจากเส้นทางอัตโนมัติ) */}
        <div className="space-y-4 bg-muted/30 p-5 rounded-[1.5rem] border border-border/40 hover:bg-muted/40 transition-colors">
          <div className="flex justify-between items-center">
            <Label className="flex items-center gap-2.5 text-sm font-bold text-foreground/80">
              <div className="p-1.5 bg-orange-500/10 rounded-lg text-orange-500">
                <Thermometer className="w-4 h-4" />
              </div>
              อุณหภูมิเฉลี่ย (ปรับระยะวิ่ง)
            </Label>
            <div className="flex gap-1 bg-background/60 p-0.5 rounded-xl border border-border/50">
              {(['auto', 'manual'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setTempMode(m)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-black transition-colors",
                    tempMode === m ? "bg-orange-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m === 'auto' ? 'อัตโนมัติ' : 'กำหนดเอง'}
                </button>
              ))}
            </div>
          </div>
          {tempMode === 'manual' ? (
            <>
              <div className="flex justify-end">
                <span className="text-sm font-black text-orange-500 bg-orange-500/10 px-3 py-1 rounded-xl tabular-nums">{manualTemp}°C</span>
              </div>
              <Slider
                value={[manualTemp]}
                onValueChange={v => setManualTemp(v[0])}
                max={45}
                min={10}
                step={1}
                className="py-1 cursor-pointer"
              />
            </>
          ) : (
            <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
              ดึงอุณหภูมิจริงตามเส้นทางให้อัตโนมัติ · ความเร็วเฉลี่ยคำนวณจากเส้นทาง — แสดงผลที่ปรับในการ์ดสรุป
            </p>
          )}
        </div>

        <div className="space-y-5 bg-muted/30 p-5 rounded-[1.5rem] border border-border/40 hover:bg-muted/40 transition-colors">
          <div className="flex justify-between items-center">
            <Label className="flex items-center gap-2.5 text-sm font-bold text-foreground/80">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <Target className="w-4 h-4" />
              </div>
              รัศมีค้นหาสถานี
            </Label>
            <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1 rounded-xl tabular-nums">{searchRadius} กม.</span>
          </div>
          <Slider
            value={[searchRadius]}
            onValueChange={v => setSearchRadius(v[0])}
            max={50}
            min={5}
            step={1}
            className="py-1 cursor-pointer"
          />
        </div>

        <div className="space-y-3 bg-muted/30 p-5 rounded-[1.5rem] border border-border/40">
          <Label className="flex items-center gap-2.5 text-sm font-bold text-foreground/80">
            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500">
              <Coins className="w-4 h-4" />
            </div>
            ค่าไฟอ้างอิง (Peak / Off-peak)
          </Label>

          <Select value={pricingNetworkId} onValueChange={setPricingNetworkId}>
            <SelectTrigger className="h-11 rounded-2xl bg-background/50 font-bold text-sm">
              <SelectValue placeholder="เลือกเครือข่าย" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {CHARGING_NETWORKS.filter(n => NETWORK_TARIFFS[n.id]).map(n => (
                <SelectItem key={n.id} value={n.id} className="font-medium">
                  {n.name}
                  <span className="text-muted-foreground"> · {NETWORK_TARIFFS[n.id].peak}/{NETWORK_TARIFFS[n.id].offPeak} ฿</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            {([
              { id: 'auto', label: 'อัตโนมัติ' },
              { id: 'peak', label: 'Peak' },
              { id: 'offpeak', label: 'Off-peak' },
            ] as { id: TariffMode; label: string }[]).map(opt => (
              <button
                key={opt.id}
                onClick={() => setTariffMode(opt.id)}
                className={cn(
                  "flex-1 py-1.5 rounded-xl text-[11px] font-black transition-all border",
                  tariffMode === opt.id
                    ? "bg-amber-500 text-white border-amber-500 shadow"
                    : "bg-background text-muted-foreground border-border/60 hover:border-amber-400/50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-bold text-muted-foreground">
              {tariffMode === 'auto'
                ? `ตอนนี้ ${isPeakTime() ? 'Peak' : 'Off-peak'} · เลือกตามเวลาถึงจุดชาร์จ`
                : tariffMode === 'peak' ? 'คิดอัตรา Peak ทุกจุด' : 'คิดอัตรา Off-peak ทุกจุด'}
            </span>
            <span className="text-sm font-black text-amber-600 tabular-nums">
              {getTariffRate(pricingNetworkId, tariffMode)} ฿/kWh
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-4 bg-primary rounded-full" />
          <h2 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">เครือข่ายที่เลือก (Charging Networks)</h2>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {CHARGING_NETWORKS.map(network => (
            <button 
              key={network.id}
              onClick={() => toggleNetwork(network.id)}
              className={cn(
                "px-4 py-2 rounded-2xl text-[11px] font-bold border-2 transition-all duration-300",
                selectedNetworks.includes(network.id) 
                  ? "bg-primary text-white border-primary shadow-lg scale-105" 
                  : "bg-background text-muted-foreground border-border/60 hover:border-primary/40 hover:bg-muted/30"
              )}
            >
              {network.name}
            </button>
          ))}
        </div>
      </section>

      <Button 
        onClick={handlePlanTrip}
        className="w-full h-15 rounded-[1.25rem] text-base font-black transition-all bg-primary hover:bg-primary/90 text-white flex gap-3 items-center group shadow-lg"
      >
        <LocateFixed className="w-5.5 h-5.5 transition-transform group-hover:rotate-12" /> 
        คำนวณเส้นทางและจุดชาร์จ
      </Button>
    </div>
  );
}

function MapView({ 
  tripData, 
  isPickingOnMap, 
  setIsPickingOnMap 
}: { 
  tripData: any;
  isPickingOnMap: 'origin' | 'destination' | null;
  setIsPickingOnMap: (val: 'origin' | 'destination' | null) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');
  
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [plannedStops, setPlannedStops] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<{distance: string, duration: string, distanceKm: number} | null>(null);
  const [selectedStation, setSelectedStation] = useState<any | null>(null);
  // โหมดนำทาง: ปั๊มที่เลือกของแต่ละจุด (index ตรงกับ plannedStops); null = ใช้ค่าอัตโนมัติ
  const [selectedStops, setSelectedStops] = useState<(any | null)[]>([]);
  const [expandedStop, setExpandedStop] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchRadiusKm, setSearchRadiusKm] = useState(20);
  const [chargeStats, setChargeStats] = useState<{
    perStopKwh: number;
    perStopMin: number;
    totalMin: number;
    totalCost: number;
    rateLabel: string;
    networkId: string;
    tariffMode: TariffMode;
  } | null>(null);
  const [tripEta, setTripEta] = useState<{ destTs: number; totalTripMin: number } | null>(null);
  const [rangeAdjust, setRangeAdjust] = useState<{
    baseRange: number; effRange: number; reducePct: number; tempC: number; avgKmh: number;
    tempSource: 'auto' | 'manual' | 'fallback';
  } | null>(null);
  const { toast } = useToast();

  // กรองสถานีให้เหลือเฉพาะฝั่งเดียวกับทิศทางเดินทาง (สลับดูทั้งหมดได้)
  const [showAllSides, setShowAllSides] = useState(false);

  // ===== โหมดขับขี่สด (Live Driving Mode) =====
  const [isDriving, setIsDriving] = useState(false);
  const [nextStopIndex, setNextStopIndex] = useState(0);
  const [followCamera, setFollowCamera] = useState(true);
  const [headingUp, setHeadingUp] = useState(false); // false = ล็อกทิศเหนือ, true = หันหัวไปด้านหน้า
  const [nearAlert, setNearAlert] = useState<{ stopNo: number; km: number } | null>(null);
  const [destinationLatLng, setDestinationLatLng] = useState<google.maps.LatLng | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const firedRef = useRef<{ idx: number; t5: boolean; t2: boolean }>({ idx: 0, t5: false, t2: false });
  const isDrivingRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  useEffect(() => { isDrivingRef.current = isDriving; }, [isDriving]);

  const geo = useGeoWatch(isDriving);
  const wake = useWakeLock(isDriving);

  // เสียงเตือนสั้น ๆ (Web Audio) — สร้าง context ตอนกดเริ่มขับ (เป็น user gesture)
  const beep = useCallback((freq = 880, ms = 180) => {
    if (!soundOn) return;
    try {
      const ctx = audioRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + ms / 1000);
    } catch {
      /* ignore */
    }
  }, [soundOn]);

  // เสียงพูดภาษาไทย (Web Speech API)
  const thVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const speak = useCallback((text: string) => {
    if (!soundOn) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel(); // ตัดข้อความเก่าที่ค้างอยู่ พูดอันล่าสุดทันที
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'th-TH';
      u.rate = 1; u.pitch = 1; u.volume = 1;
      const voice = thVoiceRef.current
        ?? synth.getVoices().find(v => v.lang?.toLowerCase().startsWith('th'))
        ?? null;
      if (voice) { thVoiceRef.current = voice; u.voice = voice; }
      synth.speak(u);
    } catch {
      /* ignore */
    }
  }, [soundOn]);

  // โหลดรายชื่อเสียงไว้ล่วงหน้า (บางเบราว์เซอร์โหลดแบบ async)
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const load = () => {
      const v = synth.getVoices().find(vv => vv.lang?.toLowerCase().startsWith('th'));
      if (v) thVoiceRef.current = v;
    };
    load();
    synth.addEventListener?.('voiceschanged', load);
    return () => synth.removeEventListener?.('voiceschanged', load);
  }, []);

  // เตือน: ปี๊บนำ 1 จังหวะ แล้วพูดข้อความไทยตาม
  const announce = useCallback((freq: number, text: string) => {
    beep(freq);
    setTimeout(() => speak(text), 220);
  }, [beep, speak]);

  // ปั๊มที่จะใช้จริงของแต่ละจุด: ที่เลือกเอง หรือเลือกอัตโนมัติให้
  const resolvedStops: (any | null)[] = plannedStops.map((stop: any, i: number) =>
    selectedStops[i] ?? pickBestStation(stop.candidates)
  );

  // รายการเป้าหมายตามลำดับ: ตำแหน่งปั๊มจริงของแต่ละจุด (ปั๊มอาจห่างจากแนวเส้นทางได้หลาย กม.
  // ถ้าใช้จุดบนเส้นทางจะเตือน "ถึงจุดชาร์จ" กลางถนน) + ปลายทางเป็นเป้าสุดท้าย
  const driveTargets: google.maps.LatLng[] = [
    ...plannedStops.map((s: any, i: number) => resolvedStops[i]?.geometry?.location ?? s.location),
    ...(destinationLatLng ? [destinationLatLng] : []),
  ];

  const startDriving = () => {
    setNextStopIndex(0);
    setFollowCamera(true);
    setNearAlert(null);
    firedRef.current = { idx: 0, t5: false, t2: false };
    // เปิด AudioContext ตอนนี้ (อยู่ใน user gesture) เพื่อให้เสียงเตือนเล่นได้
    try {
      if (!audioRef.current) {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AC) audioRef.current = new AC();
      }
      audioRef.current?.resume?.();
    } catch { /* ignore */ }
    // ปลุก TTS ภายใน user gesture (จำเป็นบน iOS) + พูดทักทายเริ่มนำทาง
    speak('เริ่มโหมดขับขี่ ขับขี่ปลอดภัยนะครับ');
    setIsDriving(true);
    map?.setZoom(16);
  };

  const stopDriving = () => {
    setIsDriving(false);
    setNearAlert(null);
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    try { map?.setHeading?.(0); } catch { /* ignore */ }
  };

  // สถานีที่จะแสดง: ค่าเริ่มต้นเฉพาะฝั่งเดียวกับทิศทางขับ (เผื่อไม่มีข้อมูลฝั่งก็แสดง)
  const visibleStations = showAllSides
    ? stations
    : stations.filter((s: any) => !s.side || s.side === DRIVER_SIDE || s.side === 'near');

  // ดึงรายละเอียดเพิ่มเติมของสถานีที่เลือก (เบอร์โทร/เว็บไซต์/เวลาเปิด)
  const selectStation = useCallback((station: any) => {
    setSelectedStation(station);
    map?.panTo(station.geometry.location);
    if (!placesLib || !map || station.formatted_phone_number || station.website) return;
    const service = new google.maps.places.PlacesService(map);
    service.getDetails(
      { placeId: station.place_id, fields: ['formatted_phone_number', 'website', 'opening_hours', 'rating', 'user_ratings_total', 'url'] },
      (details, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && details) {
          setSelectedStation((prev: any) =>
            prev && prev.place_id === station.place_id ? { ...prev, ...details } : prev
          );
        }
      }
    );
  }, [placesLib, map]);

  // โหมดนำทาง: กำหนดปั๊มให้จุดที่ i (หรือส่ง null เพื่อกลับไปใช้แบบอัตโนมัติ)
  const chooseStationForStop = useCallback((stopIndex: number, station: any | null) => {
    setSelectedStops(prev => {
      const next = [...prev];
      next[stopIndex] = station;
      return next;
    });
    if (station) selectStation(station);
  }, [selectStation]);

  useEffect(() => {
    if (!routesLib || !map) return;
    const renderer = new google.maps.DirectionsRenderer({ 
      map, 
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#4080BF',
        strokeWeight: 6,
        strokeOpacity: 0.8
      }
    });
    setDirectionsRenderer(renderer);
    return () => renderer.setMap(null);
  }, [routesLib, map]);

  const handleMapClick = useCallback((e: MapMouseEvent) => {
    if (!isPickingOnMap || !e.detail.latLng || !geocodingLib) return;

    const geocoder = new geocodingLib.Geocoder();
    geocoder.geocode({ location: e.detail.latLng }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        window.dispatchEvent(new CustomEvent('google-map-picker-update', {
          detail: { type: isPickingOnMap, address: results[0].formatted_address }
        }));
        setIsPickingOnMap(null);
      }
    });
  }, [isPickingOnMap, geocodingLib, setIsPickingOnMap]);

  // ค้นสถานีรอบจุดแวะแบบกว้าง 2 ครั้ง (type + คีย์เวิร์ดรวม) แล้วค่อยกรองแบรนด์ฝั่ง client
  // ด้วย matchStationNetwork — เดิมยิงคีย์เวิร์ดแยกต่อเครือข่าย ~15 ครั้ง/จุดแวะ ทำให้ค่า
  // Places API ต่อการวางแผน 1 ครั้งสูงมากและชนโควตาฟรีเร็ว
  const searchStationsAtLocation = useCallback(async (location: google.maps.LatLng, radiusKm: number = 20) => {
    if (!placesLib || !map) return [];

    const service = new google.maps.places.PlacesService(map);
    const requests: google.maps.places.PlaceSearchRequest[] = [
      { location, radius: radiusKm * 1000, type: 'car_charging_station' },
      { location, radius: radiusKm * 1000, keyword: 'สถานีชาร์จ EV charging station' },
    ];

    const searchPromises = requests.map(request => {
      return new Promise<any[]>((resolve) => {
        service.nearbySearch(request, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            resolve(results);
          } else {
            resolve([]);
          }
        });
      });
    });

    const resultsArray = await Promise.all(searchPromises);
    const allResults = resultsArray.flat();

    const uniqueMap = new window.Map();
    allResults.forEach(res => {
      if (res.place_id) uniqueMap.set(res.place_id, res);
    });

    return Array.from(uniqueMap.values());
  }, [placesLib, map]);

  useEffect(() => {
    if (!tripData || !routesLib || !directionsRenderer || !map) return;
    
    const calculateRoute = async () => {
      setIsLoading(true);
      const {
        origin, destination, epaRange, minBatteryThreshold, selectedNetworks,
        batteryKwh = 60, chargingKw = 60, targetCharge = 80,
        searchRadius = 20, pricingNetworkId = 'ptt', tariffMode = 'auto',
        startSoc = 100, tempMode = 'auto', manualTemp = 32,
      } = tripData;
      setSearchRadiusKm(searchRadius);
      const directionsService = new google.maps.DirectionsService();
      
      try {
        const result = await directionsService.route({
          origin,
          destination,
          travelMode: google.maps.TravelMode.DRIVING,
        });

        directionsRenderer.setDirections(result);
        const route = result.routes[0].legs[0];
        setDestinationLatLng(route.end_location);

        setRouteInfo({
          distance: route.distance?.text || '0 km',
          duration: route.duration?.text || '0 mins',
          distanceKm: (route.distance?.value || 0) / 1000
        });

        setStations([]);
        setPlannedStops([]);
        setSelectedStation(null);
        setSelectedStops([]);
        setExpandedStop(null);
        setChargeStats(null);
        setTripEta(null);
        setRangeAdjust(null);

        const path = result.routes[0].overview_path;

        // ===== ปรับระยะวิ่ง EPA ตามอุณหภูมิเฉลี่ย + ความเร็วเฉลี่ย =====
        const totalKmRaw = (route.distance?.value || 0) / 1000;
        const totalHrRaw = (route.duration?.value || 0) / 3600;
        const avgKmh = totalHrRaw > 0 ? totalKmRaw / totalHrRaw : 90;
        // อุณหภูมิ: ดึงอัตโนมัติที่กลางเส้นทาง หรือใช้ค่าที่ผู้ใช้กำหนด
        let tempC = manualTemp;
        let tempSource: 'auto' | 'manual' | 'fallback' = 'manual';
        if (tempMode === 'auto') {
          const mid = path[Math.floor(path.length / 2)] || route.start_location;
          const fetched = await fetchTemperature(mid.lat(), mid.lng());
          if (fetched != null) { tempC = fetched; tempSource = 'auto'; }
          else { tempC = 32; tempSource = 'fallback'; } // ดึงไม่ได้ → ใช้ค่าประมาณไทย
        }
        const sFactor = speedRangeFactor(avgKmh);
        const tFactor = tempRangeFactor(tempC);
        const factor = sFactor * tFactor;
        const effEpaRange = epaRange * factor;
        setRangeAdjust({
          baseRange: Math.round(epaRange),
          effRange: Math.round(effEpaRange),
          reducePct: Math.round((1 - factor) * 100),
          tempC: Math.round(tempC),
          avgKmh: Math.round(avgKmh),
          tempSource,
        });

        // เลกแรก: จาก %แบตเริ่มต้น ลงมาถึงจุดเริ่มชาร์จ
        // เลกถัดไป: จาก %เป้าหมายชาร์จ ลงมาถึงจุดเริ่มชาร์จ
        const firstLegRange = effEpaRange * Math.max(0, startSoc - minBatteryThreshold) / 100;
        const nextLegRange = effEpaRange * Math.max(0, targetCharge - minBatteryThreshold) / 100;

        // การตั้งค่าที่ขัดกันทำให้วางจุดแวะไม่ได้ — ถ้าปล่อยผ่านจะกลายเป็นบอกผู้ใช้ว่า
        // "เดินทางได้รวดเดียว" ทั้งที่แบตไม่พอ ต้องหยุด เคลียร์การ์ดสรุป และแจ้งให้แก้ค่าก่อน
        if (firstLegRange <= 0 || (totalKmRaw > firstLegRange && nextLegRange <= 0)) {
          setRouteInfo(null);
          setRangeAdjust(null);
          toast({
            variant: 'destructive',
            title: 'ตั้งค่าแบตเตอรี่ขัดกัน',
            description: firstLegRange <= 0
              ? 'แบตตอนเริ่มเดินทางต้องมากกว่า "จุดเริ่มชาร์จ" — ปรับค่าแล้วลองใหม่'
              : 'เป้าหมายชาร์จต้องมากกว่า "จุดเริ่มชาร์จ" — ปรับค่าแล้วลองใหม่',
          });
          return;
        }

        const stops: any[] = [];
        const allFoundStations: any[] = [];
        // เส้นทางแบบละเอียด (จุดถี่จาก steps) สำหรับตัดสินฝั่งซ้าย/ขวาให้แม่นบนทางแบ่งเกาะกลาง
        const detailedPath: google.maps.LatLng[] = [];
        (result.routes[0].legs[0].steps || []).forEach((step: any) => {
          if (step.path && step.path.length) detailedPath.push(...step.path);
        });
        const sidePath = detailedPath.length > 1 ? detailedPath : path;
        let currentSegmentDist = 0;
        let cumulativeDist = 0;

        for (let i = 0; i < path.length - 1; i++) {
          const d = google.maps.geometry.spherical.computeDistanceBetween(path[i], path[i+1]) / 1000;
          currentSegmentDist += d;
          cumulativeDist += d;

          const legLimit = stops.length === 0 ? firstLegRange : nextLegRange;
          if (legLimit > 0 && currentSegmentDist >= legLimit) {
            const stopLoc = path[i+1];
            stops.push({ location: stopLoc, atKm: Math.round(cumulativeDist) });
            const found = await searchStationsAtLocation(stopLoc, searchRadius);
            allFoundStations.push(...found);
            currentSegmentDist = 0;
          }
        }

        // คำนวณเวลาชาร์จ + ค่าไฟต่อจุด + เวลาถึง (ETA) ตามเวลาออกเดินทาง = ตอนนี้
        const totalKm = (route.distance?.value || 0) / 1000;
        const totalDurationSec = route.duration?.value || 0;
        const now = Date.now();
        const chargePercent = Math.max(0, targetCharge - minBatteryThreshold) / 100;
        const perStopKwh = batteryKwh * chargePercent;
        // เวลาชาร์จคิดตามกราฟชาร์จจริง (ช้าลงช่วงท้าย) แทนแบบเชิงเส้น
        const perStopMin = chargeMinutes(batteryKwh, chargingKw, minBatteryThreshold, targetCharge);

        let totalCost = 0;
        let cumulativeChargeMin = 0;
        const rates: number[] = [];
        stops.forEach((s) => {
          const driveSec = totalKm > 0 ? (s.atKm / totalKm) * totalDurationSec : 0;
          const arrival = new Date(now + driveSec * 1000 + cumulativeChargeMin * 60000);
          s.etaTs = arrival.getTime();           // เวลาถึงจุดแวะ (ก่อนชาร์จ)
          cumulativeChargeMin += perStopMin;      // บวกเวลาชาร์จที่จุดนี้
          const rate = getTariffRate(pricingNetworkId, tariffMode, arrival);
          rates.push(rate);
          totalCost += perStopKwh * rate;
        });

        // ETA ถึงปลายทาง = เวลาขับทั้งหมด + เวลาชาร์จรวมทุกจุด
        const totalChargeMin = perStopMin * stops.length;
        const destTs = now + totalDurationSec * 1000 + totalChargeMin * 60000;
        const totalTripMin = totalDurationSec / 60 + totalChargeMin;
        setTripEta({ destTs, totalTripMin: Math.round(totalTripMin) });

        if (stops.length > 0) {
          const minRate = Math.min(...rates);
          const maxRate = Math.max(...rates);
          setChargeStats({
            perStopKwh: Math.round(perStopKwh * 10) / 10,
            perStopMin: Math.round(perStopMin),
            totalMin: Math.round(totalChargeMin),
            totalCost: Math.round(totalCost),
            rateLabel: minRate === maxRate ? `${minRate}` : `${minRate}–${maxRate}`,
            networkId: pricingNetworkId,
            tariffMode,
          });
        }

        const finalUniqueMap = new window.Map();
        allFoundStations.forEach(res => {
          // แสดงเฉพาะเครือข่ายที่รู้จัก และตรงกับเครือข่ายที่ผู้ใช้เลือกไว้ (ไม่เลือกเลย = ทุกเครือข่ายที่รู้จัก)
          const net = matchStationNetwork(res.name);
          if (res.place_id && net && (selectedNetworks.length === 0 || selectedNetworks.includes(net.id))) {
            // ระบุว่าสถานีอยู่ฝั่งไหนของทิศทางเดินทาง (ซ้าย/ขวา/ก้ำกึ่ง) ด้วยเส้นละเอียด
            res.side = sideOfRoute(res.geometry.location, sidePath);
            finalUniqueMap.set(res.place_id, res);
          }
        });

        const knownStations = Array.from(finalUniqueMap.values());

        // จับสถานีแต่ละแห่งเข้ากับ "จุดแวะ" ที่ใกล้ที่สุด -> เป็นตัวเลือกของจุดนั้น
        const geomLib = google.maps.geometry.spherical;
        stops.forEach((s: any) => { s.candidates = []; });
        knownStations.forEach((st: any) => {
          let bestIdx = 0, bestDist = Infinity;
          stops.forEach((s: any, i: number) => {
            const dd = geomLib.computeDistanceBetween(st.geometry.location, s.location);
            if (dd < bestDist) { bestDist = dd; bestIdx = i; }
          });
          stops[bestIdx].candidates.push(st);
        });
        stops.forEach((s: any) => { s.candidates.sort((a: any, b: any) => stationScore(b) - stationScore(a)); });

        setStations(knownStations);
        setPlannedStops(stops);
        setSelectedStops(stops.map(() => null)); // เริ่มต้นทุกจุด = อัตโนมัติ
        
        if (!isDrivingRef.current) {
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(route.start_location);
          bounds.extend(route.end_location);
          stops.forEach(s => bounds.extend(s.location));
          map?.fitBounds(bounds, 80);
        }

      } catch (err) {
        console.error("Route planning failed", err);
        toast({
          variant: 'destructive',
          title: 'คำนวณเส้นทางไม่สำเร็จ',
          description: 'ไม่พบเส้นทางจากจุดเริ่มต้นไปปลายทาง — ตรวจสอบชื่อสถานที่หรือการเชื่อมต่อ แล้วลองใหม่อีกครั้ง',
        });
      } finally {
        setIsLoading(false);
      }
    };

    calculateRoute();
  }, [tripData, routesLib, directionsRenderer, searchStationsAtLocation, map]);

  // กล้องเลื่อนตามรถขณะขับ — North-up หรือ heading-up (หมุนตามทิศที่วิ่ง)
  useEffect(() => {
    if (isDriving && followCamera && geo.ready && map) {
      map.panTo({ lat: geo.lat, lng: geo.lng });
      // หมุนแผนที่ให้ทิศที่วิ่งชี้ขึ้น เฉพาะตอนเคลื่อนที่ (กันหมุนมั่วตอนจอด/ทิศแกว่ง)
      if (headingUp && geo.heading != null && (geo.speed ?? 0) > 3) {
        try { map.setHeading?.(geo.heading); } catch { /* ignore */ }
      }
    }
  }, [geo.lat, geo.lng, geo.heading, geo.speed, geo.ready, isDriving, followCamera, headingUp, map]);

  // กลับทิศเหนือเมื่อปิด heading-up
  useEffect(() => {
    if (!headingUp && map) { try { map.setHeading?.(0); } catch { /* ignore */ } }
  }, [headingUp, map]);

  // ผู้ใช้ลากแผนที่เอง → ปิดการเลื่อนตาม (มีปุ่ม "กลับไปที่รถ" ให้กดเปิดใหม่)
  useEffect(() => {
    if (!isDriving || !map) return;
    const listener = map.addListener('dragstart', () => setFollowCamera(false));
    return () => listener.remove();
  }, [isDriving, map]);

  // ตรวจระยะถึงเป้าหมายถัดไป: เตือนล่วงหน้า 5/2 กม. และเด้งเมื่อถึง (400 ม.)
  useEffect(() => {
    if (!isDriving || !geo.ready || nextStopIndex >= driveTargets.length) return;
    const geom = (window as any).google?.maps?.geometry?.spherical;
    if (!geom) return;

    const car = new google.maps.LatLng(geo.lat, geo.lng);
    const target = driveTargets[nextStopIndex];
    const meters = geom.computeDistanceBetween(car, target);
    const isChargingStop = nextStopIndex < plannedStops.length;

    if (isChargingStop) {
      if (firedRef.current.idx !== nextStopIndex) {
        firedRef.current = { idx: nextStopIndex, t5: false, t2: false };
      }
      if (meters <= 5000 && !firedRef.current.t5) {
        firedRef.current.t5 = true;
        announce(880, `อีกประมาณ 5 กิโลเมตร ถึงจุดชาร์จที่ ${nextStopIndex + 1}`);
        toast({ title: `ใกล้ถึงจุดชาร์จที่ ${nextStopIndex + 1}`, description: 'อีกประมาณ 5 กม.' });
      }
      if (meters <= 2000 && !firedRef.current.t2) {
        firedRef.current.t2 = true;
        announce(1100, `อีกประมาณ 2 กิโลเมตร เตรียมเข้าจุดชาร์จที่ ${nextStopIndex + 1}`);
        toast({ title: `ใกล้ถึงจุดชาร์จที่ ${nextStopIndex + 1} แล้ว!`, description: 'อีกประมาณ 2 กม.' });
      }
      setNearAlert(meters <= 5000 ? { stopNo: nextStopIndex + 1, km: Math.max(0.1, meters / 1000) } : null);
    }

    if (meters <= 400) {
      if (isChargingStop) {
        announce(988, `ถึงจุดชาร์จที่ ${nextStopIndex + 1} แล้ว พร้อมชาร์จได้เลย`);
        toast({ title: `ถึงจุดแวะที่ ${nextStopIndex + 1} แล้ว`, description: 'พร้อมชาร์จได้เลย' });
        setNextStopIndex(i => i + 1);
        setNearAlert(null);
      } else {
        announce(988, 'ถึงปลายทางแล้ว เดินทางปลอดภัยนะครับ');
        toast({ title: 'ถึงปลายทางแล้ว 🎉', description: 'เดินทางปลอดภัยนะครับ' });
        stopDriving();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.lat, geo.lng, geo.ready, isDriving, nextStopIndex]);

  const openInGoogleMaps = () => {
    if (!directionsRenderer) return;
    const dirs = directionsRenderer.getDirections();
    if (!dirs) return;

    const route = dirs.routes[0].legs[0];
    const originStr = encodeURIComponent(route.start_address);
    const destinationStr = encodeURIComponent(route.end_address);

    let url = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destinationStr}`;

    // แทรกปั๊มที่เลือก/เลือกอัตโนมัติของทุกจุดเป็น waypoints ตามลำดับ
    const waypoints = resolvedStops
      .filter(Boolean)
      .map((s: any) => `${s.geometry.location.lat()},${s.geometry.location.lng()}`);
    if (waypoints.length > 0) {
      url += `&waypoints=${encodeURIComponent(waypoints.join('|'))}`;
    }

    window.open(url, '_blank');
  };

  // สร้างข้อความสรุปทริปสำหรับแชร์/คัดลอก
  const buildSummary = () => {
    const lines = [
      '🚗 แผนเดินทาง EV — ChargeWay',
      `📍 จาก: ${tripData?.origin ?? '-'}`,
      `🏁 ถึง: ${tripData?.destination ?? '-'}`,
    ];
    if (tripData?.vehicleName) lines.push(`🔋 รถ: ${tripData.vehicleName}`);
    if (routeInfo) lines.push(`🛣️ ระยะทาง: ${routeInfo.distance} · เวลาขับ ~${routeInfo.duration}`);
    if (rangeAdjust) lines.push(`🌡️ ระยะวิ่งปรับแล้ว ~${rangeAdjust.effRange} กม. (EPA ${rangeAdjust.baseRange} · ${rangeAdjust.tempC}°C · ${rangeAdjust.avgKmh} กม./ชม.)`);
    lines.push(`⚡ จุดแวะชาร์จ: ${plannedStops.length} จุด`);
    if (chargeStats) {
      const netName = CHARGING_NETWORKS.find(n => n.id === chargeStats.networkId)?.name ?? '';
      const totalKwh = Math.round(chargeStats.perStopKwh * plannedStops.length);
      lines.push(`🔌 ชาร์จรวม ~${totalKwh} kWh · เวลาชาร์จ ~${formatMinutes(chargeStats.totalMin)}`);
      lines.push(`💰 ค่าไฟรวม ~${chargeStats.totalCost.toLocaleString()} ฿ (${netName} ${chargeStats.rateLabel} ฿/kWh)`);
    }
    if (tripEta) lines.push(`🕒 ถึงปลายทาง ~${formatClock(tripEta.destTs)} (รวม ${formatMinutes(tripEta.totalTripMin)})`);
    return lines.join('\n');
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildSummary());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard ไม่พร้อมใช้งาน */
    }
  };

  const handleShareSummary = async () => {
    const text = buildSummary();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'แผนเดินทาง EV — ChargeWay', text });
        return;
      } catch {
        /* ผู้ใช้ยกเลิก หรือ share ใช้ไม่ได้ → ตกไปคัดลอกแทน */
      }
    }
    handleCopySummary();
  };

  return (
    <>
      <div className={cn(
        isDriving
          ? "fixed inset-0 z-50 w-screen h-[100dvh]"
          : "relative w-full h-[50vh] lg:h-full shrink-0"
      )}>
        <Map
          mapId="charge_way_v5"
          defaultCenter={{ lat: 13.7367, lng: 100.5231 }}
          defaultZoom={12}
          gestureHandling={'greedy'}
          className="w-full h-full"
          onClick={handleMapClick}
        >
          {plannedStops.map((stop, i) => {
            const passed = isDriving && i < nextStopIndex;
            const upcoming = isDriving && i === nextStopIndex;
            return (
              <AdvancedMarker key={`stop-${i}`} position={stop.location} zIndex={upcoming ? 40 : 10}>
                <div
                  className={cn(
                    "bg-secondary text-white px-3 py-1.5 rounded-2xl shadow-2xl border-2 border-white flex flex-col items-center transition-all",
                    passed ? "opacity-40" : "animate-bounce",
                    upcoming && "scale-110 ring-4 ring-blue-400/50"
                  )}
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span className="text-[9px] font-black uppercase tracking-wider">จุดแวะที่ {i + 1} ({stop.atKm} กม.)</span>
                  {stop.etaTs && <span className="text-[8px] font-bold opacity-90">~{formatClock(stop.etaTs)}</span>}
                </div>
              </AdvancedMarker>
            );
          })}

          {isDriving && geo.ready && (
            <AdvancedMarker position={{ lat: geo.lat, lng: geo.lng }} zIndex={100}>
              <div className="relative w-9 h-9">
                <span className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
                <div
                  className="relative w-9 h-9 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center"
                  style={{ transform: `rotate(${headingUp ? 0 : (geo.heading ?? 0)}deg)` }}
                >
                  <Navigation className="w-4 h-4 text-white fill-white" />
                </div>
              </div>
            </AdvancedMarker>
          )}

          {visibleStations.map((station, i) => {
            const net = matchStationNetwork(station.name) ?? UNKNOWN_NETWORK;
            const isSelected = selectedStation?.place_id === station.place_id;
            return (
              <AdvancedMarker
                key={station.place_id || i}
                position={station.geometry.location}
                title={`${net.name} · ${station.name}`}
                zIndex={isSelected ? 50 : 1}
                onClick={() => selectStation(station)}
              >
                <div
                  className={cn(
                    "flex items-center gap-1 rounded-full border-2 border-white shadow-lg font-black text-white transition-transform",
                    isSelected ? "px-2.5 py-1 scale-110 ring-2 ring-offset-1 ring-orange-400" : "px-2 py-0.5"
                  )}
                  style={{ backgroundColor: net.color }}
                >
                  <Zap className={cn("fill-white", isSelected ? "w-3.5 h-3.5" : "w-3 h-3")} />
                  <span className={cn("tracking-tight", isSelected ? "text-[11px]" : "text-[10px]")}>{net.short}</span>
                </div>
              </AdvancedMarker>
            );
          })}

          {selectedStation && (
            <InfoWindow
              position={selectedStation.geometry.location}
              onCloseClick={() => setSelectedStation(null)}
            >
              <div className="p-2 min-w-[220px] max-w-[260px]">
                {selectedStation.photos?.[0] && (
                  <img
                    src={selectedStation.photos[0].getUrl({ maxWidth: 320, maxHeight: 140 })}
                    alt={selectedStation.name}
                    className="w-full h-24 object-cover rounded-lg mb-2"
                  />
                )}
                {(() => {
                  const net = matchStationNetwork(selectedStation.name) ?? UNKNOWN_NETWORK;
                  return (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black text-white mb-1"
                      style={{ backgroundColor: net.color }}
                    >
                      <Zap className="w-2.5 h-2.5 fill-white" /> {net.name}
                    </span>
                  );
                })()}
                <h3 className="font-black text-sm text-primary mb-1">{selectedStation.name}</h3>
                <div className="flex items-center gap-2 mb-1 text-[11px]">
                  <StationRating rating={selectedStation.rating} total={selectedStation.user_ratings_total} />
                  {getOpenStatus(selectedStation) !== undefined && (
                    <span className={cn("font-bold", getOpenStatus(selectedStation) ? "text-green-600" : "text-red-500")}>
                      {getOpenStatus(selectedStation) ? "เปิดอยู่" : "ปิดอยู่"}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug mb-2">{selectedStation.vicinity}</p>
                <div className="flex gap-2 mt-2">
                  {selectedStation.formatted_phone_number && (
                    <a href={`tel:${selectedStation.formatted_phone_number}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full h-8 text-[10px] font-bold rounded-xl gap-1">
                        <Phone className="w-3.5 h-3.5" /> โทร
                      </Button>
                    </a>
                  )}
                  {selectedStation.website && (
                    <a href={selectedStation.website} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button size="sm" variant="outline" className="w-full h-8 text-[10px] font-bold rounded-xl gap-1">
                        <Globe className="w-3.5 h-3.5" /> เว็บไซต์
                      </Button>
                    </a>
                  )}
                </div>
                <Button
                  size="sm"
                  className="w-full mt-2 h-8 text-[10px] font-bold rounded-xl gap-1"
                  onClick={openInGoogleMaps}
                >
                  <Navigation className="w-3.5 h-3.5" /> นำทางผ่านสถานีนี้
                </Button>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedStation.name || `${selectedStation.geometry.location.lat()},${selectedStation.geometry.location.lng()}`)}${selectedStation.place_id ? `&query_place_id=${selectedStation.place_id}` : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 h-8 text-[10px] font-bold rounded-xl gap-1"
                  >
                    <MapIcon className="w-3.5 h-3.5" /> เปิดสถานีนี้ใน Google Maps
                  </Button>
                </a>
                {(() => {
                  const net = matchStationNetwork(selectedStation.name);
                  if (!net?.appUrl) return null;
                  return (
                    <a href={net.appUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2 h-8 text-[10px] font-bold rounded-xl gap-1"
                        style={{ borderColor: net.color, color: net.color }}
                      >
                        <Smartphone className="w-3.5 h-3.5" /> เปิดแอป {net.short} (ดูสถานะ/จองเอง)
                      </Button>
                    </a>
                  );
                })()}
              </div>
            </InfoWindow>
          )}
        </Map>

        {stations.length > 0 && (
          <div className="absolute bottom-3 left-3 z-20 bg-white/90 dark:bg-card/90 backdrop-blur-md rounded-2xl shadow-lg border border-border/40 px-3 py-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">เครือข่าย</p>
            <div className="flex flex-col gap-1">
              {CHARGING_NETWORKS.map(net => (
                <div key={net.id} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full border border-white shadow" style={{ backgroundColor: net.color }} />
                  <span className="text-[9px] font-bold text-foreground/80">{net.short}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isDriving && (
          <div className="absolute inset-0 z-30 pointer-events-none p-3 flex flex-col justify-between">
            {/* แถบสถานะบน */}
            <div className="flex items-start justify-between gap-2">
              <div className="pointer-events-auto bg-white/90 dark:bg-card/90 backdrop-blur-md rounded-full shadow-lg border border-border/40 px-3 py-1.5 flex items-center gap-2">
                {geo.error === 'denied' || (!geo.ready && geo.error) ? (
                  <span className="text-[11px] font-black text-red-500">ไม่พบสัญญาณ GPS</span>
                ) : !geo.ready ? (
                  <span className="text-[11px] font-black text-amber-500">รอสัญญาณ GPS…</span>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[11px] font-black text-foreground/80">ขับอยู่</span>
                  </>
                )}
                {!wake.supported && (
                  <span className="text-[9px] font-bold text-muted-foreground">(หน้าจออาจดับ)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setHeadingUp(v => !v)}
                  variant="outline"
                  size="icon"
                  title={headingUp ? 'มุมมอง: หันหัวไปด้านหน้า (กดเพื่อล็อกทิศเหนือ)' : 'มุมมอง: ล็อกทิศเหนือ (กดเพื่อหันหัวไปด้านหน้า)'}
                  className={cn(
                    "pointer-events-auto h-11 w-11 rounded-2xl backdrop-blur-md shadow-lg shrink-0",
                    headingUp ? "bg-primary text-white" : "bg-white/90 dark:bg-card/90"
                  )}
                >
                  {headingUp ? <Navigation className="w-4 h-4 fill-white" /> : <Compass className="w-4 h-4 text-primary" />}
                </Button>
                <Button
                  onClick={() => setSoundOn(v => { if (v) { try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } } return !v; })}
                  variant="outline"
                  size="icon"
                  title={soundOn ? 'ปิดเสียงเตือน' : 'เปิดเสียงเตือน'}
                  className="pointer-events-auto h-11 w-11 rounded-2xl bg-white/90 dark:bg-card/90 backdrop-blur-md shadow-lg shrink-0"
                >
                  {soundOn ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
                </Button>
                <Button
                  onClick={stopDriving}
                  variant="outline"
                  className="pointer-events-auto h-11 rounded-2xl font-black gap-1.5 bg-white/90 dark:bg-card/90 backdrop-blur-md shadow-lg"
                >
                  <X className="w-4 h-4" /> ออกจากโหมดขับ
                </Button>
              </div>
            </div>

            {/* การ์ดล่าง: จุดถัดไป + ระยะ + เตือน */}
            <div className="flex flex-col items-center gap-2">
              {nearAlert && (
                <div className="pointer-events-auto bg-amber-500 text-white px-4 py-2 rounded-2xl shadow-xl font-black text-sm flex items-center gap-2 animate-in slide-in-from-bottom-2">
                  <Zap className="w-4 h-4 fill-white" />
                  ใกล้ถึงจุดชาร์จที่ {nearAlert.stopNo} — อีก {nearAlert.km.toFixed(1)} กม.
                </div>
              )}
              {!followCamera && (
                <Button
                  onClick={() => { setFollowCamera(true); if (geo.ready) map?.panTo({ lat: geo.lat, lng: geo.lng }); }}
                  variant="outline"
                  className="pointer-events-auto h-10 rounded-2xl font-bold gap-1.5 bg-white/90 dark:bg-card/90 backdrop-blur-md shadow-lg"
                >
                  <LocateFixed className="w-4 h-4 text-primary" /> กลับไปที่รถ
                </Button>
              )}
              <div className="pointer-events-auto bg-white/95 dark:bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/40 px-5 py-3 flex items-center gap-4">
                <div className="bg-blue-600 p-2.5 rounded-2xl shrink-0">
                  <Navigation className="w-5 h-5 text-white fill-white" />
                </div>
                {(() => {
                  const target = driveTargets[nextStopIndex];
                  const geom = (window as any).google?.maps?.geometry?.spherical;
                  let meters: number | null = null;
                  if (geo.ready && target && geom) {
                    meters = geom.computeDistanceBetween(new google.maps.LatLng(geo.lat, geo.lng), target);
                  }
                  const distLabel = meters == null ? '— กม.'
                    : meters >= 1000 ? `${(meters / 1000).toFixed(1)} กม.` : `${Math.round(meters)} ม.`;
                  const spd = geo.speed ?? 0;
                  const etaMin = meters != null && spd > 3 ? Math.round((meters / 1000) / spd * 60) : null;
                  return (
                    <>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                          {nextStopIndex < plannedStops.length ? `จุดชาร์จถัดไป (ที่ ${nextStopIndex + 1})` : 'มุ่งหน้าปลายทาง'}
                        </p>
                        <p className="text-3xl font-black text-foreground tabular-nums leading-tight">{distLabel}</p>
                        {etaMin != null && (
                          <p className="text-[11px] font-bold text-blue-600">อีก ~{formatMinutes(etaMin)}</p>
                        )}
                      </div>
                      <div className="pl-4 border-l border-border/50 text-center shrink-0">
                        <p className="text-[9px] font-black text-muted-foreground uppercase flex items-center gap-1 justify-center">
                          <GaugeIcon className="w-3 h-3" /> ความเร็ว
                        </p>
                        <p className="text-2xl font-black text-foreground tabular-nums leading-tight">{geo.speed ?? 0}</p>
                        <p className="text-[9px] font-bold text-muted-foreground">กม./ชม.</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {routeInfo && (
        <div className="relative lg:absolute lg:top-6 lg:right-6 z-20 flex flex-col gap-5 w-full lg:w-[380px] p-4 lg:p-0">
          <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-white/95 dark:bg-card/95 backdrop-blur-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-primary/5 p-6 flex flex-row items-center gap-4 border-b border-primary/10">
              <div className="bg-primary p-3 rounded-2xl">
                <Route className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-primary">สรุปการเดินทาง (EPA)</CardTitle>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">วิเคราะห์ความปลอดภัยในการขับขี่จริง</p>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/40 p-4 rounded-2xl">
                  <p className="text-[10px] text-muted-foreground uppercase font-black mb-1">ระยะทางรวม</p>
                  <p className="text-xl font-black text-primary">{routeInfo.distance}</p>
                </div>
                <div className="bg-muted/40 p-4 rounded-2xl">
                  <p className="text-[10px] text-muted-foreground uppercase font-black mb-1">เวลาขับขี่</p>
                  <p className="text-xl font-black text-primary">{routeInfo.duration}</p>
                </div>
              </div>

              {tripEta && (
                <div className="flex items-center justify-between gap-3 bg-primary/5 border border-primary/15 rounded-2xl p-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="bg-primary/10 p-2 rounded-xl text-primary shrink-0">
                      <Timer className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase font-black">ถึงปลายทางโดยประมาณ</p>
                      <p className="text-[11px] font-bold text-muted-foreground">
                        รวมเวลาเดินทาง {formatMinutes(tripEta.totalTripMin)}
                        {chargeStats ? ' (รวมชาร์จ)' : ''}
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-black text-primary tabular-nums shrink-0">{formatClock(tripEta.destTs)}</p>
                </div>
              )}

              {rangeAdjust && (
                <div className="flex items-center justify-between gap-3 bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="bg-orange-500/10 p-2 rounded-xl text-orange-500 shrink-0">
                      <Thermometer className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase font-black">ระยะวิ่งที่ปรับแล้ว</p>
                      <p className="text-[11px] font-bold text-muted-foreground">
                        {rangeAdjust.tempC}°C{rangeAdjust.tempSource === 'fallback' ? ' (ประมาณ)' : ''} · เฉลี่ย {rangeAdjust.avgKmh} กม./ชม.
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-orange-600 tabular-nums leading-tight">{rangeAdjust.effRange} กม.</p>
                    <p className="text-[10px] font-bold text-muted-foreground tabular-nums">
                      EPA {rangeAdjust.baseRange}{rangeAdjust.reducePct !== 0 ? ` · ${rangeAdjust.reducePct > 0 ? '−' : '+'}${Math.abs(rangeAdjust.reducePct)}%` : ''}
                    </p>
                  </div>
                </div>
              )}

              {plannedStops.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-secondary/5 p-5 rounded-[1.5rem] border-2 border-dashed border-secondary/30 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-secondary p-2.5 rounded-xl">
                        <Zap className="w-5 h-5 text-white fill-white" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-secondary">ต้องแวะชาร์จ {plannedStops.length} ครั้ง</p>
                        <p className="text-[11px] font-bold text-muted-foreground">รัศมี {searchRadiusKm} กม. รอบจุดแบตเตอรี่ต่ำ</p>
                      </div>
                    </div>

                    {chargeStats && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="bg-white/60 dark:bg-card/60 rounded-xl p-3 flex items-center gap-2">
                          <Timer className="w-4 h-4 text-secondary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-muted-foreground uppercase">เวลาชาร์จรวม</p>
                            <p className="text-[13px] font-black text-secondary truncate">{formatMinutes(chargeStats.totalMin)}</p>
                          </div>
                        </div>
                        <div className="bg-white/60 dark:bg-card/60 rounded-xl p-3 flex items-center gap-2">
                          <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-muted-foreground uppercase">ค่าไฟรวม</p>
                            <p className="text-[13px] font-black text-amber-600 truncate tabular-nums">~{chargeStats.totalCost.toLocaleString()} ฿</p>
                          </div>
                        </div>
                        <p className="col-span-2 text-[10px] font-medium text-muted-foreground text-center">
                          ต่อจุด ~{chargeStats.perStopKwh} kWh · {formatMinutes(chargeStats.perStopMin)} ·{" "}
                          {CHARGING_NETWORKS.find(n => n.id === chargeStats.networkId)?.name ?? ''}{" "}
                          {chargeStats.rateLabel} ฿/kWh
                          {chargeStats.tariffMode === 'auto' ? ' (อัตโนมัติ)' : chargeStats.tariffMode === 'peak' ? ' (Peak)' : ' (Off-peak)'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* โหมดนำทาง: เลือกปั๊มของแต่ละจุด (1/2/3) แล้วกดนำทางผ่าน Google Maps */}
                  {plannedStops.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 px-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          เลือกปั๊มแต่ละจุด (โหมดนำทาง)
                        </p>
                        <button
                          onClick={() => setShowAllSides(v => !v)}
                          className={cn(
                            "shrink-0 text-[9px] font-black px-2 py-1 rounded-lg border transition-colors",
                            showAllSides
                              ? "bg-muted text-muted-foreground border-border/60"
                              : "bg-primary/10 text-primary border-primary/30"
                          )}
                        >
                          {showAllSides ? 'ทุกฝั่ง' : 'เฉพาะฝั่งเดินทาง'}
                        </button>
                      </div>

                      {plannedStops.map((stop: any, i: number) => {
                        const chosen = selectedStops[i] ?? pickBestStation(stop.candidates);
                        const isAuto = !selectedStops[i];
                        const sideCands = showAllSides
                          ? stop.candidates
                          : (stop.candidates ?? []).filter((s: any) => !s.side || s.side === DRIVER_SIDE || s.side === 'near');
                        const list = sideCands.length > 0 ? sideCands : (stop.candidates ?? []);
                        const isOpen = expandedStop === i;
                        const chosenNet = chosen ? (matchStationNetwork(chosen.name) ?? UNKNOWN_NETWORK) : null;
                        return (
                          <div key={i} className="rounded-2xl border border-border/50 overflow-hidden bg-white dark:bg-card">
                            <button
                              onClick={() => setExpandedStop(isOpen ? null : i)}
                              className="w-full p-3 flex items-center gap-2.5 text-left hover:bg-muted/30 transition-colors"
                            >
                              <div className="bg-secondary text-white w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0">{i + 1}</div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-black text-foreground">
                                  จุดที่ {i + 1}
                                  <span className="text-[9px] font-bold text-muted-foreground"> · {stop.atKm} กม.{stop.etaTs ? ` · ${formatClock(stop.etaTs)}` : ''}</span>
                                </p>
                                {chosen ? (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {chosenNet && <span className="text-[8px] font-black text-white rounded px-1 py-0.5 shrink-0" style={{ backgroundColor: chosenNet.color }}>{chosenNet.short}</span>}
                                    <p className="text-[10px] font-bold text-primary truncate">{chosen.name}</p>
                                    <span className={cn("text-[8px] font-black px-1 rounded shrink-0", isAuto ? "text-amber-600 bg-amber-500/10" : "text-green-600 bg-green-500/10")}>{isAuto ? 'อัตโนมัติ' : 'เลือกเอง'}</span>
                                  </div>
                                ) : (
                                  <p className="text-[10px] font-bold text-red-500 mt-0.5">ไม่พบปั๊มใกล้จุดนี้</p>
                                )}
                              </div>
                              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} />
                            </button>

                            {isOpen && list.length > 0 && (
                              <ScrollArea className="h-[180px] border-t border-border/40 p-2">
                                <div className="space-y-1.5">
                                  {list.map((s: any, idx: number) => {
                                    const net = matchStationNetwork(s.name) ?? UNKNOWN_NETWORK;
                                    const picked = chosen?.place_id === s.place_id;
                                    return (
                                      <button
                                        key={s.place_id || idx}
                                        onClick={() => chooseStationForStop(i, s)}
                                        className={cn(
                                          "w-full text-left p-2.5 rounded-xl transition-all border flex gap-2 items-center",
                                          picked ? "bg-primary/5 border-primary/30 shadow-sm" : "bg-muted/20 border-transparent hover:bg-muted/40"
                                        )}
                                      >
                                        {s.photos?.[0] ? (
                                          <img src={s.photos[0].getUrl({ maxWidth: 80, maxHeight: 80 })} alt={s.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                        ) : (
                                          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: net.color }}>
                                            <Zap className="w-4 h-4 text-white fill-white" />
                                          </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[8px] font-black text-white rounded px-1 py-0.5 shrink-0" style={{ backgroundColor: net.color }}>{net.short}</span>
                                            <p className="text-[11px] font-bold text-foreground truncate">{s.name}</p>
                                          </div>
                                          <p className="text-[9px] text-muted-foreground truncate">{s.vicinity}</p>
                                          <div className="flex items-center gap-2 mt-0.5 text-[9px]">
                                            <StationRating rating={s.rating} total={s.user_ratings_total} />
                                            {s.side === 'near' ? (
                                              <span className="font-bold text-amber-600">ใกล้เส้นทาง</span>
                                            ) : !s.side || s.side === DRIVER_SIDE ? (
                                              <span className="font-bold text-green-600">ฝั่งเดินทาง</span>
                                            ) : (
                                              <span className="font-bold text-muted-foreground">ฝั่งตรงข้าม</span>
                                            )}
                                            {getOpenStatus(s) !== undefined && (
                                              <span className={cn("font-bold flex items-center gap-0.5", getOpenStatus(s) ? "text-green-600" : "text-red-500")}>
                                                <CircleDot className="w-2.5 h-2.5" />
                                                {getOpenStatus(s) ? "เปิด" : "ปิด"}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        {picked && <Check className="w-4 h-4 text-primary shrink-0" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </ScrollArea>
                            )}
                            {isOpen && selectedStops[i] && (
                              <button
                                onClick={() => chooseStationForStop(i, null)}
                                className="w-full text-[10px] font-bold text-muted-foreground py-2 border-t border-border/40 hover:bg-muted/30 transition-colors"
                              >
                                ↺ กลับไปใช้ปั๊มอัตโนมัติ
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-green-500/10 p-5 rounded-[1.5rem] border-2 border-dashed border-green-500/20 flex items-center gap-4">
                  <div className="bg-green-500 p-2.5 rounded-xl">
                    <Car className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-green-600">เดินทางได้รวดเดียว</p>
                    <p className="text-[11px] font-bold text-green-700/60">พลังงานเพียงพอจนถึงที่หมาย (EPA)</p>
                  </div>
                </div>
              )}

              {plannedStops.length > 0 && !isDriving && (
                <Button
                  onClick={startDriving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-14 font-black shadow-lg flex items-center justify-center gap-3"
                >
                  <Navigation className="w-5 h-5 fill-white" />
                  <span>เริ่มโหมดขับขี่</span>
                </Button>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleShareSummary}
                  className="flex-1 rounded-2xl h-12 font-bold gap-2"
                >
                  <Share2 className="w-4 h-4" /> แชร์สรุป
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopySummary}
                  className="flex-1 rounded-2xl h-12 font-bold gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                </Button>
              </div>

              <Button
                onClick={openInGoogleMaps}
                className="w-full bg-secondary hover:bg-secondary/90 text-white rounded-2xl h-14 font-black shadow-lg transition-all flex items-center justify-center gap-3 group"
              >
                <MapIcon className="w-5 h-5" />
                <span>
                  {plannedStops.length > 0
                    ? `นำทางผ่าน ${resolvedStops.filter(Boolean).length} ปั๊ม (Google Maps)`
                    : 'นำทางผ่าน Google Maps'}
                </span>
                <ChevronRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/40 backdrop-blur-md">
           <div className="flex flex-col items-center gap-4 bg-white dark:bg-card p-8 rounded-[2.5rem] shadow-2xl border border-primary/10 mx-4 text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-sm font-black text-primary uppercase tracking-[0.2em]">กำลังคำนวณระยะ EPA และจุดแวะชาร์จ...</p>
           </div>
        </div>
      )}
    </>
  );
}
