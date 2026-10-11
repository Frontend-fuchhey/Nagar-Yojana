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
      <div className="space-y-4">
        {[1, 2].map((idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col lg:flex-row gap-6 animate-pulse"
          >
            <div className="w-full sm:w-64 lg:w-72 h-44 bg-slate-200 rounded-xl flex-shrink-0" />
            <div className="flex-1 flex flex-col justify-between h-44 py-1 space-y-4">
              <div>
                <div className="h-5 bg-slate-200 rounded w-1/4 mb-3" />
                <div className="h-6 bg-slate-200 rounded w-2/3 mb-2" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </div>
              <div className="h-4 bg-slate-200 rounded w-3/4" />
            </div>
          </div>
        ))}
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
