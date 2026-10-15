import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Language } from '../types';
import { 
  Radio, 
  Search, 
  Briefcase, 
  Wallet, 
  UserCheck,
} from 'lucide-react';

export type TabType = 'radar' | 'feed' | 'active' | 'passbook' | 'profile';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  language: Language;
  isOnline: boolean;
  hasActiveJob: boolean;
  availableJobsCount: number;
  menuOpen: boolean;
  onCloseMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  language,
  isOnline,
  hasActiveJob,
  availableJobsCount,
  menuOpen,
  onCloseMenu,
}) => {
  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseMenu();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen, onCloseMenu]);

  const navItems: { id: TabType; label: string; icon: React.ReactNode; badge?: React.ReactNode }[] = [
    {
      id: 'radar',
      label: language === 'hi' ? 'ड्यूटी' : 'Duty',
      icon: (
        <div className="relative">
          <Radio className="w-5 h-5" />
          {isOnline && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
          )}
        </div>
      ),
    },
    {
      id: 'feed',
      label: language === 'hi' ? 'काम खोजें' : 'Jobs',
      icon: <Search className="w-5 h-5" />,
      badge: availableJobsCount > 0 ? (
        <span className="text-[10px] font-black px-1.5 py-0.2 bg-neutral-900 text-white rounded-full">
          {availableJobsCount}
        </span>
      ) : null,
    },
    {
      id: 'active',
      label: language === 'hi' ? 'चालू काम' : 'Active',
      icon: (
        <div className="relative">
          <Briefcase className="w-5 h-5" />
          {hasActiveJob && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
          )}
        </div>
      ),
    },
    {
      id: 'passbook',
      label: language === 'hi' ? 'कमाई' : 'Pay',
      icon: <Wallet className="w-5 h-5" />,
    },
    {
      id: 'profile',
      label: language === 'hi' ? 'पहचान ID' : 'Worker ID',
      icon: <UserCheck className="w-5 h-5" />,
    },
  ];

  return (
    <>
      <nav aria-label={language === 'hi' ? 'मुख्य नेविगेशन' : 'Main navigation'} className="h-[65px] w-[calc(100%-32px)] max-w-[361px] md:max-w-xl shrink-0 rounded-[20px] bg-white px-1.5 select-none shadow-[0px_2px_20px_rgba(0,0,0,0.11)] lg:hidden">
        <div className="grid grid-cols-4 items-center h-full">
          {navItems.filter((item) => item.id !== 'profile').map((item) => {
          const isActive = currentTab === item.id;
          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              whileTap={{ scale: 0.94 }}
              transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }}
              className={`min-h-[55px] flex items-center justify-center rounded-[15px] transition-all relative ${
                isActive
                  ? 'bg-[#2d59f0] text-white font-black'
                  : 'text-neutral-900 hover:bg-slate-50'
              }`}
            >
              {/* Icon Container */}
              <motion.div animate={{ scale: isActive ? 1 : 0.96 }} transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }} className="relative flex items-center justify-center">
                {item.icon}
                {item.badge && (
                  <span className="absolute -top-1.5 -right-3">
                    {item.badge}
                  </span>
                )}
              </motion.div>

            </motion.button>
          );
          })}
        </div>
      </nav>

      <div className="hidden lg:block">
        {menuOpen && (
          <>
            <button
              type="button"
              aria-label={language === 'hi' ? 'मेनू बंद करें' : 'Close menu'}
              onClick={onCloseMenu}
              className="fixed inset-0 z-[60] cursor-default"
            />
            <nav
              aria-label={language === 'hi' ? 'मुख्य नेविगेशन' : 'Main navigation'}
              role="menu"
              style={{ left: 'max(16px, calc((100vw - 42rem) / 2 + 14px))' }}
              className="fixed top-20 z-[70] w-64 overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-xl"
            >
              {navItems.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => {
                      onSelectTab(item.id);
                      onCloseMenu();
                    }}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    <span className="relative flex h-5 w-5 items-center justify-center">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.id === 'feed' && availableJobsCount > 0 && (
                      <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-black text-white">{availableJobsCount}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </>
        )}
      </div>
    </>
  );
};
