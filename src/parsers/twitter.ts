import type { PixelEvent } from '../shared/types';

type PartialPixelEvent = Partial<PixelEvent>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// args[0] = method ('init', 'track', 'event')
// args[1] = event name or pixel ID
// args[2] = params
export function parse(args: unknown[]): PartialPixelEvent {
  const method = typeof args[0] === 'string' ? args[0] : 'track';
  const rawSecond = args[1];
  let eventName = 'Unknown';
  const params = isRecord(args[2]) ? args[2] : {};

  if (method === 'init') {
    if (typeof rawSecond === 'string') {
      (params as Record<string, unknown>).pixel_id = rawSecond;
    }
    eventName = 'init';
  } else if (typeof rawSecond === 'string') {
    eventName = rawSecond;
  }

  const partial: PartialPixelEvent = {
    platform: 'twitter',
    method,
    eventName,
    params,
  };

  return partial;
}

