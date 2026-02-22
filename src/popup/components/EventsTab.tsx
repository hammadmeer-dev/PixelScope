import { useMemo } from 'react';
import { usePixelScopeStore } from '../../shared/store';
import { PLATFORM_META } from '../../shared/constants';
import type { EventStatus, Platform } from '../../shared/types';

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const sec = Math.floor(diff / 1000);
  if (sec < 1) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

export function EventsTab() {
  const events = usePixelScopeStore((s) => s.events);
  const filterPlatform = usePixelScopeStore((s) => s.filterPlatform);
  const filterStatus = usePixelScopeStore((s) => s.filterStatus);
  const searchQuery = usePixelScopeStore((s) => s.searchQuery);
  const setFilterPlatform = usePixelScopeStore((s) => s.setFilterPlatform);
  const setFilterStatus = usePixelScopeStore((s) => s.setFilterStatus);
  const setSearchQuery = usePixelScopeStore((s) => s.setSearchQuery);
  const selectEvent = usePixelScopeStore((s) => s.selectEvent);
  const setActiveTab = usePixelScopeStore((s) => s.setActiveTab);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return [...events]
      .sort((a, b) => b.timestamp - a.timestamp)
      .filter((e) => {
        if (filterPlatform !== 'all' && e.platform !== filterPlatform) return false;
        if (filterStatus !== 'all' && e.status !== filterStatus) return false;
        if (!q) return true;
        const haystack = `${e.eventName} ${e.platform} ${JSON.stringify(e.params)}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 200);
  }, [events, filterPlatform, filterStatus, searchQuery]);

  const handleRowClick = (id: string) => {
    selectEvent(id);
    setActiveTab('payload');
  };

  const platformOptions: Array<{ value: Platform | 'all'; label: string }> = [
    { value: 'all', label: 'All platforms' },
    ...Object.entries(PLATFORM_META).map(([key, meta]) => ({
      value: key as Platform,
      label: meta.name,
    })),
  ];

  const statusOptions: Array<{ value: EventStatus | 'all'; label: string }> = [
    { value: 'all', label: 'All statuses' },
    { value: 'ok', label: 'OK' },
    { value: 'warning', label: 'Warnings' },
    { value: 'error', label: 'Errors' },
  ];

  return (
    <div className="space-y-2 text-xs">
      <div className="flex gap-2">
        <select
          className="h-7 flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 text-[11px] text-slate-100"
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value as Platform | 'all')}
        >
          {platformOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className="h-7 w-28 rounded-md border border-slate-700 bg-slate-900 px-2 text-[11px] text-slate-100"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as EventStatus | 'all')}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <input
        type="text"
        placeholder="Search events…"
        className="h-7 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-[11px] text-slate-100 placeholder:text-slate-500"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="mt-1 max-h-64 divide-y divide-slate-800 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/60">
        {filteredEvents.length === 0 && (
          <div className="px-3 py-3 text-[11px] text-slate-500">
            No events captured yet. Interact with the page to trigger pixels.
          </div>
        )}
        {filteredEvents.map((e) => {
          const meta = PLATFORM_META[e.platform];
          const statusDot =
            e.status === 'error'
              ? 'bg-red-500'
              : e.status === 'warning'
                ? 'bg-amber-400'
                : 'bg-emerald-400';

          return (
            <button
              key={e.id}
              type="button"
              onClick={() => handleRowClick(e.id)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-900/60"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: meta.color }}
                  aria-hidden
                />
                <div>
                  <div className="text-[11px] font-medium text-slate-100">
                    {meta.name} · {e.eventName}
                  </div>
                  <div className="text-[10px] text-slate-500">{formatRelativeTime(e.timestamp)}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} aria-hidden />
                <span className="uppercase">{e.status}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

