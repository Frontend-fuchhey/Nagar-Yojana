import React from 'react';
import { Globe } from 'lucide-react';
import { setPageLanguage } from '../utils/translator';

export default function Navbar({ language, onLanguageChange }) {
  const handleToggle = () => {
    const nextLang = language === 'ne' ? 'en' : 'ne';
    if (onLanguageChange) onLanguageChange(nextLang);
    setPageLanguage(nextLang);
  };

  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
      <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-5 h-16 flex items-center justify-between">

        {/* Brand Block */}
        <div className="flex items-center gap-3 sm:gap-3.5">
          <img
            src="/Biratnagar%20City%20Gate%20Logo.png"
            alt="Biratnagar City Gate Logo"
            className="h-11 sm:h-12 w-auto object-contain flex-shrink-0 drop-shadow-sm"
          />
          <div className="flex flex-col">
            <div className="flex items-baseline tracking-tight font-bold text-xl sm:text-[22px] leading-none notranslate">
              <span className="text-[#DC143C]">Nagar</span>
              <span className="text-[#156947]">योजना</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-none">
                Civic Infrastructure Portal
              </span>
              <span className="text-slate-300 text-[10px] leading-none">•</span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal leading-none">
                Biratnagar Metropolitan City
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Block: Language Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleToggle}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-300 notranslate cursor-pointer"
            aria-label={language === 'ne' ? 'Switch language to English' : 'भाषा नेपालीमा बदल्नुहोस्'}
            title={language === 'ne' ? 'Switch to English' : 'नेपालीमा हेर्नुहोस्'}
          >
            <Globe className="w-4 h-4 text-slate-600" />
            <span>{language === 'ne' ? 'En' : 'ने'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

