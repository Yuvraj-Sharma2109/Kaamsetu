import React, { useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, Clock3, FilePlus2, LoaderCircle, Package, Plus, Search, Send, Wrench } from 'lucide-react';
import type { AdditionalWorkEstimate, AdditionalWorkEvidence, AdditionalWorkRequest, Job, Language, TradeCategory } from '../types';
import { TRADES } from '../data/mockData';
import { getFirebaseIdToken } from '../utils/firebaseAuth';

type RequestDraft = Omit<AdditionalWorkRequest, 'id' | 'status' | 'createdAt' | 'confirmedAt'>;
interface Props {
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

const STATUS: Record<Language, Record<AdditionalWorkRequest['status'], string>> = {
  en: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
  hi: { pending: 'लंबित', approved: 'स्वीकृत', rejected: 'अस्वीकृत' },
  bn: { pending: 'অপেক্ষমাণ', approved: 'অনুমোদিত', rejected: 'প্রত্যাখ্যাত' },
  mr: { pending: 'प्रलंबित', approved: 'मंजूर', rejected: 'नाकारले' },
  te: { pending: 'పెండింగ్', approved: 'ఆమోదించబడింది', rejected: 'తిరస్కరించబడింది' },
};

const asEstimate = (value: unknown): AdditionalWorkEstimate | null => {
  if (!value || typeof value !== 'object') return null;
  const e = value as AdditionalWorkEstimate;
  if (e.status === 'estimated' && (!Array.isArray(e.sources) || e.sources.length < 2
    || !Number.isFinite(e.suggestedLabourMin) || !Number.isFinite(e.suggestedLabourMax))) return null;
  return e;
};

export const AdditionalWorkRequestPanel: React.FC<Props> = ({ job, language, requests, onSubmit, onConfirm }) => {
  const [formOpen, setFormOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [workType, setWorkType] = useState<TradeCategory>(job.trade);
  const [location, setLocation] = useState(job.locationAddress);
  const [proposedLabour, setProposedLabour] = useState('');
  const [materialEstimate, setMaterialEstimate] = useState('');
  const [evidence, setEvidence] = useState<AdditionalWorkEvidence[]>([]);
  const [estimate, setEstimate] = useState<AdditionalWorkEstimate | null>(null);
  const [inspectionAcknowledged, setInspectionAcknowledged] = useState(false);
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState('');
  const requestAwaitingAction = requests.find((request) => request.status === 'pending' || (request.status === 'approved' && !request.confirmedAt));
  const canStartNew = !requestAwaitingAction;
  const needsInspection = estimate?.status !== 'estimated';
  const laborValue = Number(proposedLabour);
  const hasEstimate = estimate?.status === 'estimated';
  const validLabour = Number.isFinite(laborValue) && laborValue > 0 && (hasEstimate
    ? laborValue >= estimate.suggestedLabourMin! && laborValue <= estimate.suggestedLabourMax!
    : inspectionAcknowledged);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const picked = Array.from(files);
    if (picked.some((file) => !file.type.startsWith('image/') && !file.type.startsWith('video/'))) return setError('Choose a photo or video.');
    if (picked.reduce((size, file) => size + file.size, evidence.reduce((size, item) => size + Math.ceil(item.dataUrl.length * 0.75), 0)) > 2 * 1024 * 1024) return setError('Keep the combined evidence under 2 MB.');
    try { const loaded = await Promise.all(picked.map(toDataUrl)); setEvidence((current) => [...current, ...loaded]); setEstimate(null); setProposedLabour(''); setError(''); }
    catch (fileError) { setError(fileError instanceof Error ? fileError.message : 'Could not load the selected file.'); }
  };

  const researchEstimate = async () => {
    if (!description.trim() || !location.trim() || evidence.length === 0) return;
    setResearching(true); setError(''); setEstimate(null); setInspectionAcknowledged(false); setProposedLabour('');
    try {
      const token = await getFirebaseIdToken();
      const response = await fetch('/api/additional-work-estimate', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: description.trim(), trade: workType, location: location.trim(), language, evidence }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Live pricing research is unavailable.');
      const valid = asEstimate(result.estimate);
      if (!valid) throw new Error('The research response did not contain verifiable source-backed ranges. Further inspection is required.');
      setEstimate(valid);
      if (valid.status === 'estimated' && valid.suggestedLabourMin != null) setProposedLabour(String(valid.suggestedLabourMin));
      if (valid.status === 'estimated' && valid.materialCostMin != null && valid.materialCostMax != null) {
        setMaterialEstimate(String(Math.round((valid.materialCostMin + valid.materialCostMax) / 2)));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not research this work right now.');
    } finally { setResearching(false); }
  };

  const submitRequest = () => {
    if (!description.trim() || evidence.length === 0 || !validLabour) return;
    const suggestedMin = hasEstimate ? estimate!.suggestedLabourMin! : laborValue;
    const suggestedMax = hasEstimate ? estimate!.suggestedLabourMax! : laborValue;
    onSubmit({ description: description.trim(), evidence, suggestedLabourMin: suggestedMin, suggestedLabourMax: suggestedMax,
      proposedLabour: laborValue, materialEstimate: Math.max(0, Number(materialEstimate) || 0), estimate: estimate || undefined });
    setDescription(''); setMaterialEstimate(''); setEvidence([]); setEstimate(null); setProposedLabour(''); setError(''); setFormOpen(false);
  };

  return <section className="rounded-2xl bg-white p-4 shadow-sm" aria-label="Additional work requests">
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Wrench className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1"><h3 className="text-sm font-black text-slate-900">Additional work</h3><p className="text-[11px] text-slate-500">Request customer approval before doing extra work.</p></div>
      {canStartNew && <button type="button" onClick={() => setFormOpen((open) => !open)} aria-expanded={formOpen} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#2d59f0] px-3 text-xs font-bold text-white"><Plus className="h-4 w-4" /> Report</button>}
    </div>

    {requests.length > 0 && <div className="mt-3 space-y-2">{requests.map((request) => {
      const style = request.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : request.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800';
      return <article key={request.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-2"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${style}`}>{request.status === 'approved' ? <CheckCircle2 className="h-3 w-3" /> : request.status === 'rejected' ? <AlertCircle className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}{STATUS[language][request.status]}</span><span className="text-[10px] text-slate-500">{request.evidence.length} attachment{request.evidence.length === 1 ? '' : 's'}</span></div>
        <p className="mt-2 text-xs font-bold text-slate-900">{request.description}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg bg-white p-2"><span className="block text-slate-500">Labour</span><strong className="text-slate-900">{currency(request.proposedLabour)}</strong></div><div className="rounded-lg bg-white p-2"><span className="block text-slate-500">Materials estimate</span><strong className="text-slate-900">{currency(request.materialEstimate)}</strong></div>
        </div>
        {request.status === 'pending' && <p className="mt-2 text-[10px] font-medium text-amber-800">Pending customer approval. Do not begin this extra work.</p>}
        {request.status === 'approved' && !request.confirmedAt && <div className="mt-2 rounded-lg bg-emerald-50 p-2.5"><p className="text-[11px] font-semibold text-emerald-900">Customer approved. Confirm the separate labour and material amounts before starting.</p><button type="button" onClick={() => onConfirm(request.id)} className="mt-2 min-h-10 w-full rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white">Confirm and start additional work</button></div>}
        {request.status === 'approved' && request.confirmedAt && <p className="mt-2 text-[11px] font-bold text-emerald-800">Approved price confirmed. Additional work may proceed.</p>}
        {request.status === 'rejected' && <p className="mt-2 text-[11px] font-semibold text-slate-700">The additional request was rejected. Continue the original job at its agreed price.</p>}
      </article>;
    })}</div>}

    {formOpen && canStartNew && <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <div><label htmlFor="additional-work-description" className="mb-1 block text-xs font-bold text-slate-700">Describe the unexpected work</label><textarea id="additional-work-description" value={description} onChange={(event) => { setDescription(event.target.value.slice(0, 500)); setEstimate(null); }} maxLength={500} rows={3} placeholder="What damage or extra work did you find?" className="w-full resize-none rounded-xl bg-slate-100 p-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" /></div>
      <div><label htmlFor="additional-work-type" className="mb-1 block text-xs font-bold text-slate-700">Work type</label><select id="additional-work-type" value={workType} onChange={(event) => { setWorkType(event.target.value as TradeCategory); setEstimate(null); }} className="h-11 w-full rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-800">{TRADES.map((trade) => <option key={trade.id} value={trade.id}>{trade.nameEn}</option>)}</select></div>
      <div><label htmlFor="additional-work-location" className="mb-1 block text-xs font-bold text-slate-700">Job location for local rates</label><input id="additional-work-location" value={location} onChange={(event) => { setLocation(event.target.value.slice(0, 180)); setEstimate(null); }} maxLength={180} placeholder="City and area" className="h-11 w-full rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-800" /></div>
      <div><label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-3 text-xs font-bold text-blue-800"><Camera className="h-4 w-4" /><FilePlus2 className="h-4 w-4" /> Add photo or video<input type="file" accept="image/*,video/*" multiple capture="environment" className="sr-only" onChange={(event) => { void handleFiles(event.currentTarget.files); event.currentTarget.value = ''; }} /></label>
        {evidence.length > 0 && <div className="mt-2 space-y-1">{evidence.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700"><span className="min-w-0 flex-1 truncate">{file.name}</span><span className="shrink-0 text-slate-500">{file.mimeType.startsWith('video/') ? 'Video' : 'Photo'}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => { setEvidence((items) => items.filter((_, i) => i !== index)); setEstimate(null); }} className="px-1 font-black text-rose-600">×</button></div>)}</div>}
        <p className="mt-1 text-[10px] text-slate-500">Evidence is sent for analysis and customer review. Total upload limit: 2 MB.</p>
      </div>

      <button type="button" disabled={researching || !description.trim() || !location.trim() || evidence.length === 0} onClick={() => void researchEstimate()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-800 disabled:opacity-50">{researching ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Researching current local rates…</> : <><Search className="h-4 w-4" /> Analyze and research estimate</>}</button>

      {estimate && <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
        <div><div className="flex items-center justify-between gap-2"><h4 className="text-sm font-black text-slate-900">AI suggested estimate</h4><span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold text-slate-600">Approximate · {estimate.researchDate}</span></div><p className="mt-1 text-xs font-semibold text-slate-800">{estimate.detectedWork}</p><p className="mt-1 text-[10px] text-slate-600">Complexity: {estimate.complexity}</p></div>
        {estimate.status === 'estimated' ? <>
          {estimate.process.length > 0 && <div><p className="text-[10px] font-bold text-slate-700">Likely work process</p><ol className="mt-1 list-inside list-decimal space-y-0.5 text-[10px] text-slate-600">{estimate.process.map((step, i) => <li key={i}>{step}</li>)}</ol></div>}
          {estimate.estimatedTimeMinMinutes != null && estimate.estimatedTimeMaxMinutes != null && <p className="text-[11px] text-slate-700"><b>Estimated time:</b> {estimate.estimatedTimeMinMinutes}–{estimate.estimatedTimeMaxMinutes} min</p>}
          {(estimate.requiredSkills.length > 0 || estimate.requiredTools.length > 0 || estimate.requiredMaterials.length > 0) && <div className="space-y-1 text-[10px] text-slate-600">{estimate.requiredSkills.length > 0 && <p><b className="text-slate-700">Skills:</b> {estimate.requiredSkills.join(', ')}</p>}{estimate.requiredTools.length > 0 && <p><b className="text-slate-700">Tools:</b> {estimate.requiredTools.join(', ')}</p>}{estimate.requiredMaterials.length > 0 && <p><b className="text-slate-700">Likely materials:</b> {estimate.requiredMaterials.join(', ')}</p>}</div>}
          <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2"><div className="rounded-lg bg-white p-2"><span className="block text-slate-500">Researched market labour rate</span><b>{currency(estimate.marketLabourMin!)}–{currency(estimate.marketLabourMax!)}</b><p className="mt-1 text-[9px] text-slate-500">{estimate.marketRateBasis}</p></div><div className="rounded-lg bg-white p-2"><span className="block text-slate-500">Suggested additional labour</span><b>{currency(estimate.suggestedLabourMin!)}–{currency(estimate.suggestedLabourMax!)}</b></div></div>
          <div className="rounded-lg bg-white p-2 text-[11px]"><span className="block text-slate-500">Materials / spare parts (separate)</span><b>{estimate.materialCostMin != null && estimate.materialCostMax != null ? `${currency(estimate.materialCostMin)}–${currency(estimate.materialCostMax)}` : 'Not reliably estimated; inspect and price separately'}</b>{estimate.estimatedTotalMin != null && estimate.estimatedTotalMax != null && <p className="mt-1"><span className="text-slate-500">Estimated total incl. materials: </span><b>{currency(estimate.estimatedTotalMin)}–{currency(estimate.estimatedTotalMax)}</b></p>}</div>
          <div><p className="text-[10px] font-semibold text-slate-700">Why this range: {estimate.priceReasoning}</p><p className="mt-1 text-[10px] text-slate-600">{estimate.hiddenDamageNote}</p></div>
          <label htmlFor="additional-labour" className="block text-xs font-bold text-slate-700">Your proposed labour charge (within suggested range)</label><div className="flex items-center rounded-lg bg-white px-3"><span className="font-bold text-slate-500">₹</span><input id="additional-labour" type="number" inputMode="numeric" min={estimate.suggestedLabourMin!} max={estimate.suggestedLabourMax!} value={proposedLabour} onChange={(event) => setProposedLabour(event.target.value)} className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm font-black text-slate-900 outline-none" /></div>
        </> : <div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="text-xs font-black text-amber-900">Further inspection required</p><p className="mt-1 text-[11px] text-amber-900">{estimate.inspectionReason || 'There is not enough reliable evidence or independent local pricing to suggest a fair range.'}</p><p className="mt-1 text-[10px] text-amber-800">No AI price is suggested. Inspect the work and agree on the labour charge with the customer before proceeding.</p><label className="mt-2 flex items-start gap-2 text-[10px] font-semibold text-amber-900"><input type="checkbox" checked={inspectionAcknowledged} onChange={(event) => setInspectionAcknowledged(event.target.checked)} className="mt-0.5" />I inspected the issue and will request customer approval for the amount I enter.</label><label htmlFor="additional-labour" className="mt-3 block text-xs font-bold text-slate-700">Your proposed labour charge</label><div className="mt-1 flex items-center rounded-lg bg-white px-3"><span className="font-bold text-slate-500">₹</span><input id="additional-labour" type="number" inputMode="numeric" min="1" value={proposedLabour} onChange={(event) => setProposedLabour(event.target.value)} className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm font-black text-slate-900 outline-none" /></div></div>}
        {estimate.sources.length > 0 && <div><p className="text-[10px] font-bold text-slate-700">Research sources (checked {estimate.researchDate})</p><ul className="mt-1 space-y-1">{estimate.sources.map((source) => <li key={source.url} className="truncate text-[10px]"><a href={source.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">{source.title}</a></li>)}</ul></div>}
      </div>}

      <div className="rounded-xl border border-slate-200 p-3"><label htmlFor="additional-materials" className="flex items-center gap-2 text-xs font-bold text-slate-800"><Package className="h-4 w-4 text-slate-600" /> Materials / spare parts estimate</label><div className="mt-2 flex items-center rounded-lg bg-slate-100 px-3"><span className="font-bold text-slate-500">₹</span><input id="additional-materials" type="number" inputMode="numeric" min="0" step="10" value={materialEstimate} onChange={(event) => setMaterialEstimate(event.target.value.replace(/\D/g, '').slice(0, 7))} placeholder="0" className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm font-bold text-slate-900 outline-none" /></div><p className="mt-1 text-[10px] text-slate-500">Kept separate from labour and included only as a customer-approved estimate.</p></div>
      {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
      <div className="flex gap-2"><button type="button" onClick={() => { setFormOpen(false); setError(''); }} className="min-h-11 flex-1 rounded-xl bg-slate-100 text-xs font-bold text-slate-700">Cancel</button><button type="button" disabled={!description.trim() || evidence.length === 0 || !estimate || !validLabour} onClick={submitRequest} className="flex min-h-11 flex-[1.4] items-center justify-center gap-2 rounded-xl bg-[#2d59f0] px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"><Send className="h-4 w-4" /> Submit request</button></div>
    </div>}
  </section>;
};
