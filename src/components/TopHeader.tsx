import React from 'react';
import { WorkerProfile, Language } from '../types';
import { stopSpeech, isSpeaking } from '../utils/speech';
import { 
  Volume2, 
  VolumeX, 
  AlertTriangle,
  Menu,
  X,
} from 'lucide-react';

interface TopHeaderProps {
  worker: WorkerProfile;
  isOnline: boolean;
  language: Language;
  onLanguageChange?: (lang: Language) => void;
  audioActive: boolean;
  onToggleAudio: () => void;
  onOpenSosModal: () => void;
  onOpenProfile?: () => void;
  desktopMenuOpen: boolean;
  onToggleDesktopMenu: () => void;
  todayEarnings?: number;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  worker,
  isOnline,
  language,
  audioActive,
  onToggleAudio,
  onOpenSosModal,
  onOpenProfile,
  desktopMenuOpen,
  onToggleDesktopMenu,
  todayEarnings = 950,
}) => {
  return (
    <header className="sticky top-0 z-30 mx-auto mt-3 h-[65px] w-[calc(100%-32px)] max-w-[360px] md:max-w-2xl rounded-[20px] bg-white px-3.5 sm:px-[15px] flex items-center justify-between select-none shrink-0 shadow-[0px_2px_20px_rgba(0,0,0,0.11)]">
      <button
        type="button"
        onClick={onToggleDesktopMenu}
        aria-label={desktopMenuOpen ? (language === 'hi' ? 'मेनू बंद करें' : 'Close menu') : (language === 'hi' ? 'मेनू खोलें' : 'Open menu')}
        aria-expanded={desktopMenuOpen}
        aria-haspopup="menu"
        className="mr-2 hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-neutral-900 transition-colors hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:flex"
      >
        {desktopMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {/* Left: Worker profile summary */}
      <div role="button" tabIndex={0} onClick={onOpenProfile} onKeyDown={(event) => event.key === 'Enter' && onOpenProfile?.()} className="flex items-center gap-2.5 min-w-0 cursor-pointer">
        <div className="relative shrink-0">
          <img src="/figma/account_raw_1.jpeg" alt="" className="w-[45px] h-[45px] rounded-full object-cover" />
          {/* Status dot (Pastel green when online) */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${
              isOnline ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          />
        </div>

        <div className="min-w-0 flex flex-col">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs font-black text-neutral-900 truncate leading-tight">
              {worker.name}
            </h1>
            {worker.isKycVerified ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Aadhaar Verified" />
            ) : (
              <span className="text-[10px] text-amber-700 bg-amber-50 px-1 py-0.2 rounded font-bold" title="Aadhaar Pending">
                ⚠️
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            {isOnline ? (
              <span className="text-emerald-700 font-bold">{language === 'hi' ? 'ड्यूटी चालू' : 'On Duty'}</span>
            ) : (
              <span>{language === 'hi' ? 'ऑफलाइन' : 'Offline'}</span>
            )}
          </span>
        </div>
      </div>

      {/* Right: Audio toggle + SOS */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => {
            if (isSpeaking()) {
              stopSpeech();
            }
            onToggleAudio();
          }}
          className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs transition-colors ${
            audioActive
              ? 'bg-blue-600 text-white font-bold shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:text-neutral-900 shadow-xs'
          }`}
          title="Voice Reader"
          aria-label="Voice assistance"
        >
          {audioActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* SOS Emergency button in Pastel Rose */}
        <button
          onClick={onOpenSosModal}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors shadow-xs"
          title="Emergency SOS"
          aria-label="Emergency SOS"
        >
          <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
        </button>
      </div>
    </header>
  );
};
