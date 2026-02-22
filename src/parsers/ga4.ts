import type { PixelEvent } from '../shared/types';

type PartialPixelEvent = Partial<PixelEvent>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fromDataLayer(obj: Record<string, unknown>): PartialPixelEvent {
  const { event, ...rest } = obj as { event?: unknown } & Record<string, unknown>;
  const eventName = typeof event === 'string' ? event : 'unknown';

  return {
    platform: 'ga4',
    method: 'dataLayer.push',
    eventName,
    params: rest,
  };
}

function parseQuery(body: string): Record<string, string> {
  const params = new URLSearchParams(body);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) {
    out[k] = v;
  }
  return out;
}

function fromCollectBody(body: string): PartialPixelEvent {
  const params = parseQuery(body);
  const eventName = params.en || 'unknown';

  const ep: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key === 'en') continue;
    if (key.startsWith('ep.')) {
      ep[key.slice(3)] = value;
    } else if (key.startsWith('epn.')) {
      const num = Number(value);
      ep[key.slice(4)] = Number.isFinite(num) ? num : value;
    }
  }

  const combined: Record<string, unknown> = {
    ...ep,
  };

  return {
    platform: 'ga4',
    method: 'collect',
    eventName,
    params: combined,
  };
}

// GA4 parser:
// - If first arg is a dataLayer-style object, parse it.
// - If first arg is a URL-encoded body string from /g/collect, parse it.
export function parse(args: unknown[]): PartialPixelEvent {
  const first = args[0];

  if (typeof first === 'string') {
    return fromCollectBody(first);
  }

  if (isRecord(first)) {
    return fromDataLayer(first);
  }

  const fallback: PartialPixelEvent = {
    platform: 'ga4',
    method: 'unknown',
    eventName: 'unknown',
    params: {},
  };

  return fallback;
}

