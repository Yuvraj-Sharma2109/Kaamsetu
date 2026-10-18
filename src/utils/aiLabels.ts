import { Language } from '../types';

export const aiLabel = (language: Language) => ({
  title: { en: 'AI assistance', hi: 'AI सहायता', bn: 'AI সহায়তা', mr: 'AI सहाय्य', te: 'AI సహాయం' }[language],
  open: { en: 'Ask AI', hi: 'AI से पूछें', bn: 'AI-কে জিজ্ঞাসা করুন', mr: 'AI ला विचारा', te: 'AIని అడగండి' }[language],
});
