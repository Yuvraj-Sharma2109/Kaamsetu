import React, { useEffect, useMemo, useRef, useState } from 'react';
import { control, divIcon, map as createMap, marker, polyline, tileLayer } from 'leaflet';
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
  autoNavigate?: boolean;
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
const MAP_COPY: Record<Language, { start: string; starting: string; stop: string; locating: string; findingDestination: string; routeError: string; yourLocation: string; arrival: string; continue: string; head: string; turn: string; onto: string; roundabout: string; directions: Record<string, string> }> = {
  en: { start: 'Start navigation', starting: 'Finding route\u2026', stop: 'End navigation', locating: 'Waiting for GPS location', findingDestination: 'Finding job location\u2026', routeError: 'Route unavailable. Check your connection and try again.', yourLocation: 'Your location', arrival: 'You have arrived', continue: 'Continue straight', head: 'Head toward', turn: 'Turn', onto: 'onto', roundabout: 'At the roundabout', directions: { left: 'left', right: 'right', 'slight left': 'slightly left', 'slight right': 'slightly right', 'sharp left': 'sharply left', 'sharp right': 'sharply right', uturn: 'make a U-turn', straight: 'straight' } },
  hi: { start: '\u0928\u0947\u0935\u093f\u0917\u0947\u0936\u0928 \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902', starting: '\u0930\u093e\u0938\u094d\u0924\u093e \u0916\u094b\u091c \u0930\u0939\u0947 \u0939\u0948\u0902\u2026', stop: '\u0928\u0947\u0935\u093f\u0917\u0947\u0936\u0928 \u092c\u0902\u0926 \u0915\u0930\u0947\u0902', locating: 'GPS \u0932\u094b\u0915\u0947\u0936\u0928 \u0915\u0940 \u092a\u094d\u0930\u0924\u0940\u0915\u094d\u0937\u093e', findingDestination: '\u0915\u093e\u092e \u0915\u0940 \u091c\u0917\u0939 \u0916\u094b\u091c \u0930\u0939\u0947 \u0939\u0948\u0902\u2026', routeError: '\u0930\u093e\u0938\u094d\u0924\u093e \u0928\u0939\u0940\u0902 \u092e\u093f\u0932\u093e\u0964 \u0907\u0902\u091f\u0930\u0928\u0947\u091f \u0915\u0928\u0947\u0915\u094d\u0936\u0928 \u091c\u093e\u0901\u091a\u0947\u0902 \u0914\u0930 \u092b\u093f\u0930 \u0915\u094b\u0936\u093f\u0936 \u0915\u0930\u0947\u0902\u0964', yourLocation: '\u0906\u092a\u0915\u0940 \u0932\u094b\u0915\u0947\u0936\u0928', arrival: '\u0906\u092a \u092a\u0939\u0941\u0901\u091a \u0917\u090f \u0939\u0948\u0902', continue: '\u0938\u0940\u0927\u0947 \u0906\u0917\u0947 \u092c\u0922\u093c\u0947\u0902', head: '\u0906\u0917\u0947 \u092c\u0922\u093c\u0947\u0902', turn: '\u092e\u0941\u0921\u093c\u0947\u0902', onto: '\u0915\u0940 \u0913\u0930', roundabout: '\u0917\u094b\u0932 \u091a\u0915\u094d\u0915\u0930 \u092a\u0930', directions: { left: '\u092c\u093e\u090f\u0901', right: '\u0926\u093e\u090f\u0901', 'slight left': '\u0939\u0932\u094d\u0915\u093e \u092c\u093e\u090f\u0901', 'slight right': '\u0939\u0932\u094d\u0915\u093e \u0926\u093e\u090f\u0901', 'sharp left': '\u0924\u0947\u091c\u093c \u092c\u093e\u090f\u0901', 'sharp right': '\u0924\u0947\u091c\u093c \u0926\u093e\u090f\u0901', uturn: '\u092f\u0942-\u091f\u0930\u094d\u0928 \u0932\u0947\u0902', straight: '\u0938\u0940\u0927\u0947' } },
  bn: { start: '\u09a8\u09c7\u09ad\u09bf\u0997\u09c7\u09b6\u09a8 \u09b6\u09c1\u09b0\u09c1 \u0995\u09b0\u09c1\u09a8', starting: '\u09b0\u09be\u09b8\u09cd\u09a4\u09be \u0996\u09cb\u0981\u099c\u09be \u09b9\u099a\u09cd\u099b\u09c7\u2026', stop: '\u09a8\u09c7\u09ad\u09bf\u0997\u09c7\u09b6\u09a8 \u09ac\u09a8\u09cd\u09a7 \u0995\u09b0\u09c1\u09a8', locating: 'GPS \u09b2\u09cb\u0995\u09c7\u09b6\u09a8\u09c7\u09b0 \u0985\u09aa\u09c7\u0995\u09cd\u09b7\u09be\u09af\u09bc', findingDestination: '\u0995\u09be\u099c\u09c7\u09b0 \u09b8\u09cd\u09a5\u09be\u09a8 \u0996\u09cb\u0981\u099c\u09be \u09b9\u099a\u09cd\u099b\u09c7\u2026', routeError: '\u09b0\u09be\u09b8\u09cd\u09a4\u09be \u09aa\u09be\u0993\u09af\u09bc\u09be \u09af\u09be\u09af\u09bc\u09a8\u09bf\u0964 \u09b8\u0982\u09af\u09cb\u0997 \u09a6\u09c7\u0996\u09c7 \u0986\u09ac\u09be\u09b0 \u099a\u09c7\u09b7\u09cd\u099f\u09be \u0995\u09b0\u09c1\u09a8\u0964', yourLocation: '\u0986\u09aa\u09a8\u09be\u09b0 \u0985\u09ac\u09b8\u09cd\u09a5\u09be\u09a8', arrival: '\u0986\u09aa\u09a8\u09bf \u09aa\u09cc\u0981\u099b\u09c7 \u0997\u09c7\u099b\u09c7\u09a8', continue: '\u09b8\u09cb\u099c\u09be \u098f\u0997\u09bf\u09af\u09bc\u09c7 \u09af\u09be\u09a8', head: '\u098f\u0997\u09bf\u09af\u09bc\u09c7 \u09af\u09be\u09a8', turn: '\u09ae\u09cb\u09a1\u09bc \u09a8\u09bf\u09a8', onto: '\u09a6\u09bf\u0995\u09c7', roundabout: '\u0997\u09cb\u09b2\u099a\u09a4\u09cd\u09ac\u09b0\u09c7', directions: { left: '\u09ac\u09be\u0981\u09a6\u09bf\u0995\u09c7', right: '\u09a1\u09be\u09a8\u09a6\u09bf\u0995\u09c7', 'slight left': '\u09b8\u09be\u09ae\u09be\u09a8\u09cd\u09af \u09ac\u09be\u0981\u09a6\u09bf\u0995\u09c7', 'slight right': '\u09b8\u09be\u09ae\u09be\u09a8\u09cd\u09af \u09a1\u09be\u09a8\u09a6\u09bf\u0995\u09c7', 'sharp left': '\u09a4\u09c0\u09ac\u09cd\u09b0 \u09ac\u09be\u0981\u09a6\u09bf\u0995\u09c7', 'sharp right': '\u09a4\u09c0\u09ac\u09cd\u09b0 \u09a1\u09be\u09a8\u09a6\u09bf\u0995\u09c7', uturn: '\u0987\u0989-\u099f\u09be\u09b0\u09cd\u09a8 \u09a8\u09bf\u09a8', straight: '\u09b8\u09cb\u099c\u09be' } },
  mr: { start: '\u0928\u0947\u0935\u094d\u0939\u093f\u0917\u0947\u0936\u0928 \u0938\u0941\u0930\u0942 \u0915\u0930\u093e', starting: '\u092e\u093e\u0930\u094d\u0917 \u0936\u094b\u0927\u0924 \u0906\u0939\u0947\u2026', stop: '\u0928\u0947\u0935\u094d\u0939\u093f\u0917\u0947\u0936\u0928 \u0925\u093e\u0902\u092c\u0935\u093e', locating: 'GPS \u0938\u094d\u0925\u093e\u0928\u093e\u091a\u0940 \u0935\u093e\u091f \u092a\u093e\u0939\u0924 \u0906\u0939\u0947', findingDestination: '\u0915\u093e\u092e\u093e\u091a\u0947 \u0920\u093f\u0915\u093e\u0923 \u0936\u094b\u0927\u0924 \u0906\u0939\u0947\u2026', routeError: '\u092e\u093e\u0930\u094d\u0917 \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u093e\u0939\u0940. \u0915\u0928\u0947\u0915\u094d\u0936\u0928 \u0924\u092a\u093e\u0938\u0942\u0928 \u092a\u0941\u0928\u094d\u0939\u093e \u092a\u094d\u0930\u092f\u0924\u094d\u0928 \u0915\u0930\u093e.', yourLocation: '\u0924\u0941\u092e\u091a\u0947 \u0938\u094d\u0925\u093e\u0928', arrival: '\u0924\u0941\u092e\u094d\u0939\u0940 \u092a\u094b\u0939\u094b\u091a\u0932\u093e\u0924', continue: '\u0938\u0930\u0933 \u092a\u0941\u0922\u0947 \u091c\u093e', head: '\u092a\u0941\u0922\u0947 \u091c\u093e', turn: '\u0935\u0933\u093e', onto: '\u091a\u094d\u092f\u093e \u0926\u093f\u0936\u0947\u0928\u0947', roundabout: '\u0917\u094b\u0932 \u091a\u094c\u0915\u093e\u0924', directions: { left: '\u0921\u093e\u0935\u0940\u0915\u0921\u0947', right: '\u0909\u091c\u0935\u0940\u0915\u0921\u0947', 'slight left': '\u0925\u094b\u0921\u0947 \u0921\u093e\u0935\u0940\u0915\u0921\u0947', 'slight right': '\u0925\u094b\u0921\u0947 \u0909\u091c\u0935\u0940\u0915\u0921\u0947', 'sharp left': '\u0924\u0940\u0935\u094d\u0930 \u0921\u093e\u0935\u0940\u0915\u0921\u0947', 'sharp right': '\u0924\u0940\u0935\u094d\u0930 \u0909\u091c\u0935\u0940\u0915\u0921\u0947', uturn: '\u092f\u0942-\u091f\u0930\u094d\u0928 \u0918\u094d\u092f\u093e', straight: '\u0938\u0930\u0933' } },
  te: { start: '\u0c28\u0c3e\u0c35\u0c3f\u0c17\u0c47\u0c37\u0c28\u0c4d \u0c2a\u0c4d\u0c30\u0c3e\u0c30\u0c02\u0c2d\u0c3f\u0c02\u0c1a\u0c02\u0c21\u0c3f', starting: '\u0c2e\u0c3e\u0c30\u0c4d\u0c17\u0c3e\u0c28\u0c4d\u0c28\u0c3f \u0c15\u0c28\u0c41\u0c17\u0c4a\u0c02\u0c1f\u0c4b\u0c02\u0c26\u0c3f\u2026', stop: '\u0c28\u0c3e\u0c35\u0c3f\u0c17\u0c47\u0c37\u0c28\u0c4d \u0c06\u0c2a\u0c02\u0c21\u0c3f', locating: 'GPS \u0c38\u0c4d\u0c25\u0c3e\u0c28\u0c02 \u0c15\u0c4b\u0c38\u0c02 \u0c35\u0c47\u0c1a\u0c3f \u0c09\u0c02\u0c26\u0c3f', findingDestination: '\u0c2a\u0c28\u0c3f \u0c2a\u0c4d\u0c30\u0c26\u0c47\u0c36\u0c3e\u0c28\u0c4d\u0c28\u0c3f \u0c15\u0c28\u0c41\u0c17\u0c4a\u0c02\u0c1f\u0c4b\u0c02\u0c26\u0c3f\u2026', routeError: '\u0c2e\u0c3e\u0c30\u0c4d\u0c17\u0c02 \u0c05\u0c02\u0c26\u0c41\u0c2c\u0c3e\u0c1f\u0c41\u0c32\u0c4b \u0c32\u0c47\u0c26\u0c41. \u0c15\u0c28\u0c46\u0c15\u0c4d\u0c37\u0c28\u0c4d \u0c24\u0c28\u0c3f\u0c16\u0c40 \u0c1a\u0c47\u0c38\u0c3f \u0c2e\u0c33\u0c4d\u0c32\u0c40 \u0c2a\u0c4d\u0c30\u0c2f\u0c24\u0c4d\u0c28\u0c3f\u0c02\u0c1a\u0c02\u0c21\u0c3f.', yourLocation: '\u0c2e\u0c40 \u0c38\u0c4d\u0c25\u0c3e\u0c28\u0c02', arrival: '\u0c2e\u0c40\u0c30\u0c41 \u0c1a\u0c47\u0c30\u0c41\u0c15\u0c41\u0c28\u0c4d\u0c28\u0c3e\u0c30\u0c41', continue: '\u0c28\u0c47\u0c30\u0c41\u0c17\u0c3e \u0c15\u0c4a\u0c28\u0c38\u0c3e\u0c17\u0c02\u0c21\u0c3f', head: '\u0c2e\u0c41\u0c02\u0c26\u0c41\u0c15\u0c41 \u0c35\u0c46\u0c33\u0c4d\u0c32\u0c02\u0c21\u0c3f', turn: '\u0c24\u0c3f\u0c30\u0c17\u0c02\u0c21\u0c3f', onto: '\u0c35\u0c48\u0c2a\u0c41', roundabout: '\u0c30\u0c4c\u0c02\u0c21\u0c2c\u0c4c\u0c1f\u0c4d \u0c35\u0c26\u0c4d\u0c26', directions: { left: '\u0c0e\u0c21\u0c2e\u0c35\u0c48\u0c2a\u0c41', right: '\u0c15\u0c41\u0c21\u0c3f\u0c35\u0c48\u0c2a\u0c41', 'slight left': '\u0c15\u0c4a\u0c26\u0c4d\u0c26\u0c3f\u0c17\u0c3e \u0c0e\u0c21\u0c2e\u0c35\u0c48\u0c2a\u0c41', 'slight right': '\u0c15\u0c4a\u0c26\u0c4d\u0c26\u0c3f\u0c17\u0c3e \u0c15\u0c41\u0c21\u0c3f\u0c35\u0c48\u0c2a\u0c41', 'sharp left': '\u0c24\u0c40\u0c35\u0c4d\u0c30\u0c02\u0c17\u0c3e \u0c0e\u0c21\u0c2e\u0c35\u0c48\u0c2a\u0c41', 'sharp right': '\u0c24\u0c40\u0c35\u0c4d\u0c30\u0c02\u0c17\u0c3e \u0c15\u0c41\u0c21\u0c3f\u0c35\u0c48\u0c2a\u0c41', uturn: '\u0c2f\u0c42-\u0c1f\u0c30\u0c4d\u0c28\u0c4d \u0c24\u0c40\u0c38\u0c41\u0c15\u0c4b\u0c02\u0c21\u0c3f', straight: '\u0c28\u0c47\u0c30\u0c41\u0c17\u0c3e' } },
};
const MAP_MARKER_COPY: Record<Language, { worker: string; workSite: string; recommended: string; routeLabel: string }> = {
  en: { worker: 'You', workSite: 'Work site', recommended: 'Recommended nearby job', routeLabel: 'Navigation route' },
  hi: { worker: '\u0906\u092a', workSite: '\u0915\u093e\u092e \u0915\u0940 \u091c\u0917\u0939', recommended: '\u092a\u093e\u0938 \u0915\u093e \u0938\u0941\u091d\u093e\u092f\u093e \u0915\u093e\u092e', routeLabel: '\u0928\u0947\u0935\u093f\u0917\u0947\u0936\u0928 \u092e\u093e\u0930\u094d\u0917' },
  bn: { worker: '\u0986\u09aa\u09a8\u09bf', workSite: '\u0995\u09be\u099c\u09c7\u09b0 \u09b8\u09cd\u09a5\u09be\u09a8', recommended: '\u0995\u09be\u099b\u09c7\u09b0 \u09aa\u09cd\u09b0\u09b8\u09cd\u09a4\u09be\u09ac\u09bf\u09a4 \u0995\u09be\u099c', routeLabel: '\u09a8\u09c7\u09ad\u09bf\u0997\u09c7\u09b6\u09a8 \u09aa\u09a5' },
  mr: { worker: '\u0924\u0941\u092e\u094d\u0939\u0940', workSite: '\u0915\u093e\u092e\u093e\u091a\u0947 \u0920\u093f\u0915\u093e\u0923', recommended: '\u091c\u0935\u0933\u091a\u0947 \u0938\u0941\u091a\u0935\u0932\u0947\u0932\u0947 \u0915\u093e\u092e', routeLabel: '\u0928\u0947\u0935\u094d\u0939\u093f\u0917\u0947\u0936\u0928 \u092e\u093e\u0930\u094d\u0917' },
  te: { worker: '\u0c2e\u0c40\u0c30\u0c41', workSite: '\u0c2a\u0c28\u0c3f \u0c2a\u0c4d\u0c30\u0c26\u0c47\u0c36\u0c02', recommended: '\u0c26\u0c17\u0c4d\u0c17\u0c30\u0c32\u0c4b\u0c28\u0c3f \u0c38\u0c42\u0c1a\u0c3f\u0c02\u0c1a\u0c3f\u0c28 \u0c2a\u0c28\u0c3f', routeLabel: '\u0c28\u0c3e\u0c35\u0c3f\u0c17\u0c47\u0c37\u0c28\u0c4d \u0c2e\u0c3e\u0c30\u0c4d\u0c17\u0c02' },
};

const distanceKm = (a: GeoPoint, b: GeoPoint) => {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latDelta = radians(b.lat - a.lat);
  const lonDelta = radians(b.lon - a.lon);
  const value = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(lonDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const routeArrowIcon = (bearing: number) => divIcon({
  className: 'kaamsetu-route-arrow-host',
  html: `<span class="kaamsetu-route-arrow" style="transform:rotate(${bearing}deg)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 21l-8-4-8 4 8-18Z" fill="currentColor" stroke="none"/></svg></span>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const workerIcon = () => divIcon({
  className: 'kaamsetu-worker-marker-host',
  html: '<span class="kaamsetu-worker-marker"><span class="kaamsetu-worker-marker__pulse"></span><span class="kaamsetu-worker-marker__core"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 3 15 9-7 2-3 7L5 3Z" fill="currentColor" stroke="white" stroke-width="1.8" stroke-linejoin="round"/></svg></span></span>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const workLocationIcon = () => divIcon({
  className: 'kaamsetu-job-marker-host',
  html: '<span class="kaamsetu-job-marker"><svg viewBox="0 0 28 36" aria-hidden="true"><path d="M14 1C6.82 1 1 6.82 1 14c0 9.1 13 21 13 21s13-11.9 13-21C27 6.82 21.18 1 14 1Z" fill="currentColor" stroke="white" stroke-width="2"/><circle cx="14" cy="14" r="4.5" fill="white"/></svg></span>',
  iconSize: [36, 44],
  iconAnchor: [18, 40],
});

const bearingDegrees = (start: GeoPoint, end: GeoPoint) => {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const toDegrees = (radians: number) => radians * 180 / Math.PI;
  const lat1 = toRadians(start.lat);
  const lat2 = toRadians(end.lat);
  const lonDelta = toRadians(end.lon - start.lon);
  const y = Math.sin(lonDelta) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lonDelta);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
};

const describeStep = (step: RouteStep | undefined, arrived: boolean, copy: typeof MAP_COPY[Language]) => {
  if (arrived) return copy.arrival;
  if (!step) return copy.start;
  const { type, modifier } = step.maneuver || {};
  const street = step.name ? ` ${step.name}` : '';
  if (type === 'depart') return `${copy.head}${street ? ` ${copy.onto}${street}` : ''}`;
  if (type === 'turn' || type === 'end of road') {
    const direction = copy.directions[modifier || 'straight'] || modifier || copy.directions.straight;
    return `${copy.turn} ${direction}${street ? ` ${copy.onto}${street}` : ''}`;
  }
  if (type === 'roundabout' || type === 'rotary') return `${copy.roundabout}${street ? ` ${copy.onto}${street}` : ''}`;
  if (type === 'arrive') return copy.continue;
  return `${copy.continue}${street ? ` ${copy.onto}${street}` : ''}`;
};

export const UberMapView: React.FC<UberMapViewProps> = ({
  language, isOnline, activeJob, incomingJob, suggestedJob, onSelectSite,
  workerLocation = '', onWorkerPositionChange, onWorkerPositionError, hasArrived = false,
  customLocationText, hideLocationCard = false, autoNavigate = false,
}) => {
  const copy = MAP_COPY[language];
  const markerCopy = MAP_MARKER_COPY[language];
  const currentTargetJob = activeJob || incomingJob;
  const displayPreviewJob = suggestedJob || null;
  // A suggested job is only a preview. Show its worksite marker after the
  // worker selects or accepts it as the active/incoming job.
  const mapJob = currentTargetJob;
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const workerMarker = useRef<any>(null);
  const destinationMarker = useRef<any>(null);
  const routeLayers = useRef<any[]>([]);
  const hasFitRoute = useRef(false);
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
      className: 'kaamsetu-map-tiles',
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

  // Recalculate after a meaningful GPS change so the route follows the worker.
  useEffect(() => {
    if (!navigationActive || !workerPosition || !navigationOrigin) return;
    if (distanceKm(navigationOrigin, workerPosition) >= 0.04) setNavigationOrigin(workerPosition);
  }, [navigationActive, workerPosition, navigationOrigin]);

  useEffect(() => {
    if (!autoNavigate || !activeJob || hasArrived || navigationActive || !workerPosition || !jobPosition) return;
    setNavigationOrigin(workerPosition);
    setNavigationActive(true);
  }, [autoNavigate, activeJob?.id, hasArrived, navigationActive, workerPosition, jobPosition]);

  useEffect(() => {
    let active = true;
    if (mapJob?.locationCoordinates) {
      setJobPosition(mapJob.locationCoordinates);
      return () => { active = false; };
    }
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
  }, [mapJob?.id, mapJob?.locationCoordinates?.lat, mapJob?.locationCoordinates?.lon, workerLocation]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (workerPosition) {
      if (!workerMarker.current) {
        workerMarker.current = marker([workerPosition.lat, workerPosition.lon], {
          icon: workerIcon(), zIndexOffset: 1000,
          title: copy.yourLocation,
        }).addTo(map).bindTooltip(markerCopy.worker, { direction: 'top', offset: [0, -18] });
      } else workerMarker.current.setLatLng([workerPosition.lat, workerPosition.lon]);
      if (!firstGpsFix.current) {
        map.setView([workerPosition.lat, workerPosition.lon], 15, { animate: true });
        firstGpsFix.current = true;
      }
    }
    if (jobPosition) {
      if (!destinationMarker.current) {
        destinationMarker.current = marker([jobPosition.lat, jobPosition.lon], {
          icon: workLocationIcon(), zIndexOffset: 900,
          title: mapJob?.siteName || 'Work location',
        }).addTo(map).bindTooltip(mapJob?.siteName || markerCopy.workSite, { direction: 'top', offset: [0, -30] });
      } else destinationMarker.current.setLatLng([jobPosition.lat, jobPosition.lon]);
      destinationMarker.current.setTooltipContent(mapJob?.siteName || markerCopy.workSite);
    } else if (destinationMarker.current) {
      destinationMarker.current.remove();
      destinationMarker.current = null;
    }
    if (!workerPosition && !jobPosition && fallbackPosition) map.setView([fallbackPosition.lat, fallbackPosition.lon], 14);
    if (navigationActive && workerPosition) map.panTo([workerPosition.lat, workerPosition.lon], { animate: true, duration: 0.35 });
  }, [workerPosition, jobPosition, fallbackPosition, navigationActive, copy.yourLocation, markerCopy.worker, markerCopy.workSite, mapJob?.id]);

  useEffect(() => {
    const map = mapInstance.current;
    routeLayers.current.forEach((layer) => layer.remove());
    routeLayers.current = [];
    if (!map || !route) return;
    const casing = polyline(route.points, { color: '#ffffff', weight: 11, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
    const routeLine = polyline(route.points, { color: '#2d59f0', weight: 6, opacity: 0.96, lineCap: 'round', lineJoin: 'round' }).addTo(map);
    let remainingDistance = route.points.slice(1).reduce((total, point, index) => total + distanceKm(
      { lat: route.points[index][0], lon: route.points[index][1] },
      { lat: point[0], lon: point[1] },
    ), 0) * 0.55;
    let routeDirection: any = null;
    for (let index = 0; index < route.points.length - 1; index++) {
      const point = route.points[index];
      const next = route.points[index + 1];
      const segmentDistance = distanceKm({ lat: point[0], lon: point[1] }, { lat: next[0], lon: next[1] });
      if (remainingDistance <= segmentDistance || index === route.points.length - 2) {
        routeDirection = marker(point, {
          icon: routeArrowIcon(bearingDegrees({ lat: point[0], lon: point[1] }, { lat: next[0], lon: next[1] })),
          interactive: false,
          zIndexOffset: 600,
        }).addTo(map);
        break;
      }
      remainingDistance -= segmentDistance;
    }
    routeLayers.current = [casing, routeLine, ...(routeDirection ? [routeDirection] : [])];
    if (!hasFitRoute.current) {
      map.fitBounds(routeLine.getBounds(), { padding: [48, 48], maxZoom: 16, animate: true });
      hasFitRoute.current = true;
    }
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
    hasFitRoute.current = false;
    setNavigationOrigin(workerPosition);
    setRouteError('');
    setRouteAttempt((attempt) => attempt + 1);
    setNavigationActive(true);
  };

  const endNavigation = () => {
    setNavigationActive(false);
    hasFitRoute.current = false;
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
        {workerPosition ? <Navigation className="h-4 w-4 shrink-0 text-[#2d59f0]" /> : <MapPin className="h-4 w-4 shrink-0 text-[#2d59f0]" />}
        <span className="truncate text-[11px] font-bold text-slate-800">{locationLabel}</span>
        {workerPosition && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-100" title="Live location" />}
      </div>}

      {mapJob && !navigationActive && <button type="button" onClick={handleStartNavigation} disabled={!workerPosition || !jobPosition || routeLoading} className="absolute left-3 top-[60px] z-[500] inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2d59f0] px-4 text-xs font-black text-white shadow-lg transition-colors hover:bg-blue-800 disabled:cursor-wait disabled:bg-slate-400">
        <Navigation className="h-4 w-4" />{routeLoading ? copy.starting : !workerPosition ? copy.locating : !jobPosition ? copy.findingDestination : copy.start}
      </button>}

      {navigationActive && <section aria-live="polite" className={`absolute left-3 right-3 ${hideLocationCard ? 'top-[86px]' : 'top-3'} z-[500] overflow-hidden rounded-[20px] border border-white/90 bg-white/95 p-3.5 shadow-[0_8px_28px_rgba(15,23,42,0.2)] backdrop-blur-md sm:left-auto sm:right-3 sm:w-[min(360px,calc(100%-24px))]`}>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2d59f0] text-white shadow-md shadow-blue-700/20"><Navigation className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">{routeLoading ? copy.starting : route ? `${(route.distance / 1000).toFixed(1)} km · ${Math.max(1, Math.round(route.duration / 60))} min` : copy.start}</p>
            <p className="mt-0.5 line-clamp-2 text-sm font-black leading-5 text-slate-900">{route ? describeStep(nextStep, hasArrived, copy) : routeError || copy.locating}</p>
            {routeError && <button type="button" onClick={handleStartNavigation} className="mt-1 text-xs font-bold text-blue-700">Try again</button>}
          </div>
          <button type="button" onClick={endNavigation} aria-label={copy.stop} title={copy.stop} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
          <div className="flex min-w-0 items-center gap-2 px-2.5 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700"><Navigation className="h-3.5 w-3.5" /></span>
            <span className="min-w-0"><span className="block text-[9px] font-bold uppercase text-slate-400">{markerCopy.worker}</span><span className="block truncate text-[10px] font-bold text-slate-800">{copy.yourLocation}</span></span>
          </div>
          <div className="flex min-w-0 items-center gap-2 border-l border-slate-200 px-2.5 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600"><MapPin className="h-3.5 w-3.5 fill-current" /></span>
            <span className="min-w-0"><span className="block text-[9px] font-bold uppercase text-slate-400">{markerCopy.workSite}</span><span className="block truncate text-[10px] font-bold text-slate-800">{mapJob ? localizePlaceText(mapJob.siteName, language) : '—'}</span></span>
          </div>
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
        <button type="button" onClick={() => onSelectSite?.(displayPreviewJob)} className="absolute right-3 top-3 z-[500] max-w-[min(40%,220px)] rounded-2xl border border-white/80 bg-white/95 p-3 text-left shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl">
          <span className="mb-1 block text-[10px] font-semibold text-emerald-700">{displayPreviewJob.distanceKm.toFixed(1)} km · {markerCopy.recommended}</span>
          <span className="block truncate text-xs font-black text-neutral-900">{localizeJobTitle(displayPreviewJob, language)}</span>
          <span className="mt-1 block text-xs font-black text-blue-900">&#8377;{displayPreviewJob.agreedAmount} {uiText(language, 'taskPay')}</span>
        </button>
      )}

      <div className="absolute bottom-2 left-2 z-[500] rounded-lg bg-white/90 px-2 py-1 text-[9px] font-medium text-slate-600 shadow-sm">
        &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap</a> &middot; Routing &copy; OSRM
      </div>
    </div>
  );
};
