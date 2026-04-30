"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  APIProvider, 
  Map, 
  useMapsLibrary, 
  useMap, 
  AdvancedMarker, 
  Pin,
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
  Loader2
} from 'lucide-react';
import { CHARGING_NETWORKS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyBkAJkrsoawc920PIl-0fyiz40tHHH8Hnk";

// EPA Efficiency Factor (Typical real-world adjustment vs advertised WLTP/NEDC)
const EPA_FACTOR = 0.85; 

export default function ChargeWayApp() {
  const [tripData, setTripData] = useState<any>(null);
  const [isPickingOnMap, setIsPickingOnMap] = useState<'origin' | 'destination' | null>(null);

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'geocoding', 'routes', 'geometry']}>
      <div className="flex flex-col lg:flex-row h-screen w-full bg-background overflow-hidden font-body selection:bg-primary/20">
        {/* Left Control Panel */}
        <div className="w-full lg:w-[420px] h-full flex flex-col border-r border-border bg-card z-20 shadow-2xl overflow-hidden relative">
          <header className="p-6 pb-4 border-b border-border/50 bg-white/50 backdrop-blur-sm sticky top-0 z-30">
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
              <Badge variant="outline" className="rounded-full bg-secondary/5 text-secondary border-secondary/20 font-bold px-3">
                EPA Standard
              </Badge>
            </div>
          </header>

          <ScrollArea className="flex-1">
            <main className="p-6 space-y-8">
              <TripForm 
                onPlanTrip={setTripData} 
                isPickingOnMap={isPickingOnMap}
                setIsPickingOnMap={setIsPickingOnMap}
              />
              {tripData && <div id="summary-section" className="pt-4 border-t border-border/40" />}
            </main>
          </ScrollArea>

          <footer className="p-4 border-t border-border/50 bg-muted/20 text-center">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Powered by Google Places API • TH</p>
          </footer>
        </div>

        {/* Right Map Panel */}
        <div className="flex-1 relative h-[60vh] lg:h-full bg-slate-50">
          <MapView 
            tripData={tripData} 
            isPickingOnMap={isPickingOnMap} 
            setIsPickingOnMap={setIsPickingOnMap}
          />
          {isPickingOnMap && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
              <div className="bg-primary/90 text-white px-6 py-3 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-3 animate-pulse">
                <Target className="w-5 h-5" />
                <span className="text-sm font-black uppercase tracking-widest">
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
  const [fullRange, setFullRange] = useState(410);
  const [minBatteryThreshold, setMinBatteryThreshold] = useState(15);
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>(CHARGING_NETWORKS.map(n => n.id));
  
  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const placesLib = useMapsLibrary('places');

  // EPA Usable range calculation
  const actualEpaRange = Math.round(fullRange * EPA_FACTOR);
  const usableRange = Math.round(actualEpaRange * (1 - minBatteryThreshold / 100));

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

  const toggleNetwork = (id: string) => {
    setSelectedNetworks(prev => 
      prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
    );
  };

  const handlePlanTrip = () => {
    if (!origin || !destination) return;
    onPlanTrip({ 
      origin, 
      destination, 
      fullRange,
      minBatteryThreshold, 
      selectedNetworks 
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
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
                className="pl-11 h-13 rounded-2xl border-border/80 focus:ring-primary/20 bg-background/50 text-sm font-medium transition-all"
              />
            </div>
            <Button
              variant={isPickingOnMap === 'origin' ? 'default' : 'outline'}
              size="icon"
              className={cn(
                "h-13 w-13 rounded-2xl shrink-0 transition-all",
                isPickingOnMap === 'origin' && "animate-pulse"
              )}
              onClick={() => setIsPickingOnMap(isPickingOnMap === 'origin' ? null : 'origin')}
              title="เลือกบนแผนที่"
            >
              <Crosshair className="w-5 h-5" />
            </Button>
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
                className="pl-11 h-13 rounded-2xl border-border/80 focus:ring-secondary/20 bg-background/50 text-sm font-medium transition-all"
              />
            </div>
            <Button
              variant={isPickingOnMap === 'destination' ? 'default' : 'outline'}
              size="icon"
              className={cn(
                "h-13 w-13 rounded-2xl shrink-0 transition-all",
                isPickingOnMap === 'destination' && "animate-pulse"
              )}
              onClick={() => setIsPickingOnMap(isPickingOnMap === 'destination' ? null : 'destination')}
              title="เลือกบนแผนที่"
            >
              <Crosshair className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-4 bg-primary rounded-full" />
          <h2 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">การตั้งค่าพลังงาน (EPA Standard)</h2>
        </div>

        <div className="space-y-5 bg-muted/30 p-5 rounded-[1.5rem] border border-border/40 hover:bg-muted/40 transition-colors">
          <div className="flex justify-between items-center">
            <Label className="flex items-center gap-2.5 text-sm font-bold text-foreground/80">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <Car className="w-4 h-4" />
              </div> 
              ระยะทางวิ่งสูงสุด (แบต 100%)
            </Label>
            <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1 rounded-xl tabular-nums">{fullRange} กม.</span>
          </div>
          <Slider 
            value={[fullRange]} 
            onValueChange={v => setFullRange(v[0])} 
            max={1000} 
            step={10}
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
            onValueChange={v => setMinBatteryThreshold(v[0])} 
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
          <p className="text-[10px] text-muted-foreground italic text-right opacity-70">* คำนวณที่ {EPA_FACTOR * 100}% ของสเปคโรงงานเพื่อให้สอดคล้องกับการขับขี่จริง</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-4 bg-primary rounded-full" />
          <h2 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">เครือข่ายที่ชอบ (Prefer Networks)</h2>
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
        className="w-full h-15 rounded-[1.25rem] text-base font-black transition-all hover:shadow-[0_10px_30px_rgba(64,128,191,0.4)] hover:-translate-y-1 active:translate-y-0 bg-primary hover:bg-primary/90 text-white flex gap-3 items-center group shadow-lg"
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
  const [isLoading, setIsLoading] = useState(false);

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

    const latLng = e.detail.latLng;
    const geocoder = new geocodingLib.Geocoder();

    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const address = results[0].formatted_address;
        window.dispatchEvent(new CustomEvent('google-map-picker-update', {
          detail: { type: isPickingOnMap, address }
        }));
        setIsPickingOnMap(null);
      }
    });
  }, [isPickingOnMap, geocodingLib, setIsPickingOnMap]);

  const searchStationsAtLocation = useCallback(async (location: google.maps.LatLng) => {
    if (!placesLib || !map) return [];
    
    const service = new google.maps.places.PlacesService(map);
    return new Promise<any[]>((resolve) => {
      // Broad Nearby Search as requested
      service.nearbySearch({
        location,
        radius: 20000, // 20km radius
        keyword: "PTT EV ปตท EV PEA VOLTA VOLTA ELEXA SPARK EV Charging Station",
        type: 'car_charging_station'
      }, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          // Limit to maxResultCount = 10 as requested
          resolve(results.slice(0, 10));
        } else {
          resolve([]);
        }
      });
    });
  }, [placesLib, map]);

  useEffect(() => {
    if (!tripData || !routesLib || !directionsRenderer || !map) return;
    
    const calculateRoute = async () => {
      setIsLoading(true);
      const { origin, destination, fullRange, minBatteryThreshold, selectedNetworks } = tripData;
      const directionsService = new google.maps.DirectionsService();
      
      try {
        const result = await directionsService.route({
          origin,
          destination,
          travelMode: google.maps.TravelMode.DRIVING,
        });

        directionsRenderer.setDirections(result);
        const route = result.routes[0].legs[0];
        const totalDistanceKm = (route.distance?.value || 0) / 1000;
        
        setRouteInfo({
          distance: route.distance?.text || '0 km',
          duration: route.duration?.text || '0 mins',
          distanceKm: totalDistanceKm
        });

        setStations([]);
        setPlannedStops([]);
        setSelectedStation(null);

        // EPA Calculations
        const actualEpaRange = fullRange * EPA_FACTOR;
        const usableRangePerCharge = actualEpaRange * (1 - minBatteryThreshold / 100);

        const stops: any[] = [];
        const allFoundStations: any[] = [];
        
        // Precise segment-based stop calculation using overview_path
        const path = result.routes[0].overview_path;
        let currentSegmentDist = 0;
        let cumulativeDist = 0;

        for (let i = 0; i < path.length - 1; i++) {
          const p1 = path[i];
          const p2 = path[i+1];
          const d = google.maps.geometry.spherical.computeDistanceBetween(p1, p2) / 1000;
          
          currentSegmentDist += d;
          cumulativeDist += d;

          if (currentSegmentDist >= usableRangePerCharge) {
            const stopLoc = p2;
            stops.push({
              location: stopLoc,
              atKm: Math.round(cumulativeDist)
            });
            
            const found = await searchStationsAtLocation(stopLoc);
            allFoundStations.push(...found);
            currentSegmentDist = 0; 
          }
        }

        // De-duplicate by place_id using window.Map to avoid collision with Map component
        const uniqueMap = new window.Map();
        allFoundStations.forEach(res => {
          if (res.place_id) uniqueMap.set(res.place_id, res);
        });
        
        const finalStationsList = Array.from(uniqueMap.values());
        
        // Show all results without filtering as requested in point 4
        setStations(finalStationsList);
        setPlannedStops(stops);
        
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(route.start_location);
        bounds.extend(route.end_location);
        stops.forEach(s => bounds.extend(s.location));
        finalStationsList.forEach(s => bounds.extend(s.geometry.location));
        
        map?.fitBounds(bounds, { padding: 80 });

      } catch (err) {
        console.error("Route planning failed", err);
      } finally {
        setIsLoading(false);
      }
    };

    calculateRoute();
  }, [tripData, routesLib, directionsRenderer, searchStationsAtLocation, map]);

  const openInGoogleMaps = () => {
    if (!directionsRenderer) return;
    const dirs = directionsRenderer.getDirections();
    if (!dirs) return;

    const route = dirs.routes[0].legs[0];
    const originStr = encodeURIComponent(route.start_address);
    const destinationStr = encodeURIComponent(route.end_address);
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destinationStr}`;
    
    const waypoints = [];
    if (selectedStation) {
      waypoints.push(`${selectedStation.geometry.location.lat()},${selectedStation.geometry.location.lng()}`);
    } else {
      plannedStops.forEach(s => waypoints.push(`${s.location.lat()},${s.location.lng()}`));
    }

    if (waypoints.length > 0) {
      url += `&waypoints=${encodeURIComponent(waypoints.join('|'))}`;
    }

    window.open(url, '_blank');
  };

  return (
    <>
      <Map
        mapId="charge_way_v5"
        defaultCenter={{ lat: 13.7367, lng: 100.5231 }}
        defaultZoom={12}
        gestureHandling={'greedy'}
        disableDefaultUI={false}
        className="w-full h-full"
        onClick={handleMapClick}
      >
        {plannedStops.map((stop, i) => (
          <AdvancedMarker
            key={`stop-${i}`}
            position={stop.location}
          >
             <div className="bg-secondary text-white px-3 py-1.5 rounded-2xl shadow-2xl border-2 border-white flex flex-col items-center animate-bounce z-10">
                <Zap className="w-4 h-4 fill-white" />
                <span className="text-[9px] font-black uppercase tracking-wider">จุดแวะที่ {i+1} ({stop.atKm} กม.)</span>
             </div>
          </AdvancedMarker>
        ))}

        {stations.map((station, i) => (
          <AdvancedMarker
            key={station.place_id || i}
            position={station.geometry.location}
            title={station.name}
            onClick={() => {
              setSelectedStation(station);
              map?.panTo(station.geometry.location);
            }}
          >
            <Pin 
              background={selectedStation?.place_id === station.place_id ? '#FF5722' : '#1F8C8C'} 
              borderColor={'#ffffff'} 
              glyphColor={'#ffffff'}
              scale={selectedStation?.place_id === station.place_id ? 1.4 : 1.1}
            >
              <Zap className="w-3.5 h-3.5 text-white" />
            </Pin>
          </AdvancedMarker>
        ))}

        {selectedStation && (
          <InfoWindow
            position={selectedStation.geometry.location}
            onCloseClick={() => setSelectedStation(null)}
          >
            <div className="p-2 min-w-[200px]">
              <h3 className="font-black text-sm text-primary mb-1">{selectedStation.name}</h3>
              <p className="text-[11px] text-muted-foreground leading-snug mb-2">{selectedStation.vicinity}</p>
              <div className="flex items-center gap-2">
                {selectedStation.rating && (
                  <Badge variant="secondary" className="text-[9px] font-bold">⭐ {selectedStation.rating}</Badge>
                )}
                {selectedStation.opening_hours?.open_now && (
                  <Badge variant="outline" className="text-[9px] font-bold border-green-500 text-green-600 bg-green-50">เปิดอยู่</Badge>
                )}
              </div>
              <Button 
                size="sm" 
                className="w-full mt-3 h-8 text-[10px] font-bold rounded-xl"
                onClick={() => setSelectedStation(selectedStation)}
              >
                เลือกสถานีนี้
              </Button>
            </div>
          </InfoWindow>
        )}
      </Map>

      {routeInfo && (
        <div className="absolute top-6 right-6 z-20 flex flex-col gap-5 w-[340px] md:w-[380px] max-h-[90vh] overflow-y-auto no-scrollbar">
          <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-white/95 backdrop-blur-xl rounded-[2rem] overflow-hidden animate-in slide-in-from-right duration-700">
            <CardHeader className="bg-primary/5 p-6 flex flex-row items-center gap-4 border-b border-primary/10">
              <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
                <Route className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-primary">สรุปการเดินทาง (EPA)</CardTitle>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">วิเคราะห์ความปลอดภัยในการขับขี่จริง</p>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/40 p-4 rounded-2xl border border-border/20">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter mb-1">ระยะทางรวม</p>
                  <p className="text-xl font-black text-primary tabular-nums">{routeInfo.distance}</p>
                </div>
                <div className="bg-muted/40 p-4 rounded-2xl border border-border/20">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter mb-1">เวลาขับขี่</p>
                  <p className="text-xl font-black text-primary tabular-nums">{routeInfo.duration}</p>
                </div>
              </div>
              
              {plannedStops.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-secondary/5 p-5 rounded-[1.5rem] border-2 border-dashed border-secondary/30 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-secondary p-2.5 rounded-xl shadow-md shadow-secondary/20">
                        <Zap className="w-5 h-5 text-white fill-white" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-secondary">ต้องแวะชาร์จ {plannedStops.length} ครั้ง</p>
                        <p className="text-[11px] font-bold text-muted-foreground">รัศมี 20 กม. รอบทุกจุดที่แบตเริ่มต่ำ</p>
                      </div>
                    </div>
                    
                    {selectedStation ? (
                      <div className="pt-3 border-t border-secondary/20">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-black text-primary truncate">{selectedStation.name}</p>
                            <p className="text-[10px] font-medium text-muted-foreground truncate">{selectedStation.vicinity}</p>
                          </div>
                          <Badge className="bg-primary text-white text-[9px] shrink-0 ml-2">เลือกแล้ว</Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-3 rounded-xl bg-white/50 border border-secondary/20">
                        <AlertCircle className="w-3.5 h-3.5 text-secondary mr-2" />
                        <p className="text-[10px] font-black text-secondary uppercase tracking-widest">เลือกสถานีบนแผนที่หรือรายการด้านล่าง</p>
                      </div>
                    )}
                  </div>

                  {stations.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">ตัวเลือกสถานีใกล้เคียงในรัศมี 20 กม. ({stations.length})</p>
                      <ScrollArea className="h-[200px] rounded-2xl border border-border/50 p-2">
                        <div className="space-y-2">
                          {stations.map((s, idx) => (
                            <button
                              key={s.place_id || idx}
                              onClick={() => {
                                setSelectedStation(s);
                                map?.panTo(s.geometry.location);
                                map?.setZoom(16);
                              }}
                              className={cn(
                                "w-full text-left p-3 rounded-xl transition-all border",
                                selectedStation?.place_id === s.place_id 
                                  ? "bg-primary/5 border-primary/20 shadow-sm" 
                                  : "bg-white border-transparent hover:bg-muted/30"
                              )}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-[11px] font-bold text-foreground truncate">{s.name}</p>
                                {s.rating && <span className="text-[10px] font-bold text-orange-500 shrink-0">⭐ {s.rating}</span>}
                              </div>
                              <p className="text-[9px] text-muted-foreground truncate">{s.vicinity}</p>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
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

              <Button 
                onClick={openInGoogleMaps}
                disabled={plannedStops.length > 0 && !selectedStation && stations.length > 0}
                className="w-full bg-secondary hover:bg-secondary/90 text-white rounded-2xl h-14 font-black shadow-[0_10px_30px_rgba(31,140,140,0.3)] transition-all flex items-center justify-center gap-3 group"
              >
                <MapIcon className="w-5 h-5" />
                <span>นำทางผ่าน Google Maps</span>
                <ChevronRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-sm">
           <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-[2.5rem] shadow-2xl border border-primary/10">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-sm font-black text-primary uppercase tracking-[0.2em]">กำลังคำนวณระยะ EPA และจุดแวะชาร์จ...</p>
           </div>
        </div>
      )}
    </>
  );
}
