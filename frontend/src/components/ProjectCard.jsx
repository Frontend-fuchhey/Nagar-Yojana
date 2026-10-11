import React from 'react';
import { MapPin, User, Coins, Calendar, Flag, Star } from 'lucide-react';
import { PROJECT_TRANSLATIONS, toDevanagariNumerals } from '../translations';

export default function ProjectCard({ project, language, t, onReportIssue }) {
  const {
    id,
    title,
    status,
    location,
    contractor,
    description,
    budget,
    progress,
    imageUrl,
    ward,
    featured,
    date,
    dateLabel,
  } = project;

  const isNe = language === 'ne';
  const trans = isNe && PROJECT_TRANSLATIONS[id] ? PROJECT_TRANSLATIONS[id] : null;

  const displayTitle = trans?.title || project.titleEn || title;
  const displayLocation = trans?.location || location;
  const displayContractor = trans?.contractor || contractor;
  const displayDescription =
    (isNe && project.descriptionNe) ||
    trans?.description ||
    description ||
    'Civic infrastructure development initiative for community enhancement.';
  const displayWard =
    trans?.ward ||
    (isNe && ward
      ? ward.replace('Ward', 'वडा').replace(/(\d+)/, (m) => toDevanagariNumerals(m))
      : ward);
  const displayBudget = isNe ? toDevanagariNumerals(budget) : budget;
  const clampedProgress = Math.min(Math.max(Number(progress) || 0, 0), 100);
  const displayProgress = isNe ? toDevanagariNumerals(clampedProgress) : clampedProgress;

  const displayDateLabel = isNe ? (project.dateLabelNe || trans?.dateLabel || 'मिति') : (dateLabel || (status === 'COMPLETED' ? 'Completed On' : 'Started'));
  const displayDate = isNe && date ? toDevanagariNumerals(date) : (date || '2081-11-15 (B.S.)');

  const statusUpper = status?.toUpperCase() || 'ACTIVE';

  const getStatusConfig = () => {
    switch (statusUpper) {
      case 'ACTIVE':
        return {
          textClass: 'text-[#10B981]',
          barColor: '#10B981',
          label: isNe ? 'सक्रिय' : 'Active',
        };
      case 'DELAYED':
        return {
          textClass: 'text-[#F59E0B]',
          barColor: '#F59E0B',
          label: isNe ? 'ढिलाइ' : 'Delayed',
        };
      case 'COMPLETED':
        return {
          textClass: 'text-[#0284C7]',
          barColor: '#0284C7',
          label: isNe ? 'सम्पन्न' : 'Completed',
        };
      default:
        return {
          textClass: 'text-slate-600',
          barColor: '#64748B',
          label: statusUpper,
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <article className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-sm hover:shadow-md transition-all mb-4">
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
        {/* Column 1: Image with Optional Featured Badge */}
        <div className="w-full sm:w-64 lg:w-72 h-44 sm:h-48 relative rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
          <img
            src={imageUrl}
            alt={displayTitle}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                'https://images.unsplash.com/photo-1541888087405-eb81f8fce0ec?q=80&w=800&auto=format&fit=crop';
            }}
          />
          {featured && (
            <div className="absolute top-2.5 left-2.5 bg-[#00695C]/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3 fill-current text-amber-300" />
              <span>{t.featuredBadge}</span>
            </div>
          )}
        </div>

        {/* Column 2: Central Details (Ward, Title, Meta, Description, Budget & Progress) */}
        <div className="flex-1 flex flex-col justify-between self-stretch min-w-0">
          <div>
            {/* Ward Eyebrow */}
            <span className="text-xs font-semibold text-[#0284C7] uppercase tracking-wide">
              {displayWard}
            </span>

            {/* Project Title */}
            <h3 className="text-base sm:text-lg font-bold text-[#1E293B] mt-0.5">
              {displayTitle}
            </h3>

            {/* Meta Row: Location & Contractor */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
              <div className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{displayLocation}</span>
              </div>
              <span className="text-slate-300 select-none">|</span>
              <div className="inline-flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{displayContractor}</span>
              </div>
            </div>

            {/* Description Paragraph */}
            <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-2">
              {displayDescription}
            </p>
          </div>

          {/* Bottom Row inside Center Column: Budget & Progress Track */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            {/* Budget Box */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                <Coins className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
                  {t.budgetPrefix}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  Rs. {displayBudget}
                </span>
              </div>
            </div>

            {/* Progress Track */}
            <div className="w-36 sm:w-48 lg:w-52">
              <div className="flex justify-between items-center text-[11px] text-slate-500 mb-1">
                <span className="font-medium">{t.progressLabel}</span>
                <span className="font-bold text-slate-700">{displayProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${clampedProgress}%`,
                    backgroundColor: statusConfig.barColor,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Right Status & Action Column (Status, Date, Solid Blue Button) */}
        <div className="w-full sm:w-44 lg:w-48 flex sm:flex-col justify-between sm:items-end self-stretch sm:border-l sm:border-slate-100 sm:pl-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 gap-3">
          {/* Top: Status text */}
          <div>
            <span className={`text-sm font-bold tracking-wide ${statusConfig.textClass}`}>
              {statusConfig.label}
            </span>
          </div>

          {/* Middle: Start / Completed Date */}
          <div className="flex items-start sm:items-end gap-1.5 text-left sm:text-right">
            <Calendar className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-tight">
                {displayDateLabel}
              </span>
              <span className="text-xs font-medium text-slate-600 leading-tight whitespace-nowrap">
                {displayDate}
              </span>
            </div>
          </div>

          {/* Bottom: Solid Blue Report Issue Button */}
          <div>
            <button
              type="button"
              onClick={() => onReportIssue(project)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-[#0284C7]/20"
            >
              <Flag className="w-3.5 h-3.5 text-white" />
              <span>{t.reportIssueBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
