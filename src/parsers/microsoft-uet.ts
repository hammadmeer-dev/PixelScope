import type { PixelEvent } from '../shared/types';

type PartialPixelEvent = Partial<PixelEvent>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// args[0] = method ('pageLoad', 'event', 'set')
// For 'event': args[1] = event category, args[2] = { event_label, event_value, revenue_value, currency }
export function parse(args: unknown[]): PartialPixelEvent {
  const method = typeof args[0] === 'string' ? args[0] : 'pageLoad';
  let eventName = 'PageLoad';
  const params: Record<string, unknown> = {};

  if (method === 'event') {
    if (typeof args[1] === 'string') {
      eventName = args[1];
    }
    if (isRecord(args[2])) {
      Object.assign(params, args[2]);
    }
  }

  const partial: PartialPixelEvent = {
    platform: 'ms_uet',
    method,
    eventName,
    params,
  };

  return partial;
}

