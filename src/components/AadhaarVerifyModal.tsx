import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Language } from '../types';
import { speakText } from '../utils/speech';
import { uiText } from '../utils/uiText';
import { aiLabel } from '../utils/aiLabels';
import { 
  ShieldCheck, 
  X, 
  KeyRound, 
  Camera, 
  Check, 
  User, 
  Lock, 
  Bot,
  AlertTriangle
} from 'lucide-react';

interface AadhaarVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerifySuccess: () => void;
  language: Language;
  workerName: string;
  audioActive: boolean;
  onToggleAudio: () => void;
}

export const AadhaarVerifyModal: React.FC<AadhaarVerifyModalProps> = ({
  isOpen,
  onClose,
  onVerifySuccess,
  language,
  workerName,
  audioActive,
  onToggleAudio,
}) => {
  const [aadhaarNumber, setAadhaarNumber] = useState<string>('5421 8904 9012');
  const [mode, setMode] = useState<'otp' | 'photo'>('otp');
  const [showOtpInput, setShowOtpInput] = useState<boolean>(false);
  const [otp, setOtp] = useState<string>('6184');
  const [frontCaptured, setFrontCaptured] = useState<boolean>(false);
  const [backCaptured, setBackCaptured] = useState<boolean>(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSpeak = () => {
    window.dispatchEvent(new Event('kaamsetu:open-ai-assistant'));
    return;
    const text = language === 'hi'
      ? 'काम स्वीकार करने के लिए आधार कार्ड सत्यापन जरूरी है। अपना 12 अंकों का आधार नंबर डालें या फोटो लें।'
      : 'Aadhaar verification is required to accept work. Enter 12-digit number or take card photo.';
    if (audioActive) speakText(text, language);
  };

  const handleFormatAadhaar = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 12);
    const parts = raw.match(/.{1,4}/g);
    setAadhaarNumber(parts ? parts.join(' ') : raw);
  };

  const handleSendOtp = () => {
    if (aadhaarNumber.replace(/\D/g, '').length !== 12) {
      setError('Enter a valid 12-digit Aadhaar number first.');
      return;
    }
    setError('');
    setShowOtpInput(true);
    if (language === 'hi' && audioActive) {
      speakText('OTP कोड 6 1 8 4 भेजा गया है।', language);
    }
  };

  const handleConfirmVerification = () => {
    if (aadhaarNumber.replace(/\D/g, '').length !== 12) {
      setError('Enter a valid 12-digit Aadhaar number.');
      return;
    }
    if (mode === 'otp' && (!showOtpInput || otp !== '6184')) {
      setError(showOtpInput ? 'For this demo, enter OTP 6184.' : 'Request and verify the Aadhaar OTP first.');
      return;
    }
    setError('');
    onVerifySuccess();
    if (language === 'hi' && audioActive) {
      speakText('बधाई! आधार कार्ड सत्यापित हो गया है।', language);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-y-auto bg-black/75 backdrop-blur-xs p-4 select-none font-sans">
      <motion.div initial={{ y: 36 }} animate={{ y: 0 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }} className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto overscroll-contain rounded-3xl bg-white p-6 space-y-4 shadow-2xl relative">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏛️</span>
            <div>
              <h3 className="text-sm font-black text-neutral-900">
                {uiText(language, 'aadhaarTitle')}
              </h3>
              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-bold block mt-0.5">
                {uiText(language, 'requiredAcceptJobs')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSpeak}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl shadow-xs"
              title={aiLabel(language).title}
            >
              <Bot className="w-4 h-4 text-blue-600" />
            </button>
            <button type="button" onClick={onToggleAudio} aria-label={aiLabel(language).title} title={aiLabel(language).title} className="rounded-xl bg-slate-100 p-2 text-blue-700 hover:bg-slate-200"><Bot className="h-4 w-4" /></button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-neutral-900 rounded-xl hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visual Aadhaar Card Mockup */}
        <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between text-[9px] uppercase font-bold text-slate-400 pb-1">
            <span className="text-neutral-900 font-black">GOVT OF INDIA · UIDAI</span>
            <span className="font-mono text-blue-900 font-bold">LABOUR ID</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-14 rounded-xl bg-white flex flex-col items-center justify-center text-slate-400 shrink-0 shadow-xs">
              <User className="w-6 h-6 text-slate-500" />
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <span className="font-black text-xs text-neutral-900 block truncate">{workerName}</span>
              <span className="text-sm font-black text-blue-900 font-mono tracking-wider block">
                {aadhaarNumber || 'XXXX XXXX XXXX'}
              </span>
              <span className="inline-block text-[9px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md shadow-xs">
                Pending Verification
              </span>
            </div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl shadow-xs">
          <button
            type="button"
            onClick={() => setMode('otp')}
            className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'otp'
                ? 'bg-neutral-900 text-white font-black shadow-xs'
                : 'text-slate-600 hover:text-neutral-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{uiText(language, 'numberOtp')}</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('photo')}
            className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'photo'
                ? 'bg-neutral-900 text-white font-black shadow-xs'
                : 'text-slate-600 hover:text-neutral-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{uiText(language, 'photoTab')}</span>
          </button>
        </div>

        {/* MODE 1: OTP */}
        {mode === 'otp' && (
          <div className="space-y-3 bg-slate-50 rounded-2xl p-4 shadow-xs">
            {!showOtpInput ? (
              <div className="space-y-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    {uiText(language, 'aadhaarPlaceholder')}
                  </label>
                  <input
                    type="text"
                    value={aadhaarNumber}
                    onChange={(e) => { handleFormatAadhaar(e.target.value); setError(''); }}
                    placeholder="XXXX XXXX XXXX"
                    className="w-full bg-white rounded-xl px-3.5 py-2.5 text-center text-base font-black font-mono tracking-widest text-neutral-900 focus:outline-none shadow-xs"
                    maxLength={14}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="w-full min-h-[46px] rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-xs"
                >
                  <KeyRound className="w-4 h-4 text-blue-300" />
                  <span>{uiText(language, 'requestUidaiOtp')}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-600 block">
                      {uiText(language, 'otpPlaceholder')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowOtpInput(false)}
                      className="text-xs text-blue-700 hover:underline font-semibold"
                    >
                      {uiText(language, 'change')}
                    </button>
                  </div>

                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.slice(0, 4)); setError(''); }}
                    className="w-full bg-white rounded-xl px-4 py-2.5 text-center text-2xl font-black font-mono tracking-widest text-neutral-900 focus:outline-none shadow-xs"
                    maxLength={4}
                  />
                  <span className="text-[10px] text-slate-400 block text-center mt-1">
                    Demo Code: <strong className="text-neutral-700">6184</strong>
                  </span>
                  {error && <p role="alert" className="mt-2 text-center text-xs font-bold text-rose-700">{error}</p>}
                </div>

                <button
                  type="button"
                  onClick={handleConfirmVerification}
                  className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-transform"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{uiText(language, 'verifyUnlock')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: CARD PHOTO */}
        {mode === 'photo' && (
          <div className="space-y-3 bg-slate-50 rounded-2xl p-4 shadow-xs">
            <span className="text-xs text-slate-600 font-bold block">
              {uiText(language, 'captureBothSides')}
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFrontCaptured(true)}
                className={`h-22 rounded-xl flex flex-col items-center justify-center p-2.5 text-center transition-all shadow-xs ${
                  frontCaptured
                    ? 'bg-emerald-50 text-emerald-900'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Camera className="w-4 h-4 mb-1 text-slate-400" />
                <span className="text-[10px] font-bold block">
                  {frontCaptured ? '✓ सामने की फोटो' : 'सामने की फोटो'}
                </span>
                <span className="text-[8px] opacity-70">(Front)</span>
              </button>

              <button
                type="button"
                onClick={() => setBackCaptured(true)}
                className={`h-22 rounded-xl flex flex-col items-center justify-center p-2.5 text-center transition-all shadow-xs ${
                  backCaptured
                    ? 'bg-emerald-50 text-emerald-900'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Camera className="w-4 h-4 mb-1 text-slate-400" />
                <span className="text-[10px] font-bold block">
                  {backCaptured ? '✓ पीछे की फोटो' : 'पीछे की फोटो'}
                </span>
                <span className="text-[8px] opacity-70">(Back)</span>
              </button>
            </div>

            <button
              type="button"
              disabled={!frontCaptured && !backCaptured}
              onClick={handleConfirmVerification}
              className={`w-full min-h-[46px] rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                frontCaptured || backCaptured
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{uiText(language, 'submitPhotos')}</span>
            </button>
          </div>
        )}

        {/* Close link */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-neutral-900 underline"
          >
            {uiText(language, 'verifyLater')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
