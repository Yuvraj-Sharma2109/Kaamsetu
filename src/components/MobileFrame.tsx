import React, { useState } from 'react';
import { Smartphone, Maximize2 } from 'lucide-react';

interface MobileFrameProps {
  children: React.ReactNode;
  onToggleLoginDemo?: () => void;
  isLoggedIn?: boolean;
  fullScreenCanvas?: boolean;
  bottomOverlay?: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ 
  children,
  onToggleLoginDemo,
  isLoggedIn = true,
  fullScreenCanvas = false,
  bottomOverlay,
}) => {
  const [isFramed, setIsFramed] = useState<boolean>(true);

  return (
    <div className="min-h-[100dvh] bg-[#f1f1f1] text-neutral-900 flex flex-col items-center justify-start p-0 lg:py-6 lg:px-6 select-none font-sans">
      {/* Top Device View Switcher Banner for Desktop Viewers */}
      <div className="w-full max-w-[430px] mb-3 hidden lg:flex items-center justify-between px-4 py-2 bg-white rounded-2xl text-xs text-slate-600 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
          <span className="font-bold text-neutral-900">KaamSetu</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500 font-medium">430 × 956 px</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsFramed(!isFramed)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            {isFramed ? <Maximize2 className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span>{isFramed ? 'Full' : '430px'}</span>
          </button>

          {onToggleLoginDemo && (
            <button
              onClick={onToggleLoginDemo}
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
            >
              {isLoggedIn ? 'Log Out' : 'Portal'}
            </button>
          )}
        </div>
      </div>

      {/* On phones this fills the viewport; desktop keeps a switchable device preview. */}
      <div
        className={`transition-all duration-300 ${
          isFramed
          ? 'w-full max-w-full h-[100dvh] lg:max-w-[412px] lg:h-[min(917px,calc(100dvh-3rem))] lg:rounded-[40px] lg:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)] overflow-hidden bg-[#f1f1f1] flex flex-col relative'
            : 'w-full max-w-none min-h-[100dvh] lg:min-h-[calc(100dvh-3rem)] lg:rounded-3xl bg-[#f1f1f1] lg:shadow-xl overflow-hidden flex flex-col relative'
        }`}
      >
        {/* Mobile Status Bar (Clean White, No border) */}
        <div className={`${fullScreenCanvas ? 'hidden' : 'hidden lg:flex'} w-full bg-[#f1f1f1] px-7 pt-3.5 pb-1.5 items-center justify-between text-[11px] font-bold text-neutral-900 shrink-0 select-none z-30`}>
          <span>09:41</span>
          {/* Dynamic Island / Speaker Pill */}
          <div className="w-24 h-4 bg-neutral-950 rounded-full flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800" />
          </div>
          <div className="flex items-center gap-1.5 text-neutral-900">
            <span className="text-[10px] font-mono">5G</span>
            <div className="w-5 h-2.5 rounded-xs border border-neutral-800 p-0.5 flex items-center">
              <div className="w-full h-full bg-neutral-900 rounded-xs" />
            </div>
          </div>
        </div>

        {/* Viewport Content */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          {children}
        </div>

        {bottomOverlay && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[env(safe-area-inset-bottom)] lg:bottom-[63px] z-50 flex justify-center">
            <div className="pointer-events-auto w-full flex justify-center">{bottomOverlay}</div>
          </div>
        )}

        {/* iOS Home Indicator Bar */}
        <div className="hidden lg:flex w-full bg-[#f1f1f1] py-2 items-center justify-center shrink-0 z-30">
          <div className="w-32 h-1 bg-neutral-900/20 rounded-full" />
        </div>
      </div>
    </div>
  );
};
