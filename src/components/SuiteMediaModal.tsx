import React, { useEffect } from 'react';
import { Image as ImageIcon, Video, X } from 'lucide-react';
import { SuiteMediaSelection } from '../types/dashboard';
import { MediaCard } from './MediaCard';

interface SuiteMediaModalProps {
  selection: SuiteMediaSelection | null;
  darkMode: boolean;
  onClose: () => void;
}

export const SuiteMediaModal: React.FC<SuiteMediaModalProps> = ({
  selection,
  darkMode,
  onClose,
}) => {
  useEffect(() => {
    if (!selection) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selection, onClose]);

  if (!selection) return null;

  const isVideo = selection.kind === 'videos';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="suite-media-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div
          className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${
            darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            {isVideo ? (
              <Video className="w-5 h-5 text-purple-400 shrink-0" />
            ) : (
              <ImageIcon className="w-5 h-5 text-indigo-400 shrink-0" />
            )}
            <div className="min-w-0">
              <h3 id="suite-media-title" className="font-bold text-sm truncate">
                {selection.suiteFile} — {isVideo ? 'Recorded Videos' : 'Screenshots'} (
                {selection.items.length})
              </h3>
              <div className="text-xs text-slate-400 capitalize">{selection.project}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close media viewer"
            className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors shrink-0 ${
              darkMode
                ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {selection.items.map(({ testTitle, att }, idx) => (
            <MediaCard
              key={idx}
              att={att}
              kind={selection.kind}
              darkMode={darkMode}
              testTitle={testTitle}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
