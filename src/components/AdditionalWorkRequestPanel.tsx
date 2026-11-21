import React, { useMemo, useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, Clock3, FilePlus2, Package, Plus, Send, Wrench } from 'lucide-react';
import type { AdditionalWorkEvidence, AdditionalWorkRequest, Job, Language } from '../types';

type RequestDraft = Omit<AdditionalWorkRequest, 'id' | 'status' | 'createdAt' | 'confirmedAt'>;

interface AdditionalWorkRequestPanelProps {
  job: Job;
  pricingJobs: Job[];
  language: Language;
  requests: AdditionalWorkRequest[];
  onSubmit: (draft: RequestDraft) => void;
  onConfirm: (requestId: string) => void;
}

const currency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
const toDataUrl = (file: File) => new Promise<AdditionalWorkEvidence>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string'
    ? resolve({ name: file.name, mimeType: file.type, dataUrl: reader.result })
    : reject(new Error('Could not read that file.'));
  reader.onerror = () => reject(new Error('Could not read that file.'));
  reader.readAsDataURL(file);
});

const getSuggestedRange = (job: Job, pricingJobs: Job[]) => {
  const comparable = pricingJobs
    .filter((item) => item.trade === job.trade && item.wageType === job.wageType)
    .map((item) => item.agreedAmount)
    .filter((amount) => amount > 0)
    .sort((a, b) => a - b);
  const rates = comparable.length ? comparable : [job.agreedAmount];
  const middle = Math.floor(rates.length / 2);
  const median = rates.length % 2 ? rates[middle] : (rates[middle - 1] + rates[middle]) / 2;
  const lowFactor = job.wageType === 'hourly' ? 0.5 : job.wageType === 'task' ? 0.1 : 0.25;
  const highFactor = job.wageType === 'hourly' ? 2 : job.wageType === 'task' ? 0.35 : 0.5;
  return {
    min: Math.max(50, Math.floor((median * lowFactor) / 50) * 50),
    max: Math.max(100, Math.ceil((median * highFactor) / 50) * 50),
  };
};

const STATUS: Record<Language, Record<AdditionalWorkRequest['status'], string>> = {
  en: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
  hi: { pending: 'लंबित', approved: 'स्वीकृत', rejected: 'अस्वीकृत' },
  bn: { pending: 'অপেক্ষমাণ', approved: 'অনুমোদিত', rejected: 'প্রত্যাখ্যাত' },
  mr: { pending: 'प्रलंबित', approved: 'मंजूर', rejected: 'नाकारले' },
  te: { pending: 'పెండింగ్', approved: 'ఆమోదించబడింది', rejected: 'తిరస్కరించబడింది' },
};

export const AdditionalWorkRequestPanel: React.FC<AdditionalWorkRequestPanelProps> = ({
  job, pricingJobs, language, requests, onSubmit, onConfirm,
}) => {
  const range = useMemo(() => getSuggestedRange(job, pricingJobs), [job, pricingJobs]);
  const [formOpen, setFormOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [proposedLabour, setProposedLabour] = useState(range.min);
  const [materialEstimate, setMaterialEstimate] = useState('');
  const [evidence, setEvidence] = useState<AdditionalWorkEvidence[]>([]);
  const [error, setError] = useState('');
  const requestAwaitingAction = requests.find((request) => request.status === 'pending' || (request.status === 'approved' && !request.confirmedAt));
  const canStartNew = !requestAwaitingAction;

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const picked = Array.from(files);
    if (picked.some((file) => !file.type.startsWith('image/') && !file.type.startsWith('video/'))) {
      setError('Choose a photo or video.');
      return;
    }
    if (picked.reduce((size, file) => size + file.size, evidence.reduce((size, item) => size + Math.ceil(item.dataUrl.length * 0.75), 0)) > 2 * 1024 * 1024) {
      setError('Keep the combined evidence under 2 MB for this demo.');
      return;
    }
    try {
      const loaded = await Promise.all(picked.map(toDataUrl));
      setEvidence((current) => [...current, ...loaded]);
      setError('');
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'Could not load the selected file.');
    }
  };

  const submitRequest = () => {
    if (!description.trim() || evidence.length === 0 || proposedLabour < range.min || proposedLabour > range.max) return;
    onSubmit({
      description: description.trim(), evidence,
      suggestedLabourMin: range.min, suggestedLabourMax: range.max,
      proposedLabour, materialEstimate: Math.max(0, Number(materialEstimate) || 0),
    });
    setDescription('');
    setMaterialEstimate('');
    setEvidence([]);
    setError('');
    setFormOpen(false);
  };

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm" aria-label="Additional work requests">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Wrench className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-slate-900">Additional work</h3>
          <p className="text-[11px] text-slate-500">Request customer approval before doing extra work.</p>
        </div>
        {canStartNew && <button type="button" onClick={() => setFormOpen((open) => !open)} aria-expanded={formOpen} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#2d59f0] px-3 text-xs font-bold text-white"><Plus className="h-4 w-4" /> Report</button>}
      </div>

      {requests.length > 0 && <div className="mt-3 space-y-2">
        {requests.map((request) => {
          const statusStyle = request.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : request.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800';
          return <article key={request.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${statusStyle}`}>
                {request.status === 'approved' ? <CheckCircle2 className="h-3 w-3" /> : request.status === 'rejected' ? <AlertCircle className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                {STATUS[language][request.status]}
              </span>
              <span className="text-[10px] text-slate-500">{request.evidence.length} attachment{request.evidence.length === 1 ? '' : 's'}</span>
            </div>
            <p className="mt-2 text-xs font-bold text-slate-900">{request.description}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-white p-2"><span className="block text-slate-500">Labour</span><strong className="text-slate-900">{currency(request.proposedLabour)}</strong></div>
              <div className="rounded-lg bg-white p-2"><span className="block text-slate-500">Materials estimate</span><strong className="text-slate-900">{currency(request.materialEstimate)}</strong></div>
            </div>
            {request.status === 'pending' && <p className="mt-2 text-[10px] font-medium text-amber-800">Pending on this device. Customer approval updates are not connected yet; do not begin this extra work.</p>}
            {request.status === 'approved' && !request.confirmedAt && <div className="mt-2 rounded-lg bg-emerald-50 p-2.5">
              <p className="text-[11px] font-semibold text-emerald-900">Customer approved the request. Confirm these separate labour and material amounts before starting.</p>
              <button type="button" onClick={() => onConfirm(request.id)} className="mt-2 min-h-10 w-full rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white">Confirm and start additional work</button>
            </div>}
            {request.status === 'approved' && request.confirmedAt && <p className="mt-2 text-[11px] font-bold text-emerald-800">Approved price confirmed. Additional work may proceed.</p>}
            {request.status === 'rejected' && <p className="mt-2 text-[11px] font-semibold text-slate-700">The additional request was rejected. You can continue the original job at its agreed price.</p>}
          </article>;
        })}
      </div>}

      {formOpen && canStartNew && <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
        <div>
          <label htmlFor="additional-work-description" className="mb-1 block text-xs font-bold text-slate-700">Describe the unexpected work</label>
          <textarea id="additional-work-description" value={description} onChange={(event) => setDescription(event.target.value.slice(0, 500))} maxLength={500} rows={3} placeholder="What damage or extra work did you find?" className="w-full resize-none rounded-xl bg-slate-100 p-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-3 text-xs font-bold text-blue-800">
            <Camera className="h-4 w-4" /><FilePlus2 className="h-4 w-4" /> Add photo or video
            <input type="file" accept="image/*,video/*" multiple capture="environment" className="sr-only" onChange={(event) => { void handleFiles(event.currentTarget.files); event.currentTarget.value = ''; }} />
          </label>
          {evidence.length > 0 && <div className="mt-2 space-y-1">{evidence.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700"><span className="min-w-0 flex-1 truncate">{file.name}</span><span className="shrink-0 text-slate-500">{file.mimeType.startsWith('video/') ? 'Video' : 'Photo'}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setEvidence((items) => items.filter((_, fileIndex) => fileIndex !== index))} className="px-1 font-black text-rose-600">×</button></div>)}</div>}
          <p className="mt-1 text-[10px] text-slate-500">Photos and videos are evidence for the customer’s review.</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800"><Wrench className="h-4 w-4 text-blue-700" /> Suggested labour range</div>
          <p className="mt-1 text-lg font-black text-blue-900">{currency(range.min)} – {currency(range.max)}</p>
          <p className="text-[10px] text-slate-600">Estimated from comparable {job.trade} job rates in this app. Final amount needs customer approval.</p>
          <label htmlFor="additional-labour" className="mt-3 block text-xs font-bold text-slate-700">Your proposed labour charge</label>
          <div className="mt-1 flex items-center rounded-lg bg-white px-3"><span className="font-bold text-slate-500">₹</span><input id="additional-labour" type="number" inputMode="numeric" min={range.min} max={range.max} step={50} value={proposedLabour} onChange={(event) => setProposedLabour(Number(event.target.value))} className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm font-black text-slate-900 outline-none" /></div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <label htmlFor="additional-materials" className="flex items-center gap-2 text-xs font-bold text-slate-800"><Package className="h-4 w-4 text-slate-600" /> Materials / spare parts estimate</label>
          <div className="mt-2 flex items-center rounded-lg bg-slate-100 px-3"><span className="font-bold text-slate-500">₹</span><input id="additional-materials" type="number" inputMode="numeric" min="0" step="10" value={materialEstimate} onChange={(event) => setMaterialEstimate(event.target.value.replace(/\D/g, '').slice(0, 7))} placeholder="0" className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm font-bold text-slate-900 outline-none" /></div>
          <p className="mt-1 text-[10px] text-slate-500">Kept separate from labour and sent for approval as a separate estimate.</p>
        </div>
        {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => { setFormOpen(false); setError(''); }} className="min-h-11 flex-1 rounded-xl bg-slate-100 text-xs font-bold text-slate-700">Cancel</button>
          <button type="button" disabled={!description.trim() || evidence.length === 0 || proposedLabour < range.min || proposedLabour > range.max} onClick={submitRequest} className="flex min-h-11 flex-[1.4] items-center justify-center gap-2 rounded-xl bg-[#2d59f0] px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"><Send className="h-4 w-4" /> Submit request</button>
        </div>
      </div>}
    </section>
  );
};
