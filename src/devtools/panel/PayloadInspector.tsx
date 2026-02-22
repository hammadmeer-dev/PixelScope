import { useState } from 'react';
import { PLATFORM_META } from '../../shared/constants';
import type { PixelEvent } from '../../shared/types';

// ─── Field annotations for known keys ───────────────────────────────────────

const FIELD_ANNOTATIONS: Record<string, string> = {
  currency: 'ISO 4217 3-letter code (e.g. USD)',
  value: 'Monetary value of the event',
  transaction_id: 'Unique purchase identifier',
  content_ids: 'Array of product IDs',
  contents: 'Array of { id, quantity } objects',
  content_type: '"product" or "product_group"',
  items: 'GA4 items array',
  item_id: 'Product SKU or ID',
  item_name: 'Product name',
  content_id: 'TikTok product ID',
  price: 'Snapchat product price',
  order_quantity: 'Number of items purchased',
  conversion_id: 'LinkedIn conversion ID',
  measurement_id: 'GA4 Measurement ID (G-XXXXXXXX)',
  container_id: 'GTM Container ID (GTM-XXXXXX)',
};

// ─── Recursive JSON tree node ─────────────────────────────────────────────

interface TreeNodeProps {
  keyName: string | null;
  value: unknown;
  depth: number;
}

function TreeNode({ keyName, value, depth }: TreeNodeProps) {
  const [open, setOpen] = useState(depth < 2);
  const indent = depth * 12;

  const annotation = keyName ? FIELD_ANNOTATIONS[keyName] : undefined;

  if (value === null) {
    return (
      <div className="flex items-baseline gap-1" style={{ paddingLeft: indent }}>
        {keyName && <span className="text-sky-300">{keyName}</span>}
        {keyName && <span className="text-slate-600">:</span>}
        <span className="text-slate-500">null</span>
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div className="flex items-baseline gap-1" style={{ paddingLeft: indent }}>
        {keyName && <span className="text-sky-300">{keyName}</span>}
        {keyName && <span className="text-slate-600">:</span>}
        <span className="text-purple-400">{String(value)}</span>
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div className="flex items-baseline gap-1 flex-wrap" style={{ paddingLeft: indent }}>
        {keyName && <span className="text-sky-300">{keyName}</span>}
        {keyName && <span className="text-slate-600">:</span>}
        <span className="text-emerald-400">{value}</span>
        {annotation && (
          <span className="text-[10px] text-slate-600 italic">← {annotation}</span>
        )}
      </div>
    );
  }

  if (typeof value === 'string') {
    return (
      <div className="flex items-baseline gap-1 flex-wrap" style={{ paddingLeft: indent }}>
        {keyName && <span className="text-sky-300">{keyName}</span>}
        {keyName && <span className="text-slate-600">:</span>}
        <span className="text-amber-300 break-all">&quot;{value}&quot;</span>
        {annotation && (
          <span className="text-[10px] text-slate-600 italic">← {annotation}</span>
        )}
      </div>
    );
  }

  if (Array.isArray(value)) {
    const preview = `Array[${value.length}]`;
    return (
      <div style={{ paddingLeft: indent }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-baseline gap-1 text-left hover:opacity-80"
        >
          <span className="text-slate-500 text-[10px]">{open ? '▾' : '▸'}</span>
          {keyName && <span className="text-sky-300">{keyName}</span>}
          {keyName && <span className="text-slate-600">:</span>}
          {!open && <span className="text-slate-500">{preview}</span>}
        </button>
        {open &&
          value.map((item, i) => (
            <TreeNode key={i} keyName={String(i)} value={item} depth={depth + 1} />
          ))}
      </div>
    );
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    const preview = `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '…' : ''}}`;
    return (
      <div style={{ paddingLeft: indent }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-baseline gap-1 text-left hover:opacity-80"
        >
          <span className="text-slate-500 text-[10px]">{open ? '▾' : '▸'}</span>
          {keyName && <span className="text-sky-300">{keyName}</span>}
          {keyName && <span className="text-slate-600">:</span>}
          {!open && <span className="text-slate-500 text-[10px]">{preview}</span>}
        </button>
        {open &&
          keys.map((k) => (
            <TreeNode
              key={k}
              keyName={k}
              value={(value as Record<string, unknown>)[k]}
              depth={depth + 1}
            />
          ))}
      </div>
    );
  }

  return null;
}

// ─── Main component ───────────────────────────────────────────────────────

interface Props {
  event: PixelEvent | null;
}

export function PayloadInspector({ event }: Props) {
  if (!event) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-slate-600">
        Select an event to inspect its payload.
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
    <div className="flex h-full flex-col overflow-hidden bg-slate-950 text-[12px]">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{meta.emoji}</span>
            <div>
              <div className="font-semibold text-slate-100">
                {meta.name} · {event.eventName}
              </div>
              <div className="text-[10px] text-slate-500 truncate max-w-xs">{event.url}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                event.status === 'error'
                  ? 'bg-red-500/20 text-red-300'
                  : event.status === 'warning'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {event.status}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700"
            >
              Copy JSON
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-2 flex gap-4 text-[10px] text-slate-500">
          <span>
            Method: <span className="text-slate-300">{event.method}</span>
          </span>
          <span>
            Origin: <span className="text-slate-300">{event.origin}</span>
          </span>
          {event.scriptSource && (
            <span>
              Via: <span className="text-slate-300">{event.scriptSource}</span>
            </span>
          )}
          <span>
            {new Date(event.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* JSON Tree */}
      <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-6">
        <TreeNode keyName={null} value={event.params} depth={0} />
      </div>

      {/* Validation panel */}
      {(event.warnings.length > 0 || event.errors.length > 0) && (
        <div className="shrink-0 border-t border-slate-800 px-4 py-3 space-y-2 text-[11px]">
          {event.errors.length > 0 && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-2">
              <div className="mb-1 text-[10px] font-semibold text-red-300 uppercase tracking-wide">
                Errors
              </div>
              <ul className="list-disc pl-4 text-red-200 space-y-0.5">
                {event.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {event.warnings.length > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2">
              <div className="mb-1 text-[10px] font-semibold text-amber-300 uppercase tracking-wide">
                Warnings
              </div>
              <ul className="list-disc pl-4 text-amber-100 space-y-0.5">
                {event.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {event.warnings.length === 0 && event.errors.length === 0 && (
        <div className="shrink-0 border-t border-slate-800 px-4 py-2 text-[11px]">
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2 text-emerald-200">
            ✓ Passed all validation rules
          </div>
        </div>
      )}
    </div>
  );
}
