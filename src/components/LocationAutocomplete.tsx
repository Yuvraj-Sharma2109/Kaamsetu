import React, { useEffect, useRef, useState } from 'react';
import { Language } from '../types';
import { PlaceSuggestion, reverseGeocodePlace, searchPlaces } from '../utils/places';
import { LocateFixed, MapPin, LoaderCircle } from 'lucide-react';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (place: PlaceSuggestion) => void;
  language: Language;
  placeholder?: string;
  className?: string;
  required?: boolean;
  ariaLabel?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value, onChange, onSelect, language, placeholder, className, required, ariaLabel,
}) => {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [locationPermission, setLocationPermission] = useState<PermissionState | 'unknown'>('unknown');
  const requestRef = useRef<AbortController | null>(null);

  const currentLocationCopy: Record<Language, { action: string; error: string }> = {
    en: { action: 'Use current location', error: 'Location access is blocked. Enable it in your device or browser settings, then try again.' },
    hi: { action: '\u092e\u094c\u091c\u0942\u0926\u093e \u0932\u094b\u0915\u0947\u0936\u0928 \u0909\u092a\u092f\u094b\u0917 \u0915\u0930\u0947\u0902', error: '\u0906\u092a\u0915\u0940 \u0932\u094b\u0915\u0947\u0936\u0928 \u0928\u0939\u0940\u0902 \u092e\u093f\u0932\u0940\u0964 \u0932\u094b\u0915\u0947\u0936\u0928 \u0905\u0928\u0941\u092e\u0924\u093f \u091c\u093e\u0901\u091a\u0915\u0930 \u092b\u093f\u0930 \u0915\u094b\u0936\u093f\u0936 \u0915\u0930\u0947\u0902\u0964' },
    bn: { action: '\u09ac\u09b0\u09cd\u09a4\u09ae\u09be\u09a8 \u0985\u09ac\u09b8\u09cd\u09a5\u09be\u09a8 \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0 \u0995\u09b0\u09c1\u09a8', error: '\u0986\u09aa\u09a8\u09be\u09b0 \u0985\u09ac\u09b8\u09cd\u09a5\u09be\u09a8 \u09aa\u09be\u0993\u09af\u09bc\u09be \u09af\u09be\u09af\u09bc\u09a8\u09bf\u0964 \u0985\u09ac\u09b8\u09cd\u09a5\u09be\u09a8\u09c7\u09b0 \u0985\u09a8\u09c1\u09ae\u09a4\u09bf \u09af\u09be\u099a\u09be\u0987 \u0995\u09b0\u09c7 \u0986\u09ac\u09be\u09b0 \u099a\u09c7\u09b7\u09cd\u099f\u09be \u0995\u09b0\u09c1\u09a8\u0964' },
    mr: { action: '\u0938\u0927\u094d\u092f\u093e\u091a\u0947 \u0938\u094d\u0925\u093e\u0928 \u0935\u093e\u092a\u0930\u093e', error: '\u0924\u0941\u092e\u091a\u0947 \u0938\u094d\u0925\u093e\u0928 \u092e\u093f\u0933\u0935\u0924\u093e \u0906\u0932\u0947 \u0928\u093e\u0939\u0940. \u0938\u094d\u0925\u093e\u0928\u093e\u091a\u0940 \u092a\u0930\u0935\u093e\u0928\u0917\u0940 \u0924\u092a\u093e\u0938\u0942\u0928 \u092a\u0941\u0928\u094d\u0939\u093e \u092a\u094d\u0930\u092f\u0924\u094d\u0928 \u0915\u0930\u093e.' },
    te: { action: '\u0c2a\u0c4d\u0c30\u0c38\u0c4d\u0c24\u0c41\u0c24 \u0c38\u0c4d\u0c25\u0c3e\u0c28\u0c3e\u0c28\u0c4d\u0c28\u0c3f \u0c09\u0c2a\u0c2f\u0c4b\u0c17\u0c3f\u0c02\u0c1a\u0c02\u0c21\u0c3f', error: '\u0c2e\u0c40 \u0c38\u0c4d\u0c25\u0c3e\u0c28\u0c3e\u0c28\u0c4d\u0c28\u0c3f \u0c2a\u0c4a\u0c02\u0c26\u0c32\u0c47\u0c15\u0c2a\u0c4b\u0c2f\u0c3e\u0c2e\u0c41. \u0c38\u0c4d\u0c25\u0c3e\u0c28 \u0c05\u0c28\u0c41\u0c2e\u0c24\u0c3f\u0c28\u0c3f \u0c24\u0c28\u0c3f\u0c16\u0c40 \u0c1a\u0c47\u0c38\u0c3f \u0c2e\u0c33\u0c4d\u0c33\u0c40 \u0c2a\u0c4d\u0c30\u0c2f\u0c24\u0c4d\u0c28\u0c3f\u0c02\u0c1a\u0c02\u0c21\u0c3f.' },
  };

  useEffect(() => {
    const query = value.trim();
    setFailed(false);
    if (!open || query.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      setLoading(true);
      try {
        setSuggestions(await searchPlaces(query, language, controller.signal));
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
      requestRef.current?.abort();
    };
  }, [value, language, open]);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    if (!navigator.permissions?.query) return;
    let permissionStatus: PermissionStatus | undefined;
    let active = true;
    void navigator.permissions.query({ name: 'geolocation' }).then((status) => {
      if (!active) return;
      permissionStatus = status;
      setLocationPermission(status.state);
      status.onchange = () => setLocationPermission(status.state);
    }).catch(() => setLocationPermission('unknown'));
    return () => {
      active = false;
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, []);

  const selectPlace = (place: PlaceSuggestion) => {
    onChange(place.label);
    onSelect?.(place);
    setSuggestions([]);
    setOpen(false);
  };

  const selectCurrentLocation = () => {
    if (!navigator.geolocation || locating) {
      setLocationError(true);
      return;
    }
    if (!window.isSecureContext) {
      setLocationError(true);
      return;
    }
    if (locationPermission === 'denied') {
      setLocationError(true);
      return;
    }
    setLocating(true);
    setLocationError(false);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      setLocationPermission('granted');
      const place = await reverseGeocodePlace({ lat: coords.latitude, lon: coords.longitude }, language);
      setLocating(false);
      if (!place) {
        setLocationError(true);
        return;
      }
      selectPlace(place);
    }, (error) => {
      setLocating(false);
      if (error.code === error.PERMISSION_DENIED) setLocationPermission('denied');
      setLocationError(true);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(event) => { onChange(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}
          placeholder={placeholder}
          required={required}
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
          className={className}
        />
        {loading && <LoaderCircle aria-hidden="true" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-600" />}
      </div>
      {open && (
        <div role="listbox" className="absolute inset-x-0 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          <button type="button" role="option" aria-selected="false" disabled={locating} onMouseDown={(event) => event.preventDefault()} onClick={selectCurrentLocation} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60">
            {locating ? <LoaderCircle aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin" /> : <LocateFixed className="h-4 w-4 shrink-0" />}
            <span>{locating ? currentLocationCopy[language].action + '…' : currentLocationCopy[language].action}</span>
          </button>
          {locationError && <p role="alert" className="px-3 py-2 text-xs text-rose-600">{currentLocationCopy[language].error}</p>}
          {suggestions.map((place, index) => (
            <button key={`${place.lat}:${place.lon}:${index}`} type="button" role="option" aria-selected="false" onMouseDown={(event) => event.preventDefault()} onClick={() => selectPlace(place)} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-blue-50">
              <MapPin className="h-4 w-4 shrink-0 text-blue-600" />
              <span className="min-w-0 truncate">{place.label}</span>
            </button>
          ))}
          {failed && <p className="px-3 py-2 text-xs text-slate-500">Location suggestions unavailable. You can still enter the location manually.</p>}
          <p className="px-3 py-1.5 text-[10px] text-slate-400">Place results © OpenStreetMap contributors</p>
        </div>
      )}
    </div>
  );
};
