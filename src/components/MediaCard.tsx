import React from 'react';
import { Download, ExternalLink, Image as ImageIcon, Video } from 'lucide-react';
import { TestAttachment } from '../types/dashboard';
import { isWebUrl } from '../utils/playwrightParser';

interface MediaCardProps {
  att: TestAttachment;
  kind: 'screenshots' | 'videos';
  darkMode: boolean;
  testTitle?: string;
}

export const MediaCard: React.FC<MediaCardProps> = ({ att, kind, darkMode, testTitle }) => {
  const isVideo = kind === 'videos';
  const webAvailable = isWebUrl(att.url);

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div
        className={`px-3.5 py-2.5 border-b flex items-center justify-between gap-2 text-xs ${
          darkMode ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center space-x-2 min-w-0">
          {isVideo ? (
            <Video className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          ) : (
            <ImageIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          )}
          <span className="font-medium truncate">
            {testTitle ? `${testTitle} — ${att.name}` : att.name}
          </span>
          {att.size && (
            <span className="text-[11px] text-slate-500 font-mono shrink-0">({att.size})</span>
          )}
        </div>

        {webAvailable && (
          <div className="flex items-center space-x-3 shrink-0">
            <a
              href={att.url}
              download={att.name}
              className="text-slate-400 hover:text-cyan-400 flex items-center space-x-1 transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Download</span>
            </a>
            <a
              href={att.url}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:underline flex items-center space-x-1"
            >
              <span>{isVideo ? 'Open' : 'Full Size'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {webAvailable ? (
        isVideo ? (
          <div className="p-3">
            <video
              controls
              preload="metadata"
              src={att.url}
              className="w-full max-h-96 rounded-lg bg-black"
            >
              Your browser does not support embedded video playback.
            </video>
          </div>
        ) : (
          <a href={att.url} target="_blank" rel="noreferrer" className="block p-3">
            <img
              src={att.url}
              alt={testTitle ? `${testTitle} screenshot` : att.name}
              loading="lazy"
              className="w-full max-h-96 object-contain rounded-lg bg-slate-900/60"
            />
          </a>
        )
      ) : (
        <div className="p-3 text-xs text-amber-400">
          This media file wasn&apos;t copied into the dashboard folder yet. Re-run tests using the reporter in the Setup Guide to preview it here.
        </div>
      )}
    </div>
  );
};
