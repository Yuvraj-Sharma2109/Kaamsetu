# Activate Google sign-in

The app uses Firebase Authentication's Google provider for both **Sign in** and **Register**. Firebase creates an auth account the first time a Google identity is used; returning users sign into that same account. A new app profile then continues through the existing profile setup.

## Firebase Console

1. Open the Firebase project that owns this app and add a **Web app** if one is not already registered.
2. In **Authentication → Sign-in method**, enable **Google** and select the support email.
3. In **Authentication → Settings → Authorized domains**, add every host used to open the app, including `localhost` and the production Vercel domain (for example, `your-app.vercel.app`). Add any custom domain too.
4. In **Project settings → General → Your apps → SDK setup and configuration**, copy the web app configuration values.

## Local development

Create `.env.local` in the project root with the Firebase Web app values:

```dotenv
VITE_FIREBASE_API_KEY=your_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your_web_app_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
```

Restart the Vite server after changing environment variables. The Firebase Web configuration is public client configuration; restrict the API key to the app's domains and enabled Firebase APIs. Do not put a service-account key or OAuth client secret in these variables.

## Vercel

Add the same `VITE_FIREBASE_*` variables in **Project → Settings → Environment Variables** for the Preview and Production environments, then redeploy. Make sure the deployed host is also listed in Firebase Authorized domains.

On desktop, Google opens a Firebase-managed sign-in popup. On mobile browsers and installed PWAs, the app uses a redirect flow and resumes the Firebase session when it returns. Both flows request the user's email and use Firebase's persistent browser session. Mobile number + OTP login remains a separate, unchanged option.
