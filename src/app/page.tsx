"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
  Settings,
  LocateFixed,
  Map as MapIcon,
  Search,
  Crosshair,
  Target
} from 'lucide-react';
import { CHARGING_NETWORKS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyBkAJkrsoawc920PIl-0fyiz40tHHH8Hnk";

export default function ChargeWayApp() {
  const [tripData, setTripData] = useState<any>(null);
  const [isPickingOnMap, setIsPickingOnMap] = useState<'origin' | 'destination' | null>(null);

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'geocoding', 'routes']}>
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
                Generic EV v2.0
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
  const [currentRange, setCurrentRange] = useState(400);
  const [minRangeThreshold, setMinRangeThreshold] = useState(50);
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  
  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const placesLib = useMapsLibrary('places');

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
      currentRange, 
      minRangeThreshold, 
      selectedNetworks 
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
      {/* Route Inputs */}
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
                placeholder="จุดเริ่มต้น (Origin)" 
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
              title="เลือกจุดเริ่มบนแผนที่"
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
                placeholder="จุดหมายปลายทาง (Destination)" 
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
              title="เลือกปลายทางบนแผนที่"
            >
              <Crosshair className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Range Config */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-4 bg-primary rounded-full" />
          <h2 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">การตั้งค่าระยะทาง</h2>
        </div>

        <div className="space-y-5 bg-muted/30 p-5 rounded-[1.5rem] border border-border/40 hover:bg-muted/40 transition-colors">
          <div className="flex justify-between items-center">
            <Label className="flex items-center gap-2.5 text-sm font-bold text-foreground/80">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <Car className="w-4 h-4" />
              </div> 
              ระยะทางที่วิ่งได้ขณะนี้
            </Label>
            <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1 rounded-xl tabular-nums">{currentRange} กม.</span>
          </div>
          <Slider 
            value={[currentRange]} 
            onValueChange={v => setCurrentRange(v[0])} 
            max={1000} 
            step={5}
            className="py-1 cursor-pointer"
          />
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground/70">
            <p>0 กม.</p>
            <p>1,000 กม.</p>
          </div>
        </div>

        <div className="space-y-5 bg-muted/30 p-5 rounded-[1.5rem] border border-border/40 hover:bg-muted/40 transition-colors">
          <div className="flex justify-between items-center">
            <Label className="flex items-center gap-2.5 text-sm font-bold text-foreground/80">
              <div className="p-1.5 bg-secondary/10 rounded-lg text-secondary">
                <Zap className="w-4 h-4" />
              </div> 
              เหลือระยะกี่ กม. ถึงเริ่มชาร์จ
            </Label>
            <span className="text-sm font-black text-secondary bg-secondary/10 px-3 py-1 rounded-xl tabular-nums">{minRangeThreshold} กม.</span>
          </div>
          <Slider 
            value={[minRangeThreshold]} 
            onValueChange={v => setMinRangeThreshold(v[0])} 
            max={200} 
            min={10}
            step={5}
            className="py-1 cursor-pointer"
          />
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider text-right italic">เมื่อระยะเหลือถึงจุดนี้ จะค้นหาสถานีชาร์จในรัศมี 10 กม.</p>
        </div>
      </section>

      {/* Network Filters */}
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
          {selectedNetworks.length > 0 && (
            <button 
              onClick={() => setSelectedNetworks([])}
              className="text-[10px] text-destructive font-black uppercase tracking-widest px-2 hover:underline"
            >
              รีเซ็ต
            </button>
          )}
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

  const searchStations = useCallback((location: google.maps.LatLng, radius: number, networkQueries: string[]) => {
    if (!placesLib || !map) return;
    const service = new google.maps.places.PlacesService(map);
    
    const queries = networkQueries.length > 0 ? networkQueries : ['EV Charging Station Thailand'];

    queries.forEach(query => {
      service.nearbySearch({
        location,
        radius,
        keyword: query
      }, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setStations(prev => {
            const existingIds = new Set(prev.map(s => s.place_id));
            const newStations = results.filter(r => !existingIds.has(r.place_id));
            return [...prev, ...newStations];
          });
        }
      });
    });
  }, [placesLib, map]);

  useEffect(() => {
    if (!tripData || !routesLib || !directionsRenderer) return;
    
    const calculateRoute = async () => {
      setIsLoading(true);
      const { origin, destination, currentRange, minRangeThreshold, selectedNetworks } = tripData;
      const directionsService = new google.maps.DirectionsService();
      
      try {
        const result = await directionsService.route({
          origin,
          destination,
          travelMode: google.maps.TravelMode.DRIVING,
        });

        directionsRenderer.setDirections(result);
        const route = result.routes[0].legs[0];
        const distanceKm = (route.distance?.value || 0) / 1000;
        setRouteInfo({
          distance: route.distance?.text || '0 km',
          duration: route.duration?.text || '0 mins',
          distanceKm
        });

        setStations([]);
        setPlannedStops([]);
        setSelectedStation(null);

        // Distance you can drive until you reach the threshold
        const distanceToChargePointKm = Math.max(0, currentRange - minRangeThreshold);

        if (distanceKm > distanceToChargePointKm) {
          let cumulativeDistance = 0;
          let stopLocation = route.end_location;

          // Find the point on the path where we reach the threshold
          for (const step of route.steps) {
            cumulativeDistance += (step.distance?.value || 0) / 1000;
            if (cumulativeDistance >= distanceToChargePointKm) {
              stopLocation = step.end_location;
              break;
            }
          }

          setPlannedStops([{
            location: stopLocation,
            title: "จุดที่ควรแวะชาร์จ"
          }]);

          const networkQueries = selectedNetworks.map((id: string) => 
            CHARGING_NETWORKS.find(n => n.id === id)?.query || ""
          ).filter(Boolean);
          
          // Search in 10km radius
          searchStations(stopLocation, 10000, networkQueries);
          
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(route.start_location);
          bounds.extend(route.end_location);
          bounds.extend(stopLocation);
          map?.fitBounds(bounds, { padding: 100 });
        }
      } catch (err) {
        console.error("Route planning failed", err);
      } finally {
        setIsLoading(false);
      }
    };

    calculateRoute();
  }, [tripData, routesLib, directionsRenderer, searchStations, map]);

  const openInGoogleMaps = () => {
    if (!directionsRenderer) return;
    const dirs = directionsRenderer.getDirections();
    if (!dirs) return;

    const route = dirs.routes[0].legs[0];
    const originStr = encodeURIComponent(route.start_address);
    const destinationStr = encodeURIComponent(route.end_address);
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destinationStr}`;
    
    if (selectedStation) {
      const lat = selectedStation.geometry.location.lat();
      const lng = selectedStation.geometry.location.lng();
      url += `&waypoints=${lat},${lng}`;
    } else if (plannedStops.length > 0) {
      const waypoints = plannedStops.map(s => `${s.location.lat()},${s.location.lng()}`).join('|');
      url += `&waypoints=${encodeURIComponent(waypoints)}`;
    }

    window.open(url, '_blank');
  };

  return (
    <>
      <Map
        mapId="charge_way_v4"
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
             <div className="bg-secondary text-white px-4 py-2 rounded-2xl shadow-2xl border-2 border-white flex flex-col items-center animate-bounce">
                <Zap className="w-5 h-5 fill-white" />
                <span className="text-[10px] font-black uppercase tracking-wider">รัศมีจุดชาร์จ 10 กม.</span>
             </div>
          </AdvancedMarker>
        ))}

        {stations.map((station, i) => (
          <AdvancedMarker
            key={station.place_id || i}
            position={station.geometry.location}
            title={station.name}
            onClick={() => setSelectedStation(station)}
          >
            <Pin 
              background={selectedStation?.place_id === station.place_id ? '#FF5722' : '#1F8C8C'} 
              borderColor={'#ffffff'} 
              glyphColor={'#ffffff'}
              scale={selectedStation?.place_id === station.place_id ? 1.4 : 1.1}
            >
              <Zap className="w-4 h-4 text-white" />
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
            </div>
          </InfoWindow>
        )}
      </Map>

      {/* Overlays */}
      {routeInfo && (
        <div className="absolute top-6 right-6 z-20 flex flex-col gap-5 w-[340px] md:w-[380px]">
          <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-white/95 backdrop-blur-xl rounded-[2rem] overflow-hidden animate-in slide-in-from-right duration-700">
            <CardHeader className="bg-primary/5 p-6 flex flex-row items-center gap-4 border-b border-primary/10">
              <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
                <Route className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-primary">วิเคราะห์เส้นทาง</CardTitle>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">คำนวณตามระยะทางคงเหลือ</p>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/40 p-4 rounded-2xl border border-border/20 group hover:bg-muted/60 transition-colors">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter mb-1">ระยะทางทั้งหมด</p>
                  <p className="text-xl font-black text-primary tabular-nums">{routeInfo.distance}</p>
                </div>
                <div className="bg-muted/40 p-4 rounded-2xl border border-border/20 group hover:bg-muted/60 transition-colors">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter mb-1">เวลาโดยประมาณ</p>
                  <p className="text-xl font-black text-primary tabular-nums">{routeInfo.duration}</p>
                </div>
              </div>
              
              {plannedStops.length > 0 ? (
                <div className="bg-secondary/5 p-5 rounded-[1.5rem] border-2 border-dashed border-secondary/30 flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-secondary p-2.5 rounded-xl shadow-md shadow-secondary/20">
                      <Zap className="w-5 h-5 text-white fill-white" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-secondary">พบสถานีชาร์จในรัศมี 10 กม.</p>
                      <p className="text-[11px] font-bold text-muted-foreground">เลือกเครือข่ายที่คุณชอบบนแผนที่</p>
                    </div>
                  </div>
                  
                  {selectedStation ? (
                    <div className="pt-3 border-t border-secondary/20 animate-in fade-in zoom-in-95">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[12px] font-black text-primary truncate max-w-[200px]">{selectedStation.name}</p>
                          <p className="text-[10px] font-medium text-muted-foreground truncate max-w-[220px]">{selectedStation.vicinity}</p>
                        </div>
                        <Badge className="bg-primary text-white text-[9px]">เลือกแล้ว</Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-3 rounded-xl bg-white/50 border border-secondary/20 animate-pulse-soft">
                      <Search className="w-3.5 h-3.5 text-secondary mr-2" />
                      <p className="text-[10px] font-black text-secondary uppercase tracking-widest">รอการเลือกสถานี...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-green-500/10 p-5 rounded-[1.5rem] border-2 border-dashed border-green-500/20 flex items-center gap-4">
                  <div className="bg-green-500 p-2.5 rounded-xl shadow-md shadow-green-500/20">
                    <Car className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-green-600">เดินทางได้ตลอดเส้นทาง</p>
                    <p className="text-[11px] font-bold text-green-700/60">พลังงานเพียงพอ ไม่ต้องแวะชาร์จ</p>
                  </div>
                </div>
              )}

              <Button 
                onClick={openInGoogleMaps}
                disabled={plannedStops.length > 0 && !selectedStation}
                className="w-full bg-secondary hover:bg-secondary/90 text-white rounded-2xl h-14 font-black shadow-[0_10px_30px_rgba(31,140,140,0.3)] transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                <MapIcon className="w-5 h-5 relative z-10" />
                <span className="relative z-10">เริ่มนำทาง (Google Maps)</span>
                <ChevronRight className="w-4.5 h-4.5 transition-transform group-hover:translate-x-1 relative z-10" />
              </Button>
              
              {plannedStops.length > 0 && !selectedStation && (
                <p className="text-[10px] text-center text-secondary font-black animate-pulse-soft flex items-center justify-center gap-1.5 uppercase tracking-wider">
                  <Info className="w-3 h-3" /> กรุณาเลือกสถานีชาร์จบนแผนที่เพื่อไปต่อ
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Map Control Shortcuts */}
      <div className="absolute bottom-10 right-6 flex flex-col gap-3">
         <button 
           onClick={() => {
             if (map && directionsRenderer?.getDirections()) {
               const bounds = directionsRenderer.getDirections()?.routes[0].bounds;
               if (bounds) map.fitBounds(bounds, { padding: 50 });
             }
           }}
           className="bg-primary p-4 rounded-3xl shadow-2xl border border-white hover:bg-primary/90 transition-all hover:scale-110 active:scale-95 group"
          >
            <MapPin className="w-6 h-6 text-white" />
         </button>
      </div>

      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-sm">
           <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-[2.5rem] shadow-2xl border border-primary/10">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-black text-primary uppercase tracking-[0.2em]">กำลังคำนวณจุดชาร์จ...</p>
           </div>
        </div>
      )}
    </>
  );
}