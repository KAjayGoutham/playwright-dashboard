import React, { useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Image as ImageIcon,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import { TestCase, TestStep } from '../types/dashboard';
import {
  countSteps,
  formatDuration,
  formatStepCategory,
  isImageAttachment,
  isVideoAttachment,
  isWebUrl,
} from '../utils/playwrightParser';
import { MediaCard } from './MediaCard';

interface TestDetailsModalProps {
  test: TestCase | null;
  darkMode: boolean;
  onClose: () => void;
}

export const TestDetailsModal: React.FC<TestDetailsModalProps> = ({
  test,
  darkMode,
  onClose,
}) => {
  useEffect(() => {
    if (!test) return;
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
  }, [test, onClose]);

  if (!test) return null;

  const renderSteps = (steps: TestStep[], depth = 0): React.ReactNode => (
    <div
      className={
        depth === 0
          ? 'space-y-2'
          : 'space-y-1.5 mt-1.5 pl-4 border-l border-slate-700/50'
      }
    >
      {steps.map((step, idx) => {
        const friendlyCategory = formatStepCategory(step.category);
        return (
          <div key={`${depth}-${idx}`}>
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                darkMode
                  ? 'bg-slate-950/50 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                {step.status === 'passed' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                {friendlyCategory && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                      darkMode
                        ? 'bg-slate-800 text-cyan-400'
                        : 'bg-slate-200 text-cyan-700'
                    }`}
                  >
                    {friendlyCategory}
                  </span>
                )}
                <span className="font-medium truncate font-mono">{step.title}</span>
              </div>
              <span className="text-slate-400 font-mono shrink-0">
                {step.durationMs}ms
              </span>
            </div>
            {step.error && (
              <div className="mt-1 ml-4 px-2.5 py-1.5 rounded-lg bg-rose-950/30 border border-rose-900/40 text-[11px] font-mono text-rose-300">
                {step.error}
              </div>
            )}
            {step.steps && step.steps.length > 0 && renderSteps(step.steps, depth + 1)}
          </div>
        );
      })}
    </div>
  );

  const screenshots = (test.attachments || []).filter(isImageAttachment);
  const videos = (test.attachments || []).filter(isVideoAttachment);
  const otherFiles = (test.attachments || []).filter(
    (a) => !isImageAttachment(a) && !isVideoAttachment(a)
  );
  const stepCount = countSteps(test.steps);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="test-details-title"
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
        {/* Modal Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${
            darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0">
            {test.status === 'passed' && (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            {test.status === 'failed' && (
              <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            {test.status === 'flaky' && (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            {test.status === 'skipped' && (
              <Clock className="w-5 h-5 text-slate-400 shrink-0" />
            )}
            <div className="min-w-0">
              <h3 id="test-details-title" className="font-bold text-sm truncate">
                {test.title}
              </h3>
              <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-400">
                <span className="capitalize font-medium">{test.browser}</span>
                <span>•</span>
                <span className="font-mono">{formatDuration(test.durationMs)}</span>
                {test.retries > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400">
                      Retried {test.retries} {test.retries === 1 ? 'time' : 'times'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close test details"
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

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Error Summary */}
          {test.error && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center space-x-1.5">
                <XCircle className="w-4 h-4" />
                <span>What Went Wrong</span>
              </div>
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/50 text-xs text-rose-200 space-y-2 overflow-x-auto">
                <div className="font-semibold text-sm text-rose-300">
                  {test.error.message}
                </div>
                {test.error.snippet && (
                  <pre className="text-[11px] font-mono text-rose-200/80 whitespace-pre-wrap">
                    {test.error.snippet}
                  </pre>
                )}
                {test.error.location && (
                  <div className="text-[11px] font-mono text-slate-400 pt-1.5 border-t border-rose-900/50">
                    Test location: {test.error.location}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step-by-Step Activity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Step-by-Step Activity
              </div>
              {stepCount > 0 && (
                <span className="text-[11px] font-mono text-cyan-400">
                  {stepCount} {stepCount === 1 ? 'step' : 'steps'}
                </span>
              )}
            </div>
            {test.steps && test.steps.length > 0 ? (
              renderSteps(test.steps)
            ) : (
              <div
                className={`p-4 rounded-xl border text-xs text-slate-400 ${
                  darkMode
                    ? 'bg-slate-950/50 border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                No step details were recorded for this test.
              </div>
            )}
          </div>

          {/* Screenshots, Videos & Other Files */}
          {(screenshots.length > 0 || videos.length > 0 || otherFiles.length > 0) && (
            <div className="space-y-5">
              {screenshots.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Screenshots ({screenshots.length})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {screenshots.map((att, idx) => (
                      <MediaCard
                        key={idx}
                        att={att}
                        kind="screenshots"
                        darkMode={darkMode}
                      />
                    ))}
                  </div>
                </div>
              )}

              {videos.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <Video className="w-3.5 h-3.5 text-purple-400" />
                    <span>Recorded Videos ({videos.length})</span>
                  </div>
                  <div className="space-y-4">
                    {videos.map((att, idx) => (
                      <MediaCard
                        key={idx}
                        att={att}
                        kind="videos"
                        darkMode={darkMode}
                      />
                    ))}
                  </div>
                </div>
              )}

              {otherFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Additional Files
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {otherFiles.map((att, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          darkMode
                            ? 'bg-slate-950 border-slate-800'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="text-xs font-mono font-medium truncate">
                            {att.name}
                          </span>
                        </div>
                        {isWebUrl(att.url) ? (
                          <a
                            href={att.url}
                            download={att.name}
                            className="text-xs text-cyan-400 hover:underline flex items-center space-x-1 shrink-0"
                          >
                            <Download className="w-3 h-3" />
                            <span>{att.size || 'Download'}</span>
                          </a>
                        ) : (
                          <span className="text-xs font-mono text-slate-400 shrink-0">
                            {att.size || 'Attached'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* System Logs */}
          {test.logs && test.logs.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                System Logs
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-1 overflow-x-auto">
                {test.logs.map((log, idx) => (
                  <div key={idx}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
