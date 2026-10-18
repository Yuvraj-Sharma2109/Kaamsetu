import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { Bot, LoaderCircle, Mic, Send, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { Language } from '../types';
import { speakText, stopSpeech } from '../utils/speech';

const COPY: Record<Language, { title: string; welcome: string; note: string; placeholder: string; send: string; open: string; close: string; topics: string[]; answers: string[]; unknown: string; voiceOn: string; voiceOff: string; startListening: string; stopListening: string; listening: string; voiceUnavailable: string; screenHelp: string }> = {
  en: { title: 'KaamSetu AI Assistant', welcome: 'Hi! I can help with jobs, Aadhaar verification, payments, and your profile. What do you need?', note: 'Ask by typing or speaking. AI replies can be read aloud.', placeholder: 'Type or speak your question…', send: 'Send', open: 'Open AI assistance', close: 'Close AI assistance', topics: ['Find work', 'Aadhaar verification', 'Payments', 'Profile'], answers: ['Go to Jobs to review available work. Complete Aadhaar verification before applying, then accept a job while you are online.', 'Open your profile and choose Aadhaar verification. Enter your Aadhaar details and the demo OTP shown in the verification flow.', 'Open Pay to see your available balance, monthly earnings, and payout history. New accounts show ₹0 until a job is completed.', 'Open Profile to update your work types and personal details. Use Settings to change the app language.'], unknown: 'I can help with finding work, Aadhaar verification, payments, and profile settings. Try one of those topics.', voiceOn: 'Mute spoken replies', voiceOff: 'Enable spoken replies', startListening: 'Ask by voice', stopListening: 'Stop listening', listening: 'Listening… speak now', voiceUnavailable: 'Voice input is not supported in this browser. Try Chrome or type your question.', screenHelp: 'What can I do on this screen?' },
  hi: { title: 'कामसेतु AI सहायक', welcome: 'नमस्ते! मैं काम, आधार सत्यापन, भुगतान और प्रोफ़ाइल में मदद कर सकता हूँ। आपको क्या जानना है?', note: 'लिखकर या बोलकर पूछें। AI जवाब सुन भी सकते हैं।', placeholder: 'अपना सवाल लिखें या बोलें…', send: 'भेजें', open: 'AI सहायता खोलें', close: 'AI सहायता बंद करें', topics: ['काम खोजें', 'आधार सत्यापन', 'भुगतान', 'प्रोफ़ाइल'], answers: ['उपलब्ध काम देखने के लिए काम टैब खोलें। आवेदन से पहले आधार सत्यापन पूरा करें और ऑनलाइन रहकर काम स्वीकार करें।', 'प्रोफ़ाइल में जाकर आधार सत्यापन चुनें। आधार जानकारी भरें और सत्यापन स्क्रीन पर दिया गया डेमो OTP दर्ज करें।', 'बैलेंस, महीने की कमाई और भुगतान इतिहास देखने के लिए भुगतान टैब खोलें। नया खाता काम पूरा होने तक ₹0 दिखाता है।', 'काम के प्रकार और व्यक्तिगत जानकारी बदलने के लिए प्रोफ़ाइल खोलें। भाषा बदलने के लिए सेटिंग्स पर जाएँ।'], unknown: 'मैं काम खोजने, आधार सत्यापन, भुगतान और प्रोफ़ाइल सेटिंग्स में मदद कर सकता हूँ। इनमें से कोई विषय पूछें।', voiceOn: 'बोले गए जवाब बंद करें', voiceOff: 'बोले गए जवाब चालू करें', startListening: 'बोलकर पूछें', stopListening: 'सुनना बंद करें', listening: 'सुन रहा हूँ… अब बोलें', voiceUnavailable: 'इस ब्राउज़र में आवाज़ से सवाल पूछना उपलब्ध नहीं है। Chrome आज़माएँ या सवाल लिखें।', screenHelp: 'इस स्क्रीन पर मैं क्या कर सकता हूँ?' },
  bn: { title: 'কামসেতু AI সহায়ক', welcome: 'নমস্কার! কাজ, আধার যাচাই, পেমেন্ট এবং প্রোফাইলে সাহায্য করতে পারি। কী জানতে চান?', note: 'লিখে বা বলে জিজ্ঞাসা করুন। AI উত্তর শুনতেও পারেন।', placeholder: 'প্রশ্ন লিখুন বা বলুন…', send: 'পাঠান', open: 'AI সহায়তা খুলুন', close: 'AI সহায়তা বন্ধ করুন', topics: ['কাজ খুঁজুন', 'আধার যাচাই', 'পেমেন্ট', 'প্রোফাইল'], answers: ['কাজ দেখতে Jobs খুলুন। আবেদন করার আগে আধার যাচাই করুন এবং অনলাইনে থেকে কাজ গ্রহণ করুন।', 'প্রোফাইলে গিয়ে আধার যাচাই বেছে নিন। আধারের তথ্য দিন এবং যাচাই স্ক্রিনে দেখানো ডেমো OTP লিখুন।', 'ব্যালেন্স, মাসিক আয় এবং পেমেন্টের ইতিহাস দেখতে Pay খুলুন। নতুন অ্যাকাউন্টে কাজ শেষ না হওয়া পর্যন্ত ₹0 দেখায়।', 'কাজের ধরন ও ব্যক্তিগত তথ্য বদলাতে Profile খুলুন। অ্যাপের ভাষা বদলাতে Settings ব্যবহার করুন।'], unknown: 'কাজ খোঁজা, আধার যাচাই, পেমেন্ট এবং প্রোফাইল সেটিংসে সাহায্য করতে পারি। এই বিষয়গুলোর একটি জিজ্ঞেস করুন।', voiceOn: 'কথায় উত্তর বন্ধ করুন', voiceOff: 'কথায় উত্তর চালু করুন', startListening: 'কথা বলে জিজ্ঞাসা করুন', stopListening: 'শোনা বন্ধ করুন', listening: 'শুনছি… এখন বলুন', voiceUnavailable: 'এই ব্রাউজারে ভয়েস ইনপুট সমর্থিত নয়। Chrome ব্যবহার করুন বা প্রশ্ন লিখুন।', screenHelp: 'এই স্ক্রিনে আমি কী করতে পারি?' },
  mr: { title: 'कामसेतू AI सहाय्यक', welcome: 'नमस्कार! काम, आधार पडताळणी, पेमेंट आणि प्रोफाइलसाठी मी मदत करू शकतो. काय जाणून घ्यायचे आहे?', note: 'लिहून किंवा बोलून विचारा. AI ची उत्तरे ऐकू शकता.', placeholder: 'प्रश्न लिहा किंवा बोला…', send: 'पाठवा', open: 'AI सहाय्य उघडा', close: 'AI सहाय्य बंद करा', topics: ['काम शोधा', 'आधार पडताळणी', 'पेमेंट', 'प्रोफाइल'], answers: ['उपलब्ध काम पाहण्यासाठी Jobs उघडा. अर्ज करण्यापूर्वी आधार पडताळणी पूर्ण करा आणि ऑनलाइन असताना काम स्वीकारा.', 'प्रोफाइलमध्ये जाऊन आधार पडताळणी निवडा. आधार माहिती भरा आणि पडताळणी स्क्रीनवर दिलेला डेमो OTP टाका.', 'बॅलन्स, महिन्याची कमाई आणि पेमेंट इतिहास पाहण्यासाठी Pay उघडा. नवीन खात्यात काम पूर्ण होईपर्यंत ₹0 दिसते.', 'कामाचे प्रकार आणि वैयक्तिक माहिती बदलण्यासाठी Profile उघडा. अॅपची भाषा बदलण्यासाठी Settings वापरा.'], unknown: 'काम शोधणे, आधार पडताळणी, पेमेंट आणि प्रोफाइल सेटिंग्जमध्ये मदत करू शकतो. यापैकी एखादा विषय विचारा.', voiceOn: 'बोललेली उत्तरे बंद करा', voiceOff: 'बोललेली उत्तरे सुरू करा', startListening: 'बोलून विचारा', stopListening: 'ऐकणे थांबवा', listening: 'ऐकत आहे… आता बोला', voiceUnavailable: 'या ब्राउझरमध्ये व्हॉइस इनपुट उपलब्ध नाही. Chrome वापरा किंवा प्रश्न लिहा.', screenHelp: 'या स्क्रीनवर मी काय करू शकतो?' },
  te: { title: 'కామసేతు AI సహాయకుడు', welcome: 'నమస్కారం! ఉద్యోగాలు, ఆధార్ ధృవీకరణ, చెల్లింపులు, ప్రొఫైల్ గురించి సహాయం చేయగలను. మీకు ఏమి కావాలి?', note: 'టైప్ చేసి లేదా మాట్లాడి అడగండి. AI సమాధానాలను వినవచ్చు.', placeholder: 'మీ ప్రశ్నను టైప్ చేయండి లేదా చెప్పండి…', send: 'పంపండి', open: 'AI సహాయాన్ని తెరవండి', close: 'AI సహాయాన్ని మూసివేయండి', topics: ['పని వెతకండి', 'ఆధార్ ధృవీకరణ', 'చెల్లింపులు', 'ప్రొఫైల్'], answers: ['అందుబాటులో ఉన్న పనులను చూడటానికి Jobs తెరవండి. దరఖాస్తు చేసే ముందు ఆధార్ ధృవీకరణ పూర్తి చేసి, ఆన్‌లైన్‌లో ఉండి పనిని అంగీకరించండి.', 'ప్రొఫైల్‌లోకి వెళ్లి ఆధార్ ధృవీకరణను ఎంచుకోండి. ఆధార్ వివరాలు నమోదు చేసి, ధృవీకరణ స్క్రీన్‌లో చూపిన డెమో OTP నమోదు చేయండి.', 'బ్యాలెన్స్, ఈ నెల ఆదాయం, చెల్లింపుల చరిత్ర చూడటానికి Pay తెరవండి. కొత్త ఖాతాలో పని పూర్తయ్యే వరకు ₹0 కనిపిస్తుంది.', 'పని రకాలు, వ్యక్తిగత వివరాలను మార్చడానికి Profile తెరవండి. యాప్ భాషను మార్చడానికి Settings ఉపయోగించండి.'], unknown: 'పని వెతకడం, ఆధార్ ధృవీకరణ, చెల్లింపులు, ప్రొఫైల్ సెట్టింగ్‌లలో సహాయం చేయగలను. వీటిలో ఒకటి అడగండి.', voiceOn: 'మాట్లాడే సమాధానాలను ఆపండి', voiceOff: 'మాట్లాడే సమాధానాలను ప్రారంభించండి', startListening: 'మాట్లాడి అడగండి', stopListening: 'వినడం ఆపండి', listening: 'వింటున్నాను… ఇప్పుడు మాట్లాడండి', voiceUnavailable: 'ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్ లేదు. Chrome ప్రయత్నించండి లేదా ప్రశ్నను టైప్ చేయండి.', screenHelp: 'ఈ స్క్రీన్‌లో నేను ఏమి చేయగలను?' },
};

type ChatMessage = { from: 'assistant' | 'user'; text: string };
type SpeechRecognitionResultLike = { 0: { transcript: string }; isFinal: boolean };
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const SPEECH_LOCALE: Record<Language, string> = { en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', mr: 'mr-IN', te: 'te-IN' };

export type AssistantScreen = 'login' | 'onboarding' | 'duty' | 'jobs' | 'active' | 'earnings' | 'profile' | 'settings' | 'aadhaar' | 'jobDetails' | 'incomingJob' | 'sos';
export interface AssistantScreenContext {
  screen: AssistantScreen;
  isOnline?: boolean;
  availableJobs?: number;
  suggestedJobTitle?: string;
  suggestedJobPay?: number;
  suggestedJobSite?: string;
  activeJobTitle?: string;
  activeJobSite?: string;
  activeJobPay?: number;
  activeJobStep?: 'assigned' | 'traveling' | 'arrived' | 'punched_in' | 'completed';
  queuedJobTitle?: string;
  targetJobTitle?: string;
  targetJobPay?: number;
  targetJobSite?: string;
  targetJobSchedule?: string;
  targetJobDistance?: number;
  balance?: number;
  monthlyEarnings?: number;
  aadhaarVerified?: boolean;
  workerName?: string;
  primaryTrade?: string;
  jobsCompleted?: number;
  rating?: number;
}

const screenHelp = (context: AssistantScreenContext, language: Language) => {
  const text: Record<Language, Record<AssistantScreen, string>> = {
    en: {
      login: 'This is the sign in screen. Enter your phone number to log in or register, then follow the OTP prompt.',
      onboarding: 'This is profile setup. Add your personal details, choose one or more work types, and complete Aadhaar verification before finishing registration.',
      duty: `This is your duty radar. Current status: ${context.isOnline ? 'Online; nearby job offers can reach you.' : 'Offline; job offers are paused.'} There are ${context.availableJobs ?? 0} jobs matching your work type. ${context.suggestedJobTitle ? `Suggested job: ${context.suggestedJobTitle}${context.suggestedJobSite ? ` at ${context.suggestedJobSite}` : ''}${context.suggestedJobPay != null ? `, agreed pay ₹${context.suggestedJobPay}` : ''}.` : 'There is no matching suggested job right now.'} ${context.isOnline ? 'Open a job card to review it, or switch duty off.' : context.aadhaarVerified ? 'Turn duty on to receive nearby offers, or browse the Jobs tab.' : 'Verify Aadhaar first, then turn duty on or browse the Jobs tab.'}`,
      jobs: `This is the job list with ${context.availableJobs ?? 0} available jobs. Open a job to see its location, schedule, and agreed pay. ${context.aadhaarVerified ? 'You can apply or queue a job.' : 'Aadhaar verification is required before applying.'}`,
      active: context.activeJobTitle ? `This is your active job: ${context.activeJobTitle}${context.activeJobSite ? ` at ${context.activeJobSite}` : ''}${context.activeJobPay != null ? `, agreed pay ₹${context.activeJobPay}` : ''}. Current step: ${({ assigned: 'job assigned; start by travelling to the site', traveling: 'travelling to the site; use the route and mark arrival when you reach it', arrived: 'arrived; punch in to start the shift', punched_in: 'shift started; finish the work and punch out when done', completed: 'completed' } as const)[context.activeJobStep || 'assigned']}. ${context.queuedJobTitle ? `Next in your queue: ${context.queuedJobTitle}. ` : ''}Use the on-screen action to continue the current step, open SOS for urgent help, or contact the contractor.` : 'There is no active job on this screen. Go online or browse jobs to accept one.',
      earnings: `This is your earnings and passbook screen. Available balance: ₹${context.balance ?? 0}; this month: ₹${context.monthlyEarnings ?? 0}. Review transactions or request a withdrawal if available.`,
      profile: `This is ${context.workerName || 'your'} worker profile${context.primaryTrade ? `; primary work type: ${context.primaryTrade}` : ''}. Completed jobs: ${context.jobsCompleted ?? 0}; rating: ${context.rating ?? 0}; Aadhaar: ${context.aadhaarVerified ? 'verified' : 'not verified'}. Edit work types or details here, open Settings for preferences, or scroll down for account actions.`,
      settings: 'These are your app settings. You can change the app language and review the available preferences, then use the back button to return to your profile.',
      aadhaar: `This is Aadhaar verification. ${context.aadhaarVerified ? 'Your Aadhaar is verified.' : 'Complete the details and OTP steps to verify your identity.'} You can close this screen to return, but verification is required before applying for work.`,
      jobDetails: `This is the detail view for ${context.targetJobTitle || 'the selected job'}${context.targetJobSite ? ` at ${context.targetJobSite}` : ''}${context.targetJobDistance != null ? `, ${context.targetJobDistance} km away` : ''}${context.targetJobPay != null ? `, agreed pay ₹${context.targetJobPay}` : ''}${context.targetJobSchedule ? `, ${context.targetJobSchedule}` : ''}. Review the requirements and payment details, then accept or close the details. ${context.aadhaarVerified ? '' : 'Aadhaar verification is required before applying.'}`,
      incomingJob: `This is an incoming job offer: ${context.targetJobTitle || 'new work'}${context.targetJobSite ? ` at ${context.targetJobSite}` : ''}${context.targetJobPay != null ? `, agreed pay ₹${context.targetJobPay}` : ''}${context.targetJobSchedule ? `, ${context.targetJobSchedule}` : ''}. Check the details, then accept, queue for later, or decline. ${context.aadhaarVerified ? '' : 'Verify Aadhaar before accepting.'}`,
      sos: 'This is the emergency help screen. Use the call option if you need immediate assistance, or close it to return to your current job screen.',
    },
    hi: {
      login: 'यह लॉगिन स्क्रीन है। लॉगिन या रजिस्ट्रेशन के लिए मोबाइल नंबर भरें और OTP के निर्देशों का पालन करें।',
      onboarding: 'यह प्रोफ़ाइल सेटअप है। अपनी जानकारी भरें, एक या अधिक काम चुनें और रजिस्ट्रेशन पूरा करने से पहले आधार सत्यापन करें।',
      duty: `यह आपका ड्यूटी रडार है। अभी स्थिति: ${context.isOnline ? 'ऑनलाइन; पास के काम के ऑफर मिल सकते हैं।' : 'ऑफलाइन; काम के ऑफर रुके हुए हैं।'} आपके काम से मेल खाते ${context.availableJobs ?? 0} काम हैं। ${context.suggestedJobTitle ? `सुझाया काम: ${context.suggestedJobTitle}${context.suggestedJobSite ? `, ${context.suggestedJobSite} पर` : ''}${context.suggestedJobPay != null ? `, तय भुगतान ₹${context.suggestedJobPay}` : ''}।` : 'अभी कोई सुझाया हुआ काम नहीं है।'} ${context.isOnline ? 'काम का कार्ड खोलकर देखें या ड्यूटी बंद करें।' : context.aadhaarVerified ? 'पास के ऑफर पाने के लिए ड्यूटी चालू करें या काम टैब देखें।' : 'पहले आधार सत्यापित करें, फिर ड्यूटी चालू करें या काम टैब देखें।'}`,
      jobs: `यहाँ ${context.availableJobs ?? 0} कामों की सूची है। जगह, समय और तय भुगतान देखने के लिए काम खोलें। ${context.aadhaarVerified ? 'आप आवेदन कर सकते हैं या काम कतार में रख सकते हैं।' : 'आवेदन से पहले आधार सत्यापन ज़रूरी है।'}`,
      active: context.activeJobTitle ? `यह आपका चालू काम है: ${context.activeJobTitle}${context.activeJobSite ? `, ${context.activeJobSite} पर` : ''}${context.activeJobPay != null ? `, तय भुगतान ₹${context.activeJobPay}` : ''}। अभी का चरण: ${({ assigned: 'काम मिला है; साइट के लिए निकलें', traveling: 'साइट जा रहे हैं; पहुँचने पर पहुँचा हुआ दर्ज करें', arrived: 'साइट पहुँच गए; काम शुरू करने के लिए हाज़िरी लगाएँ', punched_in: 'काम शुरू है; पूरा होने पर पंच-आउट करें', completed: 'काम पूरा है' } as const)[context.activeJobStep || 'assigned']}। ${context.queuedJobTitle ? `कतार में अगला काम: ${context.queuedJobTitle}। ` : ''}अगला चरण पूरा करने के लिए स्क्रीन का बटन दबाएँ, तुरंत मदद के लिए SOS खोलें या ठेकेदार से संपर्क करें।` : 'इस स्क्रीन पर अभी कोई चालू काम नहीं है। ऑनलाइन हों या कामों की सूची से काम स्वीकार करें।',
      earnings: `यह आपकी कमाई और पासबुक स्क्रीन है। उपलब्ध बैलेंस: ₹${context.balance ?? 0}; इस महीने की कमाई: ₹${context.monthlyEarnings ?? 0}। लेनदेन देखें या उपलब्ध होने पर पैसे निकालें।`,
      profile: `यह ${context.workerName || 'आपकी'} कामगार प्रोफ़ाइल है${context.primaryTrade ? `; मुख्य काम: ${context.primaryTrade}` : ''}। पूरे किए काम: ${context.jobsCompleted ?? 0}; रेटिंग: ${context.rating ?? 0}; आधार: ${context.aadhaarVerified ? 'सत्यापित' : 'सत्यापित नहीं'}। काम के प्रकार या जानकारी बदलें, सेटिंग्स खोलें या नीचे स्क्रॉल करके खाता विकल्प देखें।`,
      settings: 'यह ऐप सेटिंग्स हैं। भाषा और उपलब्ध विकल्प बदलें। प्रोफ़ाइल पर लौटने के लिए बैक बटन दबाएँ।',
      aadhaar: `यह आधार सत्यापन है। ${context.aadhaarVerified ? 'आपका आधार सत्यापित है।' : 'पहचान सत्यापित करने के लिए जानकारी और OTP के चरण पूरे करें।'} काम के लिए आवेदन करने से पहले सत्यापन ज़रूरी है।`,
      jobDetails: `यह ${context.targetJobTitle || 'चुने हुए काम'} का विवरण है${context.targetJobSite ? `, ${context.targetJobSite} पर` : ''}${context.targetJobDistance != null ? `, ${context.targetJobDistance} किमी दूर` : ''}${context.targetJobPay != null ? `, तय भुगतान ₹${context.targetJobPay}` : ''}${context.targetJobSchedule ? `, ${context.targetJobSchedule}` : ''}। ज़रूरतें और भुगतान देखें, फिर काम स्वीकार करें या विवरण बंद करें। ${context.aadhaarVerified ? '' : 'आवेदन से पहले आधार सत्यापन ज़रूरी है।'}`,
      incomingJob: `यह काम का नया ऑफर है: ${context.targetJobTitle || 'नया काम'}${context.targetJobSite ? `, ${context.targetJobSite} पर` : ''}${context.targetJobPay != null ? `, तय भुगतान ₹${context.targetJobPay}` : ''}${context.targetJobSchedule ? `, ${context.targetJobSchedule}` : ''}। जानकारी देखकर स्वीकार करें, कतार में रखें या अस्वीकार करें। ${context.aadhaarVerified ? '' : 'स्वीकार करने से पहले आधार सत्यापित करें।'}`,
      sos: 'यह आपातकालीन सहायता स्क्रीन है। ज़रूरत पड़ने पर कॉल करें या अपने काम पर लौटने के लिए इसे बंद करें।',
    },
    bn: {
      login: 'এটি লগইন স্ক্রিন। লগইন বা নিবন্ধনের জন্য ফোন নম্বর দিন এবং OTP নির্দেশ অনুসরণ করুন।',
      onboarding: 'এটি প্রোফাইল সেটআপ। ব্যক্তিগত তথ্য দিন, এক বা একাধিক কাজ বেছে নিন এবং নিবন্ধন শেষ করার আগে আধার যাচাই করুন।',
      duty: `এটি আপনার ডিউটি রাডার। বর্তমান অবস্থা: ${context.isOnline ? 'অনলাইন; কাছের কাজের অফার আসতে পারে।' : 'অফলাইন; কাজের অফার বন্ধ আছে।'} আপনার কাজের ধরন অনুযায়ী ${context.availableJobs ?? 0}টি কাজ আছে। ${context.suggestedJobTitle ? `প্রস্তাবিত কাজ: ${context.suggestedJobTitle}${context.suggestedJobSite ? `, ${context.suggestedJobSite}এ` : ''}${context.suggestedJobPay != null ? `, মজুরি ₹${context.suggestedJobPay}` : ''}।` : 'এখন কোনো প্রস্তাবিত কাজ নেই।'} ${context.isOnline ? 'কাজের কার্ড খুলে দেখুন অথবা ডিউটি বন্ধ করুন।' : context.aadhaarVerified ? 'কাজের অফার পেতে ডিউটি চালু করুন বা Jobs ট্যাব দেখুন।' : 'আগে আধার যাচাই করুন, তারপর ডিউটি চালু করুন বা Jobs ট্যাব দেখুন।'}`,
      jobs: `এখানে ${context.availableJobs ?? 0}টি কাজের তালিকা আছে। স্থান, সময় ও মজুরি দেখতে কাজ খুলুন। ${context.aadhaarVerified ? 'আবেদন বা কাজ সারিতে রাখতে পারেন।' : 'আবেদনের আগে আধার যাচাই দরকার।'}`,
      active: context.activeJobTitle ? `এটি আপনার চলমান কাজ: ${context.activeJobTitle}${context.activeJobSite ? `, ${context.activeJobSite}এ` : ''}${context.activeJobPay != null ? `, মজুরি ₹${context.activeJobPay}` : ''}। বর্তমান ধাপ: ${({ assigned: 'কাজ বরাদ্দ হয়েছে; সাইটে যান', traveling: 'সাইটে যাচ্ছেন; পৌঁছে পৌঁছানোর তথ্য দিন', arrived: 'পৌঁছে গেছেন; কাজ শুরু করতে হাজিরা দিন', punched_in: 'কাজ চলছে; শেষ হলে পাঞ্চ আউট করুন', completed: 'কাজ শেষ' } as const)[context.activeJobStep || 'assigned']}। ${context.queuedJobTitle ? `পরের কাজ: ${context.queuedJobTitle}। ` : ''}পরের ধাপের বোতাম চাপুন, SOS খুলুন বা ঠিকাদারের সঙ্গে যোগাযোগ করুন।` : 'এই স্ক্রিনে এখন কোনো চলমান কাজ নেই। অনলাইনে যান বা কাজের তালিকা থেকে কাজ নিন।',
      earnings: `এটি আপনার আয় ও পাসবুক। উপলভ্য ব্যালেন্স: ₹${context.balance ?? 0}; এই মাসে: ₹${context.monthlyEarnings ?? 0}। লেনদেন দেখুন বা টাকা তোলার অনুরোধ করুন।`,
      profile: `এটি ${context.workerName || 'আপনার'} কর্মী প্রোফাইল${context.primaryTrade ? `; প্রধান কাজ: ${context.primaryTrade}` : ''}। সম্পন্ন কাজ: ${context.jobsCompleted ?? 0}; রেটিং: ${context.rating ?? 0}; আধার: ${context.aadhaarVerified ? 'যাচাই হয়েছে' : 'যাচাই হয়নি'}। কাজের ধরন বা তথ্য সম্পাদনা করুন, সেটিংস খুলুন, অথবা নিচে স্ক্রল করে অ্যাকাউন্টের বিকল্প দেখুন।`,
      settings: 'এটি অ্যাপ সেটিংস। ভাষা ও উপলভ্য পছন্দ বদলান। প্রোফাইলে ফিরতে ব্যাক বোতাম চাপুন।',
      aadhaar: `এটি আধার যাচাই। ${context.aadhaarVerified ? 'আপনার আধার যাচাই হয়েছে।' : 'পরিচয় যাচাই করতে তথ্য ও OTP ধাপ সম্পূর্ণ করুন।'} কাজে আবেদন করার আগে যাচাই দরকার।`,
      jobDetails: `এটি ${context.targetJobTitle || 'নির্বাচিত কাজের'} বিবরণ${context.targetJobSite ? `, ${context.targetJobSite}এ` : ''}${context.targetJobDistance != null ? `, ${context.targetJobDistance} কিমি দূরে` : ''}${context.targetJobPay != null ? `, মজুরি ₹${context.targetJobPay}` : ''}${context.targetJobSchedule ? `, ${context.targetJobSchedule}` : ''}। প্রয়োজন ও পেমেন্ট দেখে কাজ গ্রহণ করুন বা বন্ধ করুন। ${context.aadhaarVerified ? '' : 'আবেদনের আগে আধার যাচাই দরকার।'}`,
      incomingJob: `নতুন কাজের অফার: ${context.targetJobTitle || 'নতুন কাজ'}${context.targetJobSite ? `, ${context.targetJobSite}এ` : ''}${context.targetJobPay != null ? `, মজুরি ₹${context.targetJobPay}` : ''}${context.targetJobSchedule ? `, ${context.targetJobSchedule}` : ''}। দেখে গ্রহণ, সারিতে রাখা বা প্রত্যাখ্যান করুন। ${context.aadhaarVerified ? '' : 'গ্রহণের আগে আধার যাচাই করুন।'}`,
      sos: 'এটি জরুরি সাহায্যের স্ক্রিন। প্রয়োজনে কল করুন, অথবা বর্তমান কাজের স্ক্রিনে ফিরতে বন্ধ করুন।',
    },
    mr: {
      login: 'ही लॉगिन स्क्रीन आहे. लॉगिन किंवा नोंदणीसाठी फोन नंबर द्या आणि OTP सूचनांचे पालन करा.',
      onboarding: 'ही प्रोफाइल सेटअप स्क्रीन आहे. वैयक्तिक माहिती भरा, एक किंवा अधिक कामे निवडा आणि नोंदणी पूर्ण करण्यापूर्वी आधार पडताळणी करा.',
      duty: `हा तुमचा ड्युटी रडार आहे. सध्याची स्थिती: ${context.isOnline ? 'ऑनलाइन; जवळच्या कामांची ऑफर मिळू शकते.' : 'ऑफलाइन; कामांच्या ऑफर थांबल्या आहेत.'} तुमच्या कामाच्या प्रकाराशी ${context.availableJobs ?? 0} कामे जुळतात. ${context.suggestedJobTitle ? `सुचवलेले काम: ${context.suggestedJobTitle}${context.suggestedJobSite ? `, ${context.suggestedJobSite} येथे` : ''}${context.suggestedJobPay != null ? `, मानधन ₹${context.suggestedJobPay}` : ''}.` : 'सध्या सुचवलेले काम नाही.'} ${context.isOnline ? 'कामाचे कार्ड पाहा किंवा ड्युटी बंद करा.' : context.aadhaarVerified ? 'ऑफर मिळवण्यासाठी ड्युटी सुरू करा किंवा Jobs टॅब पाहा.' : 'आधी आधार पडताळा, मग ड्युटी सुरू करा किंवा Jobs टॅब पाहा.'}`,
      jobs: `या यादीत ${context.availableJobs ?? 0} कामे आहेत. ठिकाण, वेळ आणि मानधन पाहण्यासाठी काम उघडा. ${context.aadhaarVerified ? 'अर्ज करा किंवा काम रांगेत ठेवा.' : 'अर्ज करण्यापूर्वी आधार पडताळणी आवश्यक आहे.'}`,
      active: context.activeJobTitle ? `हे तुमचे चालू काम आहे: ${context.activeJobTitle}${context.activeJobSite ? `, ${context.activeJobSite} येथे` : ''}${context.activeJobPay != null ? `, मानधन ₹${context.activeJobPay}` : ''}. सध्याचा टप्पा: ${({ assigned: 'काम मिळाले; साइटकडे निघा', traveling: 'साइटकडे जात आहात; पोहोचल्यावर पोहोचल्याची नोंद करा', arrived: 'साइटवर पोहोचलात; काम सुरू करण्यासाठी हजेरी लावा', punched_in: 'काम सुरू आहे; पूर्ण झाल्यावर पंच-आउट करा', completed: 'काम पूर्ण' } as const)[context.activeJobStep || 'assigned']}.${context.queuedJobTitle ? ` पुढचे काम: ${context.queuedJobTitle}.` : ''} पुढील टप्प्यासाठी स्क्रीनवरील बटण वापरा, SOS उघडा किंवा कंत्राटदाराशी संपर्क साधा.` : 'या स्क्रीनवर सध्या चालू काम नाही. ऑनलाइन व्हा किंवा कामांच्या यादीतून काम स्वीकारा.',
      earnings: `ही तुमची कमाई आणि पासबुक स्क्रीन आहे. उपलब्ध शिल्लक: ₹${context.balance ?? 0}; या महिन्यात: ₹${context.monthlyEarnings ?? 0}. व्यवहार पाहा किंवा पैसे काढण्याची विनंती करा.`,
      profile: `हे ${context.workerName || 'तुमचे'} कामगार प्रोफाइल${context.primaryTrade ? `; मुख्य काम: ${context.primaryTrade}` : ''}. पूर्ण कामे: ${context.jobsCompleted ?? 0}; रेटिंग: ${context.rating ?? 0}; आधार: ${context.aadhaarVerified ? 'पडताळलेला' : 'पडताळलेला नाही'}. कामाचे प्रकार किंवा माहिती बदला, सेटिंग्ज उघडा किंवा खाते पर्यायांसाठी खाली स्क्रोल करा.`,
      settings: 'ही अॅप सेटिंग्ज आहेत. भाषा आणि उपलब्ध पर्याय बदला. प्रोफाइलवर परतण्यासाठी बॅक बटण दाबा.',
      aadhaar: `ही आधार पडताळणी आहे. ${context.aadhaarVerified ? 'तुमचा आधार पडताळला आहे.' : 'ओळख पडताळण्यासाठी माहिती आणि OTP टप्पे पूर्ण करा.'} कामासाठी अर्ज करण्यापूर्वी पडताळणी आवश्यक आहे.`,
      jobDetails: `हे ${context.targetJobTitle || 'निवडलेल्या कामाचे'} तपशील आहेत${context.targetJobSite ? `, ${context.targetJobSite} येथे` : ''}${context.targetJobDistance != null ? `, ${context.targetJobDistance} किमी दूर` : ''}${context.targetJobPay != null ? `, मानधन ₹${context.targetJobPay}` : ''}${context.targetJobSchedule ? `, ${context.targetJobSchedule}` : ''}. अटी आणि पेमेंट पाहून स्वीकारा किंवा बंद करा. ${context.aadhaarVerified ? '' : 'अर्जापूर्वी आधार पडताळणी आवश्यक आहे.'}`,
      incomingJob: `नवीन कामाची ऑफर: ${context.targetJobTitle || 'नवीन काम'}${context.targetJobSite ? `, ${context.targetJobSite} येथे` : ''}${context.targetJobPay != null ? `, मानधन ₹${context.targetJobPay}` : ''}${context.targetJobSchedule ? `, ${context.targetJobSchedule}` : ''}. पाहून स्वीकारा, रांगेत ठेवा किंवा नकार द्या. ${context.aadhaarVerified ? '' : 'स्वीकारण्यापूर्वी आधार पडताळा.'}`,
      sos: 'ही आपत्कालीन मदत स्क्रीन आहे. गरज असल्यास कॉल करा किंवा चालू कामावर परतण्यासाठी बंद करा.',
    },
    te: {
      login: 'ఇది లాగిన్ స్క్రీన్. లాగిన్ లేదా నమోదు కోసం ఫోన్ నంబర్ ఇచ్చి OTP సూచనలను అనుసరించండి.',
      onboarding: 'ఇది ప్రొఫైల్ సెటప్. వ్యక్తిగత వివరాలు నమోదు చేసి, ఒకటి లేదా అంతకంటే ఎక్కువ పనులు ఎంచుకుని, నమోదు పూర్తి చేసే ముందు ఆధార్ ధృవీకరించండి.',
      duty: `ఇది మీ డ్యూటీ రాడార్. ప్రస్తుత స్థితి: ${context.isOnline ? 'ఆన్‌లైన్; దగ్గరలోని పని ఆఫర్లు రావచ్చు.' : 'ఆఫ్‌లైన్; పని ఆఫర్లు ఆగి ఉన్నాయి.'} మీ పని రకానికి ${context.availableJobs ?? 0} పనులు సరిపోతున్నాయి. ${context.suggestedJobTitle ? `సూచించిన పని: ${context.suggestedJobTitle}${context.suggestedJobSite ? `, ${context.suggestedJobSite} వద్ద` : ''}${context.suggestedJobPay != null ? `, అంగీకరించిన చెల్లింపు ₹${context.suggestedJobPay}` : ''}.` : 'ప్రస్తుతం సూచించిన పని లేదు.'} ${context.isOnline ? 'పని కార్డ్ తెరిచి చూడండి లేదా డ్యూటీ ఆపండి.' : context.aadhaarVerified ? 'ఆఫర్లు పొందడానికి డ్యూటీ ఆన్ చేయండి లేదా Jobs ట్యాబ్ చూడండి.' : 'ముందుగా ఆధార్ ధృవీకరించి, తర్వాత డ్యూటీ ఆన్ చేయండి లేదా Jobs ట్యాబ్ చూడండి.'}`,
      jobs: `ఈ జాబితాలో ${context.availableJobs ?? 0} పనులు ఉన్నాయి. స్థలం, సమయం, చెల్లింపు చూడటానికి పనిని తెరవండి. ${context.aadhaarVerified ? 'దరఖాస్తు చేయండి లేదా క్యూలో పెట్టండి.' : 'దరఖాస్తు చేయడానికి ముందు ఆధార్ ధృవీకరణ అవసరం.'}`,
      active: context.activeJobTitle ? `ఇది మీ ప్రస్తుత పని: ${context.activeJobTitle}${context.activeJobSite ? `, ${context.activeJobSite} వద్ద` : ''}${context.activeJobPay != null ? `, చెల్లింపు ₹${context.activeJobPay}` : ''}. ప్రస్తుత దశ: ${({ assigned: 'పని కేటాయించారు; సైట్‌కు బయలుదేరండి', traveling: 'సైట్‌కు వెళ్తున్నారు; చేరినప్పుడు చేరుకున్నట్లు నమోదు చేయండి', arrived: 'సైట్‌కు చేరుకున్నారు; పని ప్రారంభించడానికి హాజరు నమోదు చేయండి', punched_in: 'పని ప్రారంభమైంది; పూర్తయ్యాక పంచ్ అవుట్ చేయండి', completed: 'పని పూర్తయింది' } as const)[context.activeJobStep || 'assigned']}.${context.queuedJobTitle ? ` క్యూలో తదుపరి పని: ${context.queuedJobTitle}.` : ''} తదుపరి దశ బటన్‌ను నొక్కండి, అత్యవసరానికి SOS తెరవండి లేదా కాంట్రాక్టర్‌ను సంప్రదించండి.` : 'ఈ స్క్రీన్‌లో ప్రస్తుతం పని లేదు. ఆన్‌లైన్‌కు వెళ్లండి లేదా పనుల జాబితా నుంచి అంగీకరించండి.',
      earnings: `ఇది మీ ఆదాయం, పాస్‌బుక్ స్క్రీన్. అందుబాటులో ఉన్న బ్యాలెన్స్: ₹${context.balance ?? 0}; ఈ నెల: ₹${context.monthlyEarnings ?? 0}. లావాదేవీలు చూడండి లేదా ఉపసంహరణ కోరండి.`,
      profile: `ఇది ${context.workerName || 'మీ'} వర్కర్ ప్రొఫైల్${context.primaryTrade ? `; ప్రధాన పని: ${context.primaryTrade}` : ''}. పూర్తయిన పనులు: ${context.jobsCompleted ?? 0}; రేటింగ్: ${context.rating ?? 0}; ఆధార్: ${context.aadhaarVerified ? 'ధృవీకరించబడింది' : 'ధృవీకరించబడలేదు'}. పని రకాలు లేదా వివరాలు మార్చండి, సెట్టింగ్స్ తెరవండి లేదా ఖాతా ఎంపికల కోసం కిందికి స్క్రోల్ చేయండి.`,
      settings: 'ఇవి యాప్ సెట్టింగ్స్. భాష, అందుబాటులో ఉన్న ఎంపికలను మార్చండి. ప్రొఫైల్‌కు తిరిగి వెళ్లడానికి బ్యాక్ బటన్ నొక్కండి.',
      aadhaar: `ఇది ఆధార్ ధృవీకరణ. ${context.aadhaarVerified ? 'మీ ఆధార్ ధృవీకరించబడింది.' : 'గుర్తింపు ధృవీకరణకు వివరాలు, OTP దశలు పూర్తి చేయండి.'} పనికి దరఖాస్తు చేసే ముందు ధృవీకరణ అవసరం.`,
      jobDetails: `ఇది ${context.targetJobTitle || 'ఎంచుకున్న పని'} వివరాలు${context.targetJobSite ? `, ${context.targetJobSite} వద్ద` : ''}${context.targetJobDistance != null ? `, ${context.targetJobDistance} కి.మీ. దూరంలో` : ''}${context.targetJobPay != null ? `, చెల్లింపు ₹${context.targetJobPay}` : ''}${context.targetJobSchedule ? `, ${context.targetJobSchedule}` : ''}. అవసరాలు, చెల్లింపు చూసి అంగీకరించండి లేదా మూసివేయండి. ${context.aadhaarVerified ? '' : 'దరఖాస్తుకు ముందు ఆధార్ ధృవీకరణ అవసరం.'}`,
      incomingJob: `కొత్త పని ఆఫర్: ${context.targetJobTitle || 'కొత్త పని'}${context.targetJobSite ? `, ${context.targetJobSite} వద్ద` : ''}${context.targetJobPay != null ? `, చెల్లింపు ₹${context.targetJobPay}` : ''}${context.targetJobSchedule ? `, ${context.targetJobSchedule}` : ''}. పరిశీలించి అంగీకరించండి, క్యూలో పెట్టండి లేదా తిరస్కరించండి. ${context.aadhaarVerified ? '' : 'అంగీకరించే ముందు ఆధార్ ధృవీకరించండి.'}`,
      sos: 'ఇది అత్యవసర సహాయ స్క్రీన్. అవసరమైతే కాల్ చేయండి లేదా ప్రస్తుత పనికి తిరిగి వెళ్లడానికి మూసివేయండి.',
    },
  };
  return text[language][context.screen];
};

function answerFor(question: string, language: Language) {
  const value = question.toLocaleLowerCase();
  const groups = [
    /(job|work|काम|नौकरी|काम|কাজ|పని|ఉద్యోగ)/i,
    /(aadhaar|aadhar|आधार|আধার|ఆధార్)/i,
    /(pay|payment|earning|balance|पैसा|भुगतान|कमाई|পেমেন্ট|টাকা|पेमेंट|पगार|చెల్లింపు|డబ్బు|ఆదాయం)/i,
    /(profile|setting|प्रोफ़ाइल|प्रोफाइल|सेटिंग|প্রোফাইল|সেটিং|प्रोफाइल|सेटिंग|ప్రొఫైల్|సెట్టింగ్)/i,
  ];
  const index = groups.findIndex((pattern) => pattern.test(value));
  return index < 0 ? COPY[language].unknown : COPY[language].answers[index];
}

export const AiAssistant: React.FC<{ language: Language; screenContext?: AssistantScreenContext }> = ({ language, screenContext }) => {
  const copy = COPY[language] || COPY.en;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [openSequence, setOpenSequence] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const openAndExplain = () => { setOpen(true); setOpenSequence((sequence) => sequence + 1); };
    window.addEventListener('kaamsetu:open-ai-assistant', openAndExplain);
    return () => window.removeEventListener('kaamsetu:open-ai-assistant', openAndExplain);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (!open || openSequence === 0 || !screenContext) return;
    const explanation = screenHelp(screenContext, language);
    setMessages((current) => [...current, { from: 'assistant', text: explanation }]);
    if (voiceReplies) speakText(explanation, language);
  }, [openSequence]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    stopSpeech();
  }, []);

  const ask = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    const asksAboutScreen = /(this screen|this page|what can i do|what should i do|what.?s on|what is on|what.?s actually|screen help|explain this|explain the screen|इस स्क्रीन|यहाँ क्या|क्या कर सकता|समझाओ|बताओ|কী করতে পারি|এই স্ক্রিন|বুঝিয়ে বল|या स्क्रीनवर|काय करू शकतो|समजावून सांग|ఈ స్క్రీన్|ఏం చేయగలను|ఇప్పుడు ఏమి|వివరించండి)/i.test(trimmed);
    const answer = asksAboutScreen && screenContext ? screenHelp(screenContext, language) : answerFor(trimmed, language);
    setMessages((current) => [...current, { from: 'user', text: trimmed }, { from: 'assistant', text: answer }]);
    setDraft('');
    setVoiceError('');
    if (voiceReplies) speakText(answer, language);
  };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const speechWindow = window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError(copy.voiceUnavailable);
      return;
    }

    setVoiceError('');
    stopSpeech();
    const recognition = new Recognition();
    recognition.lang = SPEECH_LOCALE[language] || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const result = event.results[event.resultIndex];
      if (!result) return;
      const transcript = result[0]?.transcript?.trim() || '';
      setDraft(transcript);
      if (result.isFinal && transcript) ask(transcript);
    };
    recognition.onerror = () => {
      setListening(false);
      setVoiceError(copy.voiceUnavailable);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
      setVoiceError(copy.voiceUnavailable);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    ask(draft);
  };

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setOpenSequence((sequence) => sequence + 1); }} aria-label={copy.open} title={copy.open} className="absolute bottom-[calc(82px+env(safe-area-inset-bottom))] right-4 z-[65] flex h-14 w-14 items-center justify-center rounded-full bg-blue-700 text-white shadow-lg shadow-blue-900/25 transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 lg:bottom-5">
        <Bot className="h-6 w-6" />
      </button>
      {open && <div className="absolute inset-0 z-[80] flex items-end justify-center bg-slate-950/35 p-3 pb-[calc(78px+env(safe-area-inset-bottom))] sm:items-center sm:p-5">
        <section role="dialog" aria-modal="true" aria-labelledby="ai-assistant-title" className="flex max-h-[min(640px,82dvh)] w-full max-w-[430px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
          <header className="flex items-center gap-3 bg-blue-700 px-4 py-3.5 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15"><Sparkles className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1"><h2 id="ai-assistant-title" className="text-sm font-extrabold">{copy.title}</h2><p className="text-[11px] text-blue-100">{copy.note}</p></div>
            <button type="button" onClick={() => { setVoiceReplies((enabled) => { if (enabled) stopSpeech(); return !enabled; }); }} aria-label={voiceReplies ? copy.voiceOn : copy.voiceOff} title={voiceReplies ? copy.voiceOn : copy.voiceOff} className="rounded-xl p-2 hover:bg-white/15">{voiceReplies ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</button>
            <button type="button" onClick={() => { recognitionRef.current?.stop(); stopSpeech(); setListening(false); setOpen(false); }} aria-label={copy.close} className="rounded-xl p-2 hover:bg-white/15"><X className="h-5 w-5" /></button>
          </header>
          <div ref={scrollRef} className="min-h-[220px] flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white p-3 text-sm leading-relaxed text-slate-800 shadow-sm">{copy.welcome}</div>
            {messages.map((message, index) => <div key={`${index}-${message.from}`} className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}><p className={`max-w-[90%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${message.from === 'user' ? 'rounded-br-sm bg-blue-700 text-white' : 'rounded-tl-sm bg-white text-slate-800 shadow-sm'}`}>{message.text}</p></div>)}
            {!messages.length && <div className="flex flex-wrap gap-2">{copy.topics.map((topic) => <button key={topic} type="button" onClick={() => ask(topic)} className="rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50">{topic}</button>)}</div>}
          </div>
          <form onSubmit={submit} className="border-t border-slate-100 bg-white p-3">
            {screenContext && <button type="button" onClick={() => ask(copy.screenHelp)} className="mb-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{copy.screenHelp}</button>}
            {voiceError && <p role="status" className="mb-2 text-xs text-rose-600">{voiceError}</p>}
            {listening && <p role="status" className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-700"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />{copy.listening}</p>}
            <div className="flex items-center gap-2">
            <button type="button" onClick={toggleListening} aria-label={listening ? copy.stopListening : copy.startListening} title={listening ? copy.stopListening : copy.startListening} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${listening ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{listening ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}</button>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={copy.placeholder} aria-label={copy.placeholder} className="h-11 min-w-0 flex-1 rounded-xl bg-slate-100 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" disabled={!draft.trim()} aria-label={copy.send} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>
            </div>
          </form>
        </section>
      </div>}
    </>
  );
};
