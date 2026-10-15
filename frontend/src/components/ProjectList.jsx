import React from 'react';
import ProjectCard from './ProjectCard';
import { AlertCircle, RefreshCw } from 'lucide-react';

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
      <div className="space-y-4" role="status" aria-label="Loading projects">
        {[1, 2, 3].map((idx) => (
          <article
            key={idx}
            className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-sm overflow-hidden"
          >
            <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
              {/* Column 1: Image Thumbnail Skeleton with subtle badge placeholder */}
              <div className="w-full sm:w-64 lg:w-72 h-44 sm:h-48 rounded-xl bg-slate-200/80 animate-shimmer flex-shrink-0 relative">
                {/* Optional featured tag skeleton on 1st card */}
                {idx === 1 && (
                  <div className="absolute top-2.5 left-2.5 w-20 h-5 rounded-full bg-slate-300/80" />
                )}
              </div>

              {/* Column 2: Central Details (Ward, Title, Location & Contractor Meta, Description, Budget & Progress) */}
              <div className="flex-1 flex flex-col justify-between self-stretch min-w-0 py-0.5">
                <div>
                  {/* Ward Eyebrow Skeleton */}
                  <div className="h-3.5 w-16 bg-slate-200 rounded-md animate-shimmer mb-2" />

                  {/* Project Title Skeleton */}
                  <div className="space-y-2 mb-3">
                    <div
                      className={`h-5 bg-slate-200 rounded-md animate-shimmer ${
                        idx % 2 === 0 ? 'w-4/5' : 'w-3/5'
                      }`}
                    />
                  </div>

                  {/* Meta Row: Location & Contractor Skeleton */}
                  <div className="flex items-center gap-3 mb-3.5">
                    <div className="h-3.5 w-28 bg-slate-200 rounded animate-shimmer" />
                    <span className="text-slate-300 select-none">|</span>
                    <div className="h-3.5 w-36 bg-slate-200 rounded animate-shimmer" />
                  </div>

                  {/* Description Paragraph Skeleton */}
                  <div className="space-y-1.5 mt-2">
                    <div className="h-3 w-full bg-slate-200/70 rounded animate-shimmer" />
                    <div className="h-3 w-4/5 bg-slate-200/70 rounded animate-shimmer" />
                  </div>
                </div>

                {/* Bottom Row inside Center Column: Budget & Progress Track */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  {/* Budget Box Skeleton */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-200 animate-shimmer flex-shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-2.5 w-10 bg-slate-200 rounded animate-shimmer" />
                      <div className="h-3.5 w-20 bg-slate-200 rounded animate-shimmer" />
                    </div>
                  </div>

                  {/* Progress Track Skeleton */}
                  <div className="w-36 sm:w-48 lg:w-52">
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="h-2.5 w-12 bg-slate-200 rounded animate-shimmer" />
                      <div className="h-2.5 w-7 bg-slate-200 rounded animate-shimmer" />
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden animate-shimmer" />
                  </div>
                </div>
              </div>

              {/* Column 3: Right Status & Action Column (Status, Date, Action Button) */}
              <div className="w-full sm:w-44 lg:w-48 flex sm:flex-col justify-between sm:items-end self-stretch sm:border-l sm:border-slate-100 sm:pl-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 gap-3">
                {/* Status Badge Skeleton */}
                <div className="h-5 w-20 bg-slate-200 rounded-md animate-shimmer" />

                {/* Date Skeleton */}
                <div className="space-y-1.5 flex flex-col sm:items-end">
                  <div className="h-2.5 w-14 bg-slate-200 rounded animate-shimmer" />
                  <div className="h-3.5 w-24 bg-slate-200 rounded animate-shimmer" />
                </div>

                {/* Action Button Skeleton */}
                <div className="h-9 w-28 sm:w-32 bg-slate-200 rounded-xl animate-shimmer" />
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
      <div className="py-12 text-center bg-white rounded-2xl border border-slate-200">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-[#DC143C] mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-slate-900 font-semibold text-base mb-1">
          {t.unableToLoad}
        </p>
        <p className="text-slate-500 text-sm max-w-md mx-auto mb-4">
          {error}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
          <span>{t.retryLoading}</span>
        </button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-900 font-semibold text-base">
          {t.noProjectsFound}
        </p>
        <p className="text-slate-500 text-sm mt-1">
          {t.noProjectsSub}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
