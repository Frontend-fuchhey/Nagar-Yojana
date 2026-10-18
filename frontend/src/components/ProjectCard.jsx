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
      ? ward.replace('Ward', 'à¤µà¤¡à¤¾').replace(/(\d+)/, (m) => toDevanagariNumerals(m))
      : ward);
  const displayBudget = isNe ? toDevanagariNumerals(budget) : budget;
  const clampedProgress = Math.min(Math.max(Number(progress) || 0, 0), 100);
  const displayProgress = isNe ? toDevanagariNumerals(clampedProgress) : clampedProgress;

  const displayDateLabel = isNe ? (project.dateLabelNe || trans?.dateLabel || 'à¤®à¤¿à¤¤à¤¿') : (dateLabel || (status === 'COMPLETED' ? 'Completed On' : 'Started'));
  const displayDate = isNe && date ? toDevanagariNumerals(date) : (date || '2081-11-15 (B.S.)');

  const statusUpper = status?.toUpperCase() || 'ACTIVE';

  const getStatusConfig = () => {
    switch (statusUpper) {
      case 'ACTIVE':
        return {
          textClass: 'text-[#10B981]',
          barColor: '#10B981',
          label: isNe ? 'à¤¸à¤•à¥à¤°à¤¿à¤¯' : 'Active',
        };
      case 'DELAYED':
        return {
          textClass: 'text-[#F59E0B]',
          barColor: '#F59E0B',
          label: isNe ? 'à¤¢à¤¿à¤²à¤¾à¤‡' : 'Delayed',
        };
      case 'COMPLETED':
        return {
          textClass: 'text-[#0284C7]',
          barColor: '#0284C7',
          label: isNe ? 'à¤¸à¤®à¥à¤ªà¤¨à¥à¤¨' : 'Completed',
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
    <article className="bg-white rounded-[18px] border border-[#e0e0e0] p-5 sm:p-6 transition-colors hover:border-[#c8c8cc]">
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-7 items-start">
        {/* Column 1: Image with Optional Featured Badge */}
        <div className="w-full sm:w-64 lg:w-72 h-44 sm:h-48 relative rounded-[12px] overflow-hidden flex-shrink-0 bg-[#f5f5f7]">
          <img
            src={imageUrl}
            alt={displayTitle}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                'https://images.unsplash.com/photo-1541888087405-eb81f8fce0ec?q=80&w=800&auto=format&fit=crop';
            }}
          />
          {featured && (
            <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-md text-[#1d1d1f] text-[11px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
              <Star className="w-3 h-3 fill-current text-amber-500" />
              <span>{t.featuredBadge}</span>
            </div>
          )}
        </div>

        {/* Column 2: Details */}
        <div className="flex-1 flex flex-col justify-between self-stretch min-w-0">
          <div>
            <span className="text-xs font-semibold text-[#7a7a7a] uppercase tracking-wide">
              {displayWard}
            </span>

            <h3 className="text-xl sm:text-[24px] font-semibold tracking-[-0.02em] leading-[1.2] text-[#1d1d1f] mt-1">
              {displayTitle}
            </h3>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#7a7a7a] mt-2.5">
              <div className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{displayLocation}</span>
              </div>
              <span className="text-[#e0e0e0] select-none">|</span>
              <div className="inline-flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{displayContractor}</span>
              </div>
            </div>

            <p className="text-sm text-[#1d1d1f]/80 mt-3 leading-relaxed line-clamp-2">
              {displayDescription}
            </p>
          </div>

          {/* Budget & Progress */}
          <div className="mt-5 pt-4 border-t border-[#e0e0e0] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#7a7a7a] flex-shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-[#7a7a7a] block uppercase tracking-wider">
                  {t.budgetPrefix}
                </span>
                <span className="text-sm font-semibold text-[#1d1d1f]">
                  Rs. {displayBudget}
                </span>
              </div>
            </div>

            <div className="w-36 sm:w-48 lg:w-52">
              <div className="flex justify-between items-center text-xs text-[#7a7a7a] mb-1.5">
                <span>{t.progressLabel}</span>
                <span className="font-semibold text-[#1d1d1f]">{displayProgress}%</span>
              </div>
              <div className="w-full bg-[#f5f5f7] h-1.5 rounded-full overflow-hidden">
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

        {/* Column 3: Status, Date, Action */}
        <div className="w-full sm:w-44 lg:w-48 flex sm:flex-col justify-between sm:items-end self-stretch sm:border-l sm:border-[#e0e0e0] sm:pl-6 pt-4 sm:pt-0 border-t sm:border-t-0 border-[#e0e0e0] gap-3">
          <div>
            <span className={`text-sm font-semibold ${statusConfig.textClass}`}>
              {statusConfig.label}
            </span>
          </div>

          <div className="flex items-start sm:items-end gap-1.5 text-left sm:text-right">
            <Calendar className="w-3.5 h-3.5 text-[#7a7a7a] mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[11px] text-[#7a7a7a] block leading-tight">
                {displayDateLabel}
              </span>
              <span className="text-xs text-[#1d1d1f] leading-tight whitespace-nowrap">
                {displayDate}
              </span>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => onReportIssue(project)}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#0066cc] hover:bg-[#0071e3] text-white text-sm rounded-full transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{t.reportIssueBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
