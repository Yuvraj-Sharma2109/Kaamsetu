import React from 'react';
import { AiAssistant } from './AiAssistant';
import type { AssistantScreenContext } from './AiAssistant';
import { Language } from '../types';

interface MobileFrameProps {
  children: React.ReactNode;
  bottomOverlay?: React.ReactNode;
  language?: Language;
  screenContext?: AssistantScreenContext;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children, bottomOverlay, language, screenContext }) => (
  <div className="min-h-[100dvh] w-full bg-[#f1f1f1] text-neutral-900 font-sans select-none lg:px-6 lg:py-6">
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#f1f1f1] lg:h-[calc(100dvh-3rem)] lg:rounded-3xl lg:shadow-xl">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
        {language && <AiAssistant language={language} screenContext={screenContext} />}
      </div>

      {bottomOverlay && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[env(safe-area-inset-bottom)] z-50 flex justify-center">
          <div className="pointer-events-auto flex w-full justify-center">{bottomOverlay}</div>
        </div>
      )}
    </div>
  </div>
);
