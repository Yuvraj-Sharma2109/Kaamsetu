import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Language } from '../../types';
import { getTranslation } from '../../utils/i18n';
import { speakText } from '../../utils/speech';
import { LanguageDropdown } from '../LanguageDropdown';
import { 
  Phone, 
  ShieldCheck, 
  Volume2, 
  ArrowRight, 
  ArrowLeft,
  Check, 
  UserPlus,
  LogIn
} from 'lucide-react';

interface LoginScreenProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onLoginSuccess: (method: 'phone' | 'google' | 'facebook', phoneOrEmail?: string, isNewUser?: boolean) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  language,
  onLanguageChange,
  onLoginSuccess,
}) => {
  const t = getTranslation(language);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [phoneNumber, setPhoneNumber] = useState<string>('9876543210');
  const [step, setStep] = useState<'phone_input' | 'otp_verify'>('phone_input');
  const [otp, setOtp] = useState<string>('4812');

  const handleVoiceHelp = () => {
    const text = language === 'hi'
      ? authMode === 'signin'
        ? 'लॉगिन करने के लिए अपना मोबाइल नंबर डालें या सीधे गूगल या फेसबुक बटन दबाएं।'
        : 'नया रजिस्ट्रेशन करने के लिए अपना मोबाइल नंबर डालें। इसके बाद आपको सिर्फ एक बार अपनी प्रोफाइल बनानी होगी।'
      : authMode === 'signin'
        ? 'Enter your mobile number or sign in directly with Google or Facebook.'
        : 'Enter your phone number to register. You only need to create your profile once.';
    speakText(text, language);
  };

  const handleLanguageSelect = (newLang: Language) => {
    onLanguageChange(newLang);
    const greeting = newLang === 'hi' ? 'भाषा हिन्दी' : 'English selected';
    speakText(greeting, newLang);
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.trim().length >= 10) {
      setStep('otp_verify');
      if (language === 'hi') {
        speakText('OTP कोड 4 8 1 2 भेजा गया है। पुष्टि करें।', language);
      }
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginSuccess('phone', `+91 ${phoneNumber}`, authMode === 'signup');
  };

  const handleGoogleLogin = () => {
    onLoginSuccess('google', 'rameshwar.worker@gmail.com', authMode === 'signup');
  };

  const handleFacebookLogin = () => {
    onLoginSuccess('facebook', 'rameshwar.facebook@fb.com', authMode === 'signup');
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-5 bg-slate-50 text-neutral-900 select-none overflow-y-auto space-y-3 font-sans">
      {/* 1. TOP BAR */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          {step === 'otp_verify' && (
            <button
              type="button"
              onClick={() => setStep('phone_input')}
              className="h-9 px-3 bg-white hover:bg-slate-100 rounded-xl text-xs font-bold text-neutral-800 flex items-center gap-1.5 active:scale-95 transition-transform shadow-xs"
              title={language === 'hi' ? 'पीछे जाएं' : 'Go Back'}
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
              <span>{language === 'hi' ? 'वापस' : 'Back'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleVoiceHelp}
            className="h-9 px-3.5 bg-white hover:bg-slate-100 rounded-xl text-xs font-bold text-neutral-800 flex items-center gap-1.5 active:scale-95 transition-transform shadow-xs"
          >
            <Volume2 className="w-4 h-4 text-blue-600" />
            <span>{language === 'hi' ? 'बोलकर सुनें' : 'Audio Help'}</span>
          </button>
        </div>

        <LanguageDropdown
          currentLanguage={language}
          onLanguageChange={handleLanguageSelect}
          variant="compact"
        />
      </div>

      {/* 2. HERO BRANDING */}
      <div className="text-center space-y-1.5 py-2">
        <div className="w-14 h-14 rounded-2xl bg-neutral-900 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md">
          KS
        </div>

        <div>
          <h1 className="text-xl font-black tracking-tight text-neutral-900">
            {language === 'hi' ? 'कामसेतु' : 'KaamSetu'}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {language === 'hi' ? 'सीधा काम · पक्की दिहाड़ी' : 'Direct Daily Work · Guaranteed Pay'}
          </p>
        </div>
      </div>

      {/* 3. SIGN IN vs REGISTER TOGGLE TABS (Clean borderless) */}
      <div className="w-full max-w-sm mx-auto">
        <div className="grid grid-cols-2 p-1 bg-slate-200/70 rounded-2xl shadow-xs">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin');
              setStep('phone_input');
            }}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'signin'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-slate-600 hover:text-neutral-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'लॉगिन' : 'Existing'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setStep('phone_input');
            }}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'signup'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-slate-600 hover:text-neutral-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'रजिस्टर' : 'Register'}</span>
          </button>
        </div>
      </div>

      {/* 4. MAIN AUTH CARD */}
      <div className="w-full max-w-sm mx-auto space-y-3 text-left">
        <div className="bg-white rounded-3xl p-5 shadow-sm space-y-3.5">
          {/* Direct 1-Tap Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full min-h-[48px] rounded-2xl bg-white hover:bg-slate-50 text-neutral-800 font-bold text-xs flex items-center justify-center gap-2.5 shadow-sm active:scale-98 transition-transform"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>
              {authMode === 'signin'
                ? (language === 'hi' ? 'गूगल से सीधे लॉगिन करें' : 'Sign in with Google')
                : (language === 'hi' ? 'गूगल से रजिस्टर करें' : 'Register with Google')}
            </span>
          </button>

          {/* Direct 1-Tap Facebook Login Button */}
          <button
            type="button"
            onClick={handleFacebookLogin}
            className="w-full min-h-[48px] rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-sm active:scale-98 transition-transform"
          >
            <svg className="w-5 h-5 fill-white shrink-0" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>
              {authMode === 'signin'
                ? (language === 'hi' ? 'फेसबुक से सीधे लॉगिन करें' : 'Sign in with Facebook')
                : (language === 'hi' ? 'फेसबुक से रजिस्टर करें' : 'Register with Facebook')}
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-2 py-0.5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] uppercase font-bold text-slate-400">
              {language === 'hi' ? 'या मोबाइल नंबर से' : 'OR VIA MOBILE'}
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Phone + OTP Form */}
          {step === 'phone_input' ? (
            <motion.form key="phone-input" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }} onSubmit={handleSendOtp} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  {language === 'hi' ? 'मोबाइल नंबर दर्ज करें' : 'Mobile Number'}
                </label>
                <div className="flex items-center bg-slate-100 rounded-2xl overflow-hidden shadow-xs">
                  <span className="px-3.5 py-3 text-sm font-black text-slate-500 font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98765 43210"
                    className="w-full bg-transparent px-3 py-3 text-base font-black font-mono text-neutral-900 placeholder-slate-400 focus:outline-none tracking-wider"
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[50px] rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-98 transition-transform shadow-xs"
              >
                <span>{language === 'hi' ? 'आगे बढ़ें' : 'Next'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.form>
          ) : (
            <motion.form key="otp-verify" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }} onSubmit={handleVerifyOtp} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-600 block">
                    {language === 'hi' ? '4 अंकों का OTP डालें' : 'Enter 4-Digit OTP'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep('phone_input')}
                    className="text-xs text-blue-700 hover:underline font-bold"
                  >
                    {language === 'hi' ? 'बदलें' : 'Change'}
                  </button>
                </div>

                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 4))}
                  className="w-full bg-slate-100 rounded-2xl px-4 py-3 text-center text-3xl font-black font-mono tracking-widest text-neutral-900 focus:outline-none shadow-xs"
                  maxLength={4}
                  required
                />
                <span className="text-[11px] text-slate-400 block text-center mt-1">
                  Demo Code: <strong className="text-neutral-800">4812</strong>
                </span>
              </div>

              <button
                type="submit"
                className="w-full min-h-[50px] rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-98 transition-transform shadow-xs"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>
                  {authMode === 'signin'
                    ? (language === 'hi' ? 'सत्यापित कर पोर्टल खोलें' : 'Verify & Open Portal')
                    : (language === 'hi' ? 'सत्यापित कर प्रोफाइल बनाएं' : 'Verify & Set Up Profile')}
                </span>
              </button>
            </motion.form>
          )}

          {/* Explanation badge about 1-time setup */}
          <div className="text-center pt-0.5">
            <span className="text-[11px] text-slate-500 block">
              {authMode === 'signin'
                ? (language === 'hi' ? '✓ मौजूदा मजदूरों का प्रोफाइल पहले से सुरक्षित है' : '✓ Existing accounts skip profile setup')
                : (language === 'hi' ? 'ℹ️ प्रोफाइल केवल पहली बार पंजीकरण के समय बनानी होती है' : 'ℹ️ Profile creation is only done once upon registering')}
            </span>
          </div>
        </div>
      </div>

      {/* 5. FOOTER TRUST BADGE */}
      <div className="py-1 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-semibold">
        <ShieldCheck className="w-4 h-4 text-blue-600" />
        <span>{language === 'hi' ? 'सरकारी सुरक्षा व श्रम कल्याण प्रमाणित' : 'Govt Labour Registry Verified'}</span>
      </div>
    </div>
  );
};
