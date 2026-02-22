import { describe, expect, it } from 'vitest';
import { validatePixelEvent } from '../../src/parsers/validator';
import type { PixelEvent } from '../../src/shared/types';

function makeEvent(overrides: Partial<PixelEvent>): PixelEvent {
  return {
    id: 'test-id',
    platform: 'meta',
    method: 'track',
    eventName: 'PageView',
    params: {},
    timestamp: Date.now(),
    url: 'https://example.com',
    origin: 'js_hook',
    status: 'ok',
    warnings: [],
    errors: [],
    ...overrides,
  };
}

// ─── Meta ────────────────────────────────────────────────────────────────────

describe('validator — Meta', () => {
  it('passes a valid Meta Purchase event', () => {
    const ev = makeEvent({
      platform: 'meta',
      eventName: 'Purchase',
      params: { value: 29.99, currency: 'USD', content_ids: ['123'] },
    });
    const result = validatePixelEvent(ev);
    expect(result.status).toBe('ok');
    expect(result.errors).toHaveLength(0);
  });

  it('flags missing currency on Meta Purchase as error', () => {
    const ev = makeEvent({
      platform: 'meta',
      eventName: 'Purchase',
      params: { value: 29.99, content_ids: ['123'] },
    });
    const result = validatePixelEvent(ev);
    expect(result.status).toBe('error');
    expect(result.errors.some((e) => e.includes('currency'))).toBe(true);
  });

  it('flags missing value on Meta Purchase as error', () => {
    const ev = makeEvent({
      platform: 'meta',
      eventName: 'Purchase',
      params: { currency: 'USD', content_ids: ['123'] },
    });
    const result = validatePixelEvent(ev);
    expect(result.errors.some((e) => e.includes('value'))).toBe(true);
  });

  it('flags missing content_ids and contents on Meta Purchase as error', () => {
    const ev = makeEvent({
      platform: 'meta',
      eventName: 'Purchase',
      params: { value: 10, currency: 'USD' },
    });
    const result = validatePixelEvent(ev);
    expect(result.errors.some((e) => e.includes('content_ids'))).toBe(true);
  });

  it('passes a valid Meta Purchase with contents array instead of content_ids', () => {
    const ev = makeEvent({
      platform: 'meta',
      eventName: 'Purchase',
      params: { value: 10, currency: 'GBP', contents: [{ id: 'x', quantity: 1 }] },
    });
    const result = validatePixelEvent(ev);
    expect(result.status).toBe('ok');
  });

  it('flags missing content_type on Meta AddToCart', () => {
    const ev = makeEvent({
      platform: 'meta',
      eventName: 'AddToCart',
      params: { content_ids: ['sku-1'] },
    });
    const result = validatePixelEvent(ev);
    expect(result.errors.some((e) => e.includes('content_type'))).toBe(true);
  });

  it('returns ok for non-validated Meta events', () => {
    const ev = makeEvent({ platform: 'meta', eventName: 'PageView', params: {} });
    const result = validatePixelEvent(ev);
    expect(result.status).toBe('ok');
  });
});

// ─── GA4 ─────────────────────────────────────────────────────────────────────

describe('validator — GA4', () => {
  it('passes a valid GA4 purchase event', () => {
    const ev = makeEvent({
      platform: 'ga4',
      eventName: 'purchase',
      params: {
        transaction_id: 'TXN-1',
        value: 49.99,
        currency: 'EUR',
        items: [{ item_id: 'SKU-001', item_name: 'Widget' }],
      },
    });
    const result = validatePixelEvent(ev);
    expect(result.status).toBe('ok');
  });

  it('flags missing transaction_id on GA4 purchase as error', () => {
    const ev = makeEvent({
      platform: 'ga4',
      eventName: 'purchase',
      params: { value: 49.99, currency: 'EUR', items: [{ item_id: 'SKU-001' }] },
    });
    const result = validatePixelEvent(ev);
    expect(result.status).toBe('error');
    expect(result.errors.some((e) => e.includes('transaction_id'))).toBe(true);
  });

  it('flags missing currency on GA4 purchase as error', () => {
    const ev = makeEvent({
      platform: 'ga4',
      eventName: 'purchase',
      params: { transaction_id: 'T1', value: 10, items: [{ item_id: '1' }] },
    });
    const result = validatePixelEvent(ev);
    expect(result.errors.some((e) => e.includes('currency'))).toBe(true);
  });

  it('flags items with no item_id and no item_name', () => {
    const ev = makeEvent({
      platform: 'ga4',
      eventName: 'purchase',
      params: {
        transaction_id: 'T1',
        value: 10,
        currency: 'USD',
        items: [{ quantity: 1 }],
      },
    });
    const result = validatePixelEvent(ev);
    expect(result.errors.some((e) => e.includes('item_id or item_name'))).toBe(true);
  });

  it('accepts GA4 purchase item with only item_name', () => {
    const ev = makeEvent({
      platform: 'ga4',
      eventName: 'purchase',
      params: {
        transaction_id: 'T2',
        value: 5,
        currency: 'USD',
        items: [{ item_name: 'Blue Jeans' }],
      },
    });
    const result = validatePixelEvent(ev);
    expect(result.status).toBe('ok');
  });
});

// ─── Generic / unknown platform ───────────────────────────────────────────────

describe('validator — other platforms', () => {
  it('returns ok for platforms without specific rules', () => {
    const ev = makeEvent({
      platform: 'linkedin',
      eventName: 'conversion',
      params: { conversion_id: '12345' },
    });
    const result = validatePixelEvent(ev);
    expect(result.status).toBe('ok');
  });
});
