import React from 'react';
import { Search } from 'lucide-react';
import { getWardOptions, toDevanagariNumerals } from '../translations';

export default function WardFilters({
  language,
  t,
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

  const getWardHeading = () => {
    if (activeWard === 'All') {
      return t.allWardsTitle;
    }
    const found = wardOptions.find((w) => w.value === activeWard);
    return found ? found.label : activeWard;
  };

  return (
    <div className="pt-2 pb-6">
      {/* Row 1: Heading and Status Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
          {getWardHeading()}
        </h2>

        {/* Status Links (No underlines, active is bold/dark, inactive is muted gray) */}
        <div className="flex items-center text-sm" role="tablist" aria-label="Project Status Filter">
          {statusOptions.map((status, index) => {
            const isSelected = activeStatus.toLowerCase() === status.key.toLowerCase();
            return (
              <React.Fragment key={status.key}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => onStatusChange(status.key)}
                  className={`transition-colors py-1 focus:outline-none ${
                    isSelected
                      ? 'text-gray-900 font-bold'
                      : 'text-gray-500 hover:text-gray-900 font-normal'
                  }`}
                >
                  {status.label}
                </button>
                {index < statusOptions.length - 1 && (
                  <span className="text-gray-300 mx-2 sm:mx-2.5 select-none font-light">|</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Row 2: Search Bar, Ward Select, and Sector Filters - Perfectly aligned */}
      <div className="mt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full lg:w-72 xl:w-80 flex-shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400 stroke-[2]" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="block w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors shadow-none"
          />
        </div>

        {/* Controls Row: Ward Selection & Sector Tabs in ONE clean, horizontally aligned row */}
        <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-3 text-sm">
          {/* Ward Select */}
          <div className="flex items-center gap-2">
            <label htmlFor="ward-select" className="text-gray-800 font-semibold whitespace-nowrap">
              {t.wardLabel}:
            </label>
            <select
              id="ward-select"
              value={activeWard}
              onChange={(e) => onWardChange(e.target.value)}
              className="bg-white border border-gray-300 text-gray-900 text-sm font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-colors shadow-sm cursor-pointer"
            >
              {wardOptions.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          <span className="text-gray-300 select-none hidden sm:inline font-light">|</span>

          {/* Sector Tabs */}
          <div className="flex flex-wrap items-center" role="tablist" aria-label="Sector Filter">
            <span className="text-gray-800 font-semibold mr-2">{t.sectorLabel}</span>
            {sectorOptions.map((sector, index) => {
              const isSelected = activeSector.toLowerCase() === sector.key.toLowerCase();
              return (
                <React.Fragment key={sector.key}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => onSectorChange(sector.key)}
                    className={`transition-colors py-1 focus:outline-none ${
                      isSelected
                        ? 'text-gray-900 font-bold'
                        : 'text-gray-500 hover:text-gray-900 font-normal'
                    }`}
                  >
                    {sector.label}
                  </button>
                  {index < sectorOptions.length - 1 && (
                    <span className="text-gray-300 mx-2 sm:mx-2.5 select-none font-light">|</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
