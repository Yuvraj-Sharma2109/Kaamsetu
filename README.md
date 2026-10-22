<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/87ac3607-fea1-4128-abaa-817fca3098f3

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Google and Facebook sign-in

The social buttons use Firebase Authentication. The app loads the official Firebase Web SDK modules from Google's CDN, so no extra npm package is needed.

1. Create a Firebase project and register a Web app. Copy its Web app configuration into `.env.local` using the `VITE_FIREBASE_*` names in `.env.example`.
2. In Firebase Console > Authentication > Sign-in method, enable Phone and Google. Set the SMS region policy for your users (India) and keep reCAPTCHA enabled. Complete the Google OAuth consent screen. Firebase manages the Google OAuth client. If you configure a Google web client manually, add https://<your-vercel-domain> as an authorized JavaScript origin and https://<auth-domain>/__/auth/handler as an authorized redirect URI.
3. Enable Facebook in Firebase Authentication. In Meta for Developers, add Facebook Login, configure the App ID and App Secret in Firebase, enable Client OAuth Login and Web OAuth Login, then add the Firebase redirect URI (usually https://<project-id>.firebaseapp.com/__/auth/handler) to Meta Valid OAuth Redirect URIs. The app requests email and public profile; phone setup remains available if Facebook returns no email.
4. In Firebase Authentication, add localhost (for local testing), your Firebase auth domain, and the Vercel production domain to Authorized domains. Put the public VITE_FIREBASE_* values from .env.example in Vercel and redeploy. Never put a Facebook App Secret or Firebase service account key in Vite variables.
5. Restrict the Firebase Web API key to your app's domains in Google Cloud Console. The Firebase Web config is public client configuration; never put a service account key or Facebook App Secret in Vite variables.

On the first social sign-in, KaamSetu opens profile setup. Returning users on the same browser use their saved profile. The app validates Firebase Auth's persisted session before opening protected screens. Firebase stores the authentication identity; worker profiles and job data remain browser-local and do not sync between devices.

The mobile number sign-in and registration screen remains alongside Google and Facebook. Phone codes are sent and verified by Firebase Phone Authentication with reCAPTCHA; the old local demo code `4812` is no longer accepted. Existing locally stored phone profiles are looked up by the phone number only after Firebase verifies it. On the web, Firebase requires an authorized HTTPS domain in production and enforces SMS quotas; configure your Firebase project's phone provider and SMS policy before testing real numbers.

To link Google and Facebook to one Firebase identity, sign in to the current account, then open Profile > Settings > Social sign-in methods and complete the other provider authentication. To link a mobile number, send and verify its SMS code in the same settings page. Email matches alone do not link accounts. A legacy local profile with the same verified email requires explicit confirmation before it is migrated to the Firebase UID.

Firebase Auth verifies sign-in and protects the client-side app flow. This Vite project has no application server, worker database, or API endpoints, so worker profiles and jobs remain browser-local and are not server-protected or shared between devices. Do not treat that local data as authoritative. Before using the app for real work, add a backend that verifies Firebase ID tokens on every API request and stores worker data under the Firebase UID.
