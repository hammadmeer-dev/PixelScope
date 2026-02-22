import { useEffect, useRef, useState } from 'react';
import { PLATFORM_META } from '../../shared/constants';
import type { PixelEvent } from '../../shared/types';

interface Props {
  events: PixelEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 1) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export function EventStream({ events, selectedId, onSelect }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  // Auto-scroll to bottom when new events arrive (unless paused)
  useEffect(() => {
    if (!paused && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events.length, paused]);

  // Cap at 500 events (newest last)
  const displayed = events.slice(-500);

  return (
    <div className="flex h-full flex-col bg-slate-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-1.5">
        <span className="text-[11px] text-slate-400">{events.length} events</span>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
            paused
              ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto text-[11px]">
        {displayed.length === 0 && (
          <div className="flex h-full items-center justify-center text-slate-600">
            No events captured. Interact with the inspected page to trigger pixels.
          </div>
        )}

        {displayed.map((ev, idx) => {
          const meta = PLATFORM_META[ev.platform];
          const isSelected = ev.id === selectedId;
          const statusColor =
            ev.status === 'error'
              ? 'text-red-400'
              : ev.status === 'warning'
                ? 'text-amber-400'
                : 'text-emerald-400';

          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => onSelect(ev.id)}
              className={`flex w-full items-center gap-2 border-b border-slate-800/60 px-3 py-1.5 text-left transition-colors hover:bg-slate-900 ${
                isSelected ? 'border-l-2 border-l-sky-500 bg-slate-900/80' : ''
              }`}
            >
              {/* Index */}
              <span className="w-6 shrink-0 text-right text-[10px] text-slate-600">
                {idx + 1}
              </span>

              {/* Platform color dot */}
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: meta.color }}
              />

              {/* Platform + event name */}
              <span className="min-w-0 flex-1 truncate text-slate-200">
                <span className="font-medium">{meta.name}</span>
                <span className="text-slate-500"> · </span>
                <span>{ev.eventName}</span>
              </span>

              {/* Timestamp */}
              <span className="shrink-0 text-[10px] text-slate-600">
                {relativeTime(ev.timestamp)}
              </span>

              {/* Status */}
              <span className={`shrink-0 text-[10px] font-semibold uppercase ${statusColor}`}>
                {ev.status}
              </span>
            </button>
          );
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
