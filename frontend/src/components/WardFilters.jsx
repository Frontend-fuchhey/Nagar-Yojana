import React from 'react';
import { Layers, Search } from 'lucide-react';
import { getWardOptions, toDevanagariNumerals } from '../translations';

const INPUT_CLS =
  'bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] text-sm text-[#1d1d1f] placeholder:text-[#7a7a7a] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3] transition-shadow';

export default function WardFilters({
  language,
  t,
  projectsCount = 3,
  activeWard = 'All',
  onWardChange,
  activeStatus,
  onStatusChange,
  activeSector,
  onSectorChange,
  searchQuery,
  onSearchChange,
}) {
  const isNe = language === 'ne';

  const statusOptions = [
    { key: 'All', label: t.statusAll },
    { key: 'Active', label: t.statusActive },
    { key: 'Delayed', label: t.statusDelayed },
    { key: 'Completed', label: t.statusCompleted },
  ];

  const sectorOptions = [
    { key: 'All', label: t.sectorAll },
    { key: 'Roads & Drainage', label: t.sectorRoads },
    { key: 'Water & Sanitation', label: t.sectorWater },
    { key: 'Public Facilities', label: t.sectorPublic },
  ];

  const wardOptions = getWardOptions(language);

  return (
    <div>
      {/* Section header + status tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-white border border-[#e0e0e0] text-[#156947] flex items-center justify-center flex-shrink-0 mt-1">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-2xl sm:text-[34px] font-semibold tracking-[-0.03em] leading-[1.1] text-[#1d1d1f]">
                {t.cardTitle}
              </h2>
              <span className="text-sm font-normal text-[#0066cc] select-none">
                {isNe
                  ? `${toDevanagariNumerals(projectsCount)} ${t.projectsFound}`
                  : `${projectsCount} ${t.projectsFound}`}
              </span>
            </div>
            <p className="text-sm sm:text-base text-[#7a7a7a] mt-1.5">
              {t.cardSubtitle}
            </p>
          </div>
        </div>

        {/* Status segmented pills */}
        <div
          className="inline-flex items-center gap-1 p-1 bg-white border border-[#e0e0e0] rounded-full self-start md:self-auto overflow-x-auto max-w-full"
          role="tablist"
          aria-label="Project Status Filter"
        >
          {statusOptions.map((status) => {
            const isSelected = activeStatus.toLowerCase() === status.key.toLowerCase();
            return (
              <button
                key={status.key}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onStatusChange(status.key)}
                className={`transition-colors px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] ${
                  isSelected
                    ? 'bg-[#1d1d1f] text-white font-semibold'
                    : 'text-[#7a7a7a] hover:text-[#1d1d1f] font-normal'
                }`}
              >
                {status.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter bar */}
      <div className="mt-8 p-3 sm:p-4 bg-white border border-[#e0e0e0] rounded-[18px] flex flex-col xl:flex-row xl:items-center gap-4 text-sm">
        {/* Search */}
        <div className="relative w-full xl:flex-1 xl:min-w-[200px]">
          <Search className="w-4 h-4 text-[#7a7a7a] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className={`w-full pl-10 pr-4 py-2.5 truncate ${INPUT_CLS}`}
          />
        </div>

        <div className="hidden xl:block h-6 w-px bg-[#e0e0e0]" />

        {/* Ward Selector */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <label htmlFor="ward-select" className="text-sm font-semibold text-[#1d1d1f] whitespace-nowrap">
            {t.wardLabel}
          </label>
          <select
            id="ward-select"
            value={activeWard}
            onChange={(e) => onWardChange(e.target.value)}
            className={`px-3 py-2.5 cursor-pointer max-w-[210px] ${INPUT_CLS}`}
          >
            {wardOptions.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden xl:block h-6 w-px bg-[#e0e0e0]" />

        {/* Sector chips */}
        <div className="flex flex-wrap items-center gap-2 xl:flex-shrink-0" role="tablist" aria-label="Sector Filter">
          <span className="text-sm font-semibold text-[#1d1d1f] mr-1">{t.sectorLabel}</span>
          {sectorOptions.map((sector) => {
            const isSelected = activeSector.toLowerCase() === sector.key.toLowerCase();
            return (
              <button
                key={sector.key}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSectorChange(sector.key)}
                className={`transition-colors px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap border focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] ${
                  isSelected
                    ? 'border-[#0066cc] text-[#0066cc] font-semibold bg-[#0066cc]/5'
                    : 'border-[#e0e0e0] text-[#7a7a7a] hover:text-[#1d1d1f] hover:border-[#7a7a7a] font-normal bg-white'
                }`}
              >
                {sector.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
