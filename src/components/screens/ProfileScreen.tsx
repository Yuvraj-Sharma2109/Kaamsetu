import React, { useState } from 'react';
import { WorkerProfile, Language, TradeCategory } from '../../types';
import { TRADES } from '../../data/mockData';
import { LanguageDropdown } from '../LanguageDropdown';
import { ShieldCheck, Star, LogOut, Languages, Phone, IdCard, CheckCircle2, History, Hammer } from 'lucide-react';

interface ProfileScreenProps {
  worker: WorkerProfile;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onAddTrade: (trade: TradeCategory) => void;
  onLogout?: () => void;
  onClearDemoData?: () => void;
  onOpenAadhaarModal?: () => void;
  onOpenEShramModal?: () => void;
  settingsOpenRequest?: number;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  worker,
  language,
  onLanguageChange,
  onAddTrade,
  onLogout,
  onClearDemoData,
  onOpenAadhaarModal,
  onOpenEShramModal,
  settingsOpenRequest = 0,
}) => {
  const [showTradePicker, setShowTradePicker] = useState(false);
  const primaryTrade = TRADES.find((trade) => trade.id === worker.primaryTrade) ?? TRADES[0];
  const registeredTrades = [worker.primaryTrade, ...worker.secondaryTrades];

  return (
    <div id="profile-scroll" className="mx-auto grid min-h-0 w-full max-w-[393px] flex-1 grid-cols-1 content-start gap-[15px] overflow-y-auto bg-[#f1f1f1] px-4 pb-[112px] font-sans scrollbar-none md:max-w-2xl md:grid-cols-2 lg:max-w-5xl">
      <section className="relative h-[300px] w-full shrink-0 rounded-[20px] bg-white md:col-span-2 md:flex md:h-auto md:min-h-[180px] md:items-center md:gap-8 md:px-8 md:py-6">
        <img src="/figma/account_raw_1.jpeg" alt="Worker profile" className="absolute left-1/2 top-[26px] h-[92px] w-[92px] -translate-x-1/2 rounded-full object-cover shadow-md md:static md:shrink-0 md:translate-x-0" />
        <h2 className="absolute inset-x-3 top-[134px] text-center text-lg font-bold text-black md:static md:inset-auto md:min-w-0 md:flex-1 md:text-left">{worker.name}</h2>
        <div className="absolute inset-x-[15px] top-[171px] h-[114px] rounded-[20px] bg-[#f1f1f1] px-[5px] md:static md:h-auto md:min-w-0 md:flex-1">
          <div className="flex h-[57px] items-center gap-3 border-b border-[#b5b5b5] px-1.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white"><Phone className="h-5 w-5 text-black" /></span>
            <span className="text-sm font-medium text-black">{worker.phone}</span>
          </div>
          <div className="flex h-[57px] items-center gap-3 px-1.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white"><IdCard className="h-5 w-5 text-black" /></span>
            <span className="flex-1 text-sm font-medium text-black">Aadhaar card</span>
            {worker.isKycVerified && <span className="inline-flex items-center gap-1 rounded-md bg-emerald-200 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700"><CheckCircle2 className="h-3 w-3" />Verified</span>}
          </div>
        </div>
      </section>

      <section className="grid h-[119px] w-full shrink-0 grid-cols-3 gap-[15px] rounded-[20px] bg-white p-[15px] text-center md:col-span-2 md:h-auto">
        <div className="flex h-[89px] flex-col items-center rounded-lg bg-[#f1f1f1] pt-[11px]"><History className="mb-1 h-6 w-6 text-black" /><span className="text-[12px] font-semibold text-[#8a8a8a]">Experience</span><span className="mt-1 text-sm font-bold text-[#2d59f0]">{worker.experienceYears}+ Year</span></div>
        <div className="flex h-[89px] flex-col items-center rounded-lg bg-[#f1f1f1] pt-[11px]"><Hammer className="mb-1 h-6 w-6 text-black" /><span className="text-[12px] font-semibold text-[#8a8a8a]">Jobs</span><span className="mt-1 text-sm font-bold text-[#2d59f0]">{worker.totalJobsCompleted}</span></div>
        <div className="flex h-[89px] flex-col items-center rounded-lg bg-[#f1f1f1] pt-[11px]"><Star className="mb-1 h-6 w-6 fill-black text-black" /><span className="text-[12px] font-semibold text-[#8a8a8a]">Rating</span><span className="mt-1 flex items-center gap-1 text-sm font-bold text-[#2d59f0]">{worker.rating}</span></div>
      </section>

      <section aria-label="Registered work trades" className="min-h-[197px] w-full shrink-0 rounded-[20px] bg-white p-[15px]">
        <div className="flex flex-wrap gap-x-[13px] gap-y-[14px]">
          {registeredTrades.map((tradeId) => {
            const trade = TRADES.find((item) => item.id === tradeId);
            if (!trade) return null;
            return <span key={tradeId} className="inline-flex h-10 items-center justify-center rounded-[7px] border-[1.5px] border-black px-[10px] text-[16px] font-semibold text-black">{language === 'hi' ? trade.nameHi : trade.nameEn}</span>;
          })}
          <button type="button" onClick={() => setShowTradePicker((open) => !open)} aria-label="Add registered trade" className="inline-flex h-10 w-10 items-center justify-center rounded-[7px] border-[1.5px] border-dashed border-blue-600 text-2xl leading-none text-blue-700">+</button>
        </div>
        {showTradePicker && <div className="mt-3 flex flex-wrap gap-2">{TRADES.filter((trade) => !registeredTrades.includes(trade.id)).map((trade) => <button type="button" key={trade.id} onClick={() => onAddTrade(trade.id)} className="rounded-[7px] border border-slate-300 bg-white px-2.5 py-2 text-left text-xs font-bold text-slate-800">{language === 'hi' ? trade.nameHi : trade.nameEn}<span className="ml-2 text-blue-700">+</span></button>)}</div>}
      </section>

      <section className="w-full shrink-0 space-y-3 rounded-[20px] bg-white p-4">
        <div><h3 className="text-sm font-black text-slate-900">Identity verification</h3><p className="text-xs text-slate-500">Verify your worker identity cards.</p></div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onOpenAadhaarModal} className="rounded-2xl border border-slate-200 p-3 text-left hover:border-blue-300"><ShieldCheck className={`h-5 w-5 ${worker.isKycVerified ? 'text-emerald-600' : 'text-amber-600'}`} /><span className="mt-2 block text-xs font-black text-slate-900">Aadhaar card</span><span className={`mt-1 block text-[10px] font-bold ${worker.isKycVerified ? 'text-emerald-700' : 'text-amber-700'}`}>{worker.isKycVerified ? 'Verified' : 'Verify card'}</span></button>
          <button type="button" onClick={onOpenEShramModal} className="rounded-2xl border border-slate-200 p-3 text-left hover:border-blue-300"><ShieldCheck className={`h-5 w-5 ${worker.isEShramVerified ? 'text-emerald-600' : 'text-amber-600'}`} /><span className="mt-2 block text-xs font-black text-slate-900">e-Shram card</span><span className={`mt-1 block text-[10px] font-bold ${worker.isEShramVerified ? 'text-emerald-700' : 'text-amber-700'}`}>{worker.isEShramVerified ? 'Verified' : 'Verify card'}</span></button>
        </div>
      </section>

      <section id="profile-settings" className="w-full shrink-0 space-y-3 rounded-[20px] bg-white p-4"><div className="flex items-center gap-2"><Languages className="h-4 w-4 text-blue-600" /><span className="text-xs font-black text-slate-900">App language</span></div><LanguageDropdown currentLanguage={language} onLanguageChange={onLanguageChange} variant="full" openRequest={settingsOpenRequest} /></section>

      {onLogout && <button onClick={onLogout} className="flex min-h-[50px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-white text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100"><LogOut className="h-4 w-4 text-slate-500" />Log Out / Switch Worker</button>}
      {onClearDemoData && <button onClick={onClearDemoData} className="mb-2 flex min-h-[50px] w-full shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100">Clear Demo Data</button>}
    </div>
  );
};
