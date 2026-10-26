/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react';
import { ArrowLeft, Bot, Settings } from 'lucide-react';
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
import { aiLabel } from './utils/aiLabels';
import { localizeJobTitle, localizePlaceText, localizeTradeName } from './utils/uiText';
import type { AssistantScreenContext } from './components/AiAssistant';
import { FirebaseUserInfo, isFirebaseConfigured, signOutFirebase, watchFirebaseAuth } from './utils/firebaseAuth';

const DEMO_ACCOUNTS_KEY = 'kaamsetu_demo_accounts';
const DEMO_SESSION_KEY = 'kaamsetu_demo_session';
const APP_LANGUAGE_KEY = 'kaamsetu_app_language';
type DemoAccount = {
  contact: string; worker: WorkerProfile; walletBalance?: number; transactions?: Transaction[];
  todayEarnings?: number; monthlyEarnings?: number; daysWorked?: number; jobs?: Job[];
  shift?: ShiftState; isOnline?: boolean;
};
type DemoSession = {
  contact: string; authMethod?: 'phone' | 'google' | 'facebook'; onboarded: boolean; worker: WorkerProfile; language: Language;
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
const readAppLanguage = (): Language => {
  const storedLanguage = localStorage.getItem(APP_LANGUAGE_KEY);
  return storedLanguage === 'hi' || storedLanguage === 'bn' || storedLanguage === 'mr' || storedLanguage === 'te' || storedLanguage === 'en'
    ? storedLanguage
    : 'en';
};

export default function App() {
  const [savedSession] = useState<DemoSession | null>(readDemoSession);
  const [showSplash, setShowSplash] = useState(true);
  const firebaseSessionSeenRef = useRef(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1100);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    void watchFirebaseAuth((user) => {
      if (user) {
        firebaseSessionSeenRef.current = true;
      } else if (firebaseSessionSeenRef.current) {
        firebaseSessionSeenRef.current = false;
        localStorage.removeItem(DEMO_SESSION_KEY);
        setIsLoggedIn(false);
        setAuthMethod(null);
        setHasCompletedOnboarding(false);
        setIsOnline(false);
      }
    }, () => undefined).then((stopWatching) => {
      if (disposed) stopWatching();
      else unsubscribe = stopWatching;
    }).catch(() => undefined);
    return () => { disposed = true; unsubscribe?.(); };
  }, []);

  // Auth & Onboarding Flow states
  // Restore a saved demo session after a reload; social sessions are also persisted in the demo app session.
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => Boolean(savedSession));
  const [authMethod, setAuthMethod] = useState<'phone' | 'google' | 'facebook' | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => Boolean(savedSession?.onboarded));
  const [tempUserContact, setTempUserContact] = useState<string>(() => savedSession?.contact || '');
  const [socialDisplayName, setSocialDisplayName] = useState('');

  // Core app states
  const [isOnline, setIsOnline] = useState<boolean>(savedSession?.isOnline ?? false);
  const [language, setLanguage] = useState<Language>(savedSession?.language || readAppLanguage());
  useEffect(() => {
    try { localStorage.setItem(APP_LANGUAGE_KEY, language); } catch { /* storage may be unavailable */ }
  }, [language]);
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
    const session: DemoSession = { contact: tempUserContact, authMethod: authMethod || undefined, onboarded: true, worker, language, currentTab, isOnline, jobs, walletBalance, transactions, todayEarnings, monthlyEarnings, daysWorked, shift };
    try {
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
      const accounts = readDemoAccounts();
      localStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(accounts.map((account) => account.contact === tempUserContact ? {
        ...account, worker, walletBalance, transactions, todayEarnings, monthlyEarnings, daysWorked, jobs, shift, isOnline,
      } : account)));
    } catch { /* storage may be unavailable */ }
  }, [isLoggedIn, authMethod, hasCompletedOnboarding, tempUserContact, worker, language, currentTab, isOnline, jobs, walletBalance, transactions, todayEarnings, monthlyEarnings, daysWorked, shift]);

  // Modals & Overlays
  const [incomingJob, setIncomingJob] = useState<Job | null>(null);
  const [inspectingJob, setInspectingJob] = useState<Job | null>(null);
  const [showSosModal, setShowSosModal] = useState<boolean>(false);
  // Automatic voice announcements are retired in favor of the app-wide AI helper.
  const audioActive = false;
  const [showAadhaarModal, setShowAadhaarModal] = useState<boolean>(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);

  const handleToggleAudio = () => {
    window.dispatchEvent(new Event('kaamsetu:open-ai-assistant'));
  };

  const handleVerifyAadhaarSuccess = () => {
    setShowAadhaarModal(false);
    setWorker((prev) => ({ ...prev, isKycVerified: true }));
  };

  const openNextRequiredVerification = () => {
    if (worker.isKycVerified) return true;
    setShowAadhaarModal(true);
    return false;
  };

  // Handle Online / Offline toggle
  const handleToggleOnline = () => {
    const nextState = !isOnline;
    if (nextState && !openNextRequiredVerification()) return;
    if (nextState) {
      // Rotate matching offers whenever duty starts, so the first radar preview
      // and the top of the jobs list do not keep presenting the same title.
      setJobs((currentJobs) => {
        const matchesWorkerTrade = (job: Job) =>
          job.trade === worker.primaryTrade || worker.secondaryTrades.includes(job.trade);
        const matchingJobs = currentJobs.filter(matchesWorkerTrade);
        if (matchingJobs.length < 2) return currentJobs;
        const rotatedMatches = [...matchingJobs.slice(1), matchingJobs[0]];
        const matchingIds = new Set(matchingJobs.map((job) => job.id));
        return [...rotatedMatches, ...currentJobs.filter((job) => !matchingIds.has(job.id))];
      });
    }
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
    const matchedJob = jobs.find((job) =>
      (job.trade === worker.primaryTrade || worker.secondaryTrades.includes(job.trade))
      && job.id !== shift.job?.id
      && job.id !== shift.queuedJob?.id,
    ) || jobs[0] || MOCK_JOBS[0];
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
      otpEntryStarted: false,
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
    }
    setWorker((prev) => ({ ...prev, totalJobsCompleted: prev.totalJobsCompleted + 1 }));

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
      otpEntryStarted: false,
      startedFromQueue: Boolean(nextJob),
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
    const resolvedContact = contact || (method === 'phone' ? '+91 9876543210' : `${method}.user@kaamsetu.in`);
    const accountKey = (value: string) => {
      const normalized = value.trim().toLowerCase();
      return normalized.includes('@') || normalized.includes(':') ? normalized : normalized.replace(/\D/g, '').slice(-10);
    };
    const accounts = readDemoAccounts();
    const existingAccount = accounts.find((account) => accountKey(account.contact) === accountKey(resolvedContact));
    if (isNewUser ? Boolean(existingAccount) : !existingAccount) return false;

    setIsLoggedIn(true);
    setAuthMethod(method);
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

  const handleFirebaseAuthSuccess = (method: 'phone' | 'google' | 'facebook', user: FirebaseUserInfo) => {
    // Match by Firebase UID or a phone number already verified and linked to that same Firebase identity.
    // Email is deliberately excluded: an email match alone never opens or merges a profile.
    const accountKey = (value: string) => {
      const normalized = value.trim().toLowerCase();
      return normalized.includes('@') || normalized.startsWith('firebase:') || normalized.includes(':')
        ? normalized
        : normalized.replace(/\D/g, '').slice(-10);
    };
    const verifiedPhone = user.providerData.some(({ providerId }) => providerId === 'phone') ? user.phoneNumber : null;
    const accountKeys = new Set([`firebase:${user.uid}`, ...(verifiedPhone ? [verifiedPhone] : [])].map(accountKey));
    const accounts = readDemoAccounts();
    let existingAccount = accounts.find((account) => accountKeys.has(accountKey(account.contact)));
    const legacyEmailAccount = user.email
      ? accounts.find((account) => account.contact.trim().toLowerCase() === user.email!.trim().toLowerCase())
      : undefined;
    if (!existingAccount && legacyEmailAccount) {
      if (!user.emailVerified || !window.confirm('A saved KaamSetu profile uses this verified email. Link that profile to the Firebase account you just verified?')) return false;
      existingAccount = { ...legacyEmailAccount, contact: `firebase:${user.uid}` };
      try {
        localStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify([...accounts.filter((account) => account !== legacyEmailAccount), existingAccount]));
      } catch {
        return false;
      }
    }
    const contact = existingAccount?.contact || (method === 'phone' && verifiedPhone ? verifiedPhone : `firebase:${user.uid}`);
    const accountExists = Boolean(existingAccount);
    setSocialDisplayName(user.displayName || '');
    if (!handleLoginSuccess(method, contact, !accountExists)) return false;
    setWorker((current) => ({ ...current, phone: verifiedPhone || current.phone, authEmail: user.email || undefined, authPhotoURL: user.photoURL || undefined }));
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
      <MobileFrame language={language} screenContext={{ screen: 'login' }}
      >
        <LoginScreen
          language={language}
          onLanguageChange={setLanguage}
          onLoginSuccess={handleLoginSuccess}
          onFirebaseAuthSuccess={handleFirebaseAuthSuccess}
          audioActive={audioActive}
          onToggleAudio={handleToggleAudio}
        />
      </MobileFrame>
    );
  }

  // 2. FLOW STAGE: LOGGED IN BUT FIRST TIME SIGNUP -> SHOW ONBOARDING SCREEN
  if (!hasCompletedOnboarding) {
    return (
      <MobileFrame language={language} screenContext={{ screen: 'onboarding', aadhaarVerified: worker.isKycVerified }}
      >
        <OnboardingScreen
          language={language}
          audioActive={audioActive}
          onToggleAudio={handleToggleAudio}
          initialPhone={authMethod === 'phone' ? tempUserContact : worker.phone.startsWith('firebase:') ? '' : worker.phone}
          verifiedPhone={authMethod !== 'phone' && !worker.phone.startsWith('firebase:') ? worker.phone : ''}
          initialName={socialDisplayName}
          initialEmail={worker.authEmail || ''}
          initialPhotoURL={worker.authPhotoURL || ''}
          requirePhone={authMethod !== 'phone'}
          onBackToLogin={() => {
            void signOutFirebase().finally(() => {
              setIsLoggedIn(false);
              setAuthMethod(null);
              setHasCompletedOnboarding(false);
            });
          }}
          onComplete={(newProfile) => {
            setWorker((prev) => ({
              ...prev,
              ...newProfile,
              phone: newProfile.phone || (authMethod === 'phone' ? tempUserContact : prev.phone),
            }));
            setHasCompletedOnboarding(true);
            setCurrentTab('radar');

            try {
              const onboarded = JSON.parse(localStorage.getItem('kaamsetu_onboarded_accounts') || '[]') as string[];
              localStorage.setItem('kaamsetu_onboarded_accounts', JSON.stringify(Array.from(new Set([...onboarded, tempUserContact]))));
              const accounts = readDemoAccounts();
              const nextAccounts = [...accounts.filter((account) => account.contact !== tempUserContact), { contact: tempUserContact, worker: { ...worker, ...newProfile } }];
              localStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(nextAccounts));
              localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ contact: tempUserContact, authMethod: authMethod || undefined, onboarded: true, worker: { ...worker, ...newProfile }, language, currentTab: 'radar', isOnline: false, jobs, walletBalance, transactions, todayEarnings, monthlyEarnings, daysWorked, shift } satisfies DemoSession));
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
  const selectedContextJob = incomingJob || inspectingJob;
  const assistantScreenContext: AssistantScreenContext = {
    screen: incomingJob ? 'incomingJob'
      : showAadhaarModal ? 'aadhaar'
        : showSosModal ? 'sos'
          : inspectingJob ? 'jobDetails'
            : currentTab === 'profile' && isProfileSettingsOpen ? 'settings'
              : currentTab === 'radar' ? 'duty'
                : currentTab === 'feed' ? 'jobs'
                  : currentTab === 'active' ? 'active'
                    : currentTab === 'passbook' ? 'earnings'
                      : 'profile',
    isOnline,
    availableJobs: jobs.filter((job) => job.trade === worker.primaryTrade).length,
    suggestedJobTitle: suggestedTradeJob ? localizeJobTitle(suggestedTradeJob, language) : undefined,
    suggestedJobPay: suggestedTradeJob?.agreedAmount,
    suggestedJobSite: suggestedTradeJob ? localizePlaceText(suggestedTradeJob.siteName, language) : undefined,
    activeJobTitle: shift.job ? localizeJobTitle(shift.job, language) : undefined,
    activeJobSite: shift.job ? localizePlaceText(shift.job.siteName, language) : undefined,
    activeJobPay: shift.job?.agreedAmount,
    activeJobStep: shift.status,
    queuedJobTitle: shift.queuedJob ? localizeJobTitle(shift.queuedJob, language) : undefined,
    targetJobTitle: selectedContextJob ? localizeJobTitle(selectedContextJob, language) : undefined,
    targetJobPay: selectedContextJob?.agreedAmount,
    targetJobSite: selectedContextJob ? localizePlaceText(selectedContextJob.siteName, language) : undefined,
    targetJobSchedule: selectedContextJob ? `${selectedContextJob.startTime}–${selectedContextJob.endTime}` : undefined,
    targetJobDistance: selectedContextJob?.distanceKm,
    balance: walletBalance,
    monthlyEarnings,
    aadhaarVerified: worker.isKycVerified,
    workerName: worker.name,
    primaryTrade: localizeTradeName(worker.primaryTrade, language),
    jobsCompleted: worker.totalJobsCompleted,
    rating: worker.rating,
  };

  return (
    <MobileFrame language={language} screenContext={assistantScreenContext}
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
          <button type="button" onClick={() => isProfileSettingsOpen ? setIsProfileSettingsOpen(false) : setCurrentTab(profileReturnTab)} aria-label={isProfileSettingsOpen ? 'Back to profile' : 'Back'} className="flex h-[55px] w-[55px] items-center justify-center rounded-[20px] bg-white text-black">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <button type="button" onClick={handleToggleAudio} aria-label={aiLabel(language).title} title={aiLabel(language).title} className="flex h-[55px] w-[55px] items-center justify-center rounded-[20px] bg-white text-blue-700">
            <Bot className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setIsProfileSettingsOpen(true)} aria-label="Open settings" className="flex h-[55px] w-[55px] items-center justify-center rounded-[20px] bg-white text-black">
            <Settings className="h-6 w-6" />
          </button>
        </div>
      ) : currentTab === 'active' ? null : <motion.div
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
      <main className={`${currentTab === 'radar' ? 'absolute inset-x-0 top-0 bottom-0 z-10 overflow-hidden' : currentTab === 'profile' ? 'absolute inset-x-0 top-[90px] bottom-0 z-10 overflow-hidden' : currentTab === 'active' ? 'absolute inset-x-0 top-0 bottom-0 z-10 overflow-x-hidden overflow-y-auto overscroll-contain' : 'relative flex-1 min-h-0 overflow-y-auto overscroll-contain'} flex min-h-0 flex-col select-none bg-[#f1f1f1]`}>
        <AnimatePresence mode="wait" initial={false}>
        {currentTab === 'radar' && (
          <motion.div key="radar" className="flex min-h-0 flex-1 flex-col" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }}>
          <DutyScreen
            isOnline={isOnline}
            onToggleOnline={handleToggleOnline}
            worker={worker}
            language={language}
            jobs={jobs}
            activeJob={shift.isActive ? shift.job : null}
            queuedJob={shift.queuedJob || null}
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
          />
          </motion.div>
        )}

        {currentTab === 'active' && (
          <motion.div key="active" className="flex min-h-0 flex-1 flex-col" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }}>
          <ActiveJobScreen
            shift={shift}
            worker={worker}
            language={language}
            onEnterOtp={() => setShift((prev) => ({ ...prev, otpEntryStarted: true }))}
            onPunchIn={handlePunchIn}
            onPunchOut={handlePunchOut}
            onOpenSos={() => setShowSosModal(true)}
            onBrowseJobs={() => setCurrentTab('feed')}
            onBackToDuty={() => setCurrentTab('radar')}
            suggestedNextJob={suggestedTradeJob}
            onQueueJob={handleQueueJob}
            onCancelQueuedJob={handleCancelQueuedJob}
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
            onUpdateProfile={(updates) => setWorker((current) => ({ ...current, ...updates }))}
            language={language}
            onLanguageChange={setLanguage}
            onAddTrade={handleUpdateTrade}
            onLogout={() => {
              localStorage.removeItem(DEMO_SESSION_KEY);
              void signOutFirebase().finally(() => {
                setIsLoggedIn(false);
                setAuthMethod(null);
                setIsOnline(false);
                stopSpeech();
              });
            }}
            onClearDemoData={() => {
              localStorage.removeItem(DEMO_SESSION_KEY);
              localStorage.removeItem(DEMO_ACCOUNTS_KEY);
              localStorage.removeItem('kaamsetu_onboarded_accounts');
              void signOutFirebase().finally(() => { setIsLoggedIn(false); setAuthMethod(null); });
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
            showSettings={isProfileSettingsOpen}
            audioActive={audioActive}
            onToggleAudio={handleToggleAudio}
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

    </MobileFrame>
  );
}
