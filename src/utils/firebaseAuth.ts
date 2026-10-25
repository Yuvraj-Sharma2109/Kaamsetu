import { Language } from '../types';

const FIREBASE_SDK_VERSION = '12.19.0';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

export interface FirebaseUserInfo {
  uid: string;
  email: string | null;
  emailVerified?: boolean;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber?: string | null;
  providerData: Array<{ providerId: string }>;
}

export interface FirebasePhoneConfirmation {
  confirm: (code: string) => Promise<{ user: FirebaseUserInfo }>;
}

interface FirebaseRecaptchaVerifier {
  clear: () => void;
}

interface FirebasePhoneAuthProvider {
  verifyPhoneNumber: (options: { phoneNumber: string }, verifier: FirebaseRecaptchaVerifier) => Promise<string>;
}

interface FirebaseAppSdk {
  getApps: () => Array<{ name: string }>;
  initializeApp: (config: typeof firebaseConfig) => unknown;
}

interface FirebaseAuthInstance {
  languageCode: string | null;
  currentUser: FirebaseUserInfo | null;
}

interface FirebaseAuthSdk {
  getAuth: (app: unknown) => FirebaseAuthInstance;
  setPersistence: (auth: FirebaseAuthInstance, persistence: unknown) => Promise<void>;
  browserLocalPersistence: unknown;
  GoogleAuthProvider: new () => {
    addScope: (scope: string) => void;
    setCustomParameters: (parameters: Record<string, string>) => void;
  };
  FacebookAuthProvider: new () => { addScope: (scope: string) => void };
  RecaptchaVerifier: new (auth: FirebaseAuthInstance, container: string, parameters: { size: 'invisible' }) => FirebaseRecaptchaVerifier;
  signInWithPhoneNumber: (auth: FirebaseAuthInstance, phoneNumber: string, verifier: FirebaseRecaptchaVerifier) => Promise<FirebasePhoneConfirmation>;
  PhoneAuthProvider: {
    new (auth: FirebaseAuthInstance): FirebasePhoneAuthProvider;
    credential: (verificationId: string, smsCode: string) => unknown;
  };
  linkWithCredential: (user: FirebaseUserInfo, credential: unknown) => Promise<{ user: FirebaseUserInfo }>;
  signInWithPopup: (auth: FirebaseAuthInstance, provider: unknown) => Promise<{ user: FirebaseUserInfo }>;
  signInWithRedirect: (auth: FirebaseAuthInstance, provider: unknown) => Promise<void>;
  linkWithPopup: (user: FirebaseUserInfo, provider: unknown) => Promise<{ user: FirebaseUserInfo }>;
  linkWithRedirect: (user: FirebaseUserInfo, provider: unknown) => Promise<void>;
  onAuthStateChanged: (auth: FirebaseAuthInstance, next: (user: FirebaseUserInfo | null) => void, error?: (error: unknown) => void) => () => void;
  getRedirectResult: (auth: FirebaseAuthInstance) => Promise<{ user: FirebaseUserInfo } | null>;
  signOut: (auth: FirebaseAuthInstance) => Promise<void>;
}

let sdkPromise: Promise<{ auth: FirebaseAuthInstance; sdk: FirebaseAuthSdk }> | undefined;
let phoneRecaptcha: FirebaseRecaptchaVerifier | undefined;

const isRealConfigValue = (value: string | undefined) => Boolean(
  value?.trim() && !/^(your_|my_|change_me|placeholder)/i.test(value.trim()),
);

export const isFirebaseConfigured = () =>
  isRealConfigValue(firebaseConfig.apiKey)
  && isRealConfigValue(firebaseConfig.authDomain)
  && isRealConfigValue(firebaseConfig.projectId)
  && isRealConfigValue(firebaseConfig.appId);

async function getFirebaseAuth() {
  if (!isFirebaseConfigured()) throw new Error('kaamsetu/firebase-config-missing');
  if (!sdkPromise) {
    sdkPromise = Promise.all([
      import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`) as Promise<FirebaseAppSdk>,
      import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`) as Promise<FirebaseAuthSdk>,
    ]).then(async ([appSdk, authSdk]) => {
      const existingApp = appSdk.getApps().find((app) => app.name === '[DEFAULT]');
      const app = existingApp || appSdk.initializeApp(firebaseConfig);
      const auth = authSdk.getAuth(app);
      await authSdk.setPersistence(auth, authSdk.browserLocalPersistence);
      return { auth, sdk: authSdk };
    }).catch((error) => {
      sdkPromise = undefined;
      if (error instanceof TypeError && /fetch|import|network/i.test(error.message)) {
        throw new Error('kaamsetu/firebase-sdk-unavailable');
      }
      throw error;
    });
  }
  return sdkPromise;
}

const localeFor = (language: Language) => ({ en: 'en', hi: 'hi', bn: 'bn', mr: 'mr', te: 'te' })[language];

/** Sends an SMS through Firebase Phone Auth after its reCAPTCHA check. */
export async function sendPhoneOtp(phoneNumber: string, language: Language): Promise<FirebasePhoneConfirmation> {
  const { auth, sdk } = await getFirebaseAuth();
  auth.languageCode = localeFor(language);
  phoneRecaptcha?.clear();
  phoneRecaptcha = new sdk.RecaptchaVerifier(auth, 'phone-recaptcha', { size: 'invisible' });
  return sdk.signInWithPhoneNumber(auth, phoneNumber, phoneRecaptcha);
}

export function clearPhoneRecaptcha() {
  phoneRecaptcha?.clear();
  phoneRecaptcha = undefined;
}

/** Starts SMS verification for linking a phone number to the current Firebase identity. */
export async function sendPhoneLinkOtp(phoneNumber: string, language: Language, containerId: string): Promise<string> {
  const { auth, sdk } = await getFirebaseAuth();
  if (!auth.currentUser) throw new Error('kaamsetu/firebase-user-required');
  auth.languageCode = localeFor(language);
  phoneRecaptcha?.clear();
  phoneRecaptcha = new sdk.RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  const provider = new sdk.PhoneAuthProvider(auth);
  return provider.verifyPhoneNumber({ phoneNumber }, phoneRecaptcha);
}

/** Links only after the user proves control of the number with its SMS code. */
export async function linkVerifiedPhone(verificationId: string, smsCode: string): Promise<FirebaseUserInfo> {
  const { auth, sdk } = await getFirebaseAuth();
  if (!auth.currentUser) throw new Error('kaamsetu/firebase-user-required');
  const credential = sdk.PhoneAuthProvider.credential(verificationId, smsCode);
  const result = await sdk.linkWithCredential(auth.currentUser, credential);
  clearPhoneRecaptcha();
  return result.user;
}

export async function signInWithSocialProvider(method: 'google' | 'facebook', language: Language): Promise<FirebaseUserInfo | null> {
  const { auth, sdk } = await getFirebaseAuth();
  auth.languageCode = localeFor(language);
  let provider: unknown;
  if (method === 'google') {
    const googleProvider = new sdk.GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    provider = googleProvider;
  } else {
    const facebookProvider = new sdk.FacebookAuthProvider();
    facebookProvider.addScope('email');
    provider = facebookProvider;
  }

  // Redirect sign-in is more reliable than a popup in installed PWAs and mobile browsers.
  const isMobile = window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    await sdk.signInWithRedirect(auth, provider);
    return null;
  }

  try {
    const result = await sdk.signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'auth/popup-blocked') {
      await sdk.signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

export async function watchFirebaseAuth(
  onUser: (user: FirebaseUserInfo | null) => void,
  onError: (error: unknown) => void,
): Promise<() => void> {
  const { auth, sdk } = await getFirebaseAuth();
  return sdk.onAuthStateChanged(auth, onUser, onError);
}

/** Completes the one-time OAuth redirect in the login screen that initiated sign-in. */
export async function getFirebaseRedirectUser(): Promise<FirebaseUserInfo | null> {
  const { auth, sdk } = await getFirebaseAuth();
  const result = await sdk.getRedirectResult(auth);
  return result?.user ?? null;
}

export async function signOutFirebase() {
  if (!isFirebaseConfigured()) return;
  const { auth, sdk } = await getFirebaseAuth();
  await sdk.signOut(auth);
}

export async function getLinkedSocialProviders(): Promise<Array<'google' | 'facebook'>> {
  if (!isFirebaseConfigured()) return [];
  const { auth } = await getFirebaseAuth();
  return (auth.currentUser?.providerData || []).flatMap(({ providerId }) =>
    providerId === 'google.com' ? ['google' as const]
      : providerId === 'facebook.com' ? ['facebook' as const]
        : [],
  );
}

export async function hasLinkedPhoneProvider(): Promise<boolean> {
  if (!isFirebaseConfigured()) return false;
  const { auth } = await getFirebaseAuth();
  return Boolean(auth.currentUser?.providerData.some(({ providerId }) => providerId === 'phone'));
}

/** Linking requires a currently signed-in Firebase user; Firebase verifies the provider through its popup. */
export async function linkSocialProvider(method: 'google' | 'facebook', language: Language): Promise<FirebaseUserInfo | null> {
  const { auth, sdk } = await getFirebaseAuth();
  if (!auth.currentUser) throw new Error('kaamsetu/firebase-user-required');
  auth.languageCode = localeFor(language);
  let provider: unknown;
  if (method === 'google') {
    const googleProvider = new sdk.GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    provider = googleProvider;
  } else {
    const facebookProvider = new sdk.FacebookAuthProvider();
    facebookProvider.addScope('email');
    provider = facebookProvider;
  }
  const isMobile = window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    await sdk.linkWithRedirect(auth.currentUser, provider);
    return null;
  }
  const result = await sdk.linkWithPopup(auth.currentUser, provider);
  return result.user;
}
