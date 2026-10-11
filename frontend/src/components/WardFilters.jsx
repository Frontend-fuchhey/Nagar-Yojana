import React from 'react';
import { Layers, Search } from 'lucide-react';
import { getWardOptions, toDevanagariNumerals } from '../translations';

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
    <div className="pt-0.5 pb-2">
      {/* Top Header inside Card: Layer Icon + Title + Plain Blue Count Text + Status Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        {/* Left: Icon, Title & Plain Blue Count Text (NO background pill) */}
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5 sm:mt-0">
            <Layers className="w-4 h-4 text-[#2E7D32]" />
          </div>
          <div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[#1A2530]">
                {t.cardTitle}
              </h2>
              {/* Plain Blue Text - NO rounded pill */}
              <span className="text-xs sm:text-sm font-semibold text-[#0284C7] ml-1 select-none">
                {isNe
                  ? `${toDevanagariNumerals(projectsCount)} ${t.projectsFound}`
                  : `${projectsCount} ${t.projectsFound}`}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#64748B] mt-0.5">
              {t.cardSubtitle}
            </p>
          </div>
        </div>

        {/* Right: Status Tabs */}
        <div className="flex items-center gap-4 sm:gap-5 text-xs sm:text-sm" role="tablist" aria-label="Project Status Filter">
          {statusOptions.map((status) => {
            const isSelected = activeStatus.toLowerCase() === status.key.toLowerCase();
            return (
              <button
                key={status.key}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onStatusChange(status.key)}
                className={`transition-all pb-1 focus:outline-none text-xs sm:text-sm ${
                  isSelected
                    ? 'text-[#156947] font-bold border-b-2 border-[#156947]'
                    : 'text-[#64748B] hover:text-[#1A2530] font-medium border-b-2 border-transparent'
                }`}
              >
                {status.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2: Clean Rounded Filter Bar (Search | Ward | Sector) */}
      <div className="mt-4 p-2 sm:p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-col xl:flex-row xl:items-center gap-3 text-xs sm:text-sm shadow-none">
        {/* Search Input Box */}
        <div className="relative w-full xl:flex-1 xl:min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 truncate"
          />
        </div>

        <div className="hidden xl:block h-5 w-px bg-slate-200" />

        {/* Ward Selector */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <label htmlFor="ward-select" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            {t.wardLabel}
          </label>
          <select
            id="ward-select"
            value={activeWard}
            onChange={(e) => onWardChange(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors shadow-sm cursor-pointer max-w-[210px]"
          >
            {wardOptions.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden xl:block h-5 w-px bg-slate-200" />

        {/* Sector Tabs */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 xl:flex-shrink-0" role="tablist" aria-label="Sector Filter">
          <span className="text-xs font-semibold text-slate-600 mr-0.5">{t.sectorLabel}</span>
          {sectorOptions.map((sector, index) => {
            const isSelected = activeSector.toLowerCase() === sector.key.toLowerCase();
            return (
              <React.Fragment key={sector.key}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => onSectorChange(sector.key)}
                  className={`transition-colors py-0.5 focus:outline-none text-xs sm:text-sm whitespace-nowrap ${
                    isSelected
                      ? 'text-[#1A2530] font-bold'
                      : 'text-[#64748B] hover:text-[#1A2530] font-normal'
                  }`}
                >
                  {sector.label}
                </button>
                {index < sectorOptions.length - 1 && (
                  <span className="text-slate-300 select-none font-light">|</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

    </div>
  );
}
