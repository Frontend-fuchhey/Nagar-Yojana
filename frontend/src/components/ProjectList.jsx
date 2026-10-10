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
      <div className="divide-y divide-gray-200">
        {[1, 2].map((idx) => (
          <div key={idx} className="py-8 flex flex-col lg:flex-row gap-6 animate-pulse">
            <div className="w-full sm:w-80 h-48 bg-gray-200 rounded-lg flex-shrink-0" />
            <div className="flex-1 flex flex-col justify-between h-48 py-1 space-y-4">
              <div>
                <div className="h-6 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-[#DC143C] mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-gray-900 font-semibold text-base mb-1">
          {t.unableToLoad}
        </p>
        <p className="text-gray-500 text-sm max-w-md mx-auto mb-4">
          {error}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
          <span>{t.retryLoading}</span>
        </button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="py-16 text-center border-b border-gray-200">
        <p className="text-gray-900 font-semibold text-base">
          {t.noProjectsFound}
        </p>
        <p className="text-gray-500 text-sm mt-1">
          {t.noProjectsSub}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
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
