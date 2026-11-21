# Additional Work AI Estimate Setup

The worker-side estimate flow uses the Vercel Function at `/api/additional-work-estimate`. It sends the supplied work description and attached photo/video to Gemini for visual assessment and Google Search grounding. Evidence is not stored by this function. Firebase ID tokens are checked with Firebase Identity Toolkit before an estimate request is accepted.

## Vercel environment variables

Configure these on the KaamDaar Vercel project for the Production, Preview, and Development environments where you want the feature enabled:

- `GEMINI_API_KEY` — server-only Google AI Studio key. Do not prefix this with `VITE_` and do not expose it to the browser.
- `VITE_FIREBASE_API_KEY` — the existing Firebase web API key, also available to the server function so it can verify Firebase ID tokens. Firebase web API keys are identifiers, not service-account secrets; restrict the key to the app's domains and required Firebase APIs.
- `GEMINI_ESTIMATE_MODEL` — optional model override. Default is `gemini-2.5-flash`.

Redeploy after setting or changing variables. If Gemini is not configured, workers receive **Further inspection required** with no generated price. If current Search grounding fails or yields fewer than two independent source domains, the endpoint also withholds suggested prices.

## Provider requirements and limitations

- Enable the Gemini API for the Google AI Studio project that owns `GEMINI_API_KEY`.
- Confirm the selected API plan and quota allow Google Search grounding. Google may charge for grounded searches depending on the account and plan.
- The project must deploy on Vercel (or another host configured to run the Node function in `/api`). A static-only host will serve the UI but cannot run this endpoint.
- Current web sources and their URLs are returned with the research date. The returned range is an approximate assistant suggestion, not a binding quote. The worker and customer still agree and approve the final labour and materials separately.
- Photos/videos can show only visible evidence. They cannot confirm concealed damage. Unclear work, insufficient locality, missing sources, or failed research produces **Further inspection required**, never a fallback/demo market rate.
- The customer approval state is still the existing local worker-side flow. This feature does not add a customer app, notification channel, or server persistence for requests; those require a connected KaamDaar customer/backend approval service.
