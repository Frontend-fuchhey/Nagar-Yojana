import React from 'react';
import { User, Globe } from 'lucide-react';

/**
 * Bespoke 3-Building Isometric Cluster SVG Logo
 */
function NagarYojanaLogoIcon({ className = "w-7 h-7 sm:w-8 sm:h-8" }) {
  return (
    <svg
      viewBox="0 0 36 36"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Left Building */}
      <polygon points="10,10 16,6 16,30 10,34" fill="#B91C1C" />
      <polygon points="4,14 10,10 10,34 4,37" fill="#991B1B" />
      <polygon points="10,10 16,6 10,2 4,14" fill="#DC2626" />
      <line x1="7" y1="18" x2="7" y2="21" stroke="#FBBF24" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="7" y1="24" x2="7" y2="27" stroke="#FBBF24" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="13" y1="13" x2="13" y2="16" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="13" y1="19" x2="13" y2="22" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="13" y1="25" x2="13" y2="28" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />

      {/* Center Tall Building */}
      <polygon points="21,5 27,1 27,29 21,33" fill="#DC143C" />
      <polygon points="15,9 21,5 21,33 15,36" fill="#B91C1C" />
      <line x1="18" y1="13" x2="18" y2="17" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="18" y1="20" x2="18" y2="24" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="18" y1="27" x2="18" y2="31" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="24" y1="8" x2="24" y2="12" stroke="#FEF08A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="24" y1="15" x2="24" y2="19" stroke="#FEF08A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="24" y1="22" x2="24" y2="26" stroke="#FEF08A" strokeWidth="1.2" strokeLinecap="round" />

      {/* Right Building */}
      <polygon points="31,12 36,9 36,30 31,33" fill="#991B1B" />
      <polygon points="26,15 31,12 31,33 26,36" fill="#7F1D1D" />
      <line x1="28.5" y1="19" x2="28.5" y2="23" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="28.5" y1="26" x2="28.5" y2="30" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="33.5" y1="15" x2="33.5" y2="19" stroke="#FEF08A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="33.5" y1="22" x2="33.5" y2="26" stroke="#FEF08A" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export default function Navbar({ language, onLanguageChange, t, onStaffLoginClick }) {
  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
      <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-5 h-14 flex items-center justify-between">

        {/* Brand Block */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <NagarYojanaLogoIcon className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" />
          <div className="flex flex-col">
            <div className="flex items-baseline tracking-tight font-bold text-xl sm:text-[22px] leading-none">
              <span className="text-[#DC143C]">Nagar</span>
              <span className="text-[#156947]">योजना</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-none">
                {t.portalSubtitle}
              </span>
              <span className="text-slate-300 text-[10px] leading-none">•</span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal leading-none">
                {t.portalMunicipality}
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Block: Language Dropdown (🌐 EN ▾) + Staff Portal Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Single language toggle: shows the language you can switch to */}
          <button
            type="button"
            onClick={() => onLanguageChange(language === 'ne' ? 'en' : 'ne')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
            aria-label={language === 'ne' ? 'Switch language to English' : 'भाषा नेपालीमा बदल्नुहोस्'}
            title={language === 'ne' ? 'Switch to English' : 'नेपालीमा हेर्नुहोस्'}
          >
            <Globe className="w-4 h-4 text-slate-600" />
            <span>{language === 'ne' ? 'En' : 'ने'}</span>
          </button>

          {/* Squeezed Staff Portal Button matching mockup */}
          <button
            type="button"
            onClick={onStaffLoginClick}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
          >
            <User className="w-3.5 h-3.5 text-slate-600 stroke-[2.2]" />
            <span>{t.staffPortal}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

