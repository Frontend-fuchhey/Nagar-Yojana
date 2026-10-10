import React from 'react';
import { MapPin, HardHat, Flag } from 'lucide-react';
import {
  PROJECT_TRANSLATIONS,
  toDevanagariNumerals,
} from '../translations';

export default function ProjectCard({ project, language, t, onReportIssue }) {
  const { id, title, status, location, contractor, budget, progress, imageUrl, ward } = project;

  const isNe = language === 'ne';
  const trans = isNe && PROJECT_TRANSLATIONS[id] ? PROJECT_TRANSLATIONS[id] : null;

  const displayTitle = trans?.title || title;
  const displayLocation = trans?.location || location;
  const displayContractor = trans?.contractor || contractor;
  const displayWard = trans?.ward || (isNe && ward ? ward.replace('Ward', 'वडा').replace(/(\d+)/, (m) => toDevanagariNumerals(m)) : ward);
  const displayBudget = isNe ? toDevanagariNumerals(budget) : budget;
  const clampedProgress = Math.min(Math.max(Number(progress) || 0, 0), 100);
  const displayProgress = isNe ? toDevanagariNumerals(clampedProgress) : clampedProgress;

  const statusUpper = status?.toUpperCase() || 'ACTIVE';

  // Distinct status configurations - styled with plain colored text (no rounded pill, no dot)
  const getStatusConfig = () => {
    switch (statusUpper) {
      case 'ACTIVE':
        return {
          textClass: 'text-[#15803D]',
          barFillClass: 'bg-[#2E8B57]',
          badgeBg: 'bg-[#2E8B57] text-white',
          statusLabel: isNe ? 'सक्रिय' : 'ACTIVE',
        };
      case 'DELAYED':
        return {
          textClass: 'text-[#D97706]',
          barFillClass: 'bg-[#D97706]',
          badgeBg: 'bg-[#D97706] text-white',
          statusLabel: isNe ? 'ढिलाइ' : 'DELAYED',
        };
      case 'COMPLETED':
        return {
          textClass: 'text-[#0284C7]',
          barFillClass: 'bg-[#0284C7]',
          badgeBg: 'bg-[#0284C7] text-white',
          statusLabel: isNe ? 'सम्पन्न' : 'COMPLETED',
        };
      default:
        return {
          textClass: 'text-gray-600',
          barFillClass: 'bg-gray-600',
          badgeBg: 'bg-gray-700 text-white',
          statusLabel: statusUpper,
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <article className="border-b border-gray-200 py-6 sm:py-8 last:border-b-0">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Project Thumbnail Image */}
        <div className="w-full sm:w-80 h-48 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
          <img
            src={imageUrl}
            alt={displayTitle}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1541888087405-eb81f8fce0ec?q=80&w=800&auto=format&fit=crop';
            }}
          />
        </div>

        {/* Project Details */}
        <div className="flex-1 flex flex-col justify-between min-h-[192px] w-full">
          {/* Top Line: Title + Pure Colored Text Status */}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-base sm:text-lg font-bold uppercase text-gray-900 tracking-tight">
                {displayTitle}
              </h3>
              <span className={`text-xs font-bold tracking-wider uppercase ${statusConfig.textClass}`}>
                {statusConfig.statusLabel}
              </span>
            </div>

            {/* Second Line: Ward, Location & Contractor */}
            <div className="mt-2.5 flex flex-wrap items-center text-sm text-gray-600 gap-y-1">
              {displayWard && (
                <>
                  <span className="font-semibold text-gray-700 text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {displayWard}
                  </span>
                  <span className="text-gray-300 mx-2 select-none font-light">|</span>
                </>
              )}
              <div className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span>{displayLocation}</span>
              </div>
              <span className="text-gray-300 mx-2.5 select-none font-light">|</span>
              <div className="inline-flex items-center gap-1">
                <HardHat className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>{displayContractor}</span>
              </div>
            </div>

            {/* Third Line: Budget */}
            <p className="mt-2 text-sm font-bold text-gray-900">
              {t.budgetPrefix} {displayBudget}
            </p>
          </div>

          {/* Bottom Row: Progress Visualization & Report Action */}
          <div className="mt-4 pt-2 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            {/* Progress Visualization */}
            <div className="w-full sm:max-w-md">
              {/* Dynamic Percentage Badge positioned directly above bar fill terminus */}
              <div className="relative h-6 mb-1">
                <span
                  className={`absolute bottom-0 text-[11px] font-bold px-2 py-0.5 rounded transition-all duration-300 ${statusConfig.badgeBg}`}
                  style={{
                    left: `${clampedProgress}%`,
                    transform: clampedProgress < 10 ? 'translateX(0%)' : clampedProgress > 90 ? 'translateX(-100%)' : 'translateX(-50%)',
                  }}
                >
                  {displayProgress}%
                </span>
              </div>

              {/* Progress Track & Fill */}
              <div className="w-full bg-[#EAEAEA] h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${statusConfig.barFillClass}`}
                  style={{ width: `${clampedProgress}%` }}
                />
              </div>
            </div>

            {/* Action: Report Issue Button */}
            <div className="flex-shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => onReportIssue(project)}
                className="inline-flex items-center gap-1.5 border border-[#DC143C] text-[#DC143C] hover:bg-red-50 active:bg-red-100 rounded-md px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20"
              >
                <Flag className="w-3.5 h-3.5 text-[#DC143C]" />
                <span>{t.reportIssueBtn}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
