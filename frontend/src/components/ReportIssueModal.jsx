import React, { useState, useEffect } from 'react';
import { X, Flag, CheckCircle2 } from 'lucide-react';
import { PROJECT_TRANSLATIONS, toDevanagariNumerals } from '../translations';

export default function ReportIssueModal({ project, language, t, isOpen, onClose }) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    issueType: 'Quality of Materials',
    description: '',
  });

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !project) return null;

  const isNe = language === 'ne';
  const trans = isNe && PROJECT_TRANSLATIONS[project.id] ? PROJECT_TRANSLATIONS[project.id] : null;
  const displayTitle = trans?.title || project.title;
  const displayLocation = trans?.location || project.location;
  const displayWard = trans?.ward || (isNe && project.ward ? project.ward.replace('Ward', 'वडा').replace(/(\d+)/, (m) => toDevanagariNumerals(m)) : project.ward);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);

    // Dispatch grievance to backend & ward executive queue
    try {
      const wardNum = parseInt(String(project.ward || '').replace(/\D/g, ''), 10) || 4;
      fetch('/api/grievances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          projectTitle: displayTitle,
          ward: project.ward,
          wardNumber: wardNum,
          name: formData.name,
          phone: formData.phone,
          issueType: formData.issueType,
          description: formData.description,
        }),
      }).catch((err) => console.warn('Could not persist grievance to API:', err));
    } catch (err) {
      console.warn('Grievance submission error:', err);
    }

    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div
        className="bg-white rounded-xl max-w-lg w-full p-6 sm:p-7 border border-gray-200 relative shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-md bg-red-50 flex items-center justify-center text-[#DC143C]">
            <Flag className="w-4 h-4" />
          </div>
          <h3 id="report-modal-title" className="text-lg font-bold text-gray-900">
            {t.grievanceTitle}
          </h3>
        </div>

        <p className="text-xs text-gray-500 mb-4 pb-3 border-b border-gray-200">
          {t.reportingOn} <strong className="text-gray-800 uppercase">{displayTitle}</strong> ({displayLocation}{displayWard ? ` · ${displayWard}` : ''})
        </p>

        {submitted ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 bg-green-50 text-[#2E8B57] rounded-full mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-gray-900">{t.grievanceSuccessTitle}</p>
            <p className="text-xs text-gray-500 mt-1">
              {t.grievanceSuccessMsg(displayWard)}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t.fullName}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={isNe ? 'उदा: सन्तोष कार्की' : 'e.g. Santosh Karki'}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t.mobileNumber}
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={isNe ? '९८XXXXXXXX' : '98XXXXXXXX'}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t.issueCategory}
              </label>
              <select
                value={formData.issueType}
                onChange={(e) => setFormData({ ...formData, issueType: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              >
                <option value="Quality of Materials">{t.issueQuality}</option>
                <option value="Construction Delay">{t.issueDelay}</option>
                <option value="Public Safety Hazard">{t.issueSafety}</option>
                <option value="Budget Mismanagement">{t.issueBudget}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t.issueDescription}
              </label>
              <textarea
                rows={3}
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t.issuePlaceholder}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                {t.cancelBtn}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors shadow-sm"
              >
                {t.submitGrievanceBtn}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
