import React from 'react';
import { motion } from 'motion/react';
import { Language } from '../types';
import { uiText } from '../utils/uiText';
import { 
  AlertTriangle, 
  ShieldAlert, 
  X, 
  MapPin, 
  HeartHandshake 
} from 'lucide-react';

interface SosModalProps {
  language: Language;
  onClose: () => void;
}

export const SosModal: React.FC<SosModalProps> = ({
  language,
  onClose,
}) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 backdrop-blur-xs p-4 font-sans select-none">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }} className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto overscroll-contain rounded-3xl bg-white shadow-2xl p-6 space-y-4.5">
        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <h3 className="text-base font-black text-neutral-900">
              {uiText(language, 'emergencyHelp')}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-neutral-900 rounded-xl hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPS Location Ping */}
        <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 text-xs shadow-xs">
          <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
          <div>
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Live GPS Location</span>
            <span className="font-mono text-neutral-900 font-bold">12.9716° N, 77.6412° E (Indiranagar)</span>
          </div>
        </div>

        {/* Emergency Call Actions */}
        <div className="space-y-2.5">
          {/* Police Helpline */}
          <a
            href="tel:112"
            className="w-full min-h-[48px] p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-neutral-900 font-black text-xs flex items-center justify-between transition-colors shadow-xs active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-blue-300" />
              <span>{uiText(language, 'policeHelp')} (112)</span>
            </div>
            <span className="text-xs font-mono text-blue-300 font-black">112</span>
          </a>

          {/* Ambulance Helpline in Pastel Rose */}
          <a
            href="tel:108"
            className="w-full min-h-[48px] p-3.5 rounded-2xl bg-rose-50/80 hover:bg-rose-100 text-rose-950 font-black text-xs flex items-center justify-between transition-colors shadow-xs active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <HeartHandshake className="w-4 h-4 text-rose-600" />
              <span>{uiText(language, 'ambulanceHelp')} (108)</span>
            </div>
            <span className="text-xs font-mono text-rose-700 font-black">108</span>
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
};
