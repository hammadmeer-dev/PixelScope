import type { EventStatus, PixelEvent, Platform } from '../shared/types';

export type ValidationResult = { status: EventStatus; warnings: string[]; errors: string[] };

function normalizeStatus(warnings: string[], errors: string[]): EventStatus {
  if (errors.length > 0) return 'error';
  if (warnings.length > 0) return 'warning';
  return 'ok';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getParams(event: PixelEvent): Record<string, unknown> {
  return isRecord(event.params) ? (event.params as Record<string, unknown>) : {};
}

function hasString(obj: Record<string, unknown>, key: string): boolean {
  return typeof obj[key] === 'string' && obj[key] !== '';
}

function hasNumber(obj: Record<string, unknown>, key: string): boolean {
  return typeof obj[key] === 'number' && Number.isFinite(obj[key] as number);
}

function isThreeLetterCurrency(value: unknown): boolean {
  return typeof value === 'string' && /^[A-Z]{3}$/i.test(value);
}

function validateMeta(event: PixelEvent, _warnings: string[], errors: string[]) {
  const params = getParams(event);
  const name = event.eventName;

  if (name === 'Purchase') {
    if (!hasNumber(params, 'value')) {
      errors.push('Meta Purchase missing required field: value (number).');
    }
    if (!isThreeLetterCurrency(params.currency)) {
      errors.push('Meta Purchase missing required field: currency (3-letter ISO).');
    }
    const hasContentIds = Array.isArray((params as any).content_ids);
    const hasContents = Array.isArray((params as any).contents);
    if (!hasContentIds && !hasContents) {
      errors.push('Meta Purchase missing required field: content_ids or contents.');
    }
  }

  if (name === 'AddToCart') {
    const hasContentIds = Array.isArray((params as any).content_ids);
    const hasContents = Array.isArray((params as any).contents);
    if (!hasContentIds && !hasContents) {
      errors.push('Meta AddToCart missing required field: content_ids or contents.');
    }
    if (!hasString(params, 'content_type')) {
      errors.push('Meta AddToCart missing required field: content_type.');
    }
  }
}

function validateGA4(event: PixelEvent, _warnings: string[], errors: string[]) {
  const params = getParams(event);
  const name = event.eventName.toLowerCase();

  if (name === 'purchase') {
    if (!hasString(params, 'transaction_id')) {
      errors.push('GA4 purchase missing required field: transaction_id.');
    }
    if (!hasNumber(params, 'value')) {
      errors.push('GA4 purchase missing required field: value (number).');
    }
    if (!isThreeLetterCurrency(params.currency)) {
      errors.push('GA4 purchase missing required field: currency (3-letter ISO).');
    }
    const items = (params as any).items;
    if (!Array.isArray(items) || items.length === 0) {
      errors.push('GA4 purchase missing required field: items (non-empty array).');
    } else {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const hasId = isRecord(item) && hasString(item, 'item_id');
        const hasName = isRecord(item) && hasString(item, 'item_name');
        if (!hasId && !hasName) {
          errors.push(
            `GA4 purchase item[${i}] missing required field: item_id or item_name.`,
          );
        }
      }
    }
  }
}

function validateTikTok(event: PixelEvent, _warnings: string[], errors: string[]) {
  const params = getParams(event);
  if (event.eventName === 'PlaceAnOrder') {
    if (!hasNumber(params, 'value')) {
      errors.push('TikTok PlaceAnOrder missing required field: value (number).');
    }
    if (!isThreeLetterCurrency(params.currency)) {
      errors.push('TikTok PlaceAnOrder missing required field: currency (3-letter ISO).');
    }
    if (!hasString(params, 'content_id')) {
      errors.push('TikTok PlaceAnOrder missing required field: content_id.');
    }
  }
}

function validateSnapchat(event: PixelEvent, _warnings: string[], errors: string[]) {
  const params = getParams(event);
  if (event.eventName === 'PURCHASE') {
    if (!hasNumber(params, 'price')) {
      errors.push('Snapchat PURCHASE missing required field: price (number).');
    }
    if (!isThreeLetterCurrency(params.currency)) {
      errors.push('Snapchat PURCHASE missing required field: currency (3-letter ISO).');
    }
  }
}

function validatePinterest(event: PixelEvent, _warnings: string[], errors: string[]) {
  const params = getParams(event);
  if (event.eventName === 'checkout') {
    if (!hasNumber(params, 'value')) {
      errors.push('Pinterest checkout missing required field: value (number).');
    }
    if (!hasNumber(params, 'order_quantity')) {
      errors.push('Pinterest checkout missing required field: order_quantity (number).');
    }
    if (!isThreeLetterCurrency(params.currency)) {
      errors.push('Pinterest checkout missing required field: currency (3-letter ISO).');
    }
  }
}

export function validatePixelEvent(event: PixelEvent): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const platform: Platform | undefined = event.platform;

  switch (platform) {
    case 'meta':
      validateMeta(event, warnings, errors);
      break;
    case 'ga4':
      validateGA4(event, warnings, errors);
      break;
    case 'tiktok':
      validateTikTok(event, warnings, errors);
      break;
    case 'snapchat':
      validateSnapchat(event, warnings, errors);
      break;
    case 'pinterest':
      validatePinterest(event, warnings, errors);
      break;
    default:
      break;
  }

  const status = normalizeStatus(warnings, errors);
  return { status, warnings, errors };
}

