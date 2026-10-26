import { Language } from '../types';

export interface PlaceSuggestion {
  label: string;
  lat: number;
  lon: number;
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string | undefined>;
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

const placeCache = new Map<string, PlaceSuggestion | null>();

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
  const response = await fetch(`https://photon.komoot.io/api/?${params}`, { signal });
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
