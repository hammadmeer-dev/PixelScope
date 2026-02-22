import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EventStream } from './EventStream';
import { PayloadInspector } from './PayloadInspector';
import { DataLayerTimeline } from './DataLayerTimeline';
import { PLATFORM_META } from '../../shared/constants';
import type { EventStatus, PixelEvent, Platform, PlatformSummary, TabState } from '../../shared/types';

// ─── Types ────────────────────────────────────────────────────────────────

type ActiveView = 'events' | 'datalayer';
type FilterPlatform = Platform | 'all';
type FilterStatus = EventStatus | 'all';

// ─── Helpers ──────────────────────────────────────────────────────────────

function getInspectedTabId(): number {
  return chrome.devtools.inspectedWindow.tabId;
}

function stableStringify(v: unknown): string {
  return JSON.stringify(v, Object.keys(v as object).sort());
}

function exportJson(events: PixelEvent[], pageUrl: string) {
  const payload = {
    exportedAt: new Date().toISOString(),
    pageUrl,
    summary: {
      totalEvents: events.length,
      platforms: Array.from(new Set(events.map((e) => e.platform))),
      warnings: events.filter((e) => e.warnings.length > 0).length,
      errors: events.filter((e) => e.errors.length > 0).length,
    },
    events,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pixelscope-export.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Platform filter tabs ─────────────────────────────────────────────────

const PLATFORM_TABS: Array<{ value: FilterPlatform; label: string }> = [
  { value: 'all', label: 'All' },
  ...Object.entries(PLATFORM_META).map(([k, v]) => ({ value: k as Platform, label: v.name })),
];

const STATUS_OPTIONS: Array<{ value: FilterStatus; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'ok', label: '✓ OK' },
  { value: 'warning', label: '⚠ Warning' },
  { value: 'error', label: '✕ Error' },
];

// ─── Panel ────────────────────────────────────────────────────────────────

export default function Panel() {
  const [events, setEvents] = useState<PixelEvent[]>([]);
  const [platforms, setPlatforms] = useState<PlatformSummary[]>([]);
  const [pageUrl, setPageUrl] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('events');
  const [filterPlatform, setFilterPlatform] = useState<FilterPlatform>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const tabId = getInspectedTabId();

  // ── Initial load via GET_TAB_STATE ────────────────────────────────────
  useEffect(() => {
    chrome.runtime.sendMessage(
      { type: 'GET_TAB_STATE', payload: null, tabId },
      (response: TabState | undefined) => {
        if (!response) return;
        setEvents(response.events ?? []);
        setPlatforms(response.platforms ?? []);
        setPageUrl(response.url ?? '');
      },
    );
  }, [tabId]);

  // ── Long-lived port for real-time events ──────────────────────────────
  useEffect(() => {
    const port = chrome.runtime.connect({ name: `devtools-panel-${tabId}` });
    portRef.current = port;

    port.onMessage.addListener((msg: { type: string; payload: unknown }) => {
      if (msg.type === 'PIXEL_EVENT_CAPTURED') {
        const ev = msg.payload as PixelEvent;
        if (!ev || ev.id === undefined) return;
        setEvents((prev) => {
          // Avoid duplicates (idempotent)
          if (prev.some((e) => e.id === ev.id)) return prev;
          return [...prev, ev];
        });
      }
      if (msg.type === 'TAB_STATE_RESPONSE') {
        const state = msg.payload as TabState;
        if (!state) return;
        setEvents(state.events ?? []);
        setPlatforms(state.platforms ?? []);
        setPageUrl(state.url ?? '');
      }
    });

    port.onDisconnect.addListener(() => {
      portRef.current = null;
    });

    return () => {
      port.disconnect();
    };
  }, [tabId]);

  // ── Filtered events ───────────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events
      .filter((e) => {
        if (filterPlatform !== 'all' && e.platform !== filterPlatform) return false;
        if (filterStatus !== 'all' && e.status !== filterStatus) return false;
        if (q) {
          const hay = `${e.eventName} ${e.platform} ${stableStringify(e.params)}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [events, filterPlatform, filterStatus, searchQuery]);

  // ── Selected event ────────────────────────────────────────────────────
  const selectedEvent = useMemo(() => {
    if (!selectedId) return filteredEvents[filteredEvents.length - 1] ?? null;
    return filteredEvents.find((e) => e.id === selectedId) ?? filteredEvents[filteredEvents.length - 1] ?? null;
  }, [filteredEvents, selectedId]);

  // ── Actions ───────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'CLEAR_TAB_STATE', payload: null, tabId }, () => {
      setEvents([]);
      setPlatforms([]);
      setSelectedId(null);
    });
  }, [tabId]);

  const handleExport = useCallback(() => {
    exportJson(events, pageUrl);
  }, [events, pageUrl]);

  // ── Derivations for toolbar badges ────────────────────────────────────
  const warningCount = events.filter((e) => e.status === 'warning' || e.status === 'error').length;

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-200 text-[12px]">
      {/* ── Top toolbar ─────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-900/60 px-4 py-2">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 to-emerald-400 text-[10px] font-bold text-white">
            PS
          </div>
          <span className="text-sm font-semibold text-slate-100">PixelScope</span>
        </div>

        {/* Platform filter tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {PLATFORM_TABS.map((pt) => (
            <button
              key={pt.value}
              type="button"
              onClick={() => setFilterPlatform(pt.value)}
              className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                filterPlatform === pt.value
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="h-6 rounded border border-slate-700 bg-slate-900 px-2 text-[10px] text-slate-300"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Search */}
        <input
          type="text"
          placeholder="Search events…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-6 flex-1 min-w-0 max-w-48 rounded border border-slate-700 bg-slate-900 px-2 text-[10px] text-slate-200 placeholder:text-slate-600"
        />

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* Event count / warning badge */}
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
            {filteredEvents.length} / {events.length}
            {warningCount > 0 && (
              <span className="ml-1 text-amber-400">· {warningCount} ⚠</span>
            )}
          </span>

          {/* View switch */}
          <div className="flex rounded border border-slate-700 text-[10px] overflow-hidden">
            {(['events', 'datalayer'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setActiveView(v)}
                className={`px-2 py-0.5 capitalize transition-colors ${
                  activeView === v ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:bg-slate-800'
                }`}
              >
                {v === 'events' ? 'Events' : 'dataLayer'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={events.length === 0}
            className="rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700 disabled:opacity-40"
          >
            Export
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded bg-red-500/20 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/30"
          >
            Clear
          </button>
        </div>
      </header>

      {/* ── Platform summary strip ───────────────────────────────────── */}
      {platforms.length > 0 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-800 bg-slate-900/40 px-4 py-1.5">
          {platforms.map((p) => {
            const meta = PLATFORM_META[p.platform];
            return (
              <button
                key={p.platform}
                type="button"
                onClick={() => setFilterPlatform(filterPlatform === p.platform ? 'all' : p.platform)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
                  p.status === 'error'
                    ? 'border-red-500/40 bg-red-500/10 text-red-300'
                    : p.status === 'warning'
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                } ${filterPlatform === p.platform ? 'ring-1 ring-sky-500' : ''}`}
              >
                <span>{meta.emoji}</span>
                <span>{meta.name}</span>
                <span className="text-[9px] opacity-70">({p.eventCount})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Main two-pane layout ─────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        {/* Left pane — event list or dataLayer */}
        <div className="flex w-[45%] shrink-0 flex-col border-r border-slate-800">
          {activeView === 'events' ? (
            <EventStream
              events={filteredEvents}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : (
            <DataLayerTimeline events={events} />
          )}
        </div>

        {/* Right pane — payload inspector */}
        <div className="flex-1 min-w-0">
          <PayloadInspector event={selectedEvent} />
        </div>
      </div>
    </div>
  );
}
