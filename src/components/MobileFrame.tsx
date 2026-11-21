import React, { useEffect, useState } from 'react';
import { AiAssistant } from './AiAssistant';
import type { AssistantScreenContext } from './AiAssistant';
import { Language } from '../types';

interface MobileFrameProps {
  children: React.ReactNode;
  bottomOverlay?: React.ReactNode;
  language?: Language;
  screenContext?: AssistantScreenContext;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children, bottomOverlay, language, screenContext }) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => setScale(Math.min(1, window.innerWidth / 417, window.innerHeight / 917));
    updateScale();
    window.addEventListener('resize', updateScale);
    window.visualViewport?.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      window.visualViewport?.removeEventListener('resize', updateScale);
    };
  }, []);

  return (
  <div className="flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#e7e7e7] font-sans text-neutral-900 select-none">
    <div style={{ width: 417, height: 917, transform: `scale(${scale})`, transformOrigin: 'center center' }} className="relative flex w-[417px] h-[917px] shrink-0 flex-col overflow-hidden bg-[#f1f1f1] shadow-xl">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
        {language && <AiAssistant language={language} screenContext={screenContext} />}
      </div>

      {bottomOverlay && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex justify-center">
          <div className="pointer-events-auto flex w-full justify-center">{bottomOverlay}</div>
        </div>
      )}
    </div>
  </div>
  );
};
