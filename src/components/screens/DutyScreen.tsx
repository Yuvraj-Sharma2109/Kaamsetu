import React, { useCallback, useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'motion/react';
import { GeoPoint, Job, Language, WorkerProfile } from '../../types';
import { getTranslation } from '../../utils/i18n';
import { localizeJobTitle, localizePlaceText, localizeTradeName, uiText } from '../../utils/uiText';
import { UberMapView } from '../UberMapView';
import { distanceBetweenKm, geocodePlace, reverseGeocodePlace } from '../../utils/places';
import { MapPin, Clock3, CircleCheck, ListPlus, Check } from 'lucide-react';

interface DutyScreenProps {
  isOnline: boolean;
  onToggleOnline: () => void;
  worker: WorkerProfile;
  language: Language;
  jobs: Job[];
  activeJob: Job | null;
  queuedJob?: Job | null;
  onAcceptJob: (job: Job) => void;
  onExpandedChange?: (expanded: boolean) => void;
  onExpansionProgress?: (progress: number, settle?: boolean) => void;
  onSelectJob: (job: Job) => void;
  onSimulateIncomingJob: () => void;
  onOpenEarnings: () => void;
  todayEarnings: number;
  onOpenAadhaarModal?: () => void;
}

type OnlineStage = 'offline' | 'transitioning' | 'searching' | 'preview' | 'expanded' | 'offlineTransition';

const NEARBY_COPY: Record<Language, { title: string; radius: string; findingLocation: string; findingJobs: string; permission: string; locationDenied: string; empty: string; recommended: string }> = {
  en: { title: 'Nearby jobs', radius: 'Within 5 km', findingLocation: 'Finding your location\u2026', findingJobs: 'Finding jobs within 5 km\u2026', permission: 'Allow location access for nearby job recommendations.', locationDenied: 'Location is off. Tap the map pin button to retry.', empty: 'No matching jobs found within 5 km.', recommended: 'Recommended' },
  hi: { title: '\u0906\u0938-\u092a\u093e\u0938 \u0915\u0947 \u0915\u093e\u092e', radius: '5 \u0915\u093f\u092e\u0940 \u0915\u0947 \u0905\u0902\u0926\u0930', findingLocation: '\u0906\u092a\u0915\u0940 \u0932\u094b\u0915\u0947\u0936\u0928 \u0916\u094b\u091c \u0930\u0939\u0947 \u0939\u0948\u0902\u2026', findingJobs: '5 \u0915\u093f\u092e\u0940 \u0915\u0947 \u0905\u0902\u0926\u0930 \u0915\u093e\u092e \u0916\u094b\u091c \u0930\u0939\u0947 \u0939\u0948\u0902\u2026', permission: '\u092a\u093e\u0938 \u0915\u0947 \u0915\u093e\u092e \u0926\u0947\u0916\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0932\u094b\u0915\u0947\u0936\u0928 \u0915\u0940 \u0905\u0928\u0941\u092e\u0924\u093f \u0926\u0947\u0902\u0964', locationDenied: '\u0932\u094b\u0915\u0947\u0936\u0928 \u092c\u0902\u0926 \u0939\u0948\u0964 \u092b\u093f\u0930 \u0938\u0947 \u0915\u094b\u0936\u093f\u0936 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u092e\u0948\u092a \u092a\u093f\u0928 \u0926\u092c\u093e\u090f\u0901\u0964', empty: '5 \u0915\u093f\u092e\u0940 \u0915\u0947 \u0905\u0902\u0926\u0930 \u0906\u092a\u0915\u0947 \u0915\u093e\u092e \u0915\u093e \u0915\u094b\u0908 \u091c\u0949\u092c \u0928\u0939\u0940\u0902 \u092e\u093f\u0932\u093e\u0964', recommended: '\u0906\u092a\u0915\u0947 \u0932\u093f\u090f \u0938\u0941\u091d\u093e\u092f\u093e' },
  bn: { title: '\u0995\u09be\u099b\u09be\u0995\u09be\u099b\u09bf \u0995\u09be\u099c', radius: '5 \u0995\u09bf\u09ae\u09bf\u09b0 \u09ae\u09a7\u09cd\u09af\u09c7', findingLocation: '\u0986\u09aa\u09a8\u09be\u09b0 \u0985\u09ac\u09b8\u09cd\u09a5\u09be\u09a8 \u0996\u09cb\u0981\u099c\u09be \u09b9\u099a\u09cd\u099b\u09c7\u2026', findingJobs: '5 \u0995\u09bf\u09ae\u09bf\u09b0 \u09ae\u09a7\u09cd\u09af\u09c7 \u0995\u09be\u099c \u0996\u09cb\u0981\u099c\u09be \u09b9\u099a\u09cd\u099b\u09c7\u2026', permission: '\u0995\u09be\u099b\u09c7\u09b0 \u0995\u09be\u099c \u09a6\u09c7\u0996\u09a4\u09c7 \u09b2\u09cb\u0995\u09c7\u09b6\u09a8 \u0985\u09a8\u09c1\u09ae\u09a4\u09bf \u09a6\u09bf\u09a8\u0964', locationDenied: '\u09b2\u09cb\u0995\u09c7\u09b6\u09a8 \u09ac\u09a8\u09cd\u09a7 \u0986\u099b\u09c7\u0964 \u0986\u09ac\u09be\u09b0 \u099a\u09c7\u09b7\u09cd\u099f\u09be \u0995\u09b0\u09a4\u09c7 \u09ae\u09cd\u09af\u09be\u09aa \u09aa\u09bf\u09a8\u09c7 \u099f\u09cd\u09af\u09be\u09aa \u0995\u09b0\u09c1\u09a8\u0964', empty: '5 \u0995\u09bf\u09ae\u09bf\u09b0 \u09ae\u09a7\u09cd\u09af\u09c7 \u0986\u09aa\u09a8\u09be\u09b0 \u0995\u09be\u099c\u09c7\u09b0 \u0995\u09cb\u09a8\u09cb \u099a\u09be\u0995\u09b0\u09bf \u09a8\u09c7\u0987\u0964', recommended: '\u0986\u09aa\u09a8\u09be\u09b0 \u099c\u09a8\u09cd\u09af \u09b8\u09c1\u09aa\u09be\u09b0\u09bf\u09b6' },
  mr: { title: '\u091c\u0935\u0933\u091a\u0940 \u0915\u093e\u092e\u0947', radius: '5 \u0915\u093f\u092e\u0940\u091a\u094d\u092f\u093e \u0906\u0924', findingLocation: '\u0924\u0941\u092e\u091a\u0947 \u0938\u094d\u0925\u093e\u0928 \u0936\u094b\u0927\u0924 \u0906\u0939\u0947\u2026', findingJobs: '5 \u0915\u093f\u092e\u0940\u091a\u094d\u092f\u093e \u0906\u0924 \u0915\u093e\u092e\u0947 \u0936\u094b\u0927\u0924 \u0906\u0939\u0947\u2026', permission: '\u091c\u0935\u0933\u091a\u0940 \u0915\u093e\u092e\u0947 \u092a\u093e\u0939\u0923\u094d\u092f\u093e\u0938\u093e\u0920\u0940 \u0938\u094d\u0925\u093e\u0928\u093e\u091a\u0940 \u092a\u0930\u0935\u093e\u0928\u0917\u0940 \u0926\u094d\u092f\u093e.', locationDenied: '\u0938\u094d\u0925\u093e\u0928 \u092c\u0902\u0926 \u0906\u0939\u0947. \u092a\u0941\u0928\u094d\u0939\u093e \u092a\u094d\u0930\u092f\u0924\u094d\u0928 \u0915\u0930\u0923\u094d\u092f\u093e\u0938\u093e\u0920\u0940 \u0928\u0915\u093e\u0936\u093e\u0935\u0930\u0940\u0932 \u092a\u093f\u0928 \u0926\u093e\u092c\u093e.', empty: '5 \u0915\u093f\u092e\u0940\u091a\u094d\u092f\u093e \u0906\u0924 \u091c\u0941\u0933\u0923\u093e\u0930\u0940 \u0915\u093e\u092e\u0947 \u0938\u093e\u092a\u0921\u0932\u0940 \u0928\u093e\u0939\u0940\u0924.', recommended: '\u0924\u0941\u092e\u091a\u094d\u092f\u093e\u0938\u093e\u0920\u0940 \u0936\u093f\u092b\u093e\u0930\u0938' },
  te: { title: '\u0c26\u0c17\u0c4d\u0c17\u0c30\u0c32\u0c4b\u0c28\u0c3f \u0c2a\u0c28\u0c41\u0c32\u0c41', radius: '5 \u0c15\u0c3f.\u0c2e\u0c40 \u0c32\u0c4b\u0c2a\u0c41', findingLocation: '\u0c2e\u0c40 \u0c38\u0c4d\u0c25\u0c3e\u0c28\u0c3e\u0c28\u0c4d\u0c28\u0c3f \u0c15\u0c28\u0c41\u0c17\u0c4a\u0c02\u0c1f\u0c4b\u0c02\u0c26\u0c3f\u2026', findingJobs: '5 \u0c15\u0c3f.\u0c2e\u0c40 \u0c32\u0c4b\u0c2a\u0c41 \u0c2a\u0c28\u0c41\u0c32\u0c28\u0c41 \u0c35\u0c46\u0c24\u0c41\u0c15\u0c41\u0c24\u0c4b\u0c02\u0c26\u0c3f\u2026', permission: '\u0c26\u0c17\u0c4d\u0c17\u0c30\u0c32\u0c4b\u0c28\u0c3f \u0c2a\u0c28\u0c41\u0c32 \u0c15\u0c4b\u0c38\u0c02 \u0c38\u0c4d\u0c25\u0c3e\u0c28 \u0c05\u0c28\u0c41\u0c2e\u0c24\u0c3f \u0c07\u0c35\u0c4d\u0c35\u0c02\u0c21\u0c3f.', locationDenied: '\u0c38\u0c4d\u0c25\u0c3e\u0c28\u0c02 \u0c06\u0c2b\u0c4d\u0c32\u0c4b \u0c09\u0c02\u0c26\u0c3f. \u0c2e\u0c33\u0c4d\u0c33\u0c40 \u0c2a\u0c4d\u0c30\u0c2f\u0c24\u0c4d\u0c28\u0c3f\u0c02\u0c1a\u0c21\u0c3e\u0c28\u0c3f\u0c15\u0c3f \u0c2e\u0c4d\u0c2f\u0c3e\u0c2a\u0c4d \u0c2a\u0c3f\u0c28\u0c4d\u0c28\u0c41 \u0c28\u0c4a\u0c15\u0c4d\u0c15\u0c02\u0c21\u0c3f.', empty: '5 \u0c15\u0c3f.\u0c2e\u0c40 \u0c32\u0c4b\u0c2a\u0c41 \u0c38\u0c30\u0c3f\u0c2a\u0c21\u0c47 \u0c2a\u0c28\u0c41\u0c32\u0c41 \u0c15\u0c28\u0c2c\u0c21\u0c32\u0c47\u0c26\u0c41.', recommended: '\u0c2e\u0c40\u0c15\u0c41 \u0c38\u0c3f\u0c2b\u0c3e\u0c30\u0c4d\u0c38\u0c41' },
};

const EXTENDED_JOBS_COPY: Record<Language, { title: string; range: string }> = {
  en: { title: 'More matching jobs nearby', range: '10-15 km' },
  hi: { title: '\u092a\u093e\u0938 \u092e\u0947\u0902 \u0914\u0930 \u0915\u093e\u092e', range: '10-15 km' },
  bn: { title: '\u0995\u09be\u099b\u09be\u0995\u09be\u099b\u09bf \u0986\u09b0\u0993 \u0995\u09be\u099c', range: '10-15 km' },
  mr: { title: '\u091c\u0935\u0933\u091a\u0940 \u0906\u0923\u0916\u0940 \u0915\u093e\u092e\u0947', range: '10-15 km' },
  te: { title: '\u0c26\u0c17\u0c4d\u0917\u0930\u0932\u094b \u0c2e\u0c30\u0c3f\u0c28\u0c4d\u0c28\u0c3f \u0c2a\u0c28\u0c41\u0c32\u0c41', range: '5 km - 15 km' },
};

const DEMO_JOB_LABEL: Record<Language, string> = {
  en: 'Demo job', hi: '\u0921\u0947\u092e\u094b \u0915\u093e\u092e', bn: '\u09a1\u09c7\u09ae\u09cb \u0995\u09be\u099c', mr: '\u0921\u0947\u092e\u094b \u0915\u093e\u092e', te: '\u0c21\u0c46\u0c2e\u0c4b \u0c2a\u0c28\u0c3f',
};

const offsetPoint = (origin: GeoPoint, distance: number, bearing: number): GeoPoint => {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const degrees = (value: number) => value * 180 / Math.PI;
  const angularDistance = distance / 6371;
  const bearingRadians = radians(bearing);
  const latitude = radians(origin.lat);
  const longitude = radians(origin.lon);
  const targetLatitude = Math.asin(Math.sin(latitude) * Math.cos(angularDistance) + Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearingRadians));
  const targetLongitude = longitude + Math.atan2(Math.sin(bearingRadians) * Math.sin(angularDistance) * Math.cos(latitude), Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(targetLatitude));
  return { lat: degrees(targetLatitude), lon: ((degrees(targetLongitude) + 540) % 360) - 180 };
};

export const DutyScreen: React.FC<DutyScreenProps> = ({
  isOnline,
  onToggleOnline,
  worker,
  language,
  jobs,
  activeJob,
  queuedJob,
  onAcceptJob,
  onExpandedChange,
  onExpansionProgress,
  onOpenAadhaarModal,
}) => {
  const t = getTranslation(language);
  const nearbyCopy = NEARBY_COPY[language];
  const screenRef = useRef<HTMLDivElement>(null);
  const [onlineStage, setOnlineStage] = useState<OnlineStage>(isOnline ? 'preview' : 'offline');
  const [screenHeight, setScreenHeight] = useState(() => typeof window === 'undefined' ? 917 : window.innerHeight);
  const dragStart = useRef<{ y: number; height: number } | null>(null);
  const flowTimers = useRef<number[]>([]);
  const panelHeight = useMotionValue(isOnline ? 337 : 226);
  const compactPanelHeight = Math.min(260, Math.max(180, screenHeight - 120));
  const previewHeight = Math.min(337, Math.max(compactPanelHeight, screenHeight * 0.52));
  const searchHeight = Math.min(226, Math.max(150, screenHeight * 0.28));
  const expandedHeight = Math.max(previewHeight, screenHeight - 124);
  const workTypeJobs = jobs.filter((job) =>
    (job.trade === worker.primaryTrade || worker.secondaryTrades.includes(job.trade))
    && job.id !== activeJob?.id
    && job.id !== queuedJob?.id
    && job.id !== activeJob?.demoSourceId
    && job.id !== queuedJob?.demoSourceId,
  );
  const workTypeJobKey = workTypeJobs.map((job) => job.id).sort().join('|');
  const [devicePosition, setDevicePosition] = useState<GeoPoint | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [jobPositions, setJobPositions] = useState<Record<string, GeoPoint>>({});
  const [demoJobs, setDemoJobs] = useState<Job[]>([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const generatedDemoSession = useRef(false);
  const workerPosition = devicePosition;
  const hasWorkerPosition = Boolean(workerPosition);
  const handleWorkerPositionChange = useCallback((position: GeoPoint) => {
    setLocationDenied(false);
    setDevicePosition((previous) => previous && distanceBetweenKm(previous, position) < 0.02 ? previous : position);
  }, []);
  const handleWorkerPositionError = useCallback(() => setLocationDenied(true), []);

  useEffect(() => {
    if (!isOnline) {
      generatedDemoSession.current = false;
      setDemoJobs([]);
      return;
    }
    if (!workerPosition || generatedDemoSession.current || workTypeJobs.length === 0) return;
    generatedDemoSession.current = true;
    let active = true;
    const sessionKey = 'kaamsetu-demo-recent-jobs';
    let recentIds: string[] = [];
    try {
      recentIds = JSON.parse(sessionStorage.getItem(sessionKey) || '[]') as string[];
    } catch { recentIds = []; }
    const suggestionCount = Math.min(3, workTypeJobs.length);
    const unseen = workTypeJobs.filter((job) => !recentIds.includes(job.id));
    const pool = unseen.length >= suggestionCount ? unseen : workTypeJobs;
    const shuffled = [...pool];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    const selected = shuffled.slice(0, suggestionCount);
    const extendedOnly = Math.random() < 0.25;
    const recentNext = [...selected.map((job) => job.id), ...recentIds.filter((id) => !selected.some((job) => job.id === id))].slice(0, Math.max(6, suggestionCount));
    try { sessionStorage.setItem(sessionKey, JSON.stringify(recentNext)); } catch { /* private browsing may disable storage */ }
    void Promise.all(selected.map(async (job, index) => {
      const distance = extendedOnly ? [10.4, 12.2, 14.3][index] : [0.8, 2.6, 4.4][index];
      const point = offsetPoint(workerPosition, distance, Math.random() * 360);
      const place = await reverseGeocodePlace(point, language);
      const area = place?.label || worker.currentLocation || 'Nearby area';
      return {
        ...job,
        id: `demo-${job.id}`,
        demoSourceId: job.id,
        isDemo: true,
        siteName: area,
        locationAddress: area,
        locationCoordinates: point,
        distanceKm: Math.round(distance * 10) / 10,
        travelTimeMin: Math.max(5, Math.round(distance * 4)),
      };
    })).then((generated) => {
      if (active) {
        setDemoJobs(generated);
        setJobPositions((current) => ({ ...current, ...Object.fromEntries(generated.flatMap((job) => job.locationCoordinates ? [[job.id, job.locationCoordinates]] : [])) }));
      }
    });
    return () => { active = false; };
  }, [isOnline, hasWorkerPosition]);

  useEffect(() => {
    let active = true;
    if (!isOnline) {
      setPlacesLoading(true);
      return () => { active = false; };
    }
    setPlacesLoading(true);
    const loadPositions = async () => {
      const positions: Record<string, GeoPoint> = {};
      for (const job of workTypeJobs) {
        if (!active) return;
        const place = await geocodePlace(`${job.locationAddress}, ${job.siteName}, Bengaluru, India`);
        if (place) positions[job.id] = { lat: place.lat, lon: place.lon };
      }
      if (active) {
        setJobPositions((current) => ({ ...current, ...positions }));
        setPlacesLoading(false);
      }
    };
    void loadPositions();
    return () => { active = false; };
  }, [workTypeJobKey, isOnline]);

  const realAvailableJobs = workerPosition
    ? workTypeJobs.flatMap((job) => {
      const position = jobPositions[job.id];
      if (!position) return [];
      const distance = distanceBetweenKm(workerPosition, position);
      return distance <= 5 ? [{ ...job, distanceKm: Math.round(distance * 10) / 10 }] : [];
    }).sort((a, b) => a.distanceKm - b.distanceKm)
    : [];
  const realExtendedJobs = workerPosition
    ? workTypeJobs.flatMap((job) => {
      const position = jobPositions[job.id];
      if (!position) return [];
      const distance = distanceBetweenKm(workerPosition, position);
      return distance >= 10 && distance <= 15 ? [{ ...job, distanceKm: Math.round(distance * 10) / 10 }] : [];
    }).sort((a, b) => a.distanceKm - b.distanceKm)
    : [];
  const demoAvailableJobs = demoJobs.filter((job) => job.distanceKm <= 5);
  const demoExtendedJobs = demoJobs.filter((job) => job.distanceKm >= 10 && job.distanceKm <= 15);
  const availableJobs = realAvailableJobs.length > 0 ? realAvailableJobs : demoAvailableJobs;
  const extendedJobs = realExtendedJobs.length > 0 ? realExtendedJobs : realAvailableJobs.length > 0 ? [] : demoExtendedJobs;
  const nearbyRecommendation = availableJobs[0] || null;

  useEffect(() => () => {
    flowTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    const element = screenRef.current;
    if (!element) return;
    const resizeObserver = new ResizeObserver(([entry]) => {
      setScreenHeight(entry.contentRect.height);
    });
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (onlineStage !== 'searching' && onlineStage !== 'preview' && onlineStage !== 'expanded') return;
    const targetHeight = onlineStage === 'searching' ? searchHeight : onlineStage === 'expanded' ? expandedHeight : previewHeight;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animation = animate(panelHeight, targetHeight, {
      duration: reduceMotion ? 0.01 : 0.3,
      ease: [0.42, 0, 0.58, 1],
    });
    return () => animation.stop();
  }, [onlineStage, panelHeight, searchHeight, previewHeight, expandedHeight]);

  const handleGoClick = () => {
    if (!isOnline && !worker.isKycVerified) {
      onOpenAadhaarModal?.();
      return;
    }

    flowTimers.current.forEach((timer) => window.clearTimeout(timer));
    flowTimers.current = [];

    if (isOnline) {
      onExpandedChange?.(false);
      onExpansionProgress?.(0, true);
      // Figma first animates to its short offline transition frame, waits
      // 250ms, then returns to the offline map with a 300ms Smart Animate.
      setOnlineStage('offlineTransition');
      flowTimers.current.push(window.setTimeout(() => {
        onToggleOnline();
        setOnlineStage('offline');
        panelHeight.set(searchHeight);
      }, 550));
      return;
    }

    // First Smart Animate the GO control. Figma delays its online state
    // until that transition finishes, then holds the search card for 2s.
    onExpandedChange?.(false);
    onExpansionProgress?.(0, true);
    setOnlineStage('transitioning');
    flowTimers.current.push(window.setTimeout(() => {
      onToggleOnline();
      setOnlineStage('searching');
      flowTimers.current.push(window.setTimeout(() => setOnlineStage('preview'), 2000));
    }, 550));
  };

  const startPanelDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { y: event.clientY, height: panelHeight.get() };
  };

  const movePanelDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current) return;
    const nextHeight = Math.max(previewHeight, Math.min(expandedHeight, dragStart.current.height + dragStart.current.y - event.clientY));
    panelHeight.set(nextHeight);
    onExpansionProgress?.((nextHeight - previewHeight) / Math.max(1, expandedHeight - previewHeight));
  };

  const finishPanelDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current) return;
    const delta = event.clientY - dragStart.current.y;
    const shouldExpand = delta < -45 || (Math.abs(delta) <= 45 && onlineStage === 'expanded');
    const nextStage: OnlineStage = shouldExpand ? 'expanded' : 'preview';
    dragStart.current = null;
    setOnlineStage(nextStage);
    onExpandedChange?.(shouldExpand);
    onExpansionProgress?.(shouldExpand ? 1 : 0, true);
    if (nextStage === onlineStage) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      animate(panelHeight, shouldExpand ? expandedHeight : previewHeight, {
        duration: reduceMotion ? 0.01 : 0.3,
        ease: [0.42, 0, 0.58, 1],
      });
    }
  };

  return (
    <div ref={screenRef} className="relative isolate flex-1 min-h-0 w-full overflow-hidden bg-[#f1f1f1] select-none font-sans">
      <div className="absolute inset-0">
        <UberMapView
          language={language}
          isOnline={isOnline}
          activeJob={null}
          incomingJob={null}
          suggestedJob={nearbyRecommendation}
          workerLocation={worker.currentLocation}
          onWorkerPositionChange={handleWorkerPositionChange}
          onWorkerPositionError={handleWorkerPositionError}
        />
      </div>

      {(onlineStage === 'searching' || onlineStage === 'preview' || onlineStage === 'expanded') && (
        <motion.section
          aria-live={onlineStage === 'searching' ? 'polite' : undefined}
          initial={{ opacity: 0, y: 260 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.01 : 0.3, ease: [0.42, 0, 0.58, 1] }}
          style={{ height: panelHeight }}
          className="absolute z-20 bottom-[calc(77px+env(safe-area-inset-bottom))] left-1/2 w-[calc(100%-24px)] max-w-[420px] -translate-x-1/2 overflow-y-auto overscroll-contain rounded-[20px] bg-[#f1f1f1] px-3.5 sm:px-[15px] pt-[15px] shadow-[0px_2px_20px_rgba(0,0,0,0.11)] scrollbar-none lg:bottom-6 lg:left-auto lg:right-6 lg:max-h-[calc(100%-3rem)] lg:w-[min(420px,40vw)] lg:max-w-none lg:translate-x-0"
        >
          {(onlineStage === 'preview' || onlineStage === 'expanded') && <button
            type="button"
            aria-label={onlineStage === 'expanded' ? 'Collapse work list' : 'Expand work list'}
            onPointerDown={startPanelDrag}
            onPointerMove={movePanelDrag}
            onPointerUp={finishPanelDrag}
            onPointerCancel={finishPanelDrag}
            className="absolute left-1/2 top-[3px] z-10 h-[10px] w-[52px] -translate-x-1/2 cursor-grab touch-none rounded-full active:cursor-grabbing"
          >
            <span className="mx-auto mt-[3px] block h-[2px] w-[22px] rounded-full bg-[#b5b5b5]" />
          </button>}
          {onlineStage === 'searching' && (
            <>
              <div className="absolute left-[25px] top-[25px] flex items-center gap-1.5">
                <h2 className="text-[22px] leading-none font-bold text-black">
                  {uiText(language, 'searchingWork')}
                </h2>
                <span className="inline-flex items-center gap-[2px]" aria-label="Searching">
                  {[0, 1, 2].map((dot) => (
                    <motion.i
                      key={dot}
                      className="block h-[5px] w-[5px] rounded-full bg-[#b5b5b5]"
                      animate={{ opacity: [0.35, 1, 0.35], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 0.6, delay: dot * 0.1, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  ))}
                </span>
              </div>
            </>
          )}
          {(onlineStage === 'preview' || onlineStage === 'expanded') && (
          <motion.div key="available-work-list" aria-label={uiText(language, 'availableWork')} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.01 : 0.3, ease: [0.42, 0, 0.58, 1] }} className="pb-[82px]">
          <div className="mx-auto flex w-full max-w-[390px] md:max-w-xl flex-col gap-[10px]">
            <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm">
              <span className="text-xs font-black text-slate-900">{nearbyCopy.title}</span>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-800">{nearbyCopy.radius} &middot; {availableJobs.length}</span>
            </div>
            {availableJobs.length > 0 ? availableJobs.map((job) => {
              const jobTradeName = localizeTradeName(job.trade, language);
              const title = localizeJobTitle(job, language);
              const rateUnit = uiText(language, job.wageType === 'hourly' ? 'hourlyRate' : job.wageType === 'daily' ? 'dailyRate' : 'totalRate');
              const isCurrentActive = activeJob?.id === job.id;
              const isCurrentlyQueued = queuedJob?.id === job.id;
              const queueIsFull = Boolean(activeJob && queuedJob);
              return (
                <motion.article key={job.id} layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }} className="relative min-h-[208px] rounded-[22px] bg-white px-[15px] pt-[15px] pb-[10px] shadow-[0px_2px_20px_rgba(0,0,0,0.11)]">
                  <span className="inline-flex h-[17px] max-w-[calc(100%-125px)] items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-[5px] bg-[rgba(3,192,60,0.22)] px-1 text-[10px] font-semibold leading-none text-[#03c03c]">
                    <CircleCheck className="h-[12px] w-[12px] fill-[#03c03c] text-white" />
                    {jobTradeName}
                  </span>
                  {job.isDemo && <span className="ml-1 rounded-md bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-800">{DEMO_JOB_LABEL[language]}</span>}
                  {job.id === nearbyRecommendation?.id && <span className="ml-1 rounded-md bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-800">{nearbyCopy.recommended}</span>}
                  <span className="ml-2 inline-flex max-w-[115px] shrink-0 rounded-[15px] bg-[rgba(45,89,240,0.16)] px-2 py-2.5 align-top text-[11px] font-bold leading-none text-[#2d59f0] sm:px-[9px] sm:text-[12px]">
                    &#8377;{job.agreedAmount}{rateUnit}
                  </span>
                  <h3 className="mt-[10px] min-h-[38px] w-full pr-1 text-[16px] font-bold leading-[19px] text-black line-clamp-2">{title}</h3>
                  <div className="mt-[9px] flex min-w-0 items-center gap-1 text-[10px] leading-[14px] text-[#b5b5b5]">
                    <MapPin className="h-[13px] w-[13px] shrink-0 fill-[#b5b5b5] text-[#b5b5b5]" />
                    <span className="truncate">{localizePlaceText(job.siteName, language)}</span>
                  </div>
                  <div className="mt-[10px] flex flex-wrap items-center gap-[6px] text-[10px] font-semibold leading-[18px] text-[#b5b5b5] sm:gap-[10px]">
                    <span className="inline-flex h-[18px] items-center gap-1 rounded-[5px] bg-[#f1f1f1] px-1.5">
                      <MapPin className="h-3 w-3 fill-[#b5b5b5]" />{job.distanceKm} {uiText(language, 'kmUnit')}
                    </span>
                    <span className="inline-flex h-[18px] items-center gap-1 rounded-[5px] bg-[#f1f1f1] px-1.5">
                      <Clock3 className="h-3 w-3" />{job.startTime} - {job.endTime}
                    </span>
                  </div>
                  <button
                    disabled={isCurrentActive || isCurrentlyQueued || (queueIsFull && !isCurrentActive && !isCurrentlyQueued)}
                    onClick={() => onAcceptJob(job)}
                    className={`mt-[10px] flex h-[55px] w-full items-center justify-center gap-[10px] rounded-[15px] text-[16px] font-semibold leading-none text-white transition-transform disabled:cursor-not-allowed active:scale-[0.98] ${
                      isCurrentActive ? 'bg-blue-100 text-blue-900' : isCurrentlyQueued ? 'bg-emerald-100 text-emerald-800' : queueIsFull ? 'bg-slate-300' : activeJob ? 'bg-emerald-600' : 'bg-[#2d59f0]'
                    }`}
                  >
                    {isCurrentActive ? <CircleCheck className="h-5 w-5" /> : isCurrentlyQueued ? <Check className="h-5 w-5 stroke-[3]" /> : activeJob ? <ListPlus className="h-5 w-5" /> : <CircleCheck className="h-5 w-5 fill-white text-[#2d59f0]" />}
                    {isCurrentActive
                      ? uiText(language, 'activeJob')
                      : isCurrentlyQueued
                        ? uiText(language, 'queuedAsNext')
                        : queueIsFull
                          ? uiText(language, 'queueFullFinish')
                          : activeJob
                            ? uiText(language, 'queueNext')
                            : uiText(language, 'acceptJob')}
                  </button>
                </motion.article>
              );
            }) : !workerPosition || placesLoading ? (
              <div className="rounded-[22px] bg-white px-5 py-7 text-center shadow-[0px_2px_20px_rgba(0,0,0,0.11)]">
                <h2 className="text-[16px] font-bold text-black">{!workerPosition ? locationDenied ? nearbyCopy.locationDenied : nearbyCopy.findingLocation : nearbyCopy.findingJobs}</h2>
                <p className="mt-1 text-[12px] text-[#777]">{nearbyCopy.permission}</p>
              </div>
            ) : (
              <>
                <div className="rounded-[22px] bg-white px-5 py-7 text-center shadow-[0px_2px_20px_rgba(0,0,0,0.11)]">
                  <h2 className="text-[16px] font-bold text-black">{nearbyCopy.empty}</h2>
                </div>
                {extendedJobs.length > 0 && <section aria-label={EXTENDED_JOBS_COPY[language].title} className="mt-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
                    <span className="text-xs font-black text-slate-900">{EXTENDED_JOBS_COPY[language].title}</span>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">{EXTENDED_JOBS_COPY[language].range} &middot; {extendedJobs.length}</span>
                  </div>
                  {extendedJobs.map((job) => {
                    const isCurrentActive = activeJob?.id === job.id;
                    const isCurrentlyQueued = queuedJob?.id === job.id;
                    const queueIsFull = Boolean(activeJob && queuedJob);
                    const rateUnit = uiText(language, job.wageType === 'hourly' ? 'hourlyRate' : job.wageType === 'daily' ? 'dailyRate' : 'totalRate');
                    return <motion.article key={job.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-[20px] bg-white p-3.5 shadow-[0px_2px_16px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="max-w-[65%] truncate rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{localizeTradeName(job.trade, language)}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {job.isDemo && <span className="rounded-md bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-800">{DEMO_JOB_LABEL[language]}</span>}
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-800">{job.distanceKm} {uiText(language, 'kmUnit')}</span>
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-black text-slate-900">{localizeJobTitle(job, language)}</h3>
                      <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-slate-500"><MapPin className="h-3 w-3 shrink-0" />{localizePlaceText(job.siteName, language)}</p>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{job.startTime} - {job.endTime}</span>
                    &#8377;{job.agreedAmount}{rateUnit}
                      </div>
                      <button type="button" disabled={isCurrentActive || isCurrentlyQueued || queueIsFull} onClick={() => onAcceptJob(job)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2d59f0] px-3 text-xs font-black text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                        {isCurrentActive ? uiText(language, 'activeJob') : isCurrentlyQueued ? uiText(language, 'queuedAsNext') : activeJob ? <><ListPlus className="h-4 w-4" />{uiText(language, 'queueNext')}</> : <><CircleCheck className="h-4 w-4" />{uiText(language, 'acceptJob')}</>}
                      </button>
                    </motion.article>;
                  })}
                </section>}
              </>
            )}
          </div>
          </motion.div>
          )}
        </motion.section>
      )}

      {onlineStage === 'offline' && <motion.button
          type="button"
          onClick={handleGoClick}
          className="absolute z-20 bottom-[calc(76px+env(safe-area-inset-bottom))] left-1/2 flex h-[60px] w-[110px] -translate-x-1/2 items-center justify-center rounded-[22px] bg-[#2d59f0]/40 shadow-[0_2px_10px_rgba(45,89,240,0.18)] transition-transform active:scale-95 lg:bottom-6"
          aria-label={t.swipeToOnline}
        >
          <span className="flex h-[50px] w-[100px] flex-col items-center justify-center rounded-[20px] bg-[#2d59f0] text-[#f1f1f1]">
            <span className="text-[24px] leading-[24px] font-semibold">GO</span>
            <span className="text-[12px] leading-[12px] font-medium text-white/70">{uiText(language, 'online')}</span>
          </span>
      </motion.button>}

      {(onlineStage === 'searching' || onlineStage === 'preview' || onlineStage === 'expanded') && <motion.button
          type="button"
          onClick={handleGoClick}
          className="absolute z-30 bottom-[calc(145px+env(safe-area-inset-bottom))] left-1/2 flex h-[50px] w-[100px] -translate-x-1/2 flex-col items-center justify-center rounded-[20px] bg-white text-black shadow-[0px_2px_10px_rgba(0,0,0,0.11)] transition-transform active:scale-95 lg:bottom-28"
          aria-label={t.swipeToOffline}
        >
          <span className="text-[24px] leading-[24px] font-semibold">GO</span>
          <span className="text-[12px] leading-[12px] font-medium text-[#b5b5b5]">{uiText(language, 'offline')}</span>
      </motion.button>}
    </div>
  );
};
