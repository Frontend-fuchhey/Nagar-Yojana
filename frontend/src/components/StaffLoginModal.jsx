import React, { useState, useEffect } from 'react';
import { X, Lock, KeyRound } from 'lucide-react';

export default function StaffLoginModal({ isOpen, onClose, t }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLogin = (e) => {
    e.preventDefault();
    setNotice(t.staffNotice);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-modal-title"
    >
      <div
        className="bg-white rounded-xl max-w-sm w-full p-6 border border-gray-200 relative shadow-xl"
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
          <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center text-gray-700">
            <Lock className="w-4 h-4" />
          </div>
          <h3 id="staff-modal-title" className="text-base font-bold text-gray-900">
            {t.staffTitle}
          </h3>
        </div>

        <p className="text-xs text-gray-500 mb-4 pb-3 border-b border-gray-200">
          {t.staffSubtitle}
        </p>

        {notice ? (
          <div className="p-3 bg-stone-100 border border-stone-200 rounded text-xs text-gray-700 mb-4 leading-relaxed">
            {notice}
          </div>
        ) : null}

        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t.staffEmail}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t.staffPassphrase}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-md transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{t.verifyBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
