import { GoogleGenAI } from '@google/genai';

const MAX_EVIDENCE_BYTES = 2 * 1024 * 1024;
const allowedTypes = /^(image\/(jpeg|png|webp|heic|heif)|video\/(mp4|webm|quicktime|mpeg))$/i;

function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').end(JSON.stringify(body));
}

function inspectionEstimate(reason: string, date: string, details: Partial<any> = {}) {
  return {
    status: 'further_inspection_required',
    detectedWork: details.detectedWork || 'Unable to reliably identify the additional work',
    complexity: details.complexity || 'unknown',
    process: Array.isArray(details.process) ? details.process.slice(0, 8) : [],
    estimatedTimeMinMinutes: null,
    estimatedTimeMaxMinutes: null,
    requiredSkills: Array.isArray(details.requiredSkills) ? details.requiredSkills.slice(0, 8) : [],
    requiredTools: Array.isArray(details.requiredTools) ? details.requiredTools.slice(0, 8) : [],
    requiredMaterials: Array.isArray(details.requiredMaterials) ? details.requiredMaterials.slice(0, 8) : [],
    marketLabourMin: null,
    marketLabourMax: null,
    marketRateBasis: '',
    suggestedLabourMin: null,
    suggestedLabourMax: null,
    materialCostMin: null,
    materialCostMax: null,
    estimatedTotalMin: null,
    estimatedTotalMax: null,
    priceReasoning: '',
    inspectionReason: reason,
    hiddenDamageNote: 'A photo or video cannot confirm hidden damage. Inspect the site before agreeing on scope or price.',
    researchDate: date,
    sources: Array.isArray(details.sources) ? details.sources.slice(0, 8) : [],
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  const researchDate = new Date().toISOString().slice(0, 10);
  try {
    const auth = String(req.headers.authorization || '');
    const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const apiKey = process.env.VITE_FIREBASE_API_KEY;
    if (!idToken || !apiKey) return json(res, 401, { error: 'Sign in is required to request an estimate.' });
    const identity = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
    });
    if (!identity.ok) return json(res, 401, { error: 'Your session could not be verified. Sign in again.' });

    const { description, trade, location, language, evidence } = req.body || {};
    if (typeof description !== 'string' || !description.trim() || description.length > 500 || typeof trade !== 'string' || typeof location !== 'string' || !location.trim() || !Array.isArray(evidence) || evidence.length < 1 || evidence.length > 4) {
      return json(res, 400, { error: 'Add a work description, job location, work type, and 1 to 4 photos or videos.' });
    }
    let totalBytes = 0;
    const mediaParts = [] as Array<{ inlineData: { mimeType: string; data: string } }>;
    for (const item of evidence) {
      const match = typeof item?.dataUrl === 'string' && item.dataUrl.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/);
      if (!match || !allowedTypes.test(match[1])) return json(res, 400, { error: 'One of the attachments has an unsupported format.' });
      const bytes = Math.floor(match[2].length * 0.75);
      totalBytes += bytes;
      mediaParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
    if (totalBytes > MAX_EVIDENCE_BYTES) return json(res, 413, { error: 'Keep all evidence under 2 MB.' });
    if (!process.env.GEMINI_API_KEY) {
      return json(res, 200, { estimate: inspectionEstimate('AI market research is not configured. Ask the customer to inspect and agree on a price before proceeding.', researchDate) });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `You are an estimation assistant for a worker requesting customer approval for unexpected extra work. Respond ONLY with valid JSON (no markdown) using exactly these fields: status, detectedWork, complexity, process, estimatedTimeMinMinutes, estimatedTimeMaxMinutes, requiredSkills, requiredTools, requiredMaterials, marketLabourMin, marketLabourMax, marketRateBasis, suggestedLabourMin, suggestedLabourMax, materialCostMin, materialCostMax, estimatedTotalMin, estimatedTotalMax, priceReasoning, inspectionReason, hiddenDamageNote. Currency is Indian rupees. Input: work type=${trade}; site/location=${location}; worker description=${description}; response language=${language || 'en'}. Examine attached media cautiously; say what is visibly supported and never infer hidden damage as fact. Search the web for current, relevant local labour rates for this exact trade and city/area. Prefer multiple independent, credible local sources, with unit/date/context. If you cannot find two genuinely relevant independent sources, location is not specific enough, scope is ambiguous, or media/details are insufficient, set status="further_inspection_required" and every numeric price/time field to null. Never invent rates or sources. Materials are separate from labour. Only estimate materials if the item and local prices are reliably supported; otherwise set material cost bounds null. Suggested labour is a fair range supported by the researched rates and stated work/time, never an exact certainty. For estimated total, sum labour and material bounds only when both are reliable; otherwise null. priceReasoning should explain the calculation and evidence. Include short process steps and approximate time range only if scope is clear. Include uncertainty about concealed damage in hiddenDamageNote. Do not include citations in JSON; citations are collected separately by the server.`;
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_ESTIMATE_MODEL || 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }, ...mediaParts] }],
      config: { tools: [{ googleSearch: {} }] },
    });
    const text = response.text?.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '') || '';
    const modelResult = JSON.parse(text);
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks.flatMap((chunk: any) => {
      const url = chunk.web?.uri;
      if (!url || !/^https:\/\//i.test(url)) return [];
      return [{ title: String(chunk.web.title || new URL(url).hostname).slice(0, 180), url }];
    });
    const uniqueSources = [...new Map(sources.map((source: any) => [new URL(source.url).hostname, source])).values()];
    const hasValidRanges = [modelResult.marketLabourMin, modelResult.marketLabourMax, modelResult.suggestedLabourMin, modelResult.suggestedLabourMax]
      .every((value) => Number.isFinite(value) && value > 0)
      && modelResult.marketLabourMin <= modelResult.marketLabourMax
      && modelResult.suggestedLabourMin <= modelResult.suggestedLabourMax;
    if (modelResult.status !== 'estimated' || !hasValidRanges || uniqueSources.length < 2) {
      return json(res, 200, { estimate: inspectionEstimate(
        modelResult.inspectionReason || (uniqueSources.length < 2 ? 'Fewer than two independent, relevant market sources were found. Further inspection and customer price agreement are required.' : 'The available evidence does not support a dependable price range.'),
        researchDate, { ...modelResult, sources: uniqueSources },
      ) });
    }
    const safe = (value: unknown) => Number.isFinite(value) && Number(value) > 0 ? Number(value) : null;
    const marketLabourMin = safe(modelResult.marketLabourMin)!;
    const marketLabourMax = safe(modelResult.marketLabourMax)!;
    const suggestedLabourMin = safe(modelResult.suggestedLabourMin)!;
    const suggestedLabourMax = safe(modelResult.suggestedLabourMax)!;
    const materialCostMin = safe(modelResult.materialCostMin);
    const materialCostMax = safe(modelResult.materialCostMax);
    const materialsReliable = materialCostMin !== null && materialCostMax !== null && materialCostMax >= materialCostMin;
    const estimate = {
      status: 'estimated', detectedWork: String(modelResult.detectedWork || '').slice(0, 400),
      complexity: ['basic', 'moderate', 'complex'].includes(modelResult.complexity) ? modelResult.complexity : 'unknown',
      process: Array.isArray(modelResult.process) ? modelResult.process.slice(0, 8).map(String) : [],
      estimatedTimeMinMinutes: Number.isFinite(modelResult.estimatedTimeMinMinutes) ? modelResult.estimatedTimeMinMinutes : null,
      estimatedTimeMaxMinutes: Number.isFinite(modelResult.estimatedTimeMaxMinutes) ? modelResult.estimatedTimeMaxMinutes : null,
      requiredSkills: Array.isArray(modelResult.requiredSkills) ? modelResult.requiredSkills.slice(0, 8) : [],
      requiredTools: Array.isArray(modelResult.requiredTools) ? modelResult.requiredTools.slice(0, 8) : [],
      requiredMaterials: Array.isArray(modelResult.requiredMaterials) ? modelResult.requiredMaterials.slice(0, 8) : [],
      marketLabourMin, marketLabourMax,
      marketRateBasis: String(modelResult.marketRateBasis || '').slice(0, 500),
      suggestedLabourMin, suggestedLabourMax,
      materialCostMin: materialsReliable ? materialCostMin : null,
      materialCostMax: materialsReliable ? materialCostMax : null,
      estimatedTotalMin: materialsReliable ? suggestedLabourMin + materialCostMin! : null,
      estimatedTotalMax: materialsReliable ? suggestedLabourMax + materialCostMax! : null,
      priceReasoning: String(modelResult.priceReasoning || '').slice(0, 800),
      inspectionReason: '',
      hiddenDamageNote: String(modelResult.hiddenDamageNote || 'Visible media cannot confirm concealed damage; inspect before agreeing.').slice(0, 400),
      researchDate, sources: uniqueSources.slice(0, 8),
    };
    return json(res, 200, { estimate });
  } catch (error) {
    console.error('Additional work estimate request failed:', error instanceof Error ? error.name : 'unknown error');
    return json(res, 200, { estimate: inspectionEstimate('Live visual analysis or market research could not be completed. Inspect the work and agree on the scope and price with the customer before proceeding.', researchDate) });
  }
}
