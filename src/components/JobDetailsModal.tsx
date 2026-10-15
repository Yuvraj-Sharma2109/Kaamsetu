import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Job, Language } from '../types';
import { getTranslation } from '../utils/i18n';
import { speakText, stopSpeech } from '../utils/speech';
import { localizePlaceText, uiText } from '../utils/uiText';
import { 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Volume2, 
  X, 
  CheckCircle2, 
  Building,
  AlertTriangle,
  ListPlus,
  Check
} from 'lucide-react';

interface JobDetailsModalProps {
  job: Job;
  language: Language;
  onClose: () => void;
  onAcceptJob: (job: Job) => void;
  onQueueJob?: (job: Job) => void;
  isOnline?: boolean;
  hasActiveJob?: boolean;
  hasQueuedJob?: boolean;
  isCurrentActive?: boolean;
  isCurrentQueued?: boolean;
  isAadhaarVerified?: boolean;
  onOpenAadhaarModal?: () => void;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  language,
  onClose,
  onAcceptJob,
  onQueueJob,
  isOnline = true,
  hasActiveJob = false,
  hasQueuedJob = false,
  isCurrentActive = false,
  isCurrentQueued = false,
  isAadhaarVerified = true,
  onOpenAadhaarModal,
}) => {
  const t = getTranslation(language);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handlePlayVoice = () => {
    const textToSpeak = `${job.title}. Agreed task amount is ${job.agreedAmount} rupees. Site: ${job.siteName}.`;
    setIsPlayingAudio(true);
    speakText(
      textToSpeak,
      language,
      () => setIsPlayingAudio(true),
      () => setIsPlayingAudio(false)
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-3 font-sans select-none">
      <motion.div initial={{ y: 32, scale: 0.98 }} animate={{ y: 0, scale: 1 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }} className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-slate-50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-neutral-900 font-black">
              {language === 'hi' ? job.categoryNameHi : job.categoryName}
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-xs text-slate-600 font-semibold">{job.durationDays} {uiText(language, 'days')}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayVoice}
              className="p-2 bg-white hover:bg-slate-100 text-neutral-800 rounded-xl text-xs flex items-center gap-1 transition-colors shadow-xs"
              title="Voice readout"
            >
              <Volume2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold">{isPlayingAudio ? '...' : uiText(language, 'listen')}</span>
            </button>
            <button
              onClick={() => {
                stopSpeech();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-neutral-900 rounded-xl hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-3.5 text-neutral-900">
          <div>
            <h3 className="text-base font-black text-neutral-900 leading-snug">
              {language === 'hi' ? job.titleHi : job.title}
            </h3>
            <span className="text-xs text-blue-900 font-bold mt-0.5 block">
              {job.spotsAvailable} {uiText(language, 'vacancies')}
            </span>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between shadow-xs">
            <span className="text-xs text-slate-600 font-bold">Agreed task amount</span>
            <strong className="text-xl text-blue-900">{String.fromCharCode(8377)}{job.agreedAmount}</strong>
          </div>
          
{/* Location & Landmark */}
          <div className="bg-slate-50 rounded-2xl p-3.5 space-y-1.5 text-xs shadow-xs">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-neutral-900 block">{localizePlaceText(job.siteName, language)}</span>
                <span className="text-slate-500 block">{localizePlaceText(job.locationAddress, language)}</span>
                <div className="mt-1 text-neutral-800 font-bold bg-white px-2.5 py-1 rounded-lg inline-block shadow-xs">
                  📍 {uiText(language, 'landmark')}: {localizePlaceText(job.landmark, language)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 pl-6">
              <span className="font-mono text-blue-900 font-bold">{job.distanceKm} km away</span>
              <span>·</span>
              <span>~{job.travelTimeMin} min walk</span>
            </div>
          </div>

          {/* Requester card */}
          <div className="bg-slate-50 p-3.5 rounded-2xl flex items-center justify-between text-xs shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold shadow-xs">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <span className="font-black text-neutral-900 block">{job.postedByType === 'homeowner' ? 'Homeowner · direct request' : job.postedByType === 'office' ? 'Office · direct request' : job.contractorCompany}</span>
                <span className="text-[11px] text-slate-500">{job.contractorName}</span>
              </div>
            </div>
            <span className="text-neutral-900 font-black">★ {job.contractorRating}</span>
          </div>

          {job.postedByType && job.postedByType !== 'contractor' && (
            <a href={`tel:${job.contractorPhone}`} className="block rounded-xl bg-blue-700 px-4 py-3 text-center text-sm font-black text-white">Call the {job.postedByType === 'homeowner' ? 'homeowner' : 'office requester'}</a>
          )}

          {/* Active Job Exclusivity Notice */}
          {hasActiveJob && !isCurrentActive && !isCurrentQueued && (
            <div className="bg-blue-50/80 rounded-2xl p-3 text-xs text-blue-900 leading-tight">
              ℹ️ {hasQueuedJob 
                ? (language === 'hi' ? 'आपकी कतार पहले से भरी हुई है। यह काम लेने के लिए वर्तमान काम पूरा करें।' : 'Your upcoming queue is full. Complete current shift to take more work.')
                : (language === 'hi' ? 'आपका 1 काम चालू है। यह काम वर्तमान शिफ्ट खत्म होने के बाद शुरू करने के लिए कतार में जुड़ेगा।' : 'You already have an active job. This will be queued to start right after you punch out.')}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 flex items-center gap-2.5">
          <button
            onClick={() => {
              stopSpeech();
              onClose();
            }}
            className="min-h-[48px] px-4 rounded-xl bg-white hover:bg-slate-100 text-neutral-700 text-xs font-bold shadow-xs"
          >
            Close
          </button>

          {isCurrentActive ? (
            <div className="flex-1 min-h-[48px] rounded-xl font-black text-xs flex items-center justify-center bg-blue-100 text-blue-900 shadow-xs">
              <span>{uiText(language, 'currentJob')}</span>
            </div>
          ) : isCurrentQueued ? (
            <div className="flex-1 min-h-[48px] rounded-xl font-black text-xs flex items-center justify-center bg-emerald-50 text-emerald-800 shadow-xs">
              <span>{uiText(language, 'alreadyQueued')}</span>
            </div>
          ) : hasActiveJob && hasQueuedJob ? (
            <button
              disabled
              className="flex-1 min-h-[48px] rounded-xl font-bold text-xs bg-slate-200 text-slate-500 cursor-not-allowed"
            >
              <span>{uiText(language, 'queueFull')}</span>
            </button>
          ) : hasActiveJob && !hasQueuedJob ? (
            <button
              onClick={() => {
                stopSpeech();
                if (!isAadhaarVerified) {
                  if (onOpenAadhaarModal) {
                    onClose();
                    onOpenAadhaarModal();
                  }
                  return;
                }
                if (onQueueJob) {
                  onQueueJob(job);
                  onClose();
                } else {
                  onAcceptJob(job);
                  onClose();
                }
              }}
              className="flex-1 min-h-[48px] rounded-xl font-black text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform"
            >
              <ListPlus className="w-4 h-4" />
              <span>{uiText(language, 'queueAsNext')}</span>
            </button>
          ) : (
            <button
              disabled={!isOnline}
              title={!isOnline ? 'Go online to accept this job' : undefined}
              onClick={() => {
                stopSpeech();
                if (!isAadhaarVerified) {
                  if (onOpenAadhaarModal) {
                    onClose();
                    onOpenAadhaarModal();
                  }
                  return;
                }
                onAcceptJob(job);
                onClose();
              }}
              className={`flex-1 min-h-[48px] rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-transform ${
                !isOnline
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : isAadhaarVerified
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{uiText(language, 'acceptJob')}</span>
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
