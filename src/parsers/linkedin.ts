import type { PixelEvent } from '../shared/types';

type PartialPixelEvent = Partial<PixelEvent>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// LinkedIn Insight Tag
// First arg is config object { conversion_id: string, partner_id?: string }
export function parse(args: unknown[]): PartialPixelEvent {
  const config = isRecord(args[0]) ? args[0] : {};
  const conversionId =
    typeof config.conversion_id === 'string' ? (config.conversion_id as string) : undefined;
  const partnerId =
    typeof config.partner_id === 'string' ? (config.partner_id as string) : undefined;

  const params: Record<string, unknown> = {};
  if (conversionId) params.conversion_id = conversionId;
  if (partnerId) params.partner_id = partnerId;

  const partial: PartialPixelEvent = {
    platform: 'linkedin',
    method: 'track',
    eventName: conversionId ?? 'conversion',
    params,
  };

  return partial;
}

