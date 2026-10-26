import { GeoPoint, Language } from '../types';

export interface PlaceSuggestion extends GeoPoint {
  label: string;
}

export function distanceBetweenKm(a: GeoPoint, b: GeoPoint): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latDelta = radians(b.lat - a.lat);
  const lonDelta = radians(b.lon - a.lon);
  const value = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(lonDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string | undefined>;
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

const placeCache = new Map<string, PlaceSuggestion | null>();
const PHOTON_API = (import.meta.env.VITE_PHOTON_API_URL || 'https://photon.komoot.io/api/').replace(/\/$/, '');

function getPlaceLabel(properties: Record<string, string | undefined> = {}) {
  const main = properties.name || properties.street || properties.city || properties.state;
  const secondary = [properties.street, properties.district, properties.city, properties.state, properties.country]
    .filter((item): item is string => Boolean(item) && item !== main);
  return [main, ...secondary].filter(Boolean).join(', ');
}

export async function searchPlaces(query: string, language: Language, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    limit: '5',
    lat: '20.5937',
    lon: '78.9629',
    zoom: '5',
    lang: language,
  });
  const response = await fetch(`${PHOTON_API}/?${params}`, { signal });
  if (!response.ok) throw new Error('Place search is temporarily unavailable.');
  const payload = await response.json() as PhotonResponse;
  return (payload.features || []).flatMap((feature) => {
    const coordinates = feature.geometry?.coordinates;
    if (!coordinates) return [];
    const [lon, lat] = coordinates;
    const label = getPlaceLabel(feature.properties);
    return label && Number.isFinite(lat) && Number.isFinite(lon) ? [{ label, lat, lon }] : [];
  });
}

export async function geocodePlace(query: string): Promise<PlaceSuggestion | null> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  if (placeCache.has(normalized)) return placeCache.get(normalized) || null;
  try {
    const results = await searchPlaces(query, 'en');
    const result = results[0] || null;
    placeCache.set(normalized, result);
    return result;
  } catch {
    return null;
  }
}

export async function reverseGeocodePlace(point: GeoPoint, language: Language): Promise<PlaceSuggestion | null> {
  const params = new URLSearchParams({ lat: String(point.lat), lon: String(point.lon), lang: language });
  try {
    const response = await fetch(`${PHOTON_API}/reverse?${params}`);
    if (!response.ok) return null;
    const payload = await response.json() as PhotonResponse;
    const feature = payload.features?.[0];
    const coordinates = feature?.geometry?.coordinates;
    if (!coordinates) return null;
    const [lon, lat] = coordinates;
    const label = getPlaceLabel(feature.properties);
    return label && Number.isFinite(lat) && Number.isFinite(lon) ? { label, lat, lon } : null;
  } catch {
    return null;
  }
}
