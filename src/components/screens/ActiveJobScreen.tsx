import React, { useState, useEffect } from 'react';
import { JobListingCard } from '../JobListingCard';
import { ShiftState, Language, Job, WorkerProfile } from '../../types';
import { aiLabel } from '../../utils/aiLabels';
import { localizeJobTitle, localizePlaceText, localizeTradeName, uiText } from '../../utils/uiText';
import { UberMapView } from '../UberMapView';
import { 
  Navigation, 
  Phone, 
  CheckCircle2, 
  AlertTriangle, 
  Check, 
  ArrowLeft,
  Bot, 
  ShieldCheck,
  ListPlus,
  Sparkles,
  X,
  MapPin,
  ChevronsRight,
} from 'lucide-react';

interface ActiveJobScreenProps {
  shift: ShiftState;
  worker: WorkerProfile;
  language: Language;
  onEnterOtp: () => void;
  onPunchIn: () => void;
  onPunchOut: () => void;
  onOpenSos: () => void;
  onBrowseJobs: () => void;
  onBackToDuty: () => void;
  suggestedNextJob?: Job | null;
  onQueueJob?: (job: Job) => void;
  onCancelQueuedJob?: () => void;
}

export const ActiveJobScreen: React.FC<ActiveJobScreenProps> = ({
  shift,
  worker,
  language,
  onEnterOtp,
  onPunchIn,
  onPunchOut,
  onOpenSos,
  onBrowseJobs,
  onBackToDuty,
  suggestedNextJob,
  onQueueJob,
  onCancelQueuedJob,
}) => {
  const [showCallModal, setShowCallModal] = useState<boolean>(false);
  const [siteOtp, setSiteOtp] = useState<string>('');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [otpError, setOtpError] = useState<string>('');
  const [slideProgress, setSlideProgress] = useState(0);
  const [showOtpSlideScreen, setShowOtpSlideScreen] = useState(false);
  const [workerAtWorksite, setWorkerAtWorksite] = useState(false);

  const job = shift.job;
  const queuedJob = shift.queuedJob;
  const continueLabel = ({ en: 'Continue', hi: 'जारी रखें', bn: 'চালিয়ে যান', mr: 'पुढे चला', te: 'కొనసాగించండి' } as Record<Language, string>)[language];

  useEffect(() => {
    setSiteOtp(String(Math.floor(1000 + Math.random() * 9000)));
    setEnteredOtp('');
    setOtpError('');
    setSlideProgress(0);
    setShowOtpSlideScreen(false);
    setWorkerAtWorksite(false);
  }, [job?.id]);

  const handleVerifySiteOtp = () => {
    if (enteredOtp !== siteOtp) {
      setOtpError('Incorrect OTP. Check the code from the site contractor.');
      return;
    }
    setOtpError('');
    onPunchIn();
  };

  const handleVoiceNav = () => window.dispatchEvent(new Event('kaamsetu:open-ai-assistant'));

  const handlePunchOutClick = () => {
    onPunchOut();
  };

  if (!job) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-[#f1f1f1] font-sans select-none">
        <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center text-slate-400">
          <Navigation className="w-10 h-10 text-neutral-700" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-black text-neutral-900">
            {uiText(language, 'noActiveJob')}
          </h3>
          <p className="text-xs text-slate-500 max-w-xs">
            {uiText(language, 'noActiveJobSub')}
          </p>
        </div>
        <button
          onClick={onBrowseJobs}
          className="min-h-[48px] px-6 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs active:scale-95 transition-transform shadow-xs"
        >
          {uiText(language, 'browseJobs')}
        </button>
      </div>
    );
  }

  if (shift.status !== 'punched_in' && !shift.otpEntryStarted) {
    return (
      <div className="relative mx-auto h-full min-h-[560px] w-full max-w-[393px] flex-1 overflow-hidden bg-[#f1f1f1] font-sans select-none md:max-w-2xl lg:max-w-none">
        <div className="absolute inset-0">
          <UberMapView
            language={language}
            isOnline={true}
            activeJob={job}
            incomingJob={null}
            workerLocation={worker.currentLocation}
            hideLocationCard
            autoNavigate
            hasArrived={workerAtWorksite}
            onWorkerAtDestination={() => {
              setWorkerAtWorksite(true);
              if (!shift.startedFromQueue) setShowOtpSlideScreen(true);
            }}
          />
        </div>

        <div className="absolute left-4 right-4 top-6 z-20 mx-auto flex min-h-[66px] max-w-[360px] items-center gap-3 rounded-[22px] bg-white px-4 py-2.5 shadow-[0_3px_18px_rgba(0,0,0,0.12)]">
          <button type="button" onClick={onBackToDuty} aria-label={uiText(language, 'back')} title={uiText(language, 'back')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <img
            src={worker.authPhotoURL || '/figma/account_raw_1.jpeg'}
            onError={(event) => { event.currentTarget.src = '/figma/account_raw_1.jpeg'; }}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-neutral-900">{worker.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{uiText(language, 'online')}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSos}
            aria-label={uiText(language, 'emergencySos')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-300 text-rose-700 active:scale-95"
          >
            <AlertTriangle className="h-4 w-4" />
          </button>
        </div>

        <article className="absolute bottom-[84px] left-4 right-4 z-20 mx-auto max-w-[360px] rounded-[24px] bg-white p-4 shadow-[0_3px_18px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex max-w-[70%] items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
              {localizeTradeName(job.trade, language)}
            </span>
            <span className="rounded-xl bg-indigo-50 px-2.5 py-2 text-right text-[10px] font-black leading-tight text-blue-800">
              {uiText(language, 'taskPay')}<br />₹{job.agreedAmount} {uiText(language, job.wageType === 'hourly' ? 'hourlyRate' : job.wageType === 'daily' ? 'dailyRate' : 'totalRate')}
            </span>
          </div>
          <p className="mt-2 text-xs font-medium text-neutral-700">{job.contractorName}</p>
          <h2 className="mt-1 line-clamp-2 text-[17px] font-bold leading-5 text-neutral-950">{localizeJobTitle(job, language)}</h2>
          <p className="mt-3 flex min-w-0 items-center gap-1 text-[11px] text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 fill-slate-400 text-slate-400" />
            <span className="truncate">{localizePlaceText(job.siteName, language)}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-slate-500">
            <span className="rounded-md bg-slate-100 px-2 py-1">{job.distanceKm} {uiText(language, 'kmUnit')}</span>
            <span className="rounded-md bg-slate-100 px-2 py-1">{job.startTime} - {job.endTime}</span>
          </div>
          {showOtpSlideScreen ? (
            <div className="relative mt-3 h-[54px] overflow-hidden rounded-[15px] border border-dashed border-[#2d59f0] bg-white">
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center pl-10 text-[14px] font-semibold text-[#587cff]">{uiText(language, 'slideToEnterOtp')}</span>
              <span style={{ left: `calc((100% - 52px) * ${slideProgress / 100})` }} className="pointer-events-none absolute top-0 z-10 flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[#2d59f0] text-white shadow-md transition-[left] duration-75">
                <ChevronsRight className="h-7 w-7" />
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={slideProgress}
                onChange={(event) => {
                  const progress = Number(event.target.value);
                  setSlideProgress(progress);
                  if (progress >= 86) onEnterOtp();
                }}
                aria-label={uiText(language, 'slideToEnterOtp')}
                className="absolute inset-0 z-20 h-full w-full cursor-grab appearance-none bg-transparent opacity-[0.01] active:cursor-grabbing"
              />
            </div>
          ) : shift.startedFromQueue && workerAtWorksite ? (
            <button
              type="button"
              onClick={() => setShowOtpSlideScreen(true)}
              className="mt-3 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[15px] bg-[#2d59f0] px-4 text-sm font-bold text-white shadow-md transition-colors hover:bg-blue-700 active:scale-[0.99]"
            >
              <Navigation className="h-4 w-4" />
              {continueLabel}
            </button>
          ) : (
            <div className="mt-3 flex min-h-[54px] items-center justify-center gap-2 rounded-[15px] bg-blue-50 px-3 text-center text-sm font-bold text-blue-800">
              <Navigation className="h-4 w-4 shrink-0" />
              <span>{uiText(language, 'headToSite')}</span>
            </div>
          )}
        </article>
      </div>
    );
  }

  const isArrivedAtSite = shift.status === 'arrived' || shift.status === 'punched_in';

  return (
    <div className="relative mx-auto flex min-h-max w-full max-w-[393px] flex-none flex-col overflow-x-hidden bg-[#f1f1f1] select-none font-sans md:max-w-2xl lg:grid lg:max-w-7xl lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-start lg:gap-5 lg:p-5">
      {/* 1. TURN-BY-TURN GUIDANCE BANNER */}
      <div className={`z-20 text-white px-4 py-3 shadow-md flex items-center justify-between shrink-0 transition-colors duration-500 ${
        isArrivedAtSite ? 'bg-emerald-600' : 'bg-blue-600'
      } lg:col-span-2`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <button type="button" onClick={onBackToDuty} aria-label={uiText(language, 'back')} title={uiText(language, 'back')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 transition-colors hover:bg-white/25">
            <ArrowLeft className="h-4 w-4" />
          </button>
          {isArrivedAtSite ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <Navigation className="w-5 h-5 animate-pulse shrink-0" />
          )}
          <div className="text-xs min-w-0">
            <span className="font-black block leading-tight truncate">
              {shift.status === 'punched_in'
                ? uiText(language, 'shiftInProgress')
                : isArrivedAtSite
                  ? uiText(language, 'arrivedAtSite')
                  : uiText(language, 'headToSite')}
            </span>
            <span className="text-[11px] opacity-90 block truncate">
              {isArrivedAtSite
              ? `${localizePlaceText(job.siteName, language)} · ${localizePlaceText(job.landmark, language)}`
                : `${localizePlaceText(job.landmark, language)} (~${job.travelTimeMin} ${uiText(language, 'minuteAbbr')})`}
            </span>
          </div>
        </div>

        <button
          onClick={handleVoiceNav}
          className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold shrink-0 ${
            isArrivedAtSite ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-blue-700 hover:bg-blue-800'
          }`}
          aria-label={aiLabel(language).title}
        >
          <Bot className="w-4 h-4" />
        </button>
      </div>

      {/* 2. JOB-SPECIFIC SCHEMATIC ROUTE MAP */}
      <div className="relative h-[45vh] min-h-[300px] w-full shrink-0 lg:sticky lg:top-4 lg:h-[calc(100dvh-8rem)] lg:min-h-[420px]">
        <UberMapView
          language={language}
          isOnline={true}
          activeJob={job}
          incomingJob={null}
          workerLocation={worker.currentLocation}
          hasArrived={isArrivedAtSite || workerAtWorksite}
          customLocationText={isArrivedAtSite ? localizePlaceText(job.siteName, language) : undefined}
          autoNavigate
          onWorkerAtDestination={() => {
            setWorkerAtWorksite(true);
            setShowOtpSlideScreen(true);
          }}
        />

        {/* Floating Quick Action Buttons on Map */}
        <div className="absolute top-4 right-4 flex flex-col gap-2.5 z-20">
          <button
            onClick={() => setShowCallModal(true)}
            className="w-12 h-12 rounded-full bg-white text-blue-600 shadow-md flex items-center justify-center transition-transform active:scale-95"
            title="Call Contractor"
          >
            <Phone className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenSos}
            className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-md flex items-center justify-center transition-transform active:scale-95"
            title="Emergency SOS"
          >
            <AlertTriangle className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* 3. UBER WHITE BOTTOM CARD CONTROLS */}
      <div className="relative z-20 -mt-8 shrink-0 px-4 pt-2 pb-[112px] lg:mt-0 lg:min-w-0 lg:px-0 lg:pt-0">
        <JobListingCard job={job} language={language}>
        {shift.status !== 'punched_in' ? (
          /* OTP CHECK-IN STAGE */
          <div className="space-y-3.5">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-neutral-900">
                  <ShieldCheck className="w-4 h-4 text-[#2d59f0]" />
                  <span>{uiText(language, 'verifyAttendanceOtp')}</span>
                </div>
                    <p className="text-[11px] text-slate-600">{uiText(language, 'demoOtp')} <strong className="font-mono text-neutral-900">{siteOtp}</strong></p>
                    <input
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={4}
                      value={enteredOtp}
                      onChange={(event) => { setEnteredOtp(event.target.value.replace(/\D/g, '').slice(0, 4)); setOtpError(''); }}
                      placeholder={uiText(language, 'enterOtp')}
                      aria-label={uiText(language, 'siteOtp')}
                      className="w-full h-12 rounded-xl bg-white border border-slate-200 px-4 text-center text-lg font-black tracking-[0.4em] outline-none focus:border-[#2d59f0]"
                    />
                    {otpError && <p role="alert" className="text-xs font-bold text-rose-600">{otpError}</p>}
                    <button onClick={handleVerifySiteOtp} disabled={enteredOtp.length !== 4} className="flex h-[55px] w-full items-center justify-center rounded-[15px] bg-[#2d59f0] text-[14px] font-semibold text-white transition-transform active:scale-[0.98] disabled:bg-slate-300">
                      {uiText(language, 'verifyOtpPunchIn')}
                    </button>
              </div>
          </div>
        ) : (
          /* WORK IN PROGRESS STAGE WITH BACK-TO-BACK QUEUE */
          <div className="space-y-3.5">
            {/* On-site work status */}
            <div className="flex items-center justify-between bg-slate-100/70 rounded-2xl p-4 shadow-xs">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 font-bold uppercase tracking-wider mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{uiText(language, 'onSite')}: {localizePlaceText(job.siteName, language)}</span>
                </div>
                <div className="text-sm font-bold text-slate-600">{uiText(language, 'workInProgress')}</div>
              </div>

              <span className="text-xs font-bold text-blue-800">{uiText(language, 'workBasedPay')}</span>
            </div>

            {/* QUEUED WORK OR "10 MINS TO FINISH" RECOMMENDATION */}
            {queuedJob ? (
              <div className="bg-emerald-50 rounded-2xl p-3 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-emerald-800 font-black uppercase tracking-wider block">
                      ✓ {uiText(language, 'nextJobLocked')}
                    </span>
                    <span className="text-xs font-black text-emerald-950 truncate block">
                      {localizeJobTitle(queuedJob, language)}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-900 font-bold block">{queuedJob.distanceKm} {uiText(language, 'kmAway')}</span>
                  </div>
                </div>

                {onCancelQueuedJob && (
                  <button
                    onClick={onCancelQueuedJob}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-emerald-100/60"
                    title={uiText(language, 'removeQueue')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              suggestedNextJob && onQueueJob && (
                <div className="bg-blue-50/80 rounded-2xl p-3 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-blue-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>{uiText(language, 'queueYourNext')}</span>
                    </span>
                    <span className="text-[10px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-full">
                      {uiText(language, 'anytime')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-white rounded-xl p-2.5 shadow-xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="text-xs font-black text-neutral-900 block truncate">{localizeJobTitle(suggestedNextJob, language)}</span>
                      <span className="text-[11px] text-slate-500 font-mono">{suggestedNextJob.distanceKm} {uiText(language, 'kmAway')}</span>
                    </div>

                    <button
                      onClick={() => onQueueJob(suggestedNextJob)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shrink-0 active:scale-95 shadow-xs transition-colors flex items-center gap-1"
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                      <span>{uiText(language, 'queueNext')}</span>
                    </button>
                  </div>
                </div>
              )
            )}

            {/* PUNCH OUT CTA */}
            <button
              onClick={handlePunchOutClick}
              className="w-full min-h-[52px] rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{uiText(language, 'completeWork')}</span>
            </button>
          </div>
        )}
        </JobListingCard>
      </div>

      {/* Contractor Phone Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 backdrop-blur-xs p-4">
          <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-xs space-y-4 overflow-y-auto rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-neutral-900">{job.contractorName}</h4>
              <p className="text-xs text-slate-500">{job.contractorCompany}</p>
              <div className="mt-2 text-base font-mono font-black text-blue-900">
                {job.contractorPhone}
              </div>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setShowCallModal(false)}
                className="flex-1 min-h-[46px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                {uiText(language, 'close')}
              </button>
              <a
                href={`tel:${job.contractorPhone}`}
                onClick={() => setShowCallModal(false)}
                className="flex-1 min-h-[46px] bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl flex items-center justify-center shadow-xs"
              >
                {uiText(language, 'call')}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
