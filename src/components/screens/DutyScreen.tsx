import React, { useCallback, useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'motion/react';
import { GeoPoint, Job, Language, WorkerProfile } from '../../types';
import { getTranslation } from '../../utils/i18n';
import { localizeJobTitle, localizePlaceText, localizeTradeName, uiText } from '../../utils/uiText';
import { UberMapView } from '../UberMapView';
import { distanceBetweenKm, geocodePlace } from '../../utils/places';
import { MapPin, Clock3, CircleCheck, ListPlus, Check } from 'lucide-react';

interface DutyScreenProps {
  isOnline: boolean;
  onToggleOnline: () => void;
  worker: WorkerProfile;
  language: Language;
  jobs: Job[];
  activeJob: Job | null;
  queuedJob?: Job | null;
  onAcceptJob: (job: Job) => void;
  onExpandedChange?: (expanded: boolean) => void;
  onExpansionProgress?: (progress: number, settle?: boolean) => void;
  onSelectJob: (job: Job) => void;
  onSimulateIncomingJob: () => void;
  onOpenEarnings: () => void;
  todayEarnings: number;
  onOpenAadhaarModal?: () => void;
}

type OnlineStage = 'offline' | 'transitioning' | 'searching' | 'preview' | 'expanded' | 'offlineTransition';

const NEARBY_COPY: Record<Language, { title: string; radius: string; findingLocation: string; findingJobs: string; permission: string; locationDenied: string; empty: string; recommended: string }> = {
  en: { title: 'Nearby jobs', radius: 'Within 5 km', findingLocation: 'Finding your location…', findingJobs: 'Finding jobs within 5 km…', permission: 'Allow location access for nearby job recommendations.', locationDenied: 'Location is off. Tap the map pin button to retry.', empty: 'No matching jobs found within 5 km.', recommended: 'Recommended' },
  hi: { title: 'आस-पास के काम', radius: '5 किमी के अंदर', findingLocation: 'आपकी लोकेशन खोज रहे हैं…', findingJobs: '5 किमी के अंदर काम खोज रहे हैं…', permission: 'पास के काम देखने के लिए लोकेशन की अनुमति दें।', locationDenied: 'लोकेशन बंद है। फिर से कोशिश करने के लिए मैप पिन दबाएँ।', empty: '5 किमी के अंदर आपके काम का कोई जॉब नहीं मिला।', recommended: 'आपके लिए सुझाया' },
  bn: { title: 'কাছাকাছি কাজ', radius: '৫ কিমির মধ্যে', findingLocation: 'আপনার অবস্থান খোঁজা হচ্ছে…', findingJobs: '৫ কিমির মধ্যে কাজ খোঁজা হচ্ছে…', permission: 'কাছের কাজ দেখতে লোকেশন অনুমতি দিন।', locationDenied: 'লোকেশন বন্ধ আছে। আবার চেষ্টা করতে ম্যাপ পিনে ট্যাপ করুন।', empty: '৫ কিমির মধ্যে আপনার কাজের কোনো চাকরি নেই।', recommended: 'আপনার জন্য সুপারিশ' },
  mr: { title: 'जवळची कामे', radius: '५ किमीच्या आत', findingLocation: 'तुमचे स्थान शोधत आहे…', findingJobs: '५ किमीच्या आत कामे शोधत आहे…', permission: 'जवळची कामे पाहण्यासाठी स्थानाची परवानगी द्या.', locationDenied: 'स्थान बंद आहे. पुन्हा प्रयत्न करण्यासाठी नकाशावरील पिन दाबा.', empty: '५ किमीच्या आत जुळणारी कामे सापडली नाहीत.', recommended: 'तुमच्यासाठी शिफारस' },
  te: { title: 'దగ్గరలోని పనులు', radius: '5 కి.మీ లోపు', findingLocation: 'మీ స్థానాన్ని కనుగొంటోంది…', findingJobs: '5 కి.మీ లోపు పనులను వెతుకుతోంది…', permission: 'దగ్గరలోని పనుల కోసం స్థాన అనుమతి ఇవ్వండి.', locationDenied: 'స్థానం ఆఫ్‌లో ఉంది. మళ్లీ ప్రయత్నించడానికి మ్యాప్ పిన్‌ను నొక్కండి.', empty: '5 కి.మీ లోపు సరిపడే పనులు కనబడలేదు.', recommended: 'మీకు సిఫార్సు' },
};

export const DutyScreen: React.FC<DutyScreenProps> = ({
  isOnline,
  onToggleOnline,
  worker,
  language,
  jobs,
  activeJob,
  queuedJob,
  onAcceptJob,
  onExpandedChange,
  onExpansionProgress,
  onOpenAadhaarModal,
}) => {
  const t = getTranslation(language);
  const nearbyCopy = NEARBY_COPY[language];
  const screenRef = useRef<HTMLDivElement>(null);
  const [onlineStage, setOnlineStage] = useState<OnlineStage>(isOnline ? 'preview' : 'offline');
  const [screenHeight, setScreenHeight] = useState(() => typeof window === 'undefined' ? 917 : window.innerHeight);
  const dragStart = useRef<{ y: number; height: number } | null>(null);
  const flowTimers = useRef<number[]>([]);
  const panelHeight = useMotionValue(isOnline ? 337 : 226);
  const compactPanelHeight = Math.min(260, Math.max(180, screenHeight - 120));
  const previewHeight = Math.min(337, Math.max(compactPanelHeight, screenHeight * 0.52));
  const searchHeight = Math.min(226, Math.max(150, screenHeight * 0.28));
  const expandedHeight = Math.max(previewHeight, screenHeight - 124);
  const workTypeJobs = jobs.filter((job) =>
    (job.trade === worker.primaryTrade || worker.secondaryTrades.includes(job.trade))
    && job.id !== activeJob?.id
    && job.id !== queuedJob?.id,
  );
  const workTypeJobKey = workTypeJobs.map((job) => job.id).sort().join('|');
  const [devicePosition, setDevicePosition] = useState<GeoPoint | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [jobPositions, setJobPositions] = useState<Record<string, GeoPoint>>({});
  const [placesLoading, setPlacesLoading] = useState(true);
  const workerPosition = devicePosition;
  const handleWorkerPositionChange = useCallback((position: GeoPoint) => {
    setLocationDenied(false);
    setDevicePosition((previous) => previous && distanceBetweenKm(previous, position) < 0.02 ? previous : position);
  }, []);
  const handleWorkerPositionError = useCallback(() => setLocationDenied(true), []);

  useEffect(() => {
    let active = true;
    if (!isOnline) {
      setPlacesLoading(true);
      return () => { active = false; };
    }
    setPlacesLoading(true);
    const loadPositions = async () => {
      const positions: Record<string, GeoPoint> = {};
      for (const job of workTypeJobs) {
        if (!active) return;
        const place = await geocodePlace(`${job.locationAddress}, ${job.siteName}, Bengaluru, India`);
        if (place) positions[job.id] = { lat: place.lat, lon: place.lon };
      }
      if (active) {
        setJobPositions((current) => ({ ...current, ...positions }));
        setPlacesLoading(false);
      }
    };
    void loadPositions();
    return () => { active = false; };
  }, [workTypeJobKey, isOnline]);

  const availableJobs = workerPosition
    ? workTypeJobs.flatMap((job) => {
      const position = jobPositions[job.id];
      if (!position) return [];
      const distance = distanceBetweenKm(workerPosition, position);
      return distance <= 5 ? [{ ...job, distanceKm: Math.round(distance * 10) / 10 }] : [];
    }).sort((a, b) => a.distanceKm - b.distanceKm)
    : [];
  const nearbyRecommendation = availableJobs[0] || null;

  useEffect(() => () => {
    flowTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    const element = screenRef.current;
    if (!element) return;
    const resizeObserver = new ResizeObserver(([entry]) => {
      setScreenHeight(entry.contentRect.height);
    });
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (onlineStage !== 'searching' && onlineStage !== 'preview' && onlineStage !== 'expanded') return;
    const targetHeight = onlineStage === 'searching' ? searchHeight : onlineStage === 'expanded' ? expandedHeight : previewHeight;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animation = animate(panelHeight, targetHeight, {
      duration: reduceMotion ? 0.01 : 0.3,
      ease: [0.42, 0, 0.58, 1],
    });
    return () => animation.stop();
  }, [onlineStage, panelHeight, searchHeight, previewHeight, expandedHeight]);

  const handleGoClick = () => {
    if (!isOnline && !worker.isKycVerified) {
      onOpenAadhaarModal?.();
      return;
    }

    flowTimers.current.forEach((timer) => window.clearTimeout(timer));
    flowTimers.current = [];

    if (isOnline) {
      onExpandedChange?.(false);
      onExpansionProgress?.(0, true);
      // Figma first animates to its short offline transition frame, waits
      // 250ms, then returns to the offline map with a 300ms Smart Animate.
      setOnlineStage('offlineTransition');
      flowTimers.current.push(window.setTimeout(() => {
        onToggleOnline();
        setOnlineStage('offline');
        panelHeight.set(searchHeight);
      }, 550));
      return;
    }

    // First Smart Animate the GO control. Figma delays its online state
    // until that transition finishes, then holds the search card for 2s.
    onExpandedChange?.(false);
    onExpansionProgress?.(0, true);
    setOnlineStage('transitioning');
    flowTimers.current.push(window.setTimeout(() => {
      onToggleOnline();
      setOnlineStage('searching');
      flowTimers.current.push(window.setTimeout(() => setOnlineStage('preview'), 2000));
    }, 550));
  };

  const startPanelDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { y: event.clientY, height: panelHeight.get() };
  };

  const movePanelDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current) return;
    const nextHeight = Math.max(previewHeight, Math.min(expandedHeight, dragStart.current.height + dragStart.current.y - event.clientY));
    panelHeight.set(nextHeight);
    onExpansionProgress?.((nextHeight - previewHeight) / Math.max(1, expandedHeight - previewHeight));
  };

  const finishPanelDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current) return;
    const delta = event.clientY - dragStart.current.y;
    const shouldExpand = delta < -45 || (Math.abs(delta) <= 45 && onlineStage === 'expanded');
    const nextStage: OnlineStage = shouldExpand ? 'expanded' : 'preview';
    dragStart.current = null;
    setOnlineStage(nextStage);
    onExpandedChange?.(shouldExpand);
    onExpansionProgress?.(shouldExpand ? 1 : 0, true);
    if (nextStage === onlineStage) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      animate(panelHeight, shouldExpand ? expandedHeight : previewHeight, {
        duration: reduceMotion ? 0.01 : 0.3,
        ease: [0.42, 0, 0.58, 1],
      });
    }
  };

  return (
    <div ref={screenRef} className="relative isolate flex-1 min-h-0 w-full overflow-hidden bg-[#f1f1f1] select-none font-sans">
      <div className="absolute inset-0">
        <UberMapView
          language={language}
          isOnline={isOnline}
          activeJob={null}
          incomingJob={null}
          suggestedJob={nearbyRecommendation}
          workerLocation={worker.currentLocation}
          onWorkerPositionChange={handleWorkerPositionChange}
          onWorkerPositionError={handleWorkerPositionError}
        />
      </div>

      {(onlineStage === 'searching' || onlineStage === 'preview' || onlineStage === 'expanded') && (
        <motion.section
          aria-live={onlineStage === 'searching' ? 'polite' : undefined}
          initial={{ opacity: 0, y: 260 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.01 : 0.3, ease: [0.42, 0, 0.58, 1] }}
          style={{ height: panelHeight }}
          className="absolute z-20 bottom-[calc(77px+env(safe-area-inset-bottom))] left-1/2 w-[calc(100%-24px)] max-w-[420px] -translate-x-1/2 overflow-y-auto overscroll-contain rounded-[20px] bg-[#f1f1f1] px-3.5 sm:px-[15px] pt-[15px] shadow-[0px_2px_20px_rgba(0,0,0,0.11)] scrollbar-none lg:bottom-6 lg:left-auto lg:right-6 lg:max-h-[calc(100%-3rem)] lg:w-[min(420px,40vw)] lg:max-w-none lg:translate-x-0"
        >
          {(onlineStage === 'preview' || onlineStage === 'expanded') && <button
            type="button"
            aria-label={onlineStage === 'expanded' ? 'Collapse work list' : 'Expand work list'}
            onPointerDown={startPanelDrag}
            onPointerMove={movePanelDrag}
            onPointerUp={finishPanelDrag}
            onPointerCancel={finishPanelDrag}
            className="absolute left-1/2 top-[3px] z-10 h-[10px] w-[52px] -translate-x-1/2 cursor-grab touch-none rounded-full active:cursor-grabbing"
          >
            <span className="mx-auto mt-[3px] block h-[2px] w-[22px] rounded-full bg-[#b5b5b5]" />
          </button>}
          {onlineStage === 'searching' && (
            <>
              <div className="absolute left-[25px] top-[25px] flex items-center gap-1.5">
                <h2 className="text-[22px] leading-none font-bold text-black">
                  {uiText(language, 'searchingWork')}
                </h2>
                <span className="inline-flex items-center gap-[2px]" aria-label="Searching">
                  {[0, 1, 2].map((dot) => (
                    <motion.i
                      key={dot}
                      className="block h-[5px] w-[5px] rounded-full bg-[#b5b5b5]"
                      animate={{ opacity: [0.35, 1, 0.35], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 0.6, delay: dot * 0.1, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  ))}
                </span>
              </div>
            </>
          )}
          {(onlineStage === 'preview' || onlineStage === 'expanded') && (
          <motion.div key="available-work-list" aria-label={uiText(language, 'availableWork')} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.01 : 0.3, ease: [0.42, 0, 0.58, 1] }} className="pb-[82px]">
          <div className="mx-auto flex w-full max-w-[390px] md:max-w-xl flex-col gap-[10px]">
            <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm">
              <span className="text-xs font-black text-slate-900">{nearbyCopy.title}</span>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-800">{nearbyCopy.radius} · {availableJobs.length}</span>
            </div>
            {availableJobs.length > 0 ? availableJobs.map((job) => {
              const jobTradeName = localizeTradeName(job.trade, language);
              const title = localizeJobTitle(job, language);
              const rateUnit = uiText(language, job.wageType === 'hourly' ? 'hourlyRate' : job.wageType === 'daily' ? 'dailyRate' : 'totalRate');
              const isCurrentActive = activeJob?.id === job.id;
              const isCurrentlyQueued = queuedJob?.id === job.id;
              const queueIsFull = Boolean(activeJob && queuedJob);
              return (
                <motion.article key={job.id} layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }} className="relative min-h-[208px] rounded-[22px] bg-white px-[15px] pt-[15px] pb-[10px] shadow-[0px_2px_20px_rgba(0,0,0,0.11)]">
                  <span className="inline-flex h-[17px] max-w-[calc(100%-125px)] items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-[5px] bg-[rgba(3,192,60,0.22)] px-1 text-[10px] font-semibold leading-none text-[#03c03c]">
                    <CircleCheck className="h-[12px] w-[12px] fill-[#03c03c] text-white" />
                    {jobTradeName}
                  </span>
                  {job.id === nearbyRecommendation?.id && <span className="ml-1 rounded-md bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-800">{nearbyCopy.recommended}</span>}
                  <span className="ml-2 inline-flex max-w-[115px] shrink-0 rounded-[15px] bg-[rgba(45,89,240,0.16)] px-2 py-2.5 align-top text-[11px] font-bold leading-none text-[#2d59f0] sm:px-[9px] sm:text-[12px]">
                    ₹{job.agreedAmount}{rateUnit}
                  </span>
                  <h3 className="mt-[10px] min-h-[38px] w-full pr-1 text-[16px] font-bold leading-[19px] text-black line-clamp-2">{title}</h3>
                  <div className="mt-[9px] flex min-w-0 items-center gap-1 text-[10px] leading-[14px] text-[#b5b5b5]">
                    <MapPin className="h-[13px] w-[13px] shrink-0 fill-[#b5b5b5] text-[#b5b5b5]" />
                    <span className="truncate">{localizePlaceText(job.siteName, language)}</span>
                  </div>
                  <div className="mt-[10px] flex flex-wrap items-center gap-[6px] text-[10px] font-semibold leading-[18px] text-[#b5b5b5] sm:gap-[10px]">
                    <span className="inline-flex h-[18px] items-center gap-1 rounded-[5px] bg-[#f1f1f1] px-1.5">
                      <MapPin className="h-3 w-3 fill-[#b5b5b5]" />{job.distanceKm} {uiText(language, 'kmUnit')}
                    </span>
                    <span className="inline-flex h-[18px] items-center gap-1 rounded-[5px] bg-[#f1f1f1] px-1.5">
                      <Clock3 className="h-3 w-3" />{job.startTime} - {job.endTime}
                    </span>
                  </div>
                  <button
                    disabled={isCurrentActive || isCurrentlyQueued || (queueIsFull && !isCurrentActive && !isCurrentlyQueued)}
                    onClick={() => onAcceptJob(job)}
                    className={`mt-[10px] flex h-[55px] w-full items-center justify-center gap-[10px] rounded-[15px] text-[16px] font-semibold leading-none text-white transition-transform disabled:cursor-not-allowed active:scale-[0.98] ${
                      isCurrentActive ? 'bg-blue-100 text-blue-900' : isCurrentlyQueued ? 'bg-emerald-100 text-emerald-800' : queueIsFull ? 'bg-slate-300' : activeJob ? 'bg-emerald-600' : 'bg-[#2d59f0]'
                    }`}
                  >
                    {isCurrentActive ? <CircleCheck className="h-5 w-5" /> : isCurrentlyQueued ? <Check className="h-5 w-5 stroke-[3]" /> : activeJob ? <ListPlus className="h-5 w-5" /> : <CircleCheck className="h-5 w-5 fill-white text-[#2d59f0]" />}
                    {isCurrentActive
                      ? uiText(language, 'activeJob')
                      : isCurrentlyQueued
                        ? uiText(language, 'queuedAsNext')
                        : queueIsFull
                          ? uiText(language, 'queueFullFinish')
                          : activeJob
                            ? uiText(language, 'queueNext')
                            : uiText(language, 'acceptJob')}
                  </button>
                </motion.article>
              );
            }) : !workerPosition || placesLoading ? (
              <div className="rounded-[22px] bg-white px-5 py-7 text-center shadow-[0px_2px_20px_rgba(0,0,0,0.11)]">
                <h2 className="text-[16px] font-bold text-black">{!workerPosition ? locationDenied ? nearbyCopy.locationDenied : nearbyCopy.findingLocation : nearbyCopy.findingJobs}</h2>
                <p className="mt-1 text-[12px] text-[#777]">{nearbyCopy.permission}</p>
              </div>
            ) : (
              <div className="rounded-[22px] bg-white px-5 py-7 text-center shadow-[0px_2px_20px_rgba(0,0,0,0.11)]">
                <h2 className="text-[16px] font-bold text-black">{nearbyCopy.empty}</h2>
              </div>
            )}
          </div>
          </motion.div>
          )}
        </motion.section>
      )}

      {onlineStage === 'offline' && <motion.button
          type="button"
          onClick={handleGoClick}
          className="absolute z-20 bottom-[calc(76px+env(safe-area-inset-bottom))] left-1/2 flex h-[60px] w-[110px] -translate-x-1/2 items-center justify-center rounded-[22px] bg-[#2d59f0]/40 shadow-[0_2px_10px_rgba(45,89,240,0.18)] transition-transform active:scale-95 lg:bottom-6"
          aria-label={t.swipeToOnline}
        >
          <span className="flex h-[50px] w-[100px] flex-col items-center justify-center rounded-[20px] bg-[#2d59f0] text-[#f1f1f1]">
            <span className="text-[24px] leading-[24px] font-semibold">GO</span>
            <span className="text-[12px] leading-[12px] font-medium text-white/70">{uiText(language, 'online')}</span>
          </span>
      </motion.button>}

      {(onlineStage === 'searching' || onlineStage === 'preview' || onlineStage === 'expanded') && <motion.button
          type="button"
          onClick={handleGoClick}
          className="absolute z-30 bottom-[calc(145px+env(safe-area-inset-bottom))] left-1/2 flex h-[50px] w-[100px] -translate-x-1/2 flex-col items-center justify-center rounded-[20px] bg-white text-black shadow-[0px_2px_10px_rgba(0,0,0,0.11)] transition-transform active:scale-95 lg:bottom-28"
          aria-label={t.swipeToOffline}
        >
          <span className="text-[24px] leading-[24px] font-semibold">GO</span>
          <span className="text-[12px] leading-[12px] font-medium text-[#b5b5b5]">{uiText(language, 'offline')}</span>
      </motion.button>}
    </div>
  );
};

