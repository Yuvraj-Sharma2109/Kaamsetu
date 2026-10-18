import React, { useState } from 'react';
import { Transaction, Language, WorkerProfile } from '../../types';
import { getTranslation } from '../../utils/i18n';
import { aiLabel } from '../../utils/aiLabels';
import { localizeDate, localizeTransactionTitle, uiText } from '../../utils/uiText';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  ShieldCheck, 
  Download, 
  CheckCircle2, 
  CreditCard,
  Building,
  Bot,
  X
} from 'lucide-react';

interface EarningsScreenProps {
  walletBalance: number;
  monthlyEarnings: number;
  daysWorked: number;
  transactions: Transaction[];
  language: Language;
  worker: WorkerProfile;
  onWithdraw: (amount: number, method: string) => void;
}

export const EarningsScreen: React.FC<EarningsScreenProps> = ({
  walletBalance,
  monthlyEarnings,
  daysWorked,
  transactions,
  language,
  worker,
  onWithdraw,
}) => {
  const t = getTranslation(language);
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('2000');
  const [withdrawMethod, setWithdrawMethod] = useState<'bank' | 'upi' | 'post_office'>('bank');
  const [withdrawSuccess, setWithdrawSuccess] = useState<boolean>(false);

  const handleSpeakEarnings = () => window.dispatchEvent(new Event('kaamsetu:open-ai-assistant'));

  const handleExecuteWithdraw = () => {
    const amt = parseFloat(withdrawAmount) || 0;
    if (amt > 0 && amt <= walletBalance) {
      onWithdraw(amt, withdrawMethod);
      setWithdrawSuccess(true);
      setTimeout(() => {
        setWithdrawSuccess(false);
        setShowWithdrawModal(false);
      }, 1500);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-[393px] flex-1 grid-cols-1 content-start gap-3 p-4 pb-[112px] select-none bg-[#f1f1f1] font-sans md:max-w-2xl md:grid-cols-2 md:gap-4 lg:max-w-5xl">
      {/* 1. HERO BALANCE CARD (Borderless White Card) */}
      <div className="bg-white rounded-3xl p-5 shadow-sm space-y-3 md:h-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold shadow-xs">
              <Wallet className="w-4 h-4 text-blue-300" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">
              {uiText(language, 'availableBalance')}
            </span>
          </div>

          <button
            onClick={handleSpeakEarnings}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs transition-colors shadow-xs"
            title={aiLabel(language).title}
          >
            <Bot className="w-4 h-4 text-blue-600" />
          </button>
        </div>

        {/* Big Balance Number */}
        <div>
          <div className="text-3xl font-black text-neutral-900 font-mono tracking-tight">
            ₹{walletBalance.toLocaleString('en-IN')}
          </div>
          <span className="text-xs font-bold text-blue-900 mt-0.5 block">
            ✓ {uiText(language, 'instantTransferReady')}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="min-h-[46px] rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform"
          >
            <ArrowUpRight className="w-4 h-4 text-blue-300" />
            <span>{uiText(language, 'withdraw')}</span>
          </button>

          <button
            onClick={() => setShowCertificateModal(true)}
            className="min-h-[46px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-xs"
          >
            <FileText className="w-4 h-4 text-slate-600" />
            <span>{uiText(language, 'incomeSlip')}</span>
          </button>
        </div>
      </div>

      {/* 2. STATS STRIP (Borderless) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-2xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">
            {uiText(language, 'thisMonth')}
          </span>
          <span className="text-lg font-black text-neutral-900 font-mono mt-0.5 block">
            ₹{monthlyEarnings.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-blue-900 font-bold block">
            {daysWorked} {uiText(language, 'daysWorked')}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">
            {uiText(language, 'escrowDirect')}
          </span>
          <span className="text-lg font-black text-blue-900 font-mono mt-0.5 block">
            100%
          </span>
          <span className="text-[10px] text-slate-400 font-semibold block">
            {uiText(language, 'noCommission')}
          </span>
        </div>
      </div>

      {/* 3. RECENT PAYOUTS LIST (Borderless) */}
      <div className="space-y-2 md:col-span-2">
        <span className="text-xs font-black text-neutral-900 px-1 block">
          {uiText(language, 'recentPayouts')}
        </span>

        <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-white rounded-2xl p-3.5 flex items-center justify-between shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                  tx.type === 'credit'
                    ? 'bg-blue-50 text-blue-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {tx.type === 'credit' ? (
                    <ArrowDownLeft className="w-4 h-4 text-blue-600" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-slate-600" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-black text-neutral-900 block truncate max-w-[170px]">
                    {localizeTransactionTitle(tx.id, tx.title, tx.titleHi, language)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {localizeDate(tx.date, language)} · {tx.status === 'settled' ? uiText(language, 'completed') : uiText(language, 'pending')}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className={`text-sm font-black font-mono block ${
                  tx.type === 'credit' ? 'text-blue-900' : 'text-neutral-900'
                }`}>
                  {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-bold">
                  {tx.paymentMode}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WITHDRAW MODAL (Borderless) */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-base font-black text-neutral-900">
                {uiText(language, 'withdrawToBank')}
              </h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="p-1 text-slate-400 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {withdrawSuccess ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-14 h-14 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-base font-black text-neutral-900">
                  {uiText(language, 'transferSuccess')}
                </h4>
                <p className="text-xs text-slate-500">₹{withdrawAmount} {uiText(language, 'sentToBank')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    {uiText(language, 'withdrawAmount')}
                  </label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    max={walletBalance}
                    className="w-full bg-slate-100 rounded-xl px-4 py-2.5 text-2xl font-black font-mono text-neutral-900 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-500 block mt-1">
                    {uiText(language, 'balance')} <strong className="text-neutral-900">₹{walletBalance}</strong>
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="flex gap-2">
                  {[500, 1000, 2000, walletBalance].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setWithdrawAmount(preset.toString())}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-mono font-bold text-slate-800 shadow-xs"
                    >
                      ₹{preset}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleExecuteWithdraw}
                  className="w-full min-h-[48px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm active:scale-95 transition-transform shadow-xs"
                >
                  {uiText(language, 'confirmTransfer')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INCOME CERTIFICATE MODAL */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-sm font-black text-neutral-900">
                {uiText(language, 'verifiedIncome')}
              </h3>
              <button onClick={() => setShowCertificateModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-neutral-900 block">{worker.name}</span>
              <span className="text-slate-500 block">{uiText(language, 'registryId')} {worker.id}</span>
              <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">{uiText(language, 'jobsCompleted')}</span><strong className="text-neutral-900">{worker.totalJobsCompleted}</strong></div>
                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">{uiText(language, 'daysThisMonth')}</span><strong className="text-neutral-900">{daysWorked}</strong></div>
                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">{uiText(language, 'earningsThisMonth')}</span><strong className="font-mono text-blue-900">₹{monthlyEarnings.toLocaleString('en-IN')}</strong></div>
                <div className="flex items-center justify-between gap-3"><span className="text-slate-500">{uiText(language, 'availableBalance')}</span><strong className="font-mono text-neutral-900">₹{walletBalance.toLocaleString('en-IN')}</strong></div>
              </div>
              {worker.totalJobsCompleted === 0 && <p className="pt-2 text-[11px] font-medium text-slate-500">{uiText(language, 'noJobsYet')}</p>}
            </div>
            <button
              onClick={() => setShowCertificateModal(false)}
              className="w-full min-h-[44px] rounded-xl bg-neutral-900 text-white font-bold text-xs"
            >
              {uiText(language, 'close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
