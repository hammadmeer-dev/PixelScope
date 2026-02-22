import type { PixelEvent } from '../shared/types';

type PartialPixelEvent = Partial<PixelEvent>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// args[0] = method ('track', 'init')
// args[1] = event name (SCREAMING_SNAKE_CASE)
// args[2] = params
export function parse(args: unknown[]): PartialPixelEvent {
  const method = typeof args[0] === 'string' ? args[0] : 'track';
  const rawEvent = typeof args[1] === 'string' ? args[1] : 'UNKNOWN';
  const eventName = rawEvent;
  const params = isRecord(args[2]) ? args[2] : {};

  const partial: PartialPixelEvent = {
    platform: 'snapchat',
    method,
    eventName,
    params,
  };

  return partial;
}

