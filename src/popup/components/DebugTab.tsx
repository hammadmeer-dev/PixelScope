import { useMemo } from 'react';
import { usePixelScopeStore } from '../../shared/store';
import type { Platform } from '../../shared/types';
import { PLATFORM_META } from '../../shared/constants';

export function DebugTab() {
  const events = usePixelScopeStore((s) => s.events);
  const consentMode = usePixelScopeStore((s) => s.consentMode);

  const dataLayerEvents = useMemo(
    () => events.filter((e) => e.origin === 'datalayer').slice(-20).reverse(),
    [events],
  );

  const scriptOrigins = useMemo(() => {
    const map = new Map<Platform, string>();
    for (const e of events) {
      const existing = map.get(e.platform);
      if (existing === 'gtm') continue;
      if (e.scriptSource === 'gtm') {
        map.set(e.platform, 'gtm');
      } else if (e.scriptSource === 'hardcoded' && existing !== 'gtm') {
        map.set(e.platform, 'hardcoded');
      } else if (!existing) {
        map.set(e.platform, 'unknown');
      }
    }
    return map;
  }, [events]);

  return (
    <div className="space-y-3 text-xs text-slate-200">
      <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Consent Mode
        </div>
        {!consentMode || !consentMode.detected ? (
          <div className="text-[11px] text-slate-500">
            No Consent Mode signals detected yet on this page.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <div className="text-slate-500">Version</div>
              <div className="font-medium text-slate-100">{consentMode.version ?? 'Unknown'}</div>
            </div>
            <div>
              <div className="text-slate-500">ad_storage</div>
              <div className="font-medium">{consentMode.ad_storage}</div>
            </div>
            <div>
              <div className="text-slate-500">analytics_storage</div>
              <div className="font-medium">{consentMode.analytics_storage}</div>
            </div>
            <div>
              <div className="text-slate-500">ad_user_data</div>
              <div className="font-medium">{consentMode.ad_user_data}</div>
            </div>
            <div>
              <div className="text-slate-500">ad_personalization</div>
              <div className="font-medium">{consentMode.ad_personalization}</div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/70">
        <div className="border-b border-slate-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          dataLayer pushes (last 20)
        </div>
        <div className="max-h-40 overflow-y-auto px-3 py-2 text-[11px]">
          {dataLayerEvents.length === 0 && (
            <div className="text-slate-500">No dataLayer activity captured yet.</div>
          )}
          {dataLayerEvents.map((e) => (
            <details key={e.id} className="mb-1 rounded border border-slate-800/70 bg-slate-950/70">
              <summary className="cursor-pointer px-2 py-1 text-[11px] text-slate-200">
                {e.eventName}
              </summary>
              <pre className="max-h-32 overflow-auto px-2 pb-2 text-[10px] font-mono text-slate-300">
                {JSON.stringify(e.params, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/70">
        <div className="border-b border-slate-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Script origins
        </div>
        <div className="divide-y divide-slate-800 text-[11px]">
          {events.length === 0 && (
            <div className="px-3 py-2 text-slate-500">
              No events yet — script origins will appear once pixels fire.
            </div>
          )}
          {Array.from(scriptOrigins.entries()).map(([platform, origin]) => {
            const meta = PLATFORM_META[platform];
            let label = 'Unknown';
            if (origin === 'gtm') label = 'Loaded via GTM';
            if (origin === 'hardcoded') label = 'Hardcoded in HTML';

            return (
              <div key={platform} className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{meta.emoji}</span>
                  <span className="text-xs font-medium text-slate-100">{meta.name}</span>
                </div>
                <span className="text-[11px] text-slate-400">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

