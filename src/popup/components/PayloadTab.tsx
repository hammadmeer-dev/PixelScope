import { useMemo } from 'react';
import { usePixelScopeStore } from '../../shared/store';
import { PLATFORM_META } from '../../shared/constants';

function JsonView({ value }: { value: unknown }) {
  const json = useMemo(() => JSON.stringify(value, null, 2), [value]);

  return (
    <pre className="max-h-56 overflow-auto rounded-md bg-slate-900/80 p-2 text-[11px] font-mono text-slate-100">
      {json}
    </pre>
  );
}

export function PayloadTab() {
  const events = usePixelScopeStore((s) => s.events);
  const selectedEventId = usePixelScopeStore((s) => s.selectedEventId);

  const event = useMemo(() => {
    if (!events.length) return undefined;
    if (!selectedEventId) return events[events.length - 1];
    return events.find((e) => e.id === selectedEventId) ?? events[events.length - 1];
  }, [events, selectedEventId]);

  if (!event) {
    return (
      <div className="text-[11px] text-slate-500">
        No event selected yet. Trigger an event from the Events tab.
      </div>
    );
  }

  const meta = PLATFORM_META[event.platform];

  const handleCopy = () => {
    try {
      void navigator.clipboard.writeText(JSON.stringify(event.params, null, 2));
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.emoji}</span>
          <div>
            <div className="text-xs font-semibold text-slate-100">
              {meta.name} · {event.eventName}
            </div>
            <div className="text-[10px] text-slate-500">{event.url}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-100 hover:bg-slate-700"
        >
          Copy payload
        </button>
      </div>

      <JsonView value={event.params} />

      <div className="space-y-2 text-[11px]">
        {event.warnings.length > 0 && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2">
            <div className="mb-1 text-[10px] font-semibold text-amber-300">Warnings</div>
            <ul className="list-disc pl-4 text-amber-100">
              {event.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        {event.errors.length > 0 && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2">
            <div className="mb-1 text-[10px] font-semibold text-red-300">Errors</div>
            <ul className="list-disc pl-4 text-red-100">
              {event.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
        {event.warnings.length === 0 && event.errors.length === 0 && (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2 text-emerald-100">
            This event passed all validations.
          </div>
        )}
      </div>
    </div>
  );
}

