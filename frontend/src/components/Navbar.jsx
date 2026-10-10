import React from 'react';
import { Lock } from 'lucide-react';

/**
 * Bespoke 3-Building Isometric Cluster SVG
 * Styled according to civic infrastructure identity
 */
function NagarYojanaLogoIcon({ className = "w-8 h-8" }) {
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
      {/* Left Building Amber Window Slits */}
      <line x1="7" y1="18" x2="7" y2="21" stroke="#FBBF24" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="7" y1="24" x2="7" y2="27" stroke="#FBBF24" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="13" y1="13" x2="13" y2="16" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="13" y1="19" x2="13" y2="22" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="13" y1="25" x2="13" y2="28" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />

      {/* Center Tall Building */}
      <polygon points="21,5 27,1 27,29 21,33" fill="#DC143C" />
      <polygon points="15,9 21,5 21,33 15,36" fill="#B91C1C" />
      {/* Center Amber Window Slits */}
      <line x1="18" y1="13" x2="18" y2="17" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="18" y1="20" x2="18" y2="24" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="18" y1="27" x2="18" y2="31" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="24" y1="8" x2="24" y2="12" stroke="#FEF08A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="24" y1="15" x2="24" y2="19" stroke="#FEF08A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="24" y1="22" x2="24" y2="26" stroke="#FEF08A" strokeWidth="1.2" strokeLinecap="round" />

      {/* Right Building */}
      <polygon points="31,12 36,9 36,30 31,33" fill="#991B1B" />
      <polygon points="26,15 31,12 31,33 26,36" fill="#7F1D1D" />
      {/* Right Amber Window Slits */}
      <line x1="28.5" y1="19" x2="28.5" y2="23" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="28.5" y1="26" x2="28.5" y2="30" stroke="#FDE68A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="33.5" y1="15" x2="33.5" y2="19" stroke="#FEF08A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="33.5" y1="22" x2="33.5" y2="26" stroke="#FEF08A" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export default function Navbar({ language, onLanguageChange, t, onStaffLoginClick }) {
  return (
    <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Block */}
        <div className="flex items-center gap-3">
          <NagarYojanaLogoIcon className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0" />
          <div className="flex flex-col">
            <div className="flex items-baseline tracking-tight font-bold text-2xl sm:text-[26px] leading-none">
              <span className="text-[#DC143C]">Nagar</span>
              <span className="text-[#2E8B57]">योजना</span>
            </div>
            <span className="text-xs text-gray-500 font-normal tracking-wide mt-1">
              {t.portalSubtitle}
            </span>
          </div>
        </div>

        {/* Right Action Block: Single Language Toggle (ने / En) + Staff Login */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Single Language Button: Compact, borderless; on hover shows rounded background with no border */}
          <button
            type="button"
            onClick={() => onLanguageChange(language === 'en' ? 'ne' : 'en')}
            className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors focus:outline-none"
            title={language === 'en' ? 'नेपालीमा हेर्नुहोस्' : 'Switch to English'}
            aria-label={language === 'en' ? 'Switch to Nepali' : 'Switch to English'}
          >
            <span>{language === 'en' ? 'ने' : 'En'}</span>
          </button>

          {/* Staff Login Button */}
          <button
            type="button"
            onClick={onStaffLoginClick}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 px-2.5 sm:px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            <Lock className="w-3.5 h-3.5 text-gray-700 stroke-[2.2]" />
            <span>{t.staffLogin}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
