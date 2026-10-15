import React, { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'motion/react';
import { Job, Language, WorkerProfile } from '../../types';
import { TRADES } from '../../data/mockData';
import { getTranslation } from '../../utils/i18n';
import { uiText } from '../../utils/uiText';
import { speakText } from '../../utils/speech';
import { UberMapView } from '../UberMapView';
import { MapPin, Clock3, CircleCheck } from 'lucide-react';

interface DutyScreenProps {
  isOnline: boolean;
  onToggleOnline: () => void;
  worker: WorkerProfile;
  language: Language;
  jobs: Job[];
  onAcceptJob: (job: Job) => void;
  onExpandedChange?: (expanded: boolean) => void;
  onExpansionProgress?: (progress: number, settle?: boolean) => void;
  onSelectJob: (job: Job) => void;
  onSimulateIncomingJob: () => void;
  onOpenEarnings: () => void;
  todayEarnings: number;
  onOpenAadhaarModal?: () => void;
  suggestedJob?: Job | null;
}

type OnlineStage = 'offline' | 'transitioning' | 'searching' | 'preview' | 'expanded' | 'offlineTransition';

export const DutyScreen: React.FC<DutyScreenProps> = ({
  isOnline,
  onToggleOnline,
  worker,
  language,
  jobs,
  onAcceptJob,
  onExpandedChange,
  onExpansionProgress,
  onOpenAadhaarModal,
}) => {
  const t = getTranslation(language);
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
  const trade = TRADES.find((item) => item.id === worker.primaryTrade) || TRADES[0];
  const tradeName = language === 'hi' ? trade.nameHi : trade.nameEn;
  const availableJobs = jobs.filter((job) =>
    job.trade === worker.primaryTrade || worker.secondaryTrades.includes(job.trade),
  );

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
      speakText(
        language === 'hi'
          ? 'कृपया पहले आधार कार्ड सत्यापित करें।'
          : 'Please verify your Aadhaar card first to go online.',
        language,
      );
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
          suggestedJob={null}
          workerTradeName={tradeName}
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
            {availableJobs.length > 0 ? availableJobs.map((job) => {
              const jobTrade = TRADES.find((item) => item.id === job.trade);
              const jobTradeName = language === 'hi' ? jobTrade?.nameHi : jobTrade?.nameEn;
              const title = language === 'hi' ? job.titleHi : job.title;
              const rateUnit = uiText(language, job.wageType === 'hourly' ? 'hourlyRate' : job.wageType === 'daily' ? 'dailyRate' : 'totalRate');
              return (
                <motion.article key={job.id} layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }} className="relative min-h-[208px] rounded-[22px] bg-white px-[15px] pt-[15px] pb-[10px] shadow-[0px_2px_20px_rgba(0,0,0,0.11)]">
                  <span className="inline-flex h-[17px] max-w-[calc(100%-125px)] items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-[5px] bg-[rgba(3,192,60,0.22)] px-1 text-[10px] font-semibold leading-none text-[#03c03c]">
                    <CircleCheck className="h-[12px] w-[12px] fill-[#03c03c] text-white" />
                    {jobTradeName}
                  </span>
                  <span className="ml-2 inline-flex max-w-[115px] shrink-0 rounded-[15px] bg-[rgba(45,89,240,0.16)] px-2 py-2.5 align-top text-[11px] font-bold leading-none text-[#2d59f0] sm:px-[9px] sm:text-[12px]">
                    ₹{job.agreedAmount}{rateUnit}
                  </span>
                  <h3 className="mt-[10px] min-h-[38px] w-full pr-1 text-[16px] font-bold leading-[19px] text-black line-clamp-2">{title}</h3>
                  <div className="mt-[9px] flex min-w-0 items-center gap-1 text-[10px] leading-[14px] text-[#b5b5b5]">
                    <MapPin className="h-[13px] w-[13px] shrink-0 fill-[#b5b5b5] text-[#b5b5b5]" />
                    <span className="truncate">{job.siteName}</span>
                  </div>
                  <div className="mt-[10px] flex flex-wrap items-center gap-[6px] text-[10px] font-semibold leading-[18px] text-[#b5b5b5] sm:gap-[10px]">
                    <span className="inline-flex h-[18px] items-center gap-1 rounded-[5px] bg-[#f1f1f1] px-1.5">
                      <MapPin className="h-3 w-3 fill-[#b5b5b5]" />{job.distanceKm} km
                    </span>
                    <span className="inline-flex h-[18px] items-center gap-1 rounded-[5px] bg-[#f1f1f1] px-1.5">
                      <Clock3 className="h-3 w-3" />{job.startTime} - {job.endTime}
                    </span>
                  </div>
                  <button
                    onClick={() => onAcceptJob(job)}
                    className="mt-[10px] flex h-[55px] w-full items-center justify-center gap-[10px] rounded-[15px] bg-[#2d59f0] text-[18px] font-semibold leading-none text-white transition-transform active:scale-[0.98]"
                  >
                    <CircleCheck className="h-6 w-6 fill-white text-[#2d59f0]" />
                    {uiText(language, 'acceptJob')}
                  </button>
                </motion.article>
              );
            }) : (
              <div className="rounded-[22px] bg-white px-5 py-7 text-center shadow-[0px_2px_20px_rgba(0,0,0,0.11)]">
                <h2 className="text-[16px] font-bold text-black">{uiText(language, 'noWork')}</h2>
                <p className="mt-1 text-[12px] text-[#b5b5b5]">{uiText(language, 'noWorkSub')}</p>
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

