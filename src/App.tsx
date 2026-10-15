/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react';
import { ArrowLeft, Settings } from 'lucide-react';
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

export default function App() {
  // Auth & Onboarding Flow states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(true);
  const [tempUserContact, setTempUserContact] = useState<string>('+91 98765 43210');

  // Track accounts that have already created their profile
  const [onboardedAccounts, setOnboardedAccounts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kaamsetu_onboarded_accounts');
      return saved ? JSON.parse(saved) : ['+91 98765 43210', 'google_default', 'facebook_default'];
    } catch {
      return ['+91 98765 43210', 'google_default', 'facebook_default'];
    }
  });

  // Core app states
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [language, setLanguage] = useState<Language>('en');
  const [currentTab, setCurrentTab] = useState<TabType>('radar');
  const [profileReturnTab, setProfileReturnTab] = useState<TabType>('radar');
  const [isWorkListExpanded, setIsWorkListExpanded] = useState(false);
  const workListProgress = useMotionValue(0);
  const headerY = useTransform(workListProgress, [0, 1], [0, -132]);
  const headerOpacity = useTransform(workListProgress, [0, 0.78, 1], [1, 1, 0]);
  const [worker, setWorker] = useState<WorkerProfile>(INITIAL_WORKER);
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [walletBalance, setWalletBalance] = useState<number>(3450);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [todayEarnings, setTodayEarnings] = useState<number>(950);

  // Active Shift State with Back-to-Back Work Queue
  const [shift, setShift] = useState<ShiftState>({
    isActive: false,
    job: null,
    status: 'assigned',
    punchInTime: null,
    punchInPhotoUrl: null,
    punchOutTime: null,
    queuedJob: null,
  });

  // Modals & Overlays
  const [incomingJob, setIncomingJob] = useState<Job | null>(null);
  const [inspectingJob, setInspectingJob] = useState<Job | null>(null);
  const [showSosModal, setShowSosModal] = useState<boolean>(false);
  const [audioActive, setAudioActive] = useState<boolean>(true);
  const [showAadhaarModal, setShowAadhaarModal] = useState<boolean>(false);
  const [showEShramModal, setShowEShramModal] = useState(false);
  const [profileSettingsOpenRequest, setProfileSettingsOpenRequest] = useState(0);

  const handleVerifyAadhaarSuccess = () => {
    setShowAadhaarModal(false);
    setWorker((prev) => ({ ...prev, isKycVerified: true }));
  };

  const handleVerifyEShramSuccess = () => {
    setShowEShramModal(false);
    setWorker((prev) => ({ ...prev, isEShramVerified: true }));
  };

  // Handle Online / Offline toggle
  const handleToggleOnline = () => {
    const nextState = !isOnline;
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
  ) => {
    setIsLoggedIn(true);
    const resolvedContact = contact || (method === 'phone' ? '+91 98765 43210' : `${method}.user@kaamsetu.in`);
    setTempUserContact(resolvedContact);

    const isExistingAccount = !isNewUser;

    if (isExistingAccount) {
      setHasCompletedOnboarding(true);
      setCurrentTab('radar');
      if (audioActive) {
        speakText(
          language === 'hi' ? 'लॉगिन सफल। कामसेतु में आपका स्वागत है।' : 'Login successful. Welcome back to KaamSetu.',
          language
        );
      }
    } else {
      setHasCompletedOnboarding(false);
      if (audioActive) {
        speakText(
          language === 'hi' ? 'नया खाता दर्ज हुआ। कृपया पहली बार अपनी प्रोफाइल तैयार करें।' : 'Registration successful. Please complete your one-time profile setup.',
          language
        );
      }
    }
  };

  // 1. FLOW STAGE: NOT LOGGED IN -> SHOW LOGIN SCREEN
  if (!isLoggedIn) {
    return (
      <MobileFrame
        isLoggedIn={false}
        onToggleLoginDemo={() => {
          setIsLoggedIn(true);
          setHasCompletedOnboarding(true);
        }}
      >
        <LoginScreen
          language={language}
          onLanguageChange={setLanguage}
          onLoginSuccess={handleLoginSuccess}
        />
      </MobileFrame>
    );
  }

  // 2. FLOW STAGE: LOGGED IN BUT FIRST TIME SIGNUP -> SHOW ONBOARDING SCREEN
  if (!hasCompletedOnboarding) {
    return (
      <MobileFrame
        isLoggedIn={false}
        onToggleLoginDemo={() => {
          setIsLoggedIn(true);
          setHasCompletedOnboarding(true);
        }}
      >
        <OnboardingScreen
          language={language}
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

            setOnboardedAccounts((prev) => {
              const updated = Array.from(new Set([...prev, tempUserContact]));
              try {
                localStorage.setItem('kaamsetu_onboarded_accounts', JSON.stringify(updated));
              } catch {}
              return updated;
            });

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
      isLoggedIn={true}
      fullScreenCanvas={currentTab === 'radar' || currentTab === 'profile'}
      bottomOverlay={(
        <BottomNav
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setIsWorkListExpanded(false);
            workListProgress.set(0);
          }}
          language={language}
          isOnline={isOnline}
          hasActiveJob={shift.isActive}
          availableJobsCount={jobs.filter((j) => j.trade === worker.primaryTrade).length}
        />
      )}
      onToggleLoginDemo={() => {
        setIsLoggedIn(false);
        setIsOnline(false);
        stopSpeech();
      }}
    >
      {/* Top Application Bar */}
      {currentTab === 'profile' ? (
        <div className="absolute inset-x-0 top-[63px] z-30 mx-auto flex w-[calc(100%-52px)] max-w-[360px] items-center justify-between">
          <button type="button" onClick={() => setCurrentTab(profileReturnTab)} aria-label="Back" className="flex h-[55px] w-[55px] items-center justify-center rounded-[20px] bg-white text-black">
            <ArrowLeft className="h-6 w-6" />
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
        className={currentTab === 'radar' ? 'absolute inset-x-0 top-[49px] z-30' : 'relative z-30'}
      >
      <TopHeader
        worker={worker}
        isOnline={isOnline}
        language={language}
        onLanguageChange={setLanguage}
        audioActive={audioActive}
        onToggleAudio={() => setAudioActive(!audioActive)}
        onOpenSosModal={() => setShowSosModal(true)}
        todayEarnings={todayEarnings}
        onOpenProfile={() => {
          setProfileReturnTab(currentTab);
          setCurrentTab('profile');
        }}
      />
      </motion.div>}

      {/* Screen Body Viewport */}
      <main className={`${currentTab === 'radar' ? 'absolute inset-x-0 top-0 bottom-[-20px] z-10 overflow-hidden' : currentTab === 'profile' ? 'absolute inset-x-0 top-[133px] bottom-0 z-10 overflow-hidden' : currentTab === 'active' ? 'absolute inset-x-0 top-[133px] bottom-0 z-10 overflow-x-hidden overflow-y-auto overscroll-contain' : 'relative flex-1 overflow-y-auto'} flex min-h-0 flex-col select-none bg-[#f1f1f1]`}>
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
              setIsLoggedIn(false);
              setIsOnline(false);
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
      />

      <EShramVerifyModal isOpen={showEShramModal} onClose={() => setShowEShramModal(false)} onVerifySuccess={handleVerifyEShramSuccess} />
    </MobileFrame>
  );
}
