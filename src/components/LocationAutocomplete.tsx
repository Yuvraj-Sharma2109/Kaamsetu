import React, { useEffect, useRef, useState } from 'react';
import { Language } from '../types';
import { PlaceSuggestion, searchPlaces } from '../utils/places';
import { MapPin, LoaderCircle } from 'lucide-react';

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
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const query = value.trim();
    setFailed(false);
    if (query.length < 3) {
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

    return () => window.clearTimeout(timer);
  }, [value, language]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const selectPlace = (place: PlaceSuggestion) => {
    onChange(place.label);
    onSelect?.(place);
    setSuggestions([]);
    setOpen(false);
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
      {open && (suggestions.length > 0 || failed) && (
        <div role="listbox" className="absolute inset-x-0 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
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
