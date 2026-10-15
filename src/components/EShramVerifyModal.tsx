import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, ShieldCheck } from 'lucide-react';

interface EShramVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerifySuccess: () => void;
}

export const EShramVerifyModal: React.FC<EShramVerifyModalProps> = ({ isOpen, onClose, onVerifySuccess }) => {
  const [uan, setUan] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const verify = (event: React.FormEvent) => {
    event.preventDefault();
    if (uan.replace(/\D/g, '').length !== 12) return setError('Enter the 12-digit UAN on your e-Shram card.');
    if (!otpSent) return setOtpSent(true);
    if (otp !== '6184') return setError('For this demo, enter OTP 6184.');
    onVerifySuccess();
    setUan(''); setOtp(''); setOtpSent(false); setError('');
  };

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }} className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 p-3"><motion.form initial={{ y: 36 }} animate={{ y: 0 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }} onSubmit={verify} className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl space-y-4">
    <header className="flex items-start justify-between"><div><ShieldCheck className="h-7 w-7 text-blue-700" /><h2 className="mt-2 text-lg font-black text-slate-950">e-Shram card verification</h2><p className="mt-1 text-xs text-slate-500">Enter the UAN printed on your e-Shram card.</p></div><button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></header>
    <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-700">12-digit UAN</span><input className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-blue-500" inputMode="numeric" maxLength={12} value={uan} onChange={(event) => { setUan(event.target.value.replace(/\D/g, '').slice(0, 12)); setError(''); }} placeholder="Enter UAN" /></label>
    {otpSent && <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-700">OTP (demo: 6184)</span><input className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-blue-500" inputMode="numeric" maxLength={4} value={otp} onChange={(event) => { setOtp(event.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }} placeholder="4-digit OTP" /></label>}
    {error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
    <button type="submit" className="w-full rounded-xl bg-blue-700 py-3.5 text-sm font-black text-white">{otpSent ? 'Verify e-Shram card' : 'Send OTP'}</button>
  </motion.form></motion.div>;
};
