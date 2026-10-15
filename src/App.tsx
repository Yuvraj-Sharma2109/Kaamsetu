/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react';
import { ArrowLeft, Settings, Volume2, VolumeX } from 'lucide-react';
import { MobileFrame } from './components/MobileFrame';
import { TopHeader } from './components/TopHeader';
import { BottomNav, TabType } from './components/BottomNav';
import { DutyScreen } from './components/screens/DutyScreen';
import { JobsFeedScreen } from './components/screens/JobsFeedScreen';
import { ActiveJobScreen } from './components/screens/ActiveJobScreen';
import { EarningsScreen } from './components/screens/EarningsScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { LoginScreen } from './components/screens/LoginScreen';
import { OnboardingScreen } from './components/screens/OnboardingScreen';
import { IncomingJobModal } from './components/IncomingJobModal';
import { JobDetailsModal } from './components/JobDetailsModal';
import { SosModal } from './components/SosModal';
import { AadhaarVerifyModal } from './components/AadhaarVerifyModal';
import { EShramVerifyModal } from './components/EShramVerifyModal';

import { 
  Job, 
  Language, 
  ShiftState, 
  TradeCategory, 
  WorkerProfile, 
  Transaction 
} from './types';
import { 
  INITIAL_WORKER, 
  MOCK_JOBS, 
  INITIAL_TRANSACTIONS, 
  TRADES 
} from './data/mockData';
import { speakText, stopSpeech } from './utils/speech';

const DEMO_ACCOUNTS_KEY = 'kaamsetu_demo_accounts';
const DEMO_SESSION_KEY = 'kaamsetu_demo_session';
type DemoAccount = {
  contact: string; worker: WorkerProfile; walletBalance?: number; transactions?: Transaction[];
  todayEarnings?: number; monthlyEarnings?: number; daysWorked?: number; jobs?: Job[];
  shift?: ShiftState; isOnline?: boolean;
};
type DemoSession = {
  contact: string; onboarded: boolean; worker: WorkerProfile; language: Language;
  currentTab: TabType; isOnline: boolean; jobs: Job[]; walletBalance: number;
  transactions: Transaction[]; todayEarnings: number; monthlyEarnings: number; daysWorked: number; shift: ShiftState;
};

const readDemoAccounts = (): DemoAccount[] => {
  try { return JSON.parse(localStorage.getItem(DEMO_ACCOUNTS_KEY) || '[]') as DemoAccount[]; }
  catch { return []; }
};
const readDemoSession = (): DemoSession | null => {
  try { return JSON.parse(localStorage.getItem(DEMO_SESSION_KEY) || 'null') as DemoSession | null; }
  catch { return null; }
};

export default function App() {
  const [savedSession] = useState<DemoSession | null>(readDemoSession);
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1100);
    return () => window.clearTimeout(timer);
  }, []);

  // Auth & Onboarding Flow states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => Boolean(savedSession));
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => Boolean(savedSession?.onboarded));
  const [tempUserContact, setTempUserContact] = useState<string>(() => savedSession?.contact || '');

  // Core app states
  const [isOnline, setIsOnline] = useState<boolean>(savedSession?.isOnline ?? false);
  const [language, setLanguage] = useState<Language>(savedSession?.language || 'en');
  const [currentTab, setCurrentTab] = useState<TabType>(savedSession?.currentTab || 'radar');
  const [profileReturnTab, setProfileReturnTab] = useState<TabType>('radar');
  const [isWorkListExpanded, setIsWorkListExpanded] = useState(false);
  const workListProgress = useMotionValue(0);
  const headerY = useTransform(workListProgress, [0, 1], [0, -132]);
  const headerOpacity = useTransform(workListProgress, [0, 0.78, 1], [1, 1, 0]);
  const [worker, setWorker] = useState<WorkerProfile>(savedSession?.worker || INITIAL_WORKER);
  const [jobs, setJobs] = useState<Job[]>(savedSession?.jobs || MOCK_JOBS);
  const [walletBalance, setWalletBalance] = useState<number>(savedSession?.walletBalance ?? 3450);
  const [transactions, setTransactions] = useState<Transaction[]>(savedSession?.transactions || INITIAL_TRANSACTIONS);
  const [todayEarnings, setTodayEarnings] = useState<number>(savedSession?.todayEarnings ?? 950);
  const [monthlyEarnings, setMonthlyEarnings] = useState<number>(savedSession?.monthlyEarnings ?? (savedSession?.worker.totalJobsCompleted === 0 ? 0 : 24800));
  const [daysWorked, setDaysWorked] = useState<number>(savedSession?.daysWorked ?? (savedSession?.worker.totalJobsCompleted === 0 ? 0 : 26));

  // Active Shift State with Back-to-Back Work Queue
  const [shift, setShift] = useState<ShiftState>(savedSession?.shift || {
    isActive: false,
    job: null,
    status: 'assigned',
    punchInTime: null,
    punchInPhotoUrl: null,
    punchOutTime: null,
    queuedJob: null,
  });

  useEffect(() => {
    if (!isLoggedIn || !hasCompletedOnboarding) return;
    const session: DemoSession = { contact: tempUserContact, onboarded: true, worker, language, currentTab, isOnline, jobs, walletBalance, transactions, todayEarnings, monthlyEarnings, daysWorked, shift };
    try {
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
      const accounts = readDemoAccounts();
      localStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(accounts.map((account) => account.contact === tempUserContact ? {
        ...account, worker, walletBalance, transactions, todayEarnings, monthlyEarnings, daysWorked, jobs, shift, isOnline,
      } : account)));
    } catch { /* storage may be unavailable */ }
  }, [isLoggedIn, hasCompletedOnboarding, tempUserContact, worker, language, currentTab, isOnline, jobs, walletBalance, transactions, todayEarnings, monthlyEarnings, daysWorked, shift]);

  // Modals & Overlays
  const [incomingJob, setIncomingJob] = useState<Job | null>(null);
  const [inspectingJob, setInspectingJob] = useState<Job | null>(null);
  const [showSosModal, setShowSosModal] = useState<boolean>(false);
  const [audioActive, setAudioActive] = useState<boolean>(() => localStorage.getItem('kaamsetu_audio_enabled') !== 'false');
  const [showAadhaarModal, setShowAadhaarModal] = useState<boolean>(false);
  const [showEShramModal, setShowEShramModal] = useState(false);
  const [profileSettingsOpenRequest, setProfileSettingsOpenRequest] = useState(0);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);

  const handleToggleAudio = () => {
    const next = !audioActive;
    if (!next) stopSpeech();
    setAudioActive(next);
    try { localStorage.setItem('kaamsetu_audio_enabled', String(next)); } catch {}
  };

  const handleVerifyAadhaarSuccess = () => {
    setShowAadhaarModal(false);
    setWorker((prev) => ({ ...prev, isKycVerified: true }));
  };

  const handleVerifyEShramSuccess = () => {
    setShowEShramModal(false);
    setWorker((prev) => ({ ...prev, isEShramVerified: true }));
  };

  const openNextRequiredVerification = () => {
    if (!worker.isKycVerified) {
      setShowAadhaarModal(true);
      return false;
    }
    if (!worker.isEShramVerified) {
      setShowEShramModal(true);
      return false;
    }
    return true;
  };

  // Handle Online / Offline toggle
  const handleToggleOnline = () => {
    const nextState = !isOnline;
    if (nextState && !openNextRequiredVerification()) return;
    setIsOnline(nextState);

    if (audioActive) {
      if (nextState) {
        const msg = language === 'hi'
          ? 'आप ड्यूटी पर ऑनलाइन हैं। रडार चालू है।'
          : 'You are online for duty. Radar is searching for nearby jobs.';
        speakText(msg, language);
      } else {
        const msg = language === 'hi'
          ? 'ड्यूटी बंद कर दी गई है। आप ऑफलाइन हैं।'
          : 'Duty turned off. You are now offline.';
        speakText(msg, language);
      }
    }
  };

  // Trigger simulated job dispatch manually
  const handleTriggerSimulatedJob = () => {
    const matchedJob = jobs.find((j) => j.trade === worker.primaryTrade && j.id !== shift.job?.id) || jobs[0] || MOCK_JOBS[0];
    setIncomingJob(matchedJob);

    if (audioActive) {
      const alertVoice = `New job match! ${matchedJob.title}. Agreed task pay is ₹${matchedJob.agreedAmount}.`;
            speakText(alertVoice, language);
    }
  };

  // Handle accepting a job:
  // If worker has no active job -> activates shift
  // If worker already has active job -> queues for next!
  const handleAcceptJob = (acceptedJob: Job) => {
    if (!openNextRequiredVerification()) return;
    if (!shift.isActive && !isOnline) return;

    setIncomingJob(null);
    setInspectingJob(null);

    if (shift.isActive && shift.job) {
      // Worker already has an active job -> Queue it for next!
      if (!shift.queuedJob) {
        handleQueueJob(acceptedJob);
      }
      return;
    }

    // No active job -> start active shift
    setShift({
      isActive: true,
      job: acceptedJob,
      status: 'traveling',
      punchInTime: null,
      punchInPhotoUrl: null,
      punchOutTime: null,
      queuedJob: null,
    });

    setCurrentTab('active');

    if (audioActive) {
      const msg = language === 'hi'
        ? `काम स्वीकार कर लिया गया है। ${acceptedJob.siteName} के लिए रवाना हों।`
        : `Job accepted. Head towards ${acceptedJob.siteName}.`;
      speakText(msg, language);
    }
  };

  // Handle Queueing next work (Back-to-Back Work Queue)
  const handleQueueJob = (jobToQueue: Job) => {
    if (!openNextRequiredVerification()) return;
    setIncomingJob(null);
    setInspectingJob(null);

    setShift((prev) => ({
      ...prev,
      queuedJob: jobToQueue,
    }));

    if (audioActive) {
      const msg = language === 'hi'
        ? 'अगला काम कतार में जुड़ गया है। वर्तमान काम पूरा होने के बाद यह शुरू होगा।'
        : 'Next job added to your queue. It will activate once your current shift finishes.';
      speakText(msg, language);
    }
  };

  // Cancel queued job
  const handleCancelQueuedJob = () => {
    setShift((prev) => ({
      ...prev,
      queuedJob: null,
    }));
    if (audioActive) {
      const msg = language === 'hi'
        ? 'कतार का काम हटा दिया गया है।'
        : 'Queued work removed.';
      speakText(msg, language);
    }
  };

  // Confirm arrival before requesting the contractor's site OTP.
  const handleArriveAtSite = () => {
    if (!shift.job) return;
    setShift((prev) => ({ ...prev, status: 'arrived' }));
    setWorker((prev) => ({
      ...prev,
      currentLocation: `${shift.job!.siteName}, ${shift.job!.landmark}`,
    }));
  };

  // Punch in after verifying the site OTP.
  const handlePunchIn = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setShift((prev) => ({
      ...prev,
      status: 'punched_in',
      punchInTime: timeStr,
      punchInPhotoUrl: null,
    }));

    if (audioActive) {
      const msg = `Punch in verified. Agreed task pay is ₹${shift.job?.agreedAmount ?? 0}.`;
      speakText(msg, language);
    }
  };

  // Punch out and settle payout
  const handlePunchOut = () => {
    if (!shift.job) return;
    const finalEarned = shift.job.agreedAmount;
    const nextJob = shift.queuedJob;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Update wallet and today's earnings
    if (finalEarned > 0) {
      setWalletBalance((prev) => prev + finalEarned);
      setTodayEarnings((prev) => prev + finalEarned);
      setMonthlyEarnings((prev) => prev + finalEarned);
      setDaysWorked((prev) => prev + 1);
      setWorker((prev) => ({ ...prev, totalJobsCompleted: prev.totalJobsCompleted + 1 }));
    }

    // Add transaction record
    const newTx: Transaction = {
      id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      date: 'Today',
      time: timeStr,
      type: 'credit',
      amount: finalEarned,
      title: `${shift.job.title} - Task payout`,
      titleHi: `${shift.job.titleHi} - दिहाड़ी भुगतान`,
      referenceId: `REF-${Math.floor(1000 + Math.random() * 9000)}-ESCROW-SETTLED`,
      status: 'settled',
      paymentMode: 'Direct Escrow Transfer',
    };

    if (finalEarned > 0) setTransactions((prev) => [newTx, ...prev]);

    // Promote queued work immediately after settling the completed shift.
    setShift(() => ({
      isActive: Boolean(nextJob),
      job: nextJob || null,
      status: nextJob ? 'traveling' : 'completed',
      punchInTime: null,
      punchInPhotoUrl: null,
      punchOutTime: timeStr,
      queuedJob: null,
    }));

    setCurrentTab(nextJob ? 'active' : 'passbook');

    if (audioActive) {
      const msg = `Task completed. Agreed payout is ${String.fromCharCode(8377)}${finalEarned}.`;
      speakText(msg, language);
    }
    if (nextJob && audioActive) {
      const nextMsg = language === 'hi'
        ? `अगला काम शुरू हो गया। ${nextJob.siteName} के लिए रवाना हों।`
        : `Your next job is ready. Head towards ${nextJob.siteName}.`;
      speakText(nextMsg, language);
    }
  };

  // Handle Instant Wallet Withdrawal
  const handleWithdraw = (amount: number, method: string) => {
    if (amount <= 0 || amount > walletBalance) return;
    setWalletBalance((prev) => prev - amount);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newTx: Transaction = {
      id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      date: 'Today',
      time: timeStr,
      type: 'debit',
      amount,
      title: `Withdrawn to ${method.toUpperCase()} (${worker.name})`,
      titleHi: `बैंक खाते में निकासी (${worker.name})`,
      referenceId: `UPI-WD-${Math.floor(1000 + Math.random() * 9000)}-IMPS`,
      status: 'settled',
      paymentMode: 'Instant IMPS to Bank',
    };

    setTransactions((prev) => [newTx, ...prev]);
  };

  // Update primary trade from profile
  const handleUpdateTrade = (newTrade: TradeCategory) => {
    setWorker((prev) => prev.secondaryTrades.includes(newTrade)
      ? prev
      : { ...prev, secondaryTrades: [...prev.secondaryTrades, newTrade] });
    if (audioActive) {
      const tr = TRADES.find((t) => t.id === newTrade);
      const name = language === 'hi' ? tr?.nameHi : tr?.nameEn;
      speakText(
        language === 'hi' ? `आपका काम बदलकर ${name} कर दिया गया है।` : `Work type updated to ${tr?.nameEn}.`,
        language
      );
    }
  };

  // Login handler
  const handleLoginSuccess = (
    method: 'phone' | 'google' | 'facebook', 
    contact?: string, 
    isNewUser: boolean = false
  ): boolean => {
    const resolvedContact = contact || (method === 'phone' ? '+91 98765 43210' : `${method}.user@kaamsetu.in`);
    const accountKey = (value: string) => value.includes('@') ? value.trim().toLowerCase() : value.replace(/\D/g, '').slice(-10);
    const accounts = readDemoAccounts();
    const existingAccount = accounts.find((account) => accountKey(account.contact) === accountKey(resolvedContact));
    if (isNewUser ? Boolean(existingAccount) : !existingAccount) return false;

    setIsLoggedIn(true);
    setTempUserContact(resolvedContact);

    const isExistingAccount = !isNewUser;

    if (isExistingAccount) {
      setWorker(existingAccount!.worker);
      const isFirstTimeWorker = existingAccount!.worker.totalJobsCompleted === 0;
      setWalletBalance(existingAccount!.walletBalance ?? (isFirstTimeWorker ? 0 : 3450));
      setTransactions(existingAccount!.transactions ?? (isFirstTimeWorker ? [] : INITIAL_TRANSACTIONS));
      setTodayEarnings(existingAccount!.todayEarnings ?? (isFirstTimeWorker ? 0 : 950));
      setMonthlyEarnings(existingAccount!.monthlyEarnings ?? (isFirstTimeWorker ? 0 : 24800));
      setDaysWorked(existingAccount!.daysWorked ?? (isFirstTimeWorker ? 0 : 26));
      if (existingAccount!.jobs) setJobs(existingAccount!.jobs);
      if (existingAccount!.shift) setShift(existingAccount!.shift);
      setIsOnline(existingAccount!.isOnline ?? false);
      setHasCompletedOnboarding(true);
      setCurrentTab('radar');
      if (audioActive) {
        speakText(
          language === 'hi' ? 'लॉगिन सफल। कामसेतु में आपका स्वागत है।' : 'Login successful. Welcome back to KaamSetu.',
          language
        );
      }
    } else {
      setWorker({
        ...INITIAL_WORKER,
        id: `WRK-${Math.floor(1000 + Math.random() * 9000)}`,
        phone: resolvedContact,
        secondaryTrades: [],
        rating: 0,
        totalJobsCompleted: 0,
        isKycVerified: false,
        isEShramVerified: false,
      });
      setWalletBalance(0);
      setTransactions([]);
      setTodayEarnings(0);
      setMonthlyEarnings(0);
      setDaysWorked(0);
      setIsOnline(false);
      setShift({ isActive: false, job: null, status: 'assigned', punchInTime: null, punchInPhotoUrl: null, punchOutTime: null, queuedJob: null });
      setHasCompletedOnboarding(false);
      if (audioActive) {
        speakText(
          language === 'hi' ? 'नया खाता दर्ज हुआ। कृपया पहली बार अपनी प्रोफाइल तैयार करें।' : 'Registration successful. Please complete your one-time profile setup.',
          language
        );
      }
    }
    return true;
  };

  // 1. FLOW STAGE: NOT LOGGED IN -> SHOW LOGIN SCREEN
  if (showSplash) {
    return (
      <MobileFrame>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
          <div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-blue-500 text-3xl font-black shadow-2xl shadow-blue-500/30">KS</div>
          <div className="text-center"><h1 className="text-2xl font-black tracking-tight">KaamSetu</h1><p className="mt-1 text-sm text-blue-100">Work made simple. Wages made secure.</p></div>
          <div className="mt-4 h-1 w-24 overflow-hidden rounded-full bg-white/20"><div className="h-full w-1/2 animate-pulse rounded-full bg-blue-400" /></div>
        </div>
      </MobileFrame>
    );
  }

  if (!isLoggedIn) {
    return (
      <MobileFrame
      >
        <LoginScreen
          language={language}
          onLanguageChange={setLanguage}
          onLoginSuccess={handleLoginSuccess}
          audioActive={audioActive}
          onToggleAudio={handleToggleAudio}
        />
      </MobileFrame>
    );
  }

  // 2. FLOW STAGE: LOGGED IN BUT FIRST TIME SIGNUP -> SHOW ONBOARDING SCREEN
  if (!hasCompletedOnboarding) {
    return (
      <MobileFrame
      >
        <OnboardingScreen
          language={language}
          audioActive={audioActive}
          onToggleAudio={handleToggleAudio}
          initialPhone={tempUserContact}
          onBackToLogin={() => {
            setIsLoggedIn(false);
            setHasCompletedOnboarding(false);
          }}
          onComplete={(newProfile) => {
            setWorker((prev) => ({
              ...prev,
              ...newProfile,
            }));
            setHasCompletedOnboarding(true);
            setCurrentTab('radar');

            try {
              const onboarded = JSON.parse(localStorage.getItem('kaamsetu_onboarded_accounts') || '[]') as string[];
              localStorage.setItem('kaamsetu_onboarded_accounts', JSON.stringify(Array.from(new Set([...onboarded, tempUserContact]))));
              const accounts = readDemoAccounts();
              const nextAccounts = [...accounts.filter((account) => account.contact !== tempUserContact), { contact: tempUserContact, worker: { ...worker, ...newProfile } }];
              localStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(nextAccounts));
              localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ contact: tempUserContact, onboarded: true, worker: { ...worker, ...newProfile }, language, currentTab: 'radar', isOnline: false, jobs, walletBalance, transactions, todayEarnings, monthlyEarnings, daysWorked, shift } satisfies DemoSession));
            } catch {}

            if (audioActive) {
              const tr = TRADES.find((t) => t.id === newProfile.primaryTrade);
              const name = language === 'hi' ? tr?.nameHi : tr?.nameEn;
              speakText(
                language === 'hi'
                  ? `प्रोफाइल तैयार है। आप ${name} के लिए काम पा सकते हैं। GO दबाकर ड्यूटी शुरू करें।`
                  : `Profile ready. You are registered as ${tr?.nameEn}. Press GO to start finding work.`,
                language
              );
            }
          }}
        />
      </MobileFrame>
    );
  }

  // 3. MAIN WORKER PORTAL APP
  const suggestedTradeJob = jobs.find((j) => j.trade === worker.primaryTrade && j.id !== shift.job?.id && j.id !== shift.queuedJob?.id) || jobs[0];

  return (
    <MobileFrame
      bottomOverlay={(
        <BottomNav
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'profile') setProfileReturnTab(currentTab);
            setCurrentTab(tab);
            setDesktopMenuOpen(false);
            setIsWorkListExpanded(false);
            workListProgress.set(0);
          }}
          menuOpen={desktopMenuOpen}
          onCloseMenu={() => setDesktopMenuOpen(false)}
          language={language}
          isOnline={isOnline}
          hasActiveJob={shift.isActive}
          availableJobsCount={jobs.filter((j) => j.trade === worker.primaryTrade).length}
        />
      )}
    >
      {/* Top Application Bar */}
      {currentTab === 'profile' ? (
        <div className="absolute inset-x-0 top-3 z-30 mx-auto flex w-[calc(100%-32px)] max-w-[360px] md:max-w-2xl items-center justify-between">
          <button type="button" onClick={() => setCurrentTab(profileReturnTab)} aria-label="Back" className="flex h-[55px] w-[55px] items-center justify-center rounded-[20px] bg-white text-black">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <button type="button" onClick={handleToggleAudio} aria-label={audioActive ? 'Mute audio assistance' : 'Unmute audio assistance'} className="flex h-[55px] w-[55px] items-center justify-center rounded-[20px] bg-white text-blue-700">
            {audioActive ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
          <button type="button" onClick={() => {
            document.getElementById('profile-settings')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setProfileSettingsOpenRequest((request) => request + 1);
          }} aria-label="Profile settings" className="flex h-[55px] w-[55px] items-center justify-center rounded-[20px] bg-white text-black">
            <Settings className="h-6 w-6" />
          </button>
        </div>
      ) : <motion.div
        aria-hidden={currentTab === 'radar' && isWorkListExpanded}
        style={{ y: currentTab === 'radar' ? headerY : 0, opacity: currentTab === 'radar' ? headerOpacity : 1, pointerEvents: currentTab === 'radar' && isWorkListExpanded ? 'none' : 'auto' }}
        className={currentTab === 'radar' ? 'absolute inset-x-0 top-3 z-30' : 'relative z-30'}
      >
      <TopHeader
        worker={worker}
        isOnline={isOnline}
        language={language}
        onLanguageChange={setLanguage}
        audioActive={audioActive}
        onToggleAudio={handleToggleAudio}
        desktopMenuOpen={desktopMenuOpen}
        onToggleDesktopMenu={() => setDesktopMenuOpen((open) => !open)}
        onOpenSosModal={() => setShowSosModal(true)}
        todayEarnings={todayEarnings}
        onOpenProfile={() => {
          setProfileReturnTab(currentTab);
          setCurrentTab('profile');
        }}
      />
      </motion.div>}

      {/* Screen Body Viewport */}
      <main className={`${currentTab === 'radar' ? 'absolute inset-x-0 top-0 bottom-0 z-10 overflow-hidden' : currentTab === 'profile' ? 'absolute inset-x-0 top-[90px] bottom-0 z-10 overflow-hidden' : currentTab === 'active' ? 'absolute inset-x-0 top-[90px] bottom-0 z-10 overflow-x-hidden overflow-y-auto overscroll-contain' : 'relative flex-1 overflow-y-auto'} flex min-h-0 flex-col select-none bg-[#f1f1f1]`}>
        <AnimatePresence mode="wait" initial={false}>
        {currentTab === 'radar' && (
          <motion.div key="radar" className="flex min-h-0 flex-1 flex-col" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }}>
          <DutyScreen
            isOnline={isOnline}
            onToggleOnline={handleToggleOnline}
            worker={worker}
            language={language}
            jobs={jobs}
            onAcceptJob={handleAcceptJob}
            onExpandedChange={setIsWorkListExpanded}
            onExpansionProgress={(progress, settle) => {
              if (settle) {
                const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                animate(workListProgress, progress, { duration: reduceMotion ? 0.01 : 0.3, ease: [0.42, 0, 0.58, 1] });
              } else {
                workListProgress.set(progress);
              }
            }}
            onSelectJob={(job) => setInspectingJob(job)}
            onSimulateIncomingJob={handleTriggerSimulatedJob}
            onOpenEarnings={() => setCurrentTab('passbook')}
            todayEarnings={todayEarnings}
            onOpenAadhaarModal={() => setShowAadhaarModal(true)}
            suggestedJob={suggestedTradeJob}
          />
          </motion.div>
        )}

        {currentTab === 'feed' && (
          <motion.div key="feed" className="flex min-h-0 flex-1 flex-col" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }}>
          <JobsFeedScreen
            jobs={jobs}
            language={language}
            worker={worker}
            isOnline={isOnline}
            activeJob={shift.isActive ? shift.job : null}
            queuedJob={shift.queuedJob || null}
            onSelectJob={(job) => setInspectingJob(job)}
            onAcceptJob={handleAcceptJob}
            onQueueJob={handleQueueJob}
            onOpenAadhaarModal={() => setShowAadhaarModal(true)}
            onOpenEShramModal={() => setShowEShramModal(true)}
          />
          </motion.div>
        )}

        {currentTab === 'active' && (
          <motion.div key="active" className="flex min-h-max flex-none flex-col" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }}>
          <ActiveJobScreen
            shift={shift}
            language={language}
            onPunchIn={handlePunchIn}
            onArriveAtSite={handleArriveAtSite}
            onPunchOut={handlePunchOut}
            onOpenSos={() => setShowSosModal(true)}
            onBrowseJobs={() => setCurrentTab('feed')}
            suggestedNextJob={suggestedTradeJob}
            onQueueJob={handleQueueJob}
            onCancelQueuedJob={handleCancelQueuedJob}
            onLocationUpdate={(newLoc) => setWorker((prev) => ({ ...prev, currentLocation: newLoc }))}
          />
          </motion.div>
        )}

        {currentTab === 'passbook' && (
          <motion.div key="passbook" className="flex min-h-0 flex-1 flex-col" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }}>
          <EarningsScreen
            walletBalance={walletBalance}
            monthlyEarnings={monthlyEarnings}
            daysWorked={daysWorked}
            transactions={transactions}
            language={language}
            worker={worker}
            onWithdraw={handleWithdraw}
          />
          </motion.div>
        )}

        {currentTab === 'profile' && (
          <motion.div key="profile" className="flex min-h-0 flex-1 flex-col" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }}>
          <ProfileScreen
            worker={worker}
            language={language}
            onLanguageChange={setLanguage}
            onAddTrade={handleUpdateTrade}
            onLogout={() => {
              localStorage.removeItem(DEMO_SESSION_KEY);
              setIsLoggedIn(false);
              setIsOnline(false);
              stopSpeech();
            }}
            onClearDemoData={() => {
              localStorage.removeItem(DEMO_SESSION_KEY);
              localStorage.removeItem(DEMO_ACCOUNTS_KEY);
              localStorage.removeItem('kaamsetu_onboarded_accounts');
              setIsLoggedIn(false);
              setHasCompletedOnboarding(false);
              setTempUserContact('');
              setWorker(INITIAL_WORKER);
              setJobs(MOCK_JOBS);
              setWalletBalance(3450);
              setTransactions(INITIAL_TRANSACTIONS);
              setTodayEarnings(950);
              setMonthlyEarnings(24800);
              setDaysWorked(26);
              setShift({ isActive: false, job: null, status: 'assigned', punchInTime: null, punchInPhotoUrl: null, punchOutTime: null, queuedJob: null });
              setIsOnline(false);
              setCurrentTab('radar');
              stopSpeech();
            }}
            onOpenAadhaarModal={() => setShowAadhaarModal(true)}
            onOpenEShramModal={() => setShowEShramModal(true)}
            settingsOpenRequest={profileSettingsOpenRequest}
          />
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Uber Driver Trip Dispatch Alert Modal */}
      {incomingJob && (
        <IncomingJobModal
          job={incomingJob}
          language={language}
          onAccept={handleAcceptJob}
          onDecline={() => setIncomingJob(null)}
          onQueue={handleQueueJob}
          isOnline={isOnline}
          hasActiveJob={shift.isActive && Boolean(shift.job)}
          hasQueuedJob={Boolean(shift.queuedJob)}
          isAadhaarVerified={worker.isKycVerified}
          onOpenAadhaarModal={() => setShowAadhaarModal(true)}
        />
      )}

      {/* Job Details Modal */}
      {inspectingJob && (
        <JobDetailsModal
          job={inspectingJob}
          language={language}
          onClose={() => setInspectingJob(null)}
          onAcceptJob={handleAcceptJob}
          onQueueJob={handleQueueJob}
          isOnline={isOnline}
          hasActiveJob={shift.isActive && Boolean(shift.job)}
          hasQueuedJob={Boolean(shift.queuedJob)}
          isCurrentActive={shift.job?.id === inspectingJob.id}
          isCurrentQueued={shift.queuedJob?.id === inspectingJob.id}
          isAadhaarVerified={worker.isKycVerified}
          onOpenAadhaarModal={() => setShowAadhaarModal(true)}
        />
      )}


      {/* Worker Emergency SOS Modal */}
      {showSosModal && (
        <SosModal
          language={language}
          onClose={() => setShowSosModal(false)}
        />
      )}

      {/* Aadhaar Verification Modal */}
      <AadhaarVerifyModal
        isOpen={showAadhaarModal}
        onClose={() => setShowAadhaarModal(false)}
        onVerifySuccess={handleVerifyAadhaarSuccess}
        language={language}
        workerName={worker.name}
        audioActive={audioActive}
        onToggleAudio={handleToggleAudio}
      />

      <EShramVerifyModal isOpen={showEShramModal} onClose={() => setShowEShramModal(false)} onVerifySuccess={handleVerifyEShramSuccess} audioActive={audioActive} onToggleAudio={handleToggleAudio} />
    </MobileFrame>
  );
}
