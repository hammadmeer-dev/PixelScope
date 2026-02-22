import type { PixelEvent } from '../shared/types';

type PartialPixelEvent = Partial<PixelEvent>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// GTM parser:
// - For dataLayer events that contain gtm.* fields, extract containerId and event.
// - For generic calls, treat first arg as event object.
export function parse(args: unknown[]): PartialPixelEvent {
  const first = args[0];

  if (isRecord(first)) {
    const containerId =
      typeof first['gtm.uniqueEventId'] === 'string'
        ? (first['gtm.uniqueEventId'] as string)
        : undefined;
    const eventName =
      typeof first.event === 'string' ? (first.event as string) : 'gtm_event';

    const params: Record<string, unknown> = { ...first };
    if (containerId) params.container_id = containerId;

    return {
      platform: 'gtm',
      method: 'dataLayer.push',
      eventName,
      params,
    };
  }

  const fallback: PartialPixelEvent = {
    platform: 'gtm',
    method: 'unknown',
    eventName: 'unknown',
    params: {},
  };

  return fallback;
}

