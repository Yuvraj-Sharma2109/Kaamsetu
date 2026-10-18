import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Job, Language, WorkerProfile } from '../../types';
import { TRADES } from '../../data/mockData';
import { getTranslation } from '../../utils/i18n';
import { aiLabel } from '../../utils/aiLabels';
import { localizeJobTitle, localizePlaceText, localizeTradeName, uiText } from '../../utils/uiText';
import { 
  Search, 
  MapPin, 
  Clock, 
  Bot,
CheckCircle2, 
  Utensils, 
  Wrench, 
  AlertTriangle, 
  Sparkles, 
  Check,
  ListPlus,
  Layers
} from 'lucide-react';

interface JobsFeedScreenProps {
  jobs: Job[];
  language: Language;
  worker: WorkerProfile;
  isOnline: boolean;
  activeJob: Job | null;
  queuedJob?: Job | null;
  onSelectJob: (job: Job) => void;
  onAcceptJob: (job: Job) => void;
  onQueueJob?: (job: Job) => void;
  onOpenAadhaarModal?: () => void;
}

export const JobsFeedScreen: React.FC<JobsFeedScreenProps> = ({
  jobs,
  language,
  worker,
  isOnline,
  activeJob,
  queuedJob,
  onSelectJob,
  onAcceptJob,
  onQueueJob,
  onOpenAadhaarModal,
}) => {
  const t = getTranslation(language);
  const [maxDistance, setMaxDistance] = useState<number>(5);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tradeFilterMode, setTradeFilterMode] = useState<'my_trade' | 'all'>('my_trade');

  // Look up worker's registered trade info
  const workerTrade = TRADES.find((t) => t.id === worker.primaryTrade) || TRADES[0];
  const tradeDisplayName = localizeTradeName(workerTrade.id, language);

  // Filter jobs according to worker's chosen trade as primary
  const filteredJobs = jobs.filter((job) => {
    if (tradeFilterMode === 'my_trade') {
      if (job.trade !== worker.primaryTrade) return false;
    }
    if (job.distanceKm > maxDistance) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = job.title.toLowerCase().includes(q) || job.titleHi.includes(q);
      const matchSite = job.siteName.toLowerCase().includes(q);
      if (!matchTitle && !matchSite) return false;
    }
    return true;
  });

  const handleSpeakJob = (e: React.MouseEvent, _job: Job) => { e.stopPropagation(); window.dispatchEvent(new Event('kaamsetu:open-ai-assistant')); };

  return (
    <div className="mx-auto flex w-full max-w-[393px] md:max-w-2xl lg:max-w-6xl flex-1 flex-col space-y-3.5 p-4 pb-[112px] select-none bg-[#f1f1f1] font-sans">
      {/* ACTIVE SHIFT STATUS NOTICE IF WORKER HAS JOB IN PROGRESS */}
      {activeJob && (
        <div className="bg-blue-50/90 rounded-2xl p-3.5 space-y-1.5 shadow-xs animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-blue-950 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <span>{uiText(language, 'activeShiftProgress')}</span>
            </span>
            <span className="text-[11px] font-bold text-blue-800">
              {queuedJob ? uiText(language, 'queueBooked') : uiText(language, 'canQueue')}
            </span>
          </div>
          <p className="text-[11px] text-blue-900 leading-tight">
            {queuedJob
              ? uiText(language, 'queuedIntro').replace('{job}', localizeJobTitle(queuedJob, language))
              : uiText(language, 'oneSiteRule')}
          </p>
        </div>
      )}

      {/* 1. TOP REGISTERED TRADE CARD */}
      <div className="bg-white rounded-3xl p-4 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                {uiText(language, 'yourTrade')}
              </span>
              <h2 className="text-sm font-black text-neutral-900">{tradeDisplayName}</h2>
            </div>
          </div>

          {/* Pastel Green Matched Badge */}
          <span className="text-[11px] font-black text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
            <span>{filteredJobs.length} {uiText(language, 'jobsCount')}</span>
          </span>
        </div>

        {/* Trade Switcher Toggle Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold shadow-xs">
          <button
            type="button"
            onClick={() => setTradeFilterMode('my_trade')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              tradeFilterMode === 'my_trade'
                ? 'bg-white text-neutral-900 shadow-xs font-black'
                : 'text-slate-600 hover:text-neutral-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>{uiText(language, 'only')} {tradeDisplayName}</span>
          </button>

          <button
            type="button"
            onClick={() => setTradeFilterMode('all')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              tradeFilterMode === 'all'
                ? 'bg-white text-neutral-900 shadow-xs font-black'
                : 'text-slate-600 hover:text-neutral-900'
            }`}
          >
            <span>{uiText(language, 'allTradeJobs')}</span>
          </button>
        </div>
      </div>

      {/* 2. AADHAAR PENDING ALERT */}
      {!worker.isKycVerified && (
        <div className="bg-amber-50/90 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black text-amber-950 block leading-tight">
                {uiText(language, 'aadhaarPending')}
              </span>
              <span className="text-[11px] text-amber-800 font-medium block truncate">
                {uiText(language, 'verifyClaimJobs')}
              </span>
            </div>
          </div>
          {onOpenAadhaarModal && (
            <button
              onClick={onOpenAadhaarModal}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs shrink-0 active:scale-95 shadow-xs transition-colors"
            >
              {uiText(language, 'verify')}
            </button>
          )}
        </div>
      )}

      {/* 3. DISTANCE FILTER PILLS */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-1">
        <span className="font-bold">{uiText(language, 'distanceRadius')}</span>
        <div className="flex items-center gap-1.5">
          {[2, 3.5, 5].map((dist) => (
            <button
              key={dist}
              onClick={() => setMaxDistance(dist)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                maxDistance === dist
                  ? 'bg-neutral-900 text-white font-black'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              &lt; {dist} km
            </button>
          ))}
        </div>
      </div>

      {/* 4. JOBS LIST WITH EXCLUSIVE / QUEUE LOGIC */}
      <div className="space-y-3.5 md:grid md:grid-cols-2 md:items-start md:gap-4 md:space-y-0">
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center space-y-2 shadow-sm">
            <span className="text-3xl block">🔍</span>
            <span className="text-sm font-black text-neutral-900 block">
              {uiText(language, 'noTradeJobs').replace('{trade}', tradeDisplayName)}
            </span>
            <span className="text-xs text-slate-500 block">
              {uiText(language, 'expandRadius')}
            </span>
            <button
              onClick={() => setMaxDistance(5)}
              className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold shadow-xs"
            >
              {uiText(language, 'show5km')}
            </button>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const isExactMatch = job.trade === worker.primaryTrade;
            const isCurrentActive = activeJob?.id === job.id;
            const isCurrentlyQueued = queuedJob?.id === job.id;
            const hasQueuedJob = Boolean(queuedJob);

            return (
              <motion.div
                key={job.id}
                onClick={() => onSelectJob(job)}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }}
                className="w-full bg-white rounded-3xl p-4.5 space-y-3.5 shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
              >
                {/* Header: Title, Category & Big Wage */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Exact Trade Match pill */}
                    {isExactMatch && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md shadow-xs">
                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                        <span>{uiText(language, 'matchPrefix')} {tradeDisplayName}</span>
                      </span>
                    )}

                    <h3 className="text-sm font-black text-neutral-900 leading-snug">
                      {localizeJobTitle(job, language)}
                    </h3>
                    {job.postedByType && job.postedByType !== 'contractor' && (
                      <span className="inline-flex rounded-md bg-violet-50 px-2 py-1 text-[10px] font-black uppercase text-violet-800">{job.postedByType === 'homeowner' ? 'Home · direct request' : 'Office · direct request'}</span>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{localizePlaceText(job.siteName, language)}</span>
                    </div>
                  </div>

                                    <div className="shrink-0 bg-blue-50/90 rounded-2xl px-3.5 py-2 shadow-xs text-right">
                    <div className="text-xs font-black text-blue-900">{uiText(language, 'taskPay')}</div>
                    <div className="text-[10px] text-blue-800 font-bold uppercase">₹{job.agreedAmount} {uiText(language, 'agreed')}</div>
                  </div>
                </div>

{/* Badges: Distance & Time */}
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="bg-slate-100 text-slate-800 font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-xs">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{job.distanceKm} {uiText(language, 'kmUnit')}</span>
                  </span>

                  <span className="bg-slate-100 text-slate-800 font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-xs">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{job.startTime} - {job.endTime}</span>
                  </span>

                  {job.perks.lunchProvided && (
                    <span className="bg-teal-50 text-teal-800 font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-xs">
                      <Utensils className="w-3 h-3 text-teal-600" />
                      <span>{uiText(language, 'lunch')}</span>
                    </span>
                  )}
                </div>

                {/* AI help & Smart Accept / Queue / Booked Logic */}
                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={(e) => handleSpeakJob(e, job)}
                    className="h-11 px-3.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-colors shadow-xs hover:bg-slate-200"
                    aria-label={aiLabel(language).title}
                  >
                    <Bot className="w-4 h-4" />
                    <span>{aiLabel(language).open}</span>
                  </button>

                  {/* SMART WORK STATE BUTTON */}
                  {isCurrentActive ? (
                    /* 1. Already Active */
                    <div className="flex-1 h-11 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 bg-blue-50 text-blue-900 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                      <span>{uiText(language, 'activeJob')}</span>
                    </div>
                  ) : isCurrentlyQueued ? (
                    /* 2. Currently Queued for Next */
                    <div className="flex-1 h-11 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-800 shadow-xs">
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                      <span>{uiText(language, 'queuedAsNext')}</span>
                    </div>
                  ) : activeJob && hasQueuedJob ? (
                    /* 3. Both Active & Queued slots full -> Disabled */
                    <button
                      type="button"
                      disabled
                      className="flex-1 h-11 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-slate-100 text-slate-400 cursor-not-allowed"
                      title="You already have an active job and a queued next job"
                    >
                      <span>{uiText(language, 'queueFullFinish')}</span>
                    </button>
                  ) : activeJob && !hasQueuedJob ? (
                    /* 4. Active job in progress, but queue slot is free -> "QUEUE FOR NEXT WORK" */
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!worker.isKycVerified) {
                          if (onOpenAadhaarModal) onOpenAadhaarModal();
                          return;
                        }
                        if (onQueueJob) {
                          onQueueJob(job);
                        } else {
                          onAcceptJob(job);
                        }
                      }}
                      className="flex-1 h-11 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95 transition-transform"
                    >
                      <ListPlus className="w-4 h-4" />
                      <span>{uiText(language, 'queueNext')}</span>
                    </button>
                  ) : (
                    /* 5. No active job -> standard Accept Job CTA */
                    <button
                      type="button"
                      disabled={!isOnline}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!worker.isKycVerified) {
                          if (onOpenAadhaarModal) onOpenAadhaarModal();
                          return;
                        }
                        onAcceptJob(job);
                      }}
                      className={`flex-1 h-11 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-transform ${isOnline ? 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{uiText(language, 'acceptJob')}</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
