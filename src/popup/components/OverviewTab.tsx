import { useMemo } from 'react';
import { usePixelScopeStore } from '../../shared/store';
import { PLATFORM_META } from '../../shared/constants';

function formatHostname(url: string | undefined): string {
  if (!url) return 'Unknown page';
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return url;
  }
}

export function OverviewTab() {
  const events = usePixelScopeStore((s) => s.events);
  const platforms = usePixelScopeStore((s) => s.platforms);

  const { hostname, totalEvents, platformsDetected, warningsCount } = useMemo(() => {
    const latestUrl = events.length ? events[events.length - 1].url : '';
    const hostname = formatHostname(latestUrl);
    const totalEvents = events.length;
    const platformsDetected = platforms.filter((p) => p.detected).length;
    const warningsCount = events.filter((e) => e.warnings.length > 0).length;

    let worst: 'ok' | 'warning' | 'error' = 'ok';
    for (const p of platforms) {
      if (p.status === 'error') {
        worst = 'error';
        break;
      }
      if (p.status === 'warning' && worst === 'ok') {
        worst = 'warning';
      }
    }

    return { hostname, totalEvents, platformsDetected, warningsCount };
  }, [events, platforms]);

  const handleOpenDevtools = () => {
    try {
      const url = chrome.runtime.getURL('src/devtools/devtools.html');
      chrome.tabs.create({ url });
    } catch {
      // ignore
    }
  };

  const handleExportJson = () => {
    const summaryPlatforms = Array.from(new Set(events.map((e) => e.platform)));
    const warnings = events.filter((e) => e.warnings.length > 0).length;
    const errors = events.filter((e) => e.errors.length > 0).length;

    const payload = {
      exportedAt: new Date().toISOString(),
      pageUrl: events[events.length - 1]?.url ?? '',
      summary: {
        totalEvents,
        platforms: summaryPlatforms,
        warnings,
        errors,
      },
      events,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pixelscope-export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 text-xs text-slate-200">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-slate-500">Current page</div>
        <div className="text-sm font-medium text-slate-100">{hostname}</div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-lg bg-slate-900/80 p-2">
          <div className="text-slate-400">Platforms</div>
          <div className="mt-1 text-lg font-semibold">{platformsDetected}</div>
        </div>
        <div className="rounded-lg bg-slate-900/80 p-2">
          <div className="text-slate-400">Events</div>
          <div className="mt-1 text-lg font-semibold">{totalEvents}</div>
        </div>
        <div className="rounded-lg bg-slate-900/80 p-2">
          <div className="text-slate-400">Warnings</div>
          <div className="mt-1 text-lg font-semibold text-amber-400">{warningsCount}</div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Detected platforms
        </div>
        <div className="max-h-40 divide-y divide-slate-800 overflow-y-auto">
          {platforms.length === 0 && (
            <div className="px-3 py-3 text-[11px] text-slate-500">
              No platforms detected yet on this page.
            </div>
          )}
          {platforms.map((p) => {
            const meta = PLATFORM_META[p.platform];
            const statusColor =
              p.status === 'error'
                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                : p.status === 'warning'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

            return (
              <div key={p.platform} className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{meta.emoji}</span>
                  <div>
                    <div className="text-xs font-medium">{meta.name}</div>
                    <div className="text-[11px] text-slate-500">{p.eventCount} events</div>
                  </div>
                </div>
                <div
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColor}`}
                >
                  {p.status.toUpperCase()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 pt-1 text-[11px]">
        <button
          type="button"
          onClick={handleOpenDevtools}
          className="flex-1 rounded-md bg-slate-800 px-3 py-2 font-medium text-slate-100 hover:bg-slate-700"
        >
          Open DevTools Panel
        </button>
        <button
          type="button"
          onClick={handleExportJson}
          className="rounded-md bg-sky-500 px-3 py-2 font-medium text-slate-950 hover:bg-sky-400"
        >
          Export JSON
        </button>
      </div>
    </div>
  );
}

