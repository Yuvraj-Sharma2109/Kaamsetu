import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Job, Language } from '../types';
import { getTranslation } from '../utils/i18n';
import { speakText, stopSpeech } from '../utils/speech';
import { 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Volume2, 
  X, 
  CheckCircle2, 
  Utensils, 
  ListPlus,
  Check
} from 'lucide-react';

interface IncomingJobModalProps {
  job: Job;
  language: Language;
  onAccept: (job: Job) => void;
  onDecline: () => void;
  onQueue?: (job: Job) => void;
  isOnline?: boolean;
  hasActiveJob?: boolean;
  hasQueuedJob?: boolean;
  isAadhaarVerified?: boolean;
  onOpenAadhaarModal?: () => void;
}

export const IncomingJobModal: React.FC<IncomingJobModalProps> = ({
  job,
  language,
  onAccept,
  onDecline,
  onQueue,
  isOnline = true,
  hasActiveJob = false,
  hasQueuedJob = false,
  isAadhaarVerified = true,
  onOpenAadhaarModal,
}) => {
  const t = getTranslation(language);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Auto countdown (~30s timeout)
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onDecline]);

  const handlePlayVoice = () => {
    const textToSpeak = hasActiveJob
      ? `Next job for your queue at ${job.siteName}. Agreed task amount is ${job.agreedAmount} rupees.`
      : `New job offer at ${job.siteName}. Agreed task amount is ${job.agreedAmount} rupees. Distance ${job.distanceKm} km.`;
    setIsPlayingAudio(true);
    speakText(
      textToSpeak,
      language,
      () => setIsPlayingAudio(true),
      () => setIsPlayingAudio(false)
    );
  };

  const progressPercent = (secondsRemaining / 30) * 100;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-xs p-3 select-none font-sans">
      <motion.div initial={{ y: 40 }} animate={{ y: 0 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }} className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col space-y-3 pb-4">
        {/* Countdown Bar */}
        <div className="w-full h-2 bg-slate-100">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              hasActiveJob ? 'bg-emerald-600' : 'bg-blue-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header */}
        <div className="px-5 pt-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full animate-ping ${hasActiveJob ? 'bg-emerald-600' : 'bg-blue-600'}`} />
            <span className="text-xs uppercase tracking-widest font-black text-neutral-900">
              {hasActiveJob
                ? (language === 'hi' ? '⚡ कतार में अगला काम' : '⚡ NEXT WORK FOR YOUR QUEUE')
                : (language === 'hi' ? '🚨 नया काम आया है' : '🚨 NEW JOB OFFER')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayVoice}
              className="px-2.5 py-1 bg-slate-100 text-neutral-800 font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs active:scale-95"
            >
              <Volume2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{isPlayingAudio ? '...' : (language === 'hi' ? 'सुनें' : 'Listen')}</span>
            </button>

            <button
              onClick={() => {
                stopSpeech();
                onDecline();
              }}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              aria-label="Decline"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 text-center space-y-2">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">AGREED TASK AMOUNT</span>
          <strong className="block text-2xl font-black text-blue-900">{String.fromCharCode(8377)}{job.agreedAmount}</strong>
          <span className="text-xs text-slate-600 font-bold block">{job.categoryName} ? {job.distanceKm} km away</span>
        </div>
        
{/* Location & Landmark Card */}
        <div className="mx-4 bg-slate-50 rounded-2xl p-3.5 space-y-1 text-xs shadow-xs">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-black text-neutral-900 text-sm block">{job.siteName}</span>
              <div className="mt-1 text-neutral-800 font-bold bg-white px-2 py-0.5 rounded-lg inline-block shadow-xs">
                📍 {job.landmark}
              </div>
            </div>
          </div>
        </div>

        {/* Perks */}
        {job.perks.lunchProvided && (
          <div className="mx-4 text-xs font-bold text-slate-700 flex items-center gap-1.5 px-1">
            <Utensils className="w-3.5 h-3.5 text-teal-600" />
            <span>{language === 'hi' ? 'दोपहर का भोजन मुफ्त' : 'Free Lunch Included'}</span>
          </div>
        )}

        {/* Notice if worker is already active */}
        {hasActiveJob && (
          <div className="mx-4 bg-emerald-50 rounded-xl p-2.5 text-[11px] text-emerald-950 font-bold">
            {language === 'hi'
              ? '✓ आप अभी काम पर हैं। यह काम आपके वर्तमान काम खत्म होते ही कतार में सक्रिय होगा।'
              : '✓ You are on shift. This will activate right after your current punch-out.'}
          </div>
        )}

        {/* ACTION BUTTON */}
        <div className="px-4 pt-1">
          {hasActiveJob ? (
            <button
              onClick={() => {
                stopSpeech();
                if (!isAadhaarVerified) {
                  if (onOpenAadhaarModal) {
                    onDecline();
                    onOpenAadhaarModal();
                  }
                  return;
                }
                if (onQueue) {
                  onQueue(job);
                } else {
                  onAccept(job);
                }
              }}
              className="w-full min-h-[58px] rounded-2xl font-black text-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-transform"
            >
              <ListPlus className="w-5 h-5" />
              <span>
                {language === 'hi' ? 'कतार में जोड़ें (अगला काम)' : 'QUEUE AS NEXT WORK'}
              </span>
            </button>
          ) : (
            <button
              disabled={!isOnline}
              title={!isOnline ? 'Go online to accept this job' : undefined}
              onClick={() => {
                stopSpeech();
                if (!isAadhaarVerified) {
                  if (onOpenAadhaarModal) {
                    onDecline();
                    onOpenAadhaarModal();
                  }
                  return;
                }
                onAccept(job);
              }}
              className={`w-full min-h-[58px] rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-lg transition-transform ${
                !isOnline
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : isAadhaarVerified
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-white'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {isAadhaarVerified
                  ? (language === 'hi' ? 'काम स्वीकार करें (स्वीकार)' : 'TAP TO ACCEPT JOB')
                  : (language === 'hi' ? 'आधार सत्यापित कर स्वीकारें' : 'VERIFY AADHAAR TO ACCEPT')}
              </span>
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
