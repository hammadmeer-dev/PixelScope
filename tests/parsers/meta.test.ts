import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parsers/meta';

describe('meta parser', () => {
  it('parses a Purchase track call correctly', () => {
    const result = parse([
      'track',
      'Purchase',
      { value: 29.99, currency: 'USD', content_ids: ['sku-123'] },
    ]);

    expect(result.platform).toBe('meta');
    expect(result.method).toBe('track');
    expect(result.eventName).toBe('Purchase');
    expect(result.params).toMatchObject({
      value: 29.99,
      currency: 'USD',
      content_ids: ['sku-123'],
    });
  });

  it('parses a PageView call', () => {
    const result = parse(['track', 'PageView']);
    expect(result.eventName).toBe('PageView');
    expect(result.platform).toBe('meta');
  });

  it('parses an init call and injects pixel_id into params', () => {
    const result = parse(['init', 'PX-987654321']);
    expect(result.method).toBe('init');
    expect(result.params).toMatchObject({ pixel_id: 'PX-987654321' });
  });

  it('handles missing params gracefully', () => {
    const result = parse(['track', 'AddToCart']);
    expect(result.params).toEqual({});
    expect(result.eventName).toBe('AddToCart');
  });

  it('defaults method to "track" when first arg is not a string', () => {
    const result = parse([undefined, 'Purchase', {}]);
    expect(result.method).toBe('track');
  });

  it('parses trackCustom with custom event name', () => {
    const result = parse(['trackCustom', 'MyCustomEvent', { custom_param: 'X' }]);
    expect(result.method).toBe('trackCustom');
    expect(result.eventName).toBe('MyCustomEvent');
    expect(result.params).toMatchObject({ custom_param: 'X' });
  });
});
