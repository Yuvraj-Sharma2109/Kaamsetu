import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Language } from '../../types';
import { getTranslation } from '../../utils/i18n';
import { uiText } from '../../utils/uiText';
import { aiLabel } from '../../utils/aiLabels';
import { speakText } from '../../utils/speech';
import { LanguageDropdown } from '../LanguageDropdown';
import { 
  ShieldCheck, 
  Bot,
  UserPlus,
  LogIn,
  LoaderCircle,
  ArrowRight,
  ArrowLeft,
  Check
} from 'lucide-react';
import { FirebaseUserInfo, getFirebaseRedirectUser, isFirebaseConfigured, signInWithSocialProvider, signOutFirebase, watchFirebaseAuth } from '../../utils/firebaseAuth';

interface LoginScreenProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onLoginSuccess: (method: 'phone' | 'google' | 'facebook', contact?: string, isNewUser?: boolean) => boolean;
  onFirebaseAuthSuccess: (method: 'google' | 'facebook', user: FirebaseUserInfo) => boolean;
  audioActive: boolean;
  onToggleAudio: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  language,
  onLanguageChange,
  onLoginSuccess,
  onFirebaseAuthSuccess,
  audioActive,
  onToggleAudio,
}) => {
  const t = getTranslation(language);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [phoneNumber, setPhoneNumber] = useState('9876543210');
  const [step, setStep] = useState<'phone_input' | 'otp_verify'>('phone_input');
  const [otp, setOtp] = useState('');
  const [authError, setAuthError] = useState('');
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(isFirebaseConfigured);
  const handledUidRef = useRef('');

  const handleSendOtp = (event: React.FormEvent) => {
    event.preventDefault();
    if (phoneNumber.replace(/\D/g, '').length !== 10) return;
    setAuthError('');
    setOtp('');
    setStep('otp_verify');
    if (audioActive) speakText('Your demo OTP is 4 8 1 2.', language);
  };

  const handleVerifyOtp = (event: React.FormEvent) => {
    event.preventDefault();
    if (otp !== '4812') {
      setAuthError(uiText(language, 'invalidOtpLogin'));
      return;
    }
    setAuthError('');
    if (!onLoginSuccess('phone', `+91 ${phoneNumber}`, authMode === 'signup')) {
      setAuthError(uiText(language, authMode === 'signup' ? 'accountExists' : 'accountMissing'));
    }
  };

  const socialErrorText = (error: unknown) => {
    const code = (error as { code?: string })?.code || '';
    const copy: Record<Language, Record<string, string>> = {en:{config:`Social sign-in needs Firebase setup. Add the VITE_FIREBASE_* values and enable Google and Facebook in Firebase Authentication.`,domain:`This website domain is not authorized for Firebase sign-in. Add it under Firebase Authentication → Settings → Authorized domains.`,provider:`This sign-in provider is not enabled yet. Enable it in Firebase Authentication → Sign-in method.`,closed:`Sign-in was cancelled. Try again when you are ready.`,network:`Could not reach the sign-in service. Check your internet connection and try again.`,generic:`Sign-in could not be completed. Check the Firebase provider configuration and try again.`},hi:{config:`सोशल लॉगिन के लिए Firebase सेटअप करें। VITE_FIREBASE_* मान जोड़ें और Firebase Authentication में Google व Facebook चालू करें।`,domain:`यह वेबसाइट Firebase लॉगिन के लिए अधिकृत नहीं है। Firebase Authentication की Authorized domains सूची में डोमेन जोड़ें।`,provider:`यह लॉगिन विकल्प चालू नहीं है। Firebase Authentication के Sign-in method में इसे चालू करें।`,closed:`लॉगिन रद्द हुआ। तैयार होने पर फिर कोशिश करें।`,network:`लॉगिन सेवा से संपर्क नहीं हो सका। इंटरनेट जाँचकर फिर कोशिश करें।`,generic:`लॉगिन पूरा नहीं हुआ। Firebase सेटिंग जाँचकर फिर कोशिश करें।`},bn:{config:`সোশ্যাল লগইনের জন্য Firebase সেটআপ করুন। VITE_FIREBASE_* মান যোগ করে Firebase Authentication-এ Google ও Facebook চালু করুন।`,domain:`এই ওয়েবসাইটটি Firebase লগইনের জন্য অনুমোদিত নয়। Firebase Authentication-এর Authorized domains-এ ডোমেন যোগ করুন।`,provider:`এই লগইন পদ্ধতিটি চালু নেই। Firebase Authentication-এর Sign-in method-এ এটি চালু করুন।`,closed:`লগইন বাতিল হয়েছে। প্রস্তুত হলে আবার চেষ্টা করুন।`,network:`লগইন পরিষেবায় যোগাযোগ করা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।`,generic:`লগইন সম্পূর্ণ হয়নি। Firebase সেটিং দেখে আবার চেষ্টা করুন।`},mr:{config:`सोशल लॉगिनसा�\xA0ी Firebase सेटअप करा. VITE_FIREBASE_* मूल्ये जोडा आणि Firebase Authentication मध्ये Google व Facebook सुरू करा.`,domain:`ही वेबसाइट Firebase लॉगिनसा�\xA0ी अधिकृत नाही. Firebase Authentication मधील Authorized domains मध्ये डोमेन जोडा.`,provider:`ही लॉगिन पद्धत सुरू केलेली नाही. Firebase Authentication च्या Sign-in method मध्ये ती सुरू करा.`,closed:`लॉगिन रद्द झाले. तयार झाल्यावर पुन्हा प्रयत्न करा.`,network:`लॉगिन सेवेशी संपर्क झाला नाही. इंटरनेट तपासून पुन्हा प्रयत्न करा.`,generic:`लॉगिन पूर्ण झाले नाही. Firebase सेटिंग तपासून पुन्हा प्रयत्न करा.`},te:{config:`సోషల్ లాగిన్‌కు Firebase సెటప్ చేయండి. VITE_FIREBASE_* విలువలు జోడించి Firebase Authentication‌లో Google, Facebook‌ను ప్రారంభించండి.`,domain:`ఈ వెబ్‌సైట్ Firebase లాగిన్‌కు అనుమతించబడలేదు. Firebase Authentication‌లోని Authorized domains‌లో డొమైన్ జోడించండి.`,provider:`ఈ లాగిన్ పద్ధతి ప్రారంభించబడలేదు. Firebase Authentication‌లోని Sign-in method‌లో దీన్ని ప్రారంభించండి.`,closed:`లాగిన్ రద్దయింది. సిద్ధమైనప్పుడు మళ్లీ ప్రయత్నించండి.`,network:`లాగిన్ సేవను చేరుకోలేకపోయాం. ఇంటర్నెట్ తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.`,generic:`లాగిన్ పూర్తికాలేదు. Firebase సెట్టింగ్‌లను తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.`}};
    const messages = copy[language];
    if (code === 'kaamsetu/firebase-config-missing') return 'Authentication requires Firebase setup. Add the VITE_FIREBASE_* values and enable Phone, Google, and Facebook in Firebase Authentication.';
    if (code === 'kaamsetu/firebase-sdk-unavailable') return messages.network;
    if (code === 'auth/popup-blocked') return language === 'hi'
      ? 'ब्राउज़र ने Google लॉगिन विंडो रोकी। इस साइट के लिए पॉप-अप अनुमति दें या ऐप को Chrome/Safari में खोलकर फिर कोशिश करें।'
      : language === 'bn'
        ? 'ব্রাউজার Google লগইন উইন্ডোটি আটকে দিয়েছে। এই সাইটের জন্য পপ-আপ অনুমতি দিন অথবা Chrome/Safari-তে খুলে আবার চেষ্টা করুন।'
        : language === 'mr'
          ? 'ब्राउझरने Google लॉगिन विंडो रोखली. या साइटसाठी पॉप-अपला परवानगी द्या किंवा Chrome/Safari मध्ये उघडून पुन्हा प्रयत्न करा.'
          : language === 'te'
            ? 'బ్రౌజర్ Google లాగిన్ విండోను నిరోధించింది. ఈ సైట్‌కు పాప్-అప్‌లను అనుమతించండి లేదా Chrome/Safariలో తెరిచి మళ్లీ ప్రయత్నించండి.'
            : 'Your browser blocked the Google sign-in window. Allow pop-ups for this site, or open the app in Chrome/Safari and try again.';
    if (code === 'auth/unauthorized-domain') return messages.domain;
    if (code === 'auth/operation-not-allowed' || code === 'auth/requests-to-this-api-identitytoolkit-method-google-oauth2-are-blocked') return messages.provider;
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return messages.closed;
    if (code === 'auth/network-request-failed') return messages.network;
    if (code === 'auth/invalid-phone-number') return 'Enter a valid phone number including the country code.';
    if (code === 'auth/captcha-check-failed') return 'Phone verification could not validate this browser. Refresh and try again.';
    if (code === 'auth/too-many-requests' || code === 'auth/quota-exceeded') return 'Too many OTP requests. Wait a while before trying again.';
    if (code === 'auth/invalid-verification-code') return 'That OTP is incorrect. Check the SMS and try again.';
    if (code === 'auth/code-expired' || code === 'auth/session-expired') return 'That OTP expired. Request a new code.';
    if (code === 'auth/missing-phone-number') return 'Enter your phone number to receive an OTP.';
    if (code === 'auth/invalid-api-key') return 'Firebase API key is invalid. Copy the Web API key from Firebase Project settings and update VITE_FIREBASE_API_KEY in Vercel, then redeploy.';
    if (code === 'auth/invalid-oauth-client-id') return 'Google OAuth client is misconfigured. Check the Google provider in Firebase Authentication and its Web client ID.';
    if (code === 'auth/account-exists-with-different-credential') return 'This email already uses another provider. Sign in with that provider first, then link Google or Facebook in Profile → Settings.';
    if (code === 'auth/web-storage-unsupported' || code === 'auth/operation-not-supported-in-this-environment') return 'This browser blocks the storage or redirect features required for sign-in. Open the app in a regular browser and allow cookies.';
    return code ? `${messages.generic} (${code})` : messages.generic;
  };

  const handleOAuthUser = (method: 'google' | 'facebook', user: FirebaseUserInfo) => {
    if (handledUidRef.current === user.uid) return;
    handledUidRef.current = user.uid;
    setSocialLoading(null);
    setAuthError('');
    if (!onFirebaseAuthSuccess(method, user)) {
      handledUidRef.current = '';
      setAuthError('A saved profile needs verified identity and your confirmation before it can be linked. Sign in with its existing method or try again and confirm the link.');
      void signOutFirebase().catch(() => undefined);
    }
  };

  // Keep one Firebase listener for the lifetime of the login screen. The app
  // callback is recreated by its parent, so the listener reads the newest one
  // from this ref instead of restarting redirect handling on every render.
  const handleOAuthUserRef = useRef(handleOAuthUser);
  handleOAuthUserRef.current = handleOAuthUser;
  const socialErrorTextRef = useRef(socialErrorText);
  socialErrorTextRef.current = socialErrorText;

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    watchFirebaseAuth((user) => {
      if (user) {
        const provider = user.providerData.find((item) => item.providerId === 'google.com' || item.providerId === 'facebook.com');
        if (provider) handleOAuthUserRef.current(provider.providerId === 'google.com' ? 'google' : 'facebook', user);
      }
      if (!disposed) setCheckingAuth(false);
    }, (error) => {
      if (!disposed) {
        setAuthError(socialErrorTextRef.current(error));
        setCheckingAuth(false);
      }
    }).then((stopWatching) => {
      if (disposed) stopWatching();
      else unsubscribe = stopWatching;
    }).catch((error) => {
      if (!disposed) {
        setAuthError(socialErrorText(error));
        setCheckingAuth(false);
      }
    });
    void getFirebaseRedirectUser().then((user) => {
      if (disposed || !user) return;
      const provider = user.providerData.find((item) => item.providerId === 'google.com' || item.providerId === 'facebook.com');
      if (provider) handleOAuthUserRef.current(provider.providerId === 'google.com' ? 'google' : 'facebook', user);
    }).catch((error) => {
      if (!disposed) {
        setAuthError(socialErrorTextRef.current(error));
        setCheckingAuth(false);
      }
    });
    return () => { disposed = true; unsubscribe?.(); };
  }, []);

  const handleVoiceHelp = () => {
    window.dispatchEvent(new Event('kaamsetu:open-ai-assistant'));
  };

  const handleLanguageSelect = (newLang: Language) => {
    onLanguageChange(newLang);
    const greeting = newLang === 'hi' ? '\u092d\u093e\u0937\u093e \u0939\u093f\u0928\u094d\u0926\u0940' : 'English selected';
    if (audioActive) speakText(greeting, newLang);
  };


  const handleSocialLogin = async (method: 'google' | 'facebook') => {
    setAuthError('');
    setSocialLoading(method);
    try {
      const user = await signInWithSocialProvider(method, language);
      if (user) handleOAuthUser(method, user);
    } catch (error) {
      setAuthError(socialErrorText(error));
      setSocialLoading(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-5 bg-slate-50 text-neutral-900 select-none overflow-y-auto space-y-3 font-sans">
      {/* 1. TOP BAR */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onToggleAudio} aria-label={aiLabel(language).title} title={aiLabel(language).title} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-700 shadow-xs"><Bot className="h-4 w-4" /></button>
          {step === 'otp_verify' && (
            <button type="button" onClick={() => { setStep('phone_input'); setOtp(''); }} className="h-9 px-3 bg-white hover:bg-slate-100 rounded-xl text-xs font-bold text-neutral-800 flex items-center gap-1.5 shadow-xs" title={uiText(language, 'goBack')}>
              <ArrowLeft className="w-4 h-4 text-slate-700" /><span>{uiText(language, 'back')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleVoiceHelp}
            className="h-9 px-3.5 bg-white hover:bg-slate-100 rounded-xl text-xs font-bold text-neutral-800 flex items-center gap-1.5 active:scale-95 transition-transform shadow-xs"
          >
            <Bot className="w-4 h-4 text-blue-600" />
            <span>{aiLabel(language).open}</span>
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
            {t.appName}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {t.tagline}
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
            <span>{uiText(language, 'existing')}</span>
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
            <span>{uiText(language, 'register')}</span>
          </button>
        </div>
      </div>

      {/* 4. MAIN AUTH CARD */}
      <div className="w-full max-w-sm mx-auto space-y-3 text-left">
        <div className="bg-white rounded-3xl p-5 shadow-sm space-y-3.5">
          <p className="rounded-xl bg-blue-50 px-3 py-2 text-center text-[11px] font-semibold text-blue-800">{uiText(language, 'demoAccess')} <strong>4812</strong></p>
          {authError && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-center text-xs font-bold text-rose-700">{authError}</p>}
          {/* Direct 1-Tap Google Login Button */}
          <button
            type="button"
            onClick={() => void handleSocialLogin('google')}
            disabled={socialLoading !== null || checkingAuth}
            className="w-full min-h-[48px] rounded-2xl bg-white hover:bg-slate-50 text-neutral-800 font-bold text-xs flex items-center justify-center gap-2.5 shadow-sm active:scale-98 transition-transform"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            {socialLoading === 'google' && <LoaderCircle className="h-4 w-4 animate-spin" />}
            <span>
              {authMode === 'signin'
                ? uiText(language, 'signInGoogle')
                : uiText(language, 'registerGoogle')}
            </span>
          </button>

          {/* Direct 1-Tap Facebook Login Button */}
          <button
            type="button"
            onClick={() => void handleSocialLogin('facebook')}
            disabled={socialLoading !== null || checkingAuth}
            className="w-full min-h-[48px] rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-sm active:scale-98 transition-transform"
          >
            <svg className="w-5 h-5 fill-white shrink-0" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            {socialLoading === 'facebook' && <LoaderCircle className="h-4 w-4 animate-spin" />}
            <span>
              {authMode === 'signin'
                ? uiText(language, 'signInFacebook')
                : uiText(language, 'registerFacebook')}
            </span>
          </button>

          <div className="flex items-center gap-2 py-0.5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] uppercase font-bold text-slate-400">{uiText(language, 'orViaMobile')}</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {step === 'phone_input' ? (
            <motion.form key="phone-input" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} onSubmit={handleSendOtp} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">{uiText(language, 'mobileNumber')}</label>
                <div className="flex items-center bg-slate-100 rounded-2xl overflow-hidden shadow-xs">
                  <span className="px-3.5 py-3 text-sm font-black text-slate-500 font-mono">+91</span>
                  <input type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" className="w-full bg-transparent px-3 py-3 text-base font-black font-mono text-neutral-900 placeholder-slate-400 focus:outline-none tracking-wider" maxLength={10} required />
                </div>
              </div>
              <button type="submit" className="w-full min-h-[50px] rounded-2xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-60 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-98 transition-transform shadow-xs">
                <span>{uiText(language, 'next')}</span><ArrowRight className="w-4 h-4" />
              </button>
            </motion.form>
          ) : (
            <motion.form key="otp-verify" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} onSubmit={handleVerifyOtp} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-600">{uiText(language, 'enterOtp')}</label>
                  <button type="button" onClick={() => { setStep('phone_input'); setOtp(''); }} className="text-xs text-blue-700 hover:underline font-bold">{uiText(language, 'change')}</button>
                </div>
                <input type="text" inputMode="numeric" autoComplete="one-time-code" aria-label={uiText(language, 'enterOtp')} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 4))} className="w-full bg-slate-100 rounded-2xl px-4 py-3 text-center text-3xl font-black font-mono tracking-widest text-neutral-900 focus:outline-none shadow-xs" maxLength={4} required />
              </div>
              <button type="submit" className="w-full min-h-[50px] rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-98 transition-transform shadow-xs">
                <Check className="w-5 h-5 stroke-[3]" /><span>{authMode === 'signin' ? uiText(language, 'verifyOpenPortal') : uiText(language, 'verifySetProfile')}</span>
              </button>
            </motion.form>
          )}


          {/* Explanation badge about 1-time setup */}
          <div className="text-center pt-0.5">
            <span className="text-[11px] text-slate-500 block">
              {authMode === 'signin'
                ? `✓ ${uiText(language, 'existingAccounts')}`
                : `ℹ�? ${uiText(language, 'profileOneTime')}`}
            </span>
          </div>
        </div>
      </div>

      {/* 5. FOOTER TRUST BADGE */}
      <div className="py-1 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-semibold">
        <ShieldCheck className="w-4 h-4 text-blue-600" />
        <span>{uiText(language, 'registryVerified')}</span>
      </div>
    </div>
  );
};
