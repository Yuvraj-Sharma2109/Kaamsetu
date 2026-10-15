import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { Language } from '../types';

interface LanguageDropdownProps {
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
  variant?: 'compact' | 'full';
  openRequest?: number;
}

export const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
];

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  currentLanguage,
  onLanguageChange,
  variant = 'compact',
  openRequest = 0,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedLanguage = LANGUAGES.find(({ code }) => code === currentLanguage) ?? LANGUAGES[0];

  useEffect(() => {
    if (openRequest > 0) setIsOpen(true);
  }, [openRequest]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isOpen]);

  const selectLanguage = (language: Language) => {
    onLanguageChange(language);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block w-full text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`flex items-center justify-between gap-2 rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-100 shadow-sm transition-all active:scale-[0.98] ${variant === 'full' ? 'h-11 w-full px-3.5 text-xs font-semibold' : 'h-9 px-3 text-xs font-semibold'}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <Languages className="h-4 w-4 shrink-0 text-amber-400" />
          <span className="truncate font-bold text-white">
            {selectedLanguage.native}
            {variant === 'full' && <span className="ml-1.5 font-normal text-neutral-400">({selectedLanguage.label})</span>}
          </span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-400' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute z-50 max-h-[min(320px,calc(100dvh-32px))] overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-900 py-1.5 shadow-2xl animate-in fade-in zoom-in-95 ${variant === 'full' ? 'bottom-full left-0 mb-1.5 w-full' : 'right-0 mt-1.5 w-48'}`} role="listbox" aria-label="Select app language">
          <div className="border-b border-neutral-800 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">भाषा चुनें / Select language</div>
          {LANGUAGES.map((language) => {
            const isSelected = currentLanguage === language.code;
            return (
              <button
                key={language.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => selectLanguage(language.code)}
                className={`flex w-full items-center justify-between px-3.5 py-2 text-xs transition-colors ${isSelected ? 'bg-amber-400/15 font-bold text-amber-400' : 'text-neutral-200 hover:bg-neutral-800 hover:text-white'}`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm font-bold leading-none">{language.native}</span>
                  <span className="text-[11px] text-neutral-400">({language.label})</span>
                </span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-amber-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
