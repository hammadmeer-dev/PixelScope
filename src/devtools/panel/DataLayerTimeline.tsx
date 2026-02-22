import type { PixelEvent } from '../../shared/types';

interface Props {
  events: PixelEvent[];
}

const CONVERSION_EVENTS = new Set([
  // GA4
  'purchase', 'add_to_cart', 'begin_checkout', 'add_payment_info',
  // Meta
  'Purchase', 'InitiateCheckout', 'AddToCart', 'AddPaymentInfo',
  // TikTok
  'PlaceAnOrder', 'CompletePayment', 'AddPaymentInfo',
  // Snapchat
  'PURCHASE', 'START_CHECKOUT', 'ADD_BILLING',
  // Pinterest
  'checkout',
]);

function isConversion(eventName: string): boolean {
  return CONVERSION_EVENTS.has(eventName);
}

export function DataLayerTimeline({ events }: Props) {
  const dlEvents = events.filter((e) => e.origin === 'datalayer');

  return (
    <div className="flex h-full flex-col bg-slate-950 text-[12px]">
      <div className="shrink-0 border-b border-slate-800 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          dataLayer Timeline
        </span>
        <span className="ml-2 text-[10px] text-slate-600">{dlEvents.length} pushes</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {dlEvents.length === 0 && (
          <div className="flex h-full items-center justify-center text-[11px] text-slate-600">
            No dataLayer pushes captured yet.
          </div>
        )}

        {dlEvents.map((ev, idx) => {
          const conv = isConversion(ev.eventName);
          return (
            <details
              key={ev.id}
              className={`rounded border text-[11px] ${
                conv
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-slate-800 bg-slate-900/50'
              }`}
            >
              <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-1.5 hover:bg-slate-800/40">
                {/* Index */}
                <span className="w-5 shrink-0 text-right text-[10px] text-slate-600">
                  {idx + 1}
                </span>

                {/* Conversion badge */}
                {conv && (
                  <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-emerald-400">
                    conversion
                  </span>
                )}

                {/* Event name */}
                <span className="flex-1 truncate font-medium text-slate-200">{ev.eventName}</span>

                {/* Time */}
                <span className="shrink-0 text-[10px] text-slate-600">
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </span>
              </summary>

              <pre className="max-h-40 overflow-auto border-t border-slate-800/60 px-3 py-2 text-[10px] font-mono text-slate-300">
                {JSON.stringify(ev.params, null, 2)}
              </pre>
            </details>
          );
        })}
      </div>
    </div>
  );
}
