import React, { useState, useEffect } from 'react';
import { X, Lock, KeyRound } from 'lucide-react';

const FIELD_CLS =
  'w-full bg-[#fafafc] border border-[#e0e0e0] rounded-[11px] px-3.5 py-2.5 text-[15px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3] transition-shadow';
const LABEL_CLS = 'block text-sm font-semibold text-[#1d1d1f] mb-1.5';

export default function StaffLoginModal({ isOpen, onClose }) {
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
    setNotice(
      'Municipal staff portal access requires verification credentials issued by the Biratnagar Metropolitan City Administration.'
    );
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
        className="bg-white rounded-[18px] max-w-sm w-full p-6 sm:p-8 border border-[#e0e0e0] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#7a7a7a] hover:text-[#1d1d1f] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-2 pr-10">
          <div className="w-9 h-9 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#1d1d1f]">
            <Lock className="w-4 h-4" />
          </div>
          <h3 id="staff-modal-title" className="text-xl font-semibold tracking-[-0.02em] text-[#1d1d1f]">
            Municipal & Ward Staff Authorization
          </h3>
        </div>

        <p className="text-sm text-[#7a7a7a] mb-5 pb-4 border-b border-[#e0e0e0]">
          Authorized Municipal Engineers & Ward Oversight Officers, Biratnagar Metropolitan City.
        </p>

        {notice ? (
          <div className="p-3.5 bg-[#f5f5f7] border border-[#e0e0e0] rounded-[11px] text-sm text-[#1d1d1f] mb-4 leading-relaxed">
            {notice}
          </div>
        ) : null}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className={LABEL_CLS}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD_CLS}
            />
          </div>

          <div>
            <label className={LABEL_CLS}>
              Passphrase
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={FIELD_CLS}
            />
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm text-[#0066cc] border border-[#0066cc] rounded-full hover:bg-[#0066cc]/5 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm text-white bg-[#0066cc] hover:bg-[#0071e3] rounded-full transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Verify</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
