import type { PixelEvent } from '../shared/types';

type PartialPixelEvent = Partial<PixelEvent>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// args[0] = method ('track', 'init', 'trackCustom')
// args[1] = event name ('Purchase', 'PageView', etc.)
// args[2] = params object
export function parse(args: unknown[]): PartialPixelEvent {
  const method = typeof args[0] === 'string' ? args[0] : 'track';
  let eventName = typeof args[1] === 'string' ? args[1] : 'Unknown';
  const params = isRecord(args[2]) ? args[2] : {};

  // Normalize common Meta event casing (e.g. 'PageView' stays as-is).
  if (typeof eventName === 'string' && eventName) {
    eventName = eventName;
  }

  // For 'init' calls, treat the pixel id as a param so validator/platform
  // summary code can pick it up later.
  if (method === 'init' && typeof args[1] === 'string') {
    (params as Record<string, unknown>).pixel_id = args[1];
  }

  const partial: PartialPixelEvent = {
    platform: 'meta',
    method,
    eventName,
    params,
  };

  return partial;
}

