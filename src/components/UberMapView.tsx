import React, { useEffect, useMemo, useState } from 'react';
import { Job, Language } from '../types';
import { localizeJobTitle, localizePlaceText, uiText } from '../utils/uiText';
import { geocodePlace } from '../utils/places';
import { MapPin, Navigation } from 'lucide-react';

interface UberMapViewProps {
  language: Language;
  isOnline: boolean;
  activeJob: Job | null;
  incomingJob: Job | null;
  suggestedJob?: Job | null;
  onSelectSite?: (job: Job) => void;
  workerLocation?: string;
  hasArrived?: boolean;
  customLocationText?: string;
  onPositionChange?: (locationName: string) => void;
  hideLocationCard?: boolean;
}

interface Coordinates { lat: number; lon: number }
const BENGALURU: Coordinates = { lat: 12.9716, lon: 77.5946 };

export const UberMapView: React.FC<UberMapViewProps> = ({
  language,
  isOnline,
  activeJob,
  incomingJob,
  suggestedJob,
  onSelectSite,
  workerLocation = '',
  hasArrived = false,
  customLocationText,
  hideLocationCard = false,
}) => {
  const currentTargetJob = activeJob || incomingJob;
  const displayPreviewJob = suggestedJob || null;
  const mapJob = currentTargetJob || (isOnline ? displayPreviewJob : null);
  const [workerPosition, setWorkerPosition] = useState<Coordinates | null>(null);
  const [jobPosition, setJobPosition] = useState<Coordinates | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => setWorkerPosition({ lat: coords.latitude, lon: coords.longitude }),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    let active = true;
    setJobPosition(null);
    const address = mapJob
      ? [mapJob.locationAddress, mapJob.siteName, 'Bengaluru, India'].join(', ')
      : workerLocation;
    if (address) {
      void geocodePlace(address).then((place) => {
        if (active && place) setJobPosition({ lat: place.lat, lon: place.lon });
      });
    }
    return () => { active = false; };
  }, [mapJob?.id, workerLocation]);

  const mapCenter = jobPosition || workerPosition || BENGALURU;
  const embedUrl = useMemo(() => {
    const otherPoint = jobPosition && workerPosition ? workerPosition : null;
    const latPadding = otherPoint ? Math.max(0.018, Math.abs(jobPosition!.lat - otherPoint.lat) * 0.25) : 0.018;
    const lonPadding = otherPoint ? Math.max(0.018, Math.abs(jobPosition!.lon - otherPoint.lon) * 0.25) : 0.018;
    const latMin = Math.min(mapCenter.lat, otherPoint?.lat ?? mapCenter.lat) - latPadding;
    const latMax = Math.max(mapCenter.lat, otherPoint?.lat ?? mapCenter.lat) + latPadding;
    const lonMin = Math.min(mapCenter.lon, otherPoint?.lon ?? mapCenter.lon) - lonPadding;
    const lonMax = Math.max(mapCenter.lon, otherPoint?.lon ?? mapCenter.lon) + lonPadding;
    const params = new URLSearchParams({
      bbox: `${lonMin},${latMin},${lonMax},${latMax}`,
      layer: 'mapnik',
      marker: `${mapCenter.lat},${mapCenter.lon}`,
    });
    return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
  }, [mapCenter.lat, mapCenter.lon, jobPosition, workerPosition]);

  const locationLabel = customLocationText || (hasArrived && activeJob
    ? localizePlaceText(activeJob.siteName, language)
    : mapJob ? localizePlaceText(mapJob.locationAddress, language) : workerLocation || uiText(language, 'departedBase'));
  const navigateUrl = useMemo(() => {
    const destination = mapJob
      ? `${mapJob.locationAddress}, ${mapJob.siteName}, Bengaluru, India`
      : workerLocation || 'Bengaluru, India';
    const params = new URLSearchParams({ api: '1', destination, travelmode: 'driving' });
    if (workerPosition) params.set('origin', `${workerPosition.lat},${workerPosition.lon}`);
    else if (workerLocation) params.set('origin', workerLocation);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }, [mapJob?.id, workerLocation, workerPosition]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-slate-100">
      <iframe
        title={`OpenStreetMap near ${locationLabel}`}
        src={embedUrl}
        className="absolute inset-0 h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/70 to-transparent" />

      {!hideLocationCard && <div className="absolute left-3 top-3 z-10 flex max-w-[min(70%,320px)] items-center gap-2 truncate rounded-full bg-white px-3 py-2 shadow-md">
        <MapPin className="h-4 w-4 shrink-0 text-blue-600" />
        <span className="truncate text-[11px] font-bold text-neutral-800">{locationLabel}</span>
        {workerPosition && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" title="Live location" />}
      </div>}

      {mapJob && <a href={navigateUrl} target="_blank" rel="noreferrer" className="absolute left-3 top-[58px] z-10 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-xs font-black text-white shadow-lg hover:bg-blue-800">
        <Navigation className="h-4 w-4" /> Navigate
      </a>}

      {isOnline && !currentTargetJob && displayPreviewJob && (
        <button type="button" onClick={() => onSelectSite?.(displayPreviewJob)} className="absolute right-3 top-3 z-10 max-w-[min(48%,220px)] rounded-2xl bg-white p-3 text-left shadow-lg transition-shadow hover:shadow-xl">
          <span className="mb-1 block text-[10px] font-semibold text-emerald-700">{displayPreviewJob.distanceKm} {uiText(language, 'kmAway')} · {uiText(language, 'matched')}</span>
          <span className="block truncate text-xs font-black text-neutral-900">{localizeJobTitle(displayPreviewJob, language)}</span>
          <span className="mt-1 block text-xs font-black text-blue-900">₹{displayPreviewJob.agreedAmount} {uiText(language, 'taskPay')}</span>
        </button>
      )}

      <div className="absolute bottom-2 right-2 rounded bg-white/90 px-2 py-1 text-[9px] text-slate-600">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap contributors</a>
      </div>
    </div>
  );
};
