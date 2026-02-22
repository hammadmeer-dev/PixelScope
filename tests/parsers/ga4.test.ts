import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parsers/ga4';

describe('ga4 parser — fromDataLayer', () => {
  it('extracts event name and rest as params from a dataLayer object', () => {
    const result = parse([{ event: 'purchase', transaction_id: 'T123', value: 49.99, currency: 'EUR' }]);
    expect(result.platform).toBe('ga4');
    expect(result.method).toBe('dataLayer.push');
    expect(result.eventName).toBe('purchase');
    expect(result.params).toMatchObject({
      transaction_id: 'T123',
      value: 49.99,
      currency: 'EUR',
    });
    // 'event' key should NOT appear in params
    expect((result.params as Record<string, unknown>)['event']).toBeUndefined();
  });

  it('falls back to unknown eventName when event is not a string', () => {
    const result = parse([{ event: 42 }]);
    expect(result.eventName).toBe('unknown');
  });
});

describe('ga4 parser — fromCollectBody (network /g/collect)', () => {
  it('parses URL-encoded POST body from /g/collect', () => {
    // Typical GA4 collect payload
    const body = 'en=purchase&ep.transaction_id=TXN-001&epn.value=99.90&ep.currency=USD';
    const result = parse([body]);

    expect(result.platform).toBe('ga4');
    expect(result.method).toBe('collect');
    expect(result.eventName).toBe('purchase');
    expect(result.params).toMatchObject({
      transaction_id: 'TXN-001',
      currency: 'USD',
    });
    // epn. prefixed fields should be parsed as numbers
    expect((result.params as Record<string, unknown>)['value']).toBe(99.90);
  });

  it('handles collect body with only event name', () => {
    const body = 'en=page_view';
    const result = parse([body]);
    expect(result.eventName).toBe('page_view');
    expect(result.params).toEqual({});
  });

  it('falls back to unknown for an empty collect body', () => {
    const result = parse(['']);
    expect(result.eventName).toBe('unknown');
  });
});

describe('ga4 parser — fallback', () => {
  it('returns unknown event when passed no args', () => {
    const result = parse([]);
    expect(result.eventName).toBe('unknown');
    expect(result.platform).toBe('ga4');
  });
});
