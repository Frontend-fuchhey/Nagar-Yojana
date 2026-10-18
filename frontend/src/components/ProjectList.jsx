import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import ProjectCard from './ProjectCard';

export default function ProjectList({
  projects,
  loading,
  error,
  language,
  t,
  onRetry,
  onReportIssue,
}) {
  if (loading) {
    return (
      <div className="space-y-5" role="status" aria-label="Loading projects">
        {[1, 2, 3].map((idx) => (
          <article
            key={idx}
            className="bg-white rounded-[18px] border border-[#e0e0e0] p-5 sm:p-6 overflow-hidden"
          >
            <div className="flex flex-col lg:flex-row gap-5 lg:gap-7 items-start">
              {/* Image skeleton */}
              <div className="w-full sm:w-64 lg:w-72 h-44 sm:h-48 rounded-[12px] bg-[#f5f5f7] animate-shimmer flex-shrink-0 relative">
                {idx === 1 && (
                  <div className="absolute top-3 left-3 w-20 h-5 rounded-full bg-[#e0e0e0]" />
                )}
              </div>

              {/* Details skeleton */}
              <div className="flex-1 flex flex-col justify-between self-stretch min-w-0 py-0.5">
                <div>
                  <div className="h-3.5 w-16 bg-[#f5f5f7] rounded-md animate-shimmer mb-2" />
                  <div className="space-y-2 mb-3">
                    <div
                      className={`h-5 bg-[#f5f5f7] rounded-md animate-shimmer ${
                        idx % 2 === 0 ? 'w-4/5' : 'w-3/5'
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-3 mb-3.5">
                    <div className="h-3.5 w-28 bg-[#f5f5f7] rounded animate-shimmer" />
                    <span className="text-[#e0e0e0] select-none">|</span>
                    <div className="h-3.5 w-36 bg-[#f5f5f7] rounded animate-shimmer" />
                  </div>
                  <div className="space-y-1.5 mt-2">
                    <div className="h-3 w-full bg-[#f5f5f7] rounded animate-shimmer" />
                    <div className="h-3 w-4/5 bg-[#f5f5f7] rounded animate-shimmer" />
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-[#e0e0e0] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#f5f5f7] animate-shimmer flex-shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-2.5 w-10 bg-[#f5f5f7] rounded animate-shimmer" />
                      <div className="h-3.5 w-20 bg-[#f5f5f7] rounded animate-shimmer" />
                    </div>
                  </div>
                  <div className="w-36 sm:w-48 lg:w-52">
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="h-2.5 w-12 bg-[#f5f5f7] rounded animate-shimmer" />
                      <div className="h-2.5 w-7 bg-[#f5f5f7] rounded animate-shimmer" />
                    </div>
                    <div className="w-full bg-[#f5f5f7] h-1.5 rounded-full overflow-hidden animate-shimmer" />
                  </div>
                </div>
              </div>

              {/* Right column skeleton */}
              <div className="w-full sm:w-44 lg:w-48 flex sm:flex-col justify-between sm:items-end self-stretch sm:border-l sm:border-[#e0e0e0] sm:pl-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#e0e0e0] gap-3">
                <div className="h-5 w-20 bg-[#f5f5f7] rounded-md animate-shimmer" />
                <div className="space-y-1.5 flex flex-col sm:items-end">
                  <div className="h-2.5 w-14 bg-[#f5f5f7] rounded animate-shimmer" />
                  <div className="h-3.5 w-24 bg-[#f5f5f7] rounded animate-shimmer" />
                </div>
                <div className="h-10 w-28 sm:w-32 bg-[#f5f5f7] rounded-full animate-shimmer" />
              </div>
            </div>
          </article>
        ))}
        <span className="sr-only">Loading project data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center bg-white rounded-[18px] border border-[#e0e0e0]">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#f5f5f7] text-[#DC143C] mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-[#1d1d1f] font-semibold text-lg tracking-[-0.02em] mb-1">
          {t.unableToLoad}
        </p>
        <p className="text-[#7a7a7a] text-sm max-w-md mx-auto mb-5">
          {error}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#0066cc] rounded-full text-sm text-[#0066cc] bg-transparent hover:bg-[#0066cc]/5 transition-colors active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t.retryLoading}</span>
        </button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="py-20 text-center bg-white rounded-[18px] border border-[#e0e0e0]">
        <p className="text-[#1d1d1f] font-semibold text-xl tracking-[-0.02em]">
          {t.noProjectsFound}
        </p>
        <p className="text-[#7a7a7a] text-sm mt-1">
          {t.noProjectsSub}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          language={language}
          t={t}
          onReportIssue={onReportIssue}
        />
      ))}
    </div>
  );
}
