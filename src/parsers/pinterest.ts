import type { PixelEvent } from '../shared/types';

type PartialPixelEvent = Partial<PixelEvent>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// args[0] = method ('track', 'init', 'load')
// args[1] = event name (lowercase)
// args[2] = params
export function parse(args: unknown[]): PartialPixelEvent {
  const method = typeof args[0] === 'string' ? args[0] : 'track';
  const eventName = typeof args[1] === 'string' ? args[1] : method;
  const params = isRecord(args[2]) ? args[2] : {};

  if (method === 'init' && typeof args[1] === 'string') {
    (params as Record<string, unknown>).tag_id = args[1];
  }

  const partial: PartialPixelEvent = {
    platform: 'pinterest',
    method,
    eventName,
    params,
  };

  return partial;
}

