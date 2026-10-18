import React, { useState, useEffect } from 'react';
import { X, Flag, CheckCircle2 } from 'lucide-react';
import { PROJECT_TRANSLATIONS, toDevanagariNumerals } from '../translations';

const FIELD_CLS =
  'w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] px-3.5 py-2.5 text-[15px] text-[#1d1d1f] placeholder-[#7a7a7a] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3] transition-shadow';
const LABEL_CLS = 'block text-sm font-semibold text-[#1d1d1f] mb-1.5';

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
        className="bg-white rounded-[18px] max-w-lg w-full p-6 sm:p-8 border border-[#e0e0e0] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#7a7a7a] hover:text-[#1d1d1f] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-2 pr-10">
          <div className="w-9 h-9 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#DC143C]">
            <Flag className="w-4 h-4" />
          </div>
          <h3 id="report-modal-title" className="text-2xl font-semibold tracking-[-0.02em] text-[#1d1d1f]">
            {t.grievanceTitle}
          </h3>
        </div>

        <p className="text-sm text-[#7a7a7a] mb-5 pb-4 border-b border-[#e0e0e0]">
          {t.reportingOn} <strong className="text-[#1d1d1f] font-semibold uppercase">{displayTitle}</strong> ({displayLocation}{displayWard ? ` · ${displayWard}` : ''})
        </p>

        {submitted ? (
          <div className="py-10 text-center">
            <div className="w-14 h-14 bg-[#f5f5f7] text-[#156947] rounded-full mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-lg font-semibold tracking-[-0.02em] text-[#1d1d1f]">{t.grievanceSuccessTitle}</p>
            <p className="text-sm text-[#7a7a7a] mt-1">
              {t.grievanceSuccessMsg(displayWard)}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={LABEL_CLS}>
                {t.fullName}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={isNe ? 'उदा: सन्तोष कार्की' : 'e.g. Santosh Karki'}
                className={FIELD_CLS}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>
                {t.mobileNumber}
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={isNe ? '९८XXXXXXXX' : '98XXXXXXXX'}
                className={FIELD_CLS}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>
                {t.issueCategory}
              </label>
              <select
                value={formData.issueType}
                onChange={(e) => setFormData({ ...formData, issueType: e.target.value })}
                className={FIELD_CLS}
              >
                <option value="Quality of Materials">{t.issueQuality}</option>
                <option value="Construction Delay">{t.issueDelay}</option>
                <option value="Public Safety Hazard">{t.issueSafety}</option>
                <option value="Budget Mismanagement">{t.issueBudget}</option>
              </select>
            </div>

            <div>
              <label className={LABEL_CLS}>
                {t.issueDescription}
              </label>
              <textarea
                rows={3}
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t.issuePlaceholder}
                className={FIELD_CLS}
              />
            </div>

            <div className="pt-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm text-[#0066cc] border border-[#0066cc] rounded-full hover:bg-[#0066cc]/5 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
              >
                {t.cancelBtn}
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm text-white bg-[#0066cc] hover:bg-[#0071e3] rounded-full transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2"
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
