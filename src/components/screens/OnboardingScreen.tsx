import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Language, TradeCategory, WorkerProfile } from '../../types';
import { TRADES } from '../../data/mockData';
import { getTranslation } from '../../utils/i18n';
import { speakText } from '../../utils/speech';
import { 
  Wrench, 
  Check, 
  ShieldCheck, 
  MapPin, 
  Volume2, 
  ArrowRight,
  ArrowLeft,
  User,
  Camera,
  KeyRound,
  Lock
} from 'lucide-react';

interface OnboardingScreenProps {
  language: Language;
  onComplete: (profile: Partial<WorkerProfile>) => void;
  initialPhone?: string;
  onBackToLogin?: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  language,
  onComplete,
  initialPhone = '+91 98765 43210',
  onBackToLogin,
}) => {
  const t = getTranslation(language);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form fields
  const [selectedTrade, setSelectedTrade] = useState<TradeCategory>('mason');
  const [name, setName] = useState<string>('Rameshwar Kumar');
  const [location, setLocation] = useState<string>('Indiranagar, Bangalore');
  const [experienceYears, setExperienceYears] = useState<number>(7);

  // Dedicated Aadhaar KYC State
  const [aadhaarNumber, setAadhaarNumber] = useState<string>('5421 8904 9012');
  const [aadhaarMode, setAadhaarMode] = useState<'otp' | 'photo'>('otp');
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [enteredOtp, setEnteredOtp] = useState<string>('6184');
  const [isAadhaarVerified, setIsAadhaarVerified] = useState<boolean>(false);
  const [hasFrontPhoto, setHasFrontPhoto] = useState<boolean>(false);
  const [hasBackPhoto, setHasBackPhoto] = useState<boolean>(false);

  const selectedTradeInfo = TRADES.find((t) => t.id === selectedTrade) || TRADES[0];
  const tradeDisplayName = language === 'hi' ? selectedTradeInfo.nameHi : selectedTradeInfo.nameEn;

  // Step voice guidance
  const handleSpeakCurrentStep = () => {
    let text = '';
    if (currentStep === 1) {
      text = language === 'hi'
        ? 'कदम 1: अपना मुख्य काम चुनें, जैसे राजमिस्त्री या हेल्पर।'
        : 'Step 1: Select your main work type such as Mason or Helper.';
    } else if (currentStep === 2) {
      text = language === 'hi'
        ? 'कदम 2: अपना नाम और काम करने का शहर लिखें।'
        : 'Step 2: Enter your name and working city.';
    } else if (currentStep === 3) {
      text = language === 'hi'
        ? 'कदम 3: अपने काम का तजुर्बा चुनें।'
        : 'Step 3: Select your work experience.';
    } else if (currentStep === 4) {
      text = language === 'hi'
        ? 'कदम 4: आधार कार्ड सत्यापन। 12 अंकों का नंबर डालें या फोटो लें।'
        : 'Step 4: Aadhaar card verification. Enter 12-digit number or take photo.';
    } else {
      text = language === 'hi'
        ? 'कदम 5: प्रोफाइल तैयार है। काम शुरू करने के लिए बटन दबाएं।'
        : 'Step 5: Profile ready. Tap button to start work.';
    }
    speakText(text, language);
  };

  const handleSelectTrade = (tradeId: TradeCategory) => {
    setSelectedTrade(tradeId);
    const trade = TRADES.find((t) => t.id === tradeId);
    if (trade) {
      if (language === 'hi') {
        speakText(`आपने ${trade.nameHi} चुना।`, language);
      }
    }
  };

  const handleFormatAadhaar = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 12);
    const parts = raw.match(/.{1,4}/g);
    setAadhaarNumber(parts ? parts.join(' ') : raw);
  };

  const handleSendAadhaarOtp = () => {
    setShowOtpModal(true);
    if (language === 'hi') {
      speakText('OTP कोड 6 1 8 4 भेजा गया है।', language);
    }
  };

  const handleVerifyOtpSuccess = () => {
    setShowOtpModal(false);
    setIsAadhaarVerified(true);
    if (language === 'hi') {
      speakText('आधार कार्ड सफलतापूर्वक सत्यापित हो गया है!', language);
    }
  };

  const handleFinish = () => {
    onComplete({
      name: name.trim() || 'Rameshwar Kumar',
      primaryTrade: selectedTrade,
      experienceYears: experienceYears,
      currentLocation: location,
      isKycVerified: isAadhaarVerified,
    });
  };

  const handleGoBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4 | 5);
    } else if (onBackToLogin) {
      onBackToLogin();
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-4 bg-slate-50 text-neutral-900 select-none overflow-y-auto space-y-3 font-sans relative">
      {/* 1. TOP HEADER (Borderless) */}
      <div className="flex items-center justify-between pb-2 shrink-0">
        <div className="flex items-center gap-2">
          {(currentStep > 1 || onBackToLogin) && (
            <button
              type="button"
              onClick={handleGoBack}
              className="h-9 px-3 bg-white hover:bg-slate-100 rounded-xl text-xs font-bold text-neutral-800 flex items-center gap-1.5 shadow-xs active:scale-95 transition-transform"
              title={currentStep > 1 ? (language === 'hi' ? 'पिछले कदम पर जाएं' : 'Previous Step') : (language === 'hi' ? 'लॉगिन पर वापस जाएं' : 'Back to Login')}
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
              <span>{language === 'hi' ? 'वापस' : 'Back'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSpeakCurrentStep}
            className="h-9 px-3 bg-white rounded-xl text-xs font-bold text-neutral-800 flex items-center gap-1.5 shadow-xs active:scale-95 transition-transform"
          >
            <Volume2 className="w-4 h-4 text-blue-600" />
            <span>{language === 'hi' ? 'बोलकर सुनें' : 'Audio Help'}</span>
          </button>
        </div>

        <span className="text-xs font-black text-neutral-900 bg-white px-3 py-1 rounded-xl shadow-xs">
          {language === 'hi' ? `कदम ${currentStep} / 5` : `Step ${currentStep} of 5`}
        </span>
      </div>

      {/* Progress Bar (Pastel Blue & Slate) */}
      <div className="space-y-1 shrink-0">
        <div className="grid grid-cols-5 gap-1.5 h-1.5">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`rounded-full transition-all duration-300 ${
                step <= currentStep ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 2. STEP CONTENT CARDS (Borderless) */}
      <motion.div key={currentStep} initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }} className="flex-1 flex flex-col justify-center py-1">
        {/* ================= STEP 1: SELECT WORK TYPE ================= */}
        {currentStep === 1 && (
          <div className="space-y-2.5 animate-in fade-in">
            <div>
              <h2 className="text-base font-black text-neutral-900">
                {language === 'hi' ? 'आप क्या काम करते हैं?' : 'Select Your Main Work'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'hi' ? 'अपना मुख्य काम चुनें' : 'Choose 1 trade to receive matching jobs'}
              </p>
            </div>

            {/* Trade Grid (Borderless Cards) */}
            <div className="grid grid-cols-2 gap-2.5 max-h-[400px] overflow-y-auto pr-0.5 pt-1">
              {TRADES.map((trade) => {
                const isSelected = trade.id === selectedTrade;
                return (
                  <motion.div
                    key={trade.id}
                    onClick={() => handleSelectTrade(trade.id)}
                    layout
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }}
                    className={`p-4 rounded-2xl transition-all cursor-pointer flex items-center justify-between active:scale-98 min-h-[58px] ${
                      isSelected
                        ? 'bg-neutral-900 text-white shadow-md'
                        : 'bg-white text-neutral-900 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    <span className="text-xs font-black block">
                      {language === 'hi' ? trade.nameHi : trade.nameEn}
                    </span>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs ml-2">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= STEP 2: NAME & WORK CITY ================= */}
        {currentStep === 2 && (
          <div className="space-y-3 animate-in fade-in">
            <div>
              <h2 className="text-base font-black text-neutral-900">
                {language === 'hi' ? 'आपका नाम और इलाका' : 'Your Name & City'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'hi' ? 'ठेकेदार इसी नाम से आपको पहचानेंगे' : 'For site attendance and identification'}
              </p>
            </div>

            <div className="space-y-3 bg-white rounded-3xl p-5 shadow-sm">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  {language === 'hi' ? 'आपका पूरा नाम' : 'Full Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rameshwar Kumar"
                  className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm font-black text-neutral-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  {language === 'hi' ? 'काम करने का शहर या इलाका' : 'Preferred City or Area'}
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Indiranagar, Bangalore"
                  className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm font-black text-neutral-900 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{language === 'hi' ? 'लॉगिन मोबाइल नंबर:' : 'Registered Phone:'}</span>
                <span className="font-mono text-neutral-900 font-bold">{initialPhone}</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: EXPERIENCE ================= */}
        {currentStep === 3 && (
          <div className="space-y-3.5 animate-in fade-in">
            <div>
              <h2 className="text-base font-black text-neutral-900">
                {language === 'hi' ? 'काम का तजुर्बा' : 'Work Experience'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'hi' ? 'अपने काम का अनुभव चुनें' : 'Select your years of work experience in this trade'}
              </p>
            </div>

            {/* Experience Selector Card */}
            <div className="bg-white rounded-3xl p-5 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">
                  {language === 'hi' ? 'चुना गया तजुर्बा:' : 'Selected Experience:'}
                </span>
                <span className="font-mono text-neutral-900 font-black text-sm bg-slate-100 px-3 py-1 rounded-xl">
                  {experienceYears} {language === 'hi' ? 'साल' : 'Years'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {[
                  { yr: 1, labelEn: '1 Year', labelHi: '1 साल' },
                  { yr: 3, labelEn: '3 Years', labelHi: '3 साल' },
                  { yr: 5, labelEn: '5 Years', labelHi: '5 साल' },
                  { yr: 8, labelEn: '8+ Years', labelHi: '8+ साल' },
                ].map(({ yr, labelEn, labelHi }) => {
                  const isSelected = experienceYears === yr;
                  return (
                    <motion.button
                      key={yr}
                      type="button"
                      onClick={() => setExperienceYears(yr)}
                      layout
                      whileTap={{ scale: 0.97 }}
                      transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }}
                      className={`min-h-[56px] p-4 rounded-2xl text-xs font-bold transition-all text-center flex items-center justify-between shadow-xs active:scale-95 ${
                        isSelected
                          ? 'bg-neutral-900 text-white font-black shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{language === 'hi' ? labelHi : labelEn}</span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs ml-2">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 4: AADHAAR VERIFICATION ================= */}
        {currentStep === 4 && (
          <div className="space-y-3 animate-in fade-in">
            <div>
              <h2 className="text-base font-black text-neutral-900">
                {language === 'hi' ? 'आधार कार्ड सत्यापन' : 'Aadhaar Verification'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'hi' ? 'सत्यापित मजदूरों को तुरंत काम मिलता है' : 'Required to accept and start jobs'}
              </p>
            </div>

            {/* Visual Aadhaar Card Mockup (Borderless) */}
            <div className="bg-white rounded-3xl p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏛️</span>
                  <div>
                    <span className="text-[10px] uppercase font-black text-neutral-900 tracking-wider block">
                      GOVT OF INDIA · UIDAI
                    </span>
                    <span className="text-[9px] text-slate-400">मेरा आधार, मेरी पहचान</span>
                  </div>
                </div>

                {isAadhaarVerified ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 font-black text-[10px] shadow-xs">
                    ✓ VERIFIED
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
                    PENDING
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 py-1">
                <div className="w-12 h-14 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 shrink-0">
                  <User className="w-6 h-6 text-slate-500" />
                  <span className="text-[7px] text-slate-400 uppercase mt-0.5">PHOTO</span>
                </div>

                <div className="space-y-0.5 min-w-0 flex-1">
                  <span className="font-black text-xs text-neutral-900 block truncate">{name}</span>
                  <div className="text-sm font-black font-mono tracking-widest text-blue-900">
                    {aadhaarNumber || 'XXXX XXXX XXXX'}
                  </div>
                </div>
              </div>
            </div>

            {/* TAB SELECTOR: OTP vs CARD PHOTO (Borderless) */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl shadow-xs">
              <button
                type="button"
                onClick={() => setAadhaarMode('otp')}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  aadhaarMode === 'otp'
                    ? 'bg-neutral-900 text-white font-black shadow-xs'
                    : 'text-slate-600 hover:text-neutral-900'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{language === 'hi' ? 'आधार नंबर + OTP' : 'Aadhaar OTP'}</span>
              </button>

              <button
                type="button"
                onClick={() => setAadhaarMode('photo')}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  aadhaarMode === 'photo'
                    ? 'bg-neutral-900 text-white font-black shadow-xs'
                    : 'text-slate-600 hover:text-neutral-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{language === 'hi' ? 'कार्ड की फोटो' : 'Card Photo'}</span>
              </button>
            </div>

            {/* METHOD 1: OTP */}
            {aadhaarMode === 'otp' && (
              <div className="space-y-2.5 bg-white rounded-3xl p-4 shadow-sm">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    {language === 'hi' ? '12 अंकों का आधार नंबर डालें' : 'Enter 12-Digit Aadhaar Number'}
                  </label>
                  <input
                    type="text"
                    value={aadhaarNumber}
                    onChange={(e) => handleFormatAadhaar(e.target.value)}
                    placeholder="XXXX XXXX XXXX"
                    className="w-full bg-slate-100 rounded-xl px-4 py-2.5 text-center text-base font-black font-mono tracking-widest text-neutral-900 focus:outline-none"
                    maxLength={14}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendAadhaarOtp}
                  className="w-full min-h-[44px] rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-xs"
                >
                  <KeyRound className="w-4 h-4 text-blue-300" />
                  <span>{language === 'hi' ? 'OTP प्राप्त करें' : 'Get UIDAI OTP'}</span>
                </button>
              </div>
            )}

            {/* METHOD 2: PHOTO */}
            {aadhaarMode === 'photo' && (
              <div className="space-y-2 bg-white rounded-3xl p-4 shadow-sm">
                <span className="text-xs text-slate-600 font-bold block">
                  {language === 'hi' ? 'कार्ड की फोटो खींचें:' : 'Capture card photos:'}
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHasFrontPhoto(true);
                      setIsAadhaarVerified(true);
                    }}
                    className={`h-20 rounded-xl flex flex-col items-center justify-center p-2 text-center transition-all shadow-xs ${
                      hasFrontPhoto
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Camera className="w-4 h-4 mb-1 text-slate-400" />
                    <span className="text-[11px] font-bold block">
                      {hasFrontPhoto ? '✓ सामने की फोटो' : 'सामने की फोटो'}
                    </span>
                    <span className="text-[9px] opacity-70">(Front)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHasBackPhoto(true);
                      setIsAadhaarVerified(true);
                    }}
                    className={`h-20 rounded-xl flex flex-col items-center justify-center p-2 text-center transition-all shadow-xs ${
                      hasBackPhoto
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Camera className="w-4 h-4 mb-1 text-slate-400" />
                    <span className="text-[11px] font-bold block">
                      {hasBackPhoto ? '✓ पीछे की फोटो' : 'पीछे की फोटो'}
                    </span>
                    <span className="text-[9px] opacity-70">(Back)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Skip Option */}
            <div className="text-center pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setIsAadhaarVerified(false);
                  setCurrentStep(5);
                }}
                className="text-xs text-slate-500 hover:text-neutral-900 underline font-semibold"
              >
                {language === 'hi' ? 'मेरे पास अभी कार्ड नहीं है (बाद में सत्यापित करें)' : 'I don\'t have card right now (Verify Later)'}
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 5: FINAL SUMMARY & START ================= */}
        {currentStep === 5 && (
          <div className="space-y-3 animate-in fade-in">
            <div>
              <h2 className="text-base font-black text-neutral-900">
                {language === 'hi' ? 'प्रोफाइल तैयार है' : 'Profile Ready'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'hi' ? 'काम शुरू करने के लिए नीचे दबाएं' : 'Tap below to start receiving work'}
              </p>
            </div>

            {/* Ready Worker Card (Borderless) */}
            <div className="bg-white rounded-3xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white font-black text-xl flex items-center justify-center shadow-xs">
                  {name.charAt(0) || 'R'}
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900">{name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{location}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div className="bg-slate-100/70 rounded-xl p-3 shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {language === 'hi' ? 'पेशा' : 'Trade'}
                  </span>
                  <span className="text-sm font-black text-neutral-900">{tradeDisplayName}</span>
                </div>

                <div className="bg-slate-100/70 rounded-xl p-3 shadow-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {language === 'hi' ? 'तजुर्बा' : 'Experience'}
                  </span>
                  <span className="text-sm font-black text-blue-900 font-mono">
                    {experienceYears} {language === 'hi' ? 'साल' : 'Years'}
                  </span>
                </div>
              </div>

              {/* Aadhaar status pill */}
              <div className="flex items-center justify-between p-3 bg-slate-100/70 rounded-xl text-xs shadow-xs">
                <span className="text-slate-600 font-bold">
                  {language === 'hi' ? 'आधार कार्ड सत्यापन' : 'Aadhaar Status'}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                  isAadhaarVerified ? 'bg-blue-50 text-blue-900 font-black' : 'bg-slate-100 text-slate-600'
                }`}>
                  {isAadhaarVerified ? '✓ Verified' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* 3. BOTTOM STEP NAVIGATION BUTTONS (Borderless) */}
      <div className="pt-2 flex items-center gap-2 shrink-0">
        {/* Next / Finish Button */}
        {currentStep < 5 ? (
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3 | 4 | 5)}
            className="w-full min-h-[48px] rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-transform"
          >
            <span>
              {currentStep === 1 && (language === 'hi' ? 'आगे: नाम दर्ज करें' : 'Next: Name & City')}
              {currentStep === 2 && (language === 'hi' ? 'आगे: काम का तजुर्बा' : 'Next: Work Experience')}
              {currentStep === 3 && (language === 'hi' ? 'आगे: आधार सत्यापन' : 'Next: Aadhaar KYC')}
              {currentStep === 4 && (language === 'hi' ? 'आगे: प्रोफाइल समीक्षा' : 'Next: Review & Finish')}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            className="w-full min-h-[50px] rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-transform"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>{language === 'hi' ? 'काम शुरू करें (ड्यूटी चालू)' : 'START WORK NOW'}</span>
          </button>
        )}
      </div>

      {/* UIDAI OTP BOTTOM SHEET MODAL (Borderless) */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-xs p-3">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-neutral-900">
                {language === 'hi' ? 'UIDAI आधार OTP दर्ज करें' : 'Enter Aadhaar OTP'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'hi' ? '4 अंकों का कोड डालें' : 'Enter 4-digit code'}
              </p>
            </div>

            <div>
              <input
                type="text"
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value.slice(0, 4))}
                className="w-full bg-slate-100 rounded-2xl px-4 py-3 text-center text-3xl font-black font-mono tracking-widest text-neutral-900 focus:outline-none"
                maxLength={4}
              />
              <span className="text-[11px] text-slate-400 block text-center mt-1">
                Demo Code: <strong className="text-neutral-700">6184</strong>
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleVerifyOtpSuccess}
                className="w-full min-h-[48px] rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xs"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>{language === 'hi' ? 'पुष्टि करें (सत्यापन सफल)' : 'Verify & Continue'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="w-full py-2 text-xs text-slate-500 hover:text-neutral-900"
              >
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
