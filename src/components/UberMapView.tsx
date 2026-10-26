import React, { useEffect, useMemo, useRef, useState } from 'react';
import { circleMarker, control, map as createMap, polyline, tileLayer } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GeoPoint, Job, Language } from '../types';
import { localizeJobTitle, localizePlaceText, uiText } from '../utils/uiText';
import { geocodePlace } from '../utils/places';
import { MapPin, Navigation, LocateFixed, X } from 'lucide-react';

interface UberMapViewProps {
  language: Language;
  isOnline: boolean;
  activeJob: Job | null;
  incomingJob: Job | null;
  suggestedJob?: Job | null;
  onSelectSite?: (job: Job) => void;
  workerLocation?: string;
  onWorkerPositionChange?: (position: GeoPoint) => void;
  onWorkerPositionError?: () => void;
  hasArrived?: boolean;
  customLocationText?: string;
  hideLocationCard?: boolean;
}

interface Coordinates extends GeoPoint {}
interface RouteStep {
  name?: string;
  distance?: number;
  maneuver?: { type?: string; modifier?: string; location?: [number, number] };
}
interface RouteResponse {
  code?: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
    legs?: Array<{ steps?: RouteStep[] }>;
  }>;
}
interface ActiveRoute { points: [number, number][]; distance: number; duration: number; steps: RouteStep[] }

const DEFAULT_CENTER: Coordinates = { lat: 12.9716, lon: 77.5946 };
const ROUTER_BASE = (import.meta.env.VITE_OSRM_ROUTER_URL || 'https://router.project-osrm.org').replace(/\/$/, '');
const MAP_TILE_URL = import.meta.env.VITE_OSM_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAP_COPY: Record<Language, { start: string; starting: string; stop: string; locating: string; routeError: string; yourLocation: string; arrival: string }> = {
  en: { start: 'Start navigation', starting: 'Finding route…', stop: 'End navigation', locating: 'Waiting for GPS location', routeError: 'Route unavailable. Check your connection and try again.', yourLocation: 'Your location', arrival: 'You have arrived' },
  hi: { start: 'नेविगेशन शुरू करें', starting: 'रास्ता ढूँढ रहे हैं…', stop: 'नेविगेशन रोकें', locating: 'GPS लोकेशन की प्रतीक्षा', routeError: 'रास्ता नहीं मिला। कनेक्शन जाँचें और फिर कोशिश करें।', yourLocation: 'आपकी लोकेशन', arrival: 'आप पहुँच गए हैं' },
  bn: { start: 'নেভিগেশন শুরু করুন', starting: 'রাস্তা খোঁজা হচ্ছে…', stop: 'নেভিগেশন বন্ধ করুন', locating: 'GPS লোকেশনের অপেক্ষায়', routeError: 'রাস্তা পাওয়া যায়নি। সংযোগ দেখে আবার চেষ্টা করুন।', yourLocation: 'আপনার অবস্থান', arrival: 'আপনি পৌঁছে গেছেন' },
  mr: { start: 'नेव्हिगेशन सुरू करा', starting: 'मार्ग शोधत आहे…', stop: 'नेव्हिगेशन थांबवा', locating: 'GPS स्थानाची वाट पाहत आहे', routeError: 'मार्ग उपलब्ध नाही. कनेक्शन तपासून पुन्हा प्रयत्न करा.', yourLocation: 'तुमचे स्थान', arrival: 'तुम्ही पोहोचलात' },
  te: { start: 'నావిగేషన్ ప్రారంభించండి', starting: 'మార్గాన్ని కనుగొంటోంది…', stop: 'నావిగేషన్ ఆపండి', locating: 'GPS స్థానం కోసం వేచి ఉంది', routeError: 'మార్గం అందుబాటులో లేదు. కనెక్షన్ తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.', yourLocation: 'మీ స్థానం', arrival: 'మీరు చేరుకున్నారు' },
};

const distanceKm = (a: GeoPoint, b: GeoPoint) => {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latDelta = radians(b.lat - a.lat);
  const lonDelta = radians(b.lon - a.lon);
  const value = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(lonDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const describeStep = (step: RouteStep | undefined, arrived: boolean, copy: typeof MAP_COPY[Language]) => {
  if (arrived) return copy.arrival;
  if (!step) return copy.start;
  const { type, modifier } = step.maneuver || {};
  const street = step.name ? ` ${step.name}` : '';
  if (type === 'depart') return `Head${street}`;
  if (type === 'turn' || type === 'end of road') return `Turn ${modifier || ''}${street}`.trim();
  if (type === 'roundabout' || type === 'rotary') return `Enter the roundabout${street}`;
  if (type === 'arrive') return copy.start;
  return `${type || 'Continue'}${street}`;
};

export const UberMapView: React.FC<UberMapViewProps> = ({
  language, isOnline, activeJob, incomingJob, suggestedJob, onSelectSite,
  workerLocation = '', onWorkerPositionChange, onWorkerPositionError, hasArrived = false,
  customLocationText, hideLocationCard = false,
}) => {
  const copy = MAP_COPY[language];
  const currentTargetJob = activeJob || incomingJob;
  const displayPreviewJob = suggestedJob || null;
  const mapJob = currentTargetJob || (isOnline ? displayPreviewJob : null);
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const workerMarker = useRef<any>(null);
  const destinationMarker = useRef<any>(null);
  const routeLayers = useRef<any[]>([]);
  const firstGpsFix = useRef(false);
  const onWorkerPositionChangeRef = useRef(onWorkerPositionChange);
  const onWorkerPositionErrorRef = useRef(onWorkerPositionError);
  const [workerPosition, setWorkerPosition] = useState<Coordinates | null>(null);
  const [fallbackPosition, setFallbackPosition] = useState<Coordinates | null>(null);
  const [jobPosition, setJobPosition] = useState<Coordinates | null>(null);
  const [navigationActive, setNavigationActive] = useState(false);
  const [navigationOrigin, setNavigationOrigin] = useState<Coordinates | null>(null);
  const [route, setRoute] = useState<ActiveRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [routeAttempt, setRouteAttempt] = useState(0);

  useEffect(() => {
    onWorkerPositionChangeRef.current = onWorkerPositionChange;
    onWorkerPositionErrorRef.current = onWorkerPositionError;
  }, [onWorkerPositionChange, onWorkerPositionError]);

  useEffect(() => {
    if (!mapElement.current || mapInstance.current) return;
    const map = createMap(mapElement.current, { zoomControl: false, attributionControl: false, preferCanvas: true }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lon], 14);
    tileLayer(MAP_TILE_URL, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    control({ position: 'bottomright' }).zoom?.({}).addTo(map);
    mapInstance.current = map;
    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    resizeObserver.observe(mapElement.current);
    const resizeTimer = window.setTimeout(() => map.invalidateSize({ pan: false }), 300);
    return () => {
      window.clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      workerMarker.current?.remove();
      destinationMarker.current?.remove();
      routeLayers.current.forEach((layer) => layer.remove());
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isOnline && !activeJob && !incomingJob) return;
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const point = { lat: coords.latitude, lon: coords.longitude };
        setWorkerPosition(point);
        onWorkerPositionChangeRef.current?.(point);
      },
      () => onWorkerPositionErrorRef.current?.(),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 12000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline, activeJob?.id, incomingJob?.id]);

  useEffect(() => {
    let active = true;
    const address = mapJob
      ? [mapJob.locationAddress, mapJob.siteName, 'Bengaluru, India'].join(', ')
      : workerLocation;
    if (mapJob) setJobPosition(null);
    if (!address) return () => { active = false; };
    void geocodePlace(address).then((place) => {
      if (!active || !place) return;
      if (mapJob) setJobPosition({ lat: place.lat, lon: place.lon });
      else setFallbackPosition({ lat: place.lat, lon: place.lon });
    });
    return () => { active = false; };
  }, [mapJob?.id, workerLocation]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (workerPosition) {
      if (!workerMarker.current) {
        workerMarker.current = circleMarker([workerPosition.lat, workerPosition.lon], {
          radius: 9, color: '#ffffff', weight: 4, fillColor: '#2d59f0', fillOpacity: 1,
        }).addTo(map).bindTooltip(copy.yourLocation, { direction: 'top', offset: [0, -8] });
      } else workerMarker.current.setLatLng([workerPosition.lat, workerPosition.lon]);
      if (!firstGpsFix.current) {
        map.setView([workerPosition.lat, workerPosition.lon], 15, { animate: true });
        firstGpsFix.current = true;
      }
    }
    if (jobPosition) {
      if (!destinationMarker.current) {
        destinationMarker.current = circleMarker([jobPosition.lat, jobPosition.lon], {
          radius: 10, color: '#ffffff', weight: 4, fillColor: '#f04452', fillOpacity: 1,
        }).addTo(map);
      } else destinationMarker.current.setLatLng([jobPosition.lat, jobPosition.lon]);
    } else if (destinationMarker.current) {
      destinationMarker.current.remove();
      destinationMarker.current = null;
    }
    if (!workerPosition && !jobPosition && fallbackPosition) map.setView([fallbackPosition.lat, fallbackPosition.lon], 14);
    if (navigationActive && workerPosition) map.panTo([workerPosition.lat, workerPosition.lon], { animate: true, duration: 0.35 });
  }, [workerPosition, jobPosition, fallbackPosition, navigationActive, copy.yourLocation]);

  useEffect(() => {
    const map = mapInstance.current;
    routeLayers.current.forEach((layer) => layer.remove());
    routeLayers.current = [];
    if (!map || !route) return;
    const casing = polyline(route.points, { color: '#ffffff', weight: 11, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
    const routeLine = polyline(route.points, { color: '#2d59f0', weight: 6, opacity: 0.96, lineCap: 'round', lineJoin: 'round' }).addTo(map);
    routeLayers.current = [casing, routeLine];
    map.fitBounds(routeLine.getBounds(), { padding: [48, 48], maxZoom: 16, animate: true });
  }, [route]);

  useEffect(() => {
    if (!navigationActive || !navigationOrigin || !jobPosition) return;
    const controller = new AbortController();
    setRouteLoading(true);
    setRouteError('');
    setRoute(null);
    const coords = `${navigationOrigin.lon},${navigationOrigin.lat};${jobPosition.lon},${jobPosition.lat}`;
    void fetch(`${ROUTER_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Route request failed');
        const payload = await response.json() as RouteResponse;
        const result = payload.routes?.[0];
        if (payload.code !== 'Ok' || !result?.geometry?.coordinates?.length) throw new Error('Route not found');
        setRoute({
          points: result.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
          distance: result.distance,
          duration: result.duration,
          steps: result.legs?.flatMap((leg) => leg.steps || []) || [],
        });
      })
      .catch(() => { if (!controller.signal.aborted) setRouteError(copy.routeError); })
      .finally(() => { if (!controller.signal.aborted) setRouteLoading(false); });
    return () => controller.abort();
  }, [navigationActive, navigationOrigin, jobPosition, copy.routeError, routeAttempt]);

  const handleStartNavigation = () => {
    if (!workerPosition || !jobPosition) return;
    setNavigationOrigin(workerPosition);
    setRouteError('');
    setRouteAttempt((attempt) => attempt + 1);
    setNavigationActive(true);
  };

  const endNavigation = () => {
    setNavigationActive(false);
    setNavigationOrigin(null);
    setRoute(null);
    setRouteError('');
    setRouteLoading(false);
  };

  const nextStep = useMemo(() => {
    if (!route || !workerPosition) return route?.steps.find((step) => step.maneuver?.type !== 'depart');
    const closestIndex = route.points.reduce((bestIndex, point, index) =>
      distanceKm(workerPosition, { lat: point[0], lon: point[1] }) < distanceKm(workerPosition, { lat: route.points[bestIndex][0], lon: route.points[bestIndex][1] }) ? index : bestIndex, 0);
    const maneuvers = route.steps.filter((step) => step.maneuver?.type && step.maneuver.type !== 'depart');
    return maneuvers.find((step) => {
      const point = step.maneuver?.location;
      if (!point) return true;
      const stepIndex = route.points.reduce((bestIndex, routePoint, index) =>
        distanceKm({ lat: point[1], lon: point[0] }, { lat: routePoint[0], lon: routePoint[1] }) < distanceKm({ lat: point[1], lon: point[0] }, { lat: route.points[bestIndex][0], lon: route.points[bestIndex][1] }) ? index : bestIndex, 0);
      return stepIndex >= closestIndex;
    }) || maneuvers[maneuvers.length - 1];
  }, [route, workerPosition]);

  const locationLabel = customLocationText || (hasArrived && activeJob
    ? localizePlaceText(activeJob.siteName, language)
    : mapJob ? localizePlaceText(mapJob.locationAddress, language) : workerLocation || uiText(language, 'departedBase'));

  return (
    <div className="relative isolate h-full min-h-0 w-full overflow-hidden rounded-[22px] bg-[#e9eef6] shadow-[0_2px_16px_rgba(15,23,42,0.12)]">
      <div ref={mapElement} className="absolute inset-0 z-0" aria-label="Interactive map" />
      {!hideLocationCard && <div className="absolute left-3 top-3 z-[500] flex max-w-[min(70%,320px)] items-center gap-2 truncate rounded-2xl border border-white/80 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur-sm">
        <MapPin className="h-4 w-4 shrink-0 text-[#2d59f0]" />
        <span className="truncate text-[11px] font-bold text-slate-800">{locationLabel}</span>
        {workerPosition && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-100" title="Live location" />}
      </div>}

      {mapJob && !navigationActive && <button type="button" onClick={handleStartNavigation} disabled={!workerPosition || !jobPosition || routeLoading} className="absolute left-3 top-[60px] z-[500] inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2d59f0] px-4 text-xs font-black text-white shadow-lg transition-colors hover:bg-blue-800 disabled:cursor-wait disabled:bg-slate-400">
        <Navigation className="h-4 w-4" />{routeLoading ? copy.starting : !workerPosition ? copy.locating : !jobPosition ? 'Finding job location…' : copy.start}
      </button>}

      {navigationActive && <section aria-live="polite" className="absolute left-3 right-3 top-3 z-[500] rounded-2xl border border-white/80 bg-white/95 p-3 shadow-xl backdrop-blur-sm sm:left-auto sm:right-3 sm:w-[min(350px,calc(100%-24px))]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2d59f0] text-white"><Navigation className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">{routeLoading ? copy.starting : route ? `${(route.distance / 1000).toFixed(1)} km · ${Math.max(1, Math.round(route.duration / 60))} min` : copy.start}</p>
            <p className="mt-0.5 line-clamp-2 text-sm font-black leading-5 text-slate-900">{route ? describeStep(nextStep, hasArrived, copy) : routeError || copy.locating}</p>
            {routeError && <button type="button" onClick={handleStartNavigation} className="mt-1 text-xs font-bold text-blue-700">Try again</button>}
          </div>
          <button type="button" onClick={endNavigation} aria-label={copy.stop} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><X className="h-4 w-4" /></button>
        </div>
      </section>}

      {!workerPosition && <button type="button" onClick={() => navigator.geolocation?.getCurrentPosition(({ coords }) => {
        const point = { lat: coords.latitude, lon: coords.longitude };
        setWorkerPosition(point);
        onWorkerPositionChangeRef.current?.(point);
        mapInstance.current?.setView([point.lat, point.lon], 15, { animate: true });
      }, () => { setRouteError(copy.locating); onWorkerPositionErrorRef.current?.(); }, { enableHighAccuracy: true, timeout: 12000 })} className="absolute bottom-[78px] right-3 z-[500] flex h-11 w-11 items-center justify-center rounded-xl border border-slate-100 bg-white text-[#2d59f0] shadow-lg" aria-label={copy.yourLocation} title={copy.yourLocation}>
        <LocateFixed className="h-5 w-5" />
      </button>}

      {isOnline && !currentTargetJob && displayPreviewJob && !navigationActive && (
        <button type="button" onClick={() => onSelectSite?.(displayPreviewJob)} className="absolute right-3 top-3 z-[500] max-w-[min(48%,220px)] rounded-2xl border border-white/80 bg-white/95 p-3 text-left shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl">
          <span className="mb-1 block text-[10px] font-semibold text-emerald-700">{displayPreviewJob.distanceKm.toFixed(1)} km · {uiText(language, 'matched')}</span>
          <span className="block truncate text-xs font-black text-neutral-900">{localizeJobTitle(displayPreviewJob, language)}</span>
          <span className="mt-1 block text-xs font-black text-blue-900">₹{displayPreviewJob.agreedAmount} {uiText(language, 'taskPay')}</span>
        </button>
      )}

      <div className="absolute bottom-2 left-2 z-[500] rounded-lg bg-white/90 px-2 py-1 text-[9px] font-medium text-slate-600 shadow-sm">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap</a> · Routing © OSRM
      </div>
    </div>
  );
};
