import React, { useEffect, useState } from 'react';
import { WorkerProfile, Language, TradeCategory } from '../../types';
import { TRADES } from '../../data/mockData';
import { LanguageDropdown } from '../LanguageDropdown';
import { localizeTradeName } from '../../utils/uiText';
import { getLinkedSocialProviders, hasLinkedPhoneProvider, isFirebaseConfigured, linkSocialProvider, linkVerifiedPhone, sendPhoneLinkOtp } from '../../utils/firebaseAuth';
import { Star, LogOut, Languages, Phone, IdCard, CheckCircle2, History, Hammer, AlertCircle, Settings, Bot } from 'lucide-react';

const PROFILE_COPY: Record<Language, { settings: string; appLanguage: string; assistant: string; assistantHelp: string; aadhaar: string; verified: string; verify: string; experience: string; jobs: string; rating: string; workType: string; logout: string; clearDemo: string; socialMethods: string; connectGoogle: string; connectFacebook: string; connected: string; connect: string; connecting: string }> = {
  en: { settings: 'Settings', appLanguage: 'App language', assistant: 'AI assistance', assistantHelp: 'Ask about jobs, payments, or your account', aadhaar: 'Aadhaar', verified: 'Verified', verify: 'Not verified · Verify', experience: 'Experience', jobs: 'Jobs', rating: 'Rating', workType: 'Work Type', logout: 'Log Out / Switch Worker', clearDemo: 'Clear Demo Data', socialMethods: 'Social sign-in methods', connectGoogle: 'Connect Google', connectFacebook: 'Connect Facebook', connected: 'Connected', connect: 'Connect', connecting: 'Connecting…' },
  hi: { settings: 'सेटिंग्स', appLanguage: 'ऐप की भाषा', assistant: 'AI सहायता', assistantHelp: 'काम, भुगतान या खाते के बारे में पूछें', aadhaar: 'आधार', verified: 'सत्यापित', verify: 'सत्यापित नहीं · सत्यापित करें', experience: 'अनुभव', jobs: 'काम', rating: 'रेटिंग', workType: 'काम के प्रकार', logout: 'लॉग आउट / श्रमिक बदलें', clearDemo: 'डेमो डेटा हटाएँ', socialMethods: 'सोशल लॉगिन तरीके', connectGoogle: 'Google जोड़ें', connectFacebook: 'Facebook जोड़ें', connected: 'जुड़ा हुआ', connect: 'जोड़ें', connecting: 'जोड़ रहे हैं…' },
  bn: { settings: 'সেটিংস', appLanguage: 'অ্যাপের ভাষা', assistant: 'AI সহায়তা', assistantHelp: 'কাজ, পেমেন্ট বা অ্যাকাউন্ট সম্পর্কে জিজ্ঞাসা করুন', aadhaar: 'আধার', verified: 'যাচাইকৃত', verify: 'যাচাই হয়নি · যাচাই করুন', experience: 'অভিজ্ঞতা', jobs: 'কাজ', rating: 'রেটিং', workType: 'কাজের ধরন', logout: 'লগ আউট / কর্মী বদলান', clearDemo: 'ডেমো ডেটা মুছুন', socialMethods: 'সোশ্যাল লগইন পদ্ধতি', connectGoogle: 'Google যুক্ত করুন', connectFacebook: 'Facebook যুক্ত করুন', connected: 'যুক্ত হয়েছে', connect: 'যুক্ত করুন', connecting: 'যুক্ত হচ্ছে…' },
  mr: { settings: 'सेटिंग्ज', appLanguage: 'अ‍ॅपची भाषा', assistant: 'AI सहाय्य', assistantHelp: 'काम, पेमेंट किंवा खात्याबद्दल विचारा', aadhaar: 'आधार', verified: 'पडताळले', verify: 'पडताळलेले नाही · पडताळा', experience: 'अनुभव', jobs: 'कामे', rating: 'रेटिंग', workType: 'कामाचे प्रकार', logout: 'लॉग आउट / कामगार बदला', clearDemo: 'डेमो डेटा हटवा', socialMethods: 'सोशल लॉगिन पद्धती', connectGoogle: 'Google जोडा', connectFacebook: 'Facebook जोडा', connected: 'जोडलेले', connect: 'जोडा', connecting: 'जोडत आहे…' },
  te: { settings: 'సెట్టింగ్‌లు', appLanguage: 'యాప్ భాష', assistant: 'AI సహాయం', assistantHelp: 'పని, చెల్లింపులు లేదా ఖాతా గురించి అడగండి', aadhaar: 'ఆధార్', verified: 'ధృవీకరించబడింది', verify: 'ధృవీకరించలేదు · ధృవీకరించండి', experience: 'అనుభవం', jobs: 'పనులు', rating: 'రేటింగ్', workType: 'పని రకాలు', logout: 'లాగ్ అవుట్ / కార్మికుడిని మార్చండి', clearDemo: 'డెమో డేటాను తొలగించండి', socialMethods: 'సోషల్ సైన్-ఇన్ పద్ధతులు', connectGoogle: 'Google‌ను కనెక్ట్ చేయండి', connectFacebook: 'Facebook‌ను కనెక్ట్ చేయండి', connected: 'కనెక్ట్ అయింది', connect: 'కనెక్ట్ చేయండి', connecting: 'కనెక్ట్ అవుతోంది…' },
};

interface ProfileScreenProps {
  worker: WorkerProfile;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onAddTrade: (trade: TradeCategory) => void;
  onLogout?: () => void;
  onClearDemoData?: () => void;
  onOpenAadhaarModal?: () => void;
  showSettings: boolean;
  audioActive: boolean;
  onToggleAudio: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  worker,
  language,
  onLanguageChange,
  onAddTrade,
  onLogout,
  onClearDemoData,
  onOpenAadhaarModal,
  showSettings,
  onToggleAudio,
}) => {
  const [showTradePicker, setShowTradePicker] = useState(false);
  const [linkedProviders, setLinkedProviders] = useState<Array<'google' | 'facebook'>>([]);
  const [linkingProvider, setLinkingProvider] = useState<'google' | 'facebook' | null>(null);
  const [linkError, setLinkError] = useState('');
  const [phoneLinked, setPhoneLinked] = useState(false);
  const [phoneLinkCodeId, setPhoneLinkCodeId] = useState('');
  const [phoneLinkOtp, setPhoneLinkOtp] = useState('');
  const [phoneLinkBusy, setPhoneLinkBusy] = useState(false);
  const [phoneLinkMessage, setPhoneLinkMessage] = useState('');
  const copy = PROFILE_COPY[language];
  const primaryTrade = TRADES.find((trade) => trade.id === worker.primaryTrade) ?? TRADES[0];
  const registeredTrades = [worker.primaryTrade, ...worker.secondaryTrades];

  useEffect(() => {
    if (!showSettings || !isFirebaseConfigured()) return;
    let active = true;
    void Promise.all([getLinkedSocialProviders(), hasLinkedPhoneProvider()]).then(([providers, hasPhone]) => {
      if (active) { setLinkedProviders(providers); setPhoneLinked(hasPhone); }
    }).catch(() => {
      if (active) setLinkedProviders([]);
    });
    return () => { active = false; };
  }, [showSettings]);

  const handleSendPhoneLinkOtp = async () => {
    const digits = worker.phone.replace(/\D/g, '');
    const e164 = digits.length === 10 ? `+91${digits}` : digits.startsWith('91') ? `+${digits}` : '';
    if (!e164) {
      setPhoneLinkMessage('Add a valid 10-digit Indian mobile number during profile setup first.');
      return;
    }
    setPhoneLinkBusy(true);
    setPhoneLinkMessage('');
    try {
      const verificationId = await sendPhoneLinkOtp(e164, language, 'profile-phone-recaptcha');
      setPhoneLinkCodeId(verificationId);
      setPhoneLinkMessage(`Verification code sent to ${e164}.`);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      setPhoneLinkMessage(code ? `Could not send verification code (${code}).` : 'Could not send verification code. Try again.');
    } finally {
      setPhoneLinkBusy(false);
    }
  };

  const handleVerifyPhoneLink = async () => {
    setPhoneLinkBusy(true);
    setPhoneLinkMessage('');
    try {
      const user = await linkVerifiedPhone(phoneLinkCodeId, phoneLinkOtp);
      setPhoneLinked(user.providerData.some(({ providerId }) => providerId === 'phone'));
      setPhoneLinkCodeId('');
      setPhoneLinkOtp('');
      setPhoneLinkMessage('Verified mobile number linked to this account.');
    } catch (error) {
      const code = (error as { code?: string })?.code;
      setPhoneLinkMessage(code === 'auth/credential-already-in-use'
        ? 'This phone number belongs to a different account. Sign in with that number first.'
        : code === 'auth/invalid-verification-code' ? 'That verification code is incorrect.'
          : code ? `Could not verify the phone number (${code}).` : 'Could not verify the phone number. Try again.');
    } finally {
      setPhoneLinkBusy(false);
    }
  };

  const handleLinkProvider = async (provider: 'google' | 'facebook') => {
    setLinkingProvider(provider);
    setLinkError('');
    try {
      const user = await linkSocialProvider(provider, language);
      if (!user) return;
      setLinkedProviders(user.providerData.flatMap(({ providerId }) =>
        providerId === 'google.com' ? ['google' as const]
          : providerId === 'facebook.com' ? ['facebook' as const]
            : [],
      ));
    } catch (error) {
      const code = (error as { code?: string })?.code;
      setLinkError(code === 'auth/credential-already-in-use'
        ? 'That social account is already linked to another KaamSetu sign-in. Sign in to that account first.'
        : code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'
          ? 'Account linking was cancelled.'
          : code === 'kaamsetu/firebase-user-required'
            ? 'Sign in with Google or Facebook before linking another provider.'
            : code ? `Could not link the account (${code}).` : 'Could not link the account. Please try again.');
    } finally {
      setLinkingProvider(null);
    }
  };

  if (showSettings) {
    return (
      <div id="profile-scroll" className="mx-auto flex min-h-0 w-full max-w-[393px] flex-1 flex-col gap-[15px] overflow-y-auto bg-[#f1f1f1] px-4 pb-[112px] pt-[76px] font-sans scrollbar-none md:max-w-2xl lg:max-w-5xl">
        <section className="w-full rounded-[20px] bg-white p-4">
          <div className="mb-4 flex items-center gap-2"><Settings className="h-5 w-5 text-blue-600" /><h2 className="text-base font-black text-slate-900">{copy.settings}</h2></div>
          <div className="space-y-2 rounded-xl bg-[#f1f1f1] p-3">
            <div className="flex items-center gap-2"><Languages className="h-4 w-4 text-slate-700" /><span className="text-xs font-bold text-slate-900">{copy.appLanguage}</span></div>
            <LanguageDropdown currentLanguage={language} onLanguageChange={onLanguageChange} variant="full" />
          </div>
          <button type="button" onClick={onToggleAudio} className="flex min-h-[58px] w-full items-center gap-3 rounded-xl bg-[#f1f1f1] px-3 text-left hover:bg-slate-200">
            <Bot className="h-5 w-5 shrink-0 text-blue-700" />
            <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-900">{copy.assistant}</span><span className="block text-[11px] text-slate-500">{copy.assistantHelp}</span></span>
            <span className="rounded-full bg-blue-700 px-3 py-1.5 text-[11px] font-bold text-white">{language === 'en' ? 'Open' : language === 'hi' ? 'खोलें' : language === 'bn' ? 'খুলুন' : language === 'mr' ? 'उघडा' : 'తెరవండి'}</span>
          </button>
          {isFirebaseConfigured() && <div className="space-y-2 rounded-xl bg-[#f1f1f1] p-3">
            <h3 className="text-xs font-bold text-slate-900">{copy.socialMethods}</h3>
            {(['google', 'facebook'] as const).map((provider) => {
              const connected = linkedProviders.includes(provider);
              return <button key={provider} type="button" disabled={connected || linkingProvider !== null} onClick={() => void handleLinkProvider(provider)} className="flex min-h-11 w-full items-center justify-between rounded-lg bg-white px-3 text-left text-xs font-bold text-slate-800 disabled:opacity-60">
                <span>{provider === 'google' ? copy.connectGoogle : copy.connectFacebook}</span>
                <span className={connected ? 'text-emerald-700' : 'text-blue-700'}>{connected ? copy.connected : linkingProvider === provider ? copy.connecting : copy.connect}</span>
              </button>;
            })}
            {linkError && <p role="alert" className="text-xs font-semibold text-rose-700">{linkError}</p>}
          </div>}
          {isFirebaseConfigured() && <div className="space-y-2 rounded-xl bg-[#f1f1f1] p-3">
            <h3 className="text-xs font-bold text-slate-900">Verified phone sign-in</h3>
            {phoneLinked ? <p className="text-xs font-semibold text-emerald-700">Mobile number is linked to this account.</p> : <>
              <p className="text-[11px] text-slate-600">Link the profile mobile number after verifying its SMS code. {worker.phone}</p>
              {!phoneLinkCodeId ? <button type="button" disabled={phoneLinkBusy} onClick={() => void handleSendPhoneLinkOtp()} className="min-h-10 w-full rounded-lg bg-white px-3 text-left text-xs font-bold text-blue-700 disabled:opacity-60">{phoneLinkBusy ? 'Sending code…' : 'Send verification code'}</button> : <div className="flex gap-2">
                <input aria-label="SMS verification code" inputMode="numeric" autoComplete="one-time-code" value={phoneLinkOtp} onChange={(event) => setPhoneLinkOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-sm font-bold tracking-widest" placeholder="SMS code" />
                <button type="button" disabled={phoneLinkBusy || phoneLinkOtp.length < 4} onClick={() => void handleVerifyPhoneLink()} className="rounded-lg bg-blue-700 px-3 text-xs font-bold text-white disabled:opacity-50">{phoneLinkBusy ? 'Verifying…' : 'Verify & link'}</button>
              </div>}
              <div id="profile-phone-recaptcha" />
            </>}
            {phoneLinkMessage && <p role="status" className="text-xs font-semibold text-slate-700">{phoneLinkMessage}</p>}
          </div>}
        </section>
      </div>
    );
  }

  return (
    <div id="profile-scroll" className="mx-auto grid min-h-0 w-full max-w-[393px] flex-1 grid-cols-1 content-start gap-[15px] overflow-y-auto bg-[#f1f1f1] px-4 pb-[112px] font-sans scrollbar-none md:max-w-2xl md:grid-cols-2 lg:max-w-5xl">
      <section className="relative h-[285px] w-full shrink-0 rounded-[20px] bg-white md:col-span-2 md:flex md:h-auto md:min-h-[180px] md:items-center md:gap-8 md:px-8 md:py-6">
        <img src={worker.authPhotoURL || '/figma/account_raw_1.jpeg'} onError={(event) => { event.currentTarget.src = '/figma/account_raw_1.jpeg'; }} alt="Worker profile" className="absolute left-1/2 top-[26px] h-[92px] w-[92px] -translate-x-1/2 rounded-full object-cover shadow-md md:static md:shrink-0 md:translate-x-0" />
        <h2 className="absolute inset-x-3 top-[134px] text-center text-lg font-bold text-black md:static md:inset-auto md:min-w-0 md:flex-1 md:text-left">{worker.name}</h2>
        <div className="absolute inset-x-[15px] top-[171px] min-h-[97px] rounded-[20px] bg-[#f1f1f1] px-[5px] md:static md:h-auto md:min-w-0 md:flex-1">
          <div className="flex h-[57px] items-center gap-3 border-b border-[#b5b5b5] px-1.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white"><Phone className="h-5 w-5 text-black" /></span>
            <span className="text-sm font-medium text-black">{worker.phone}</span>
          </div>
          <button type="button" onClick={onOpenAadhaarModal} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-1.5 text-left hover:bg-white/70"><IdCard className="h-4 w-4 shrink-0 text-slate-700" /><span className="flex-1 text-xs font-bold text-slate-900">{copy.aadhaar}</span>{worker.isKycVerified ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />{copy.verified}</span> : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700"><AlertCircle className="h-3 w-3" />{copy.verify}</span>}</button>
        </div>
      </section>

      <section className="grid h-[119px] w-full shrink-0 grid-cols-3 gap-[15px] rounded-[20px] bg-white p-[15px] text-center md:col-span-2 md:h-auto">
        <div className="flex h-[89px] flex-col items-center rounded-lg bg-[#f1f1f1] pt-[11px]"><History className="mb-1 h-6 w-6 text-black" /><span className="text-[12px] font-semibold text-[#8a8a8a]">{copy.experience}</span><span className="mt-1 text-sm font-bold text-[#2d59f0]">{worker.experienceYears}+</span></div>
        <div className="flex h-[89px] flex-col items-center rounded-lg bg-[#f1f1f1] pt-[11px]"><Hammer className="mb-1 h-6 w-6 text-black" /><span className="text-[12px] font-semibold text-[#8a8a8a]">{copy.jobs}</span><span className="mt-1 text-sm font-bold text-[#2d59f0]">{worker.totalJobsCompleted}</span></div>
        <div className="flex h-[89px] flex-col items-center rounded-lg bg-[#f1f1f1] pt-[11px]"><Star className="mb-1 h-6 w-6 fill-black text-black" /><span className="text-[12px] font-semibold text-[#8a8a8a]">{copy.rating}</span><span className="mt-1 flex items-center gap-1 text-sm font-bold text-[#2d59f0]">{worker.rating}</span></div>
      </section>

      <section aria-label="Registered work trades" className="min-h-[197px] w-full shrink-0 rounded-[20px] bg-white p-[15px]">
        <h3 className="mb-3 text-sm font-bold text-black">{copy.workType}</h3>
        <div className="flex flex-wrap gap-x-[13px] gap-y-[14px]">
          {registeredTrades.map((tradeId) => {
            const trade = TRADES.find((item) => item.id === tradeId);
            if (!trade) return null;
            return <span key={tradeId} className="inline-flex h-10 items-center justify-center rounded-[7px] border-[1.5px] border-black px-[10px] text-[16px] font-semibold text-black">{localizeTradeName(trade.id, language)}</span>;
          })}
          <button type="button" onClick={() => setShowTradePicker((open) => !open)} aria-label="Add registered trade" className="inline-flex h-10 w-10 items-center justify-center rounded-[7px] border-[1.5px] border-dashed border-blue-600 text-2xl leading-none text-blue-700">+</button>
        </div>
        {showTradePicker && <div className="mt-3 flex flex-wrap gap-2">{TRADES.filter((trade) => !registeredTrades.includes(trade.id)).map((trade) => <button type="button" key={trade.id} onClick={() => onAddTrade(trade.id)} className="rounded-[7px] border border-slate-300 bg-white px-2.5 py-2 text-left text-xs font-bold text-slate-800">{localizeTradeName(trade.id, language)}<span className="ml-2 text-blue-700">+</span></button>)}</div>}
      </section>

      {(onLogout || onClearDemoData) && <section aria-label="Account actions" className="mb-2 flex w-full flex-col gap-3 rounded-[20px] bg-white p-[15px]">
        {onLogout && <button onClick={onLogout} className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#f1f1f1] px-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-200"><LogOut className="h-4 w-4 shrink-0 text-slate-500" />{copy.logout}</button>}
        {onClearDemoData && <button onClick={onClearDemoData} className="flex min-h-[50px] w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-2 text-center text-xs font-bold text-rose-700 hover:bg-rose-100">{copy.clearDemo}</button>}
      </section>}
    </div>
  );
};
