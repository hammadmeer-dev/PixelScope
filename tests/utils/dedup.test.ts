import { describe, expect, it } from 'vitest';
import type { PixelEvent } from '../../src/shared/types';

// ─── Inline duplicate detection logic (mirrors service-worker.ts) ─────────────
// We extract the logic into a testable shape to avoid browser-API dependencies.

const DEDUP_WINDOW_MS = 500;

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  const stringify = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(stringify);
    const obj = v as Record<string, unknown>;
    if (seen.has(obj)) return '[Circular]';
    seen.add(obj);
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) out[key] = stringify(obj[key]);
    return out;
  };

  return JSON.stringify(stringify(value));
}

interface DedupResult {
  isDuplicate: boolean;
}

class DedupChecker {
  private fingerprints = new Map<string, number>();

  check(event: Pick<PixelEvent, 'platform' | 'eventName' | 'params' | 'timestamp'>): DedupResult {
    const fp = `${event.platform}:${event.eventName}:${stableStringify(event.params)}`;
    const ts = event.timestamp;
    const last = this.fingerprints.get(fp);
    const isDuplicate = typeof last === 'number' && ts - last <= DEDUP_WINDOW_MS;
    this.fingerprints.set(fp, ts);
    return { isDuplicate };
  }

  clear() {
    this.fingerprints.clear();
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('dedup — same event within 500ms', () => {
  it('marks the second event as duplicate when within 500ms', () => {
    const checker = new DedupChecker();
    const baseEvent = { platform: 'meta' as const, eventName: 'Purchase', params: { value: 10 } };

    const first = checker.check({ ...baseEvent, timestamp: 1000 });
    const second = checker.check({ ...baseEvent, timestamp: 1400 }); // 400ms later

    expect(first.isDuplicate).toBe(false);
    expect(second.isDuplicate).toBe(true);
  });

  it('does NOT mark as duplicate when events are 600ms apart', () => {
    const checker = new DedupChecker();
    const baseEvent = { platform: 'meta' as const, eventName: 'Purchase', params: { value: 10 } };

    checker.check({ ...baseEvent, timestamp: 1000 });
    const second = checker.check({ ...baseEvent, timestamp: 1600 }); // 600ms later

    expect(second.isDuplicate).toBe(false);
  });

  it('does NOT mark as duplicate when params differ', () => {
    const checker = new DedupChecker();

    checker.check({ platform: 'meta', eventName: 'Purchase', params: { value: 10 }, timestamp: 1000 });
    const second = checker.check({ platform: 'meta', eventName: 'Purchase', params: { value: 20 }, timestamp: 1200 });

    expect(second.isDuplicate).toBe(false);
  });

  it('does NOT mark as duplicate when event name differs', () => {
    const checker = new DedupChecker();
    const ts = 1000;

    checker.check({ platform: 'meta', eventName: 'Purchase', params: {}, timestamp: ts });
    const second = checker.check({ platform: 'meta', eventName: 'PageView', params: {}, timestamp: ts + 100 });

    expect(second.isDuplicate).toBe(false);
  });

  it('does NOT mark as duplicate when platform differs', () => {
    const checker = new DedupChecker();
    const ts = 1000;

    checker.check({ platform: 'meta', eventName: 'Purchase', params: {}, timestamp: ts });
    const second = checker.check({ platform: 'ga4', eventName: 'Purchase', params: {}, timestamp: ts + 100 });

    expect(second.isDuplicate).toBe(false);
  });

  it('correctly handles exactly 500ms gap as duplicate', () => {
    const checker = new DedupChecker();
    const base = { platform: 'tiktok' as const, eventName: 'PlaceAnOrder', params: {} };

    checker.check({ ...base, timestamp: 2000 });
    const second = checker.check({ ...base, timestamp: 2500 }); // exactly 500ms

    expect(second.isDuplicate).toBe(true);
  });

  it('is not duplicate just above 500ms', () => {
    const checker = new DedupChecker();
    const base = { platform: 'tiktok' as const, eventName: 'PlaceAnOrder', params: {} };

    checker.check({ ...base, timestamp: 2000 });
    const second = checker.check({ ...base, timestamp: 2501 }); // 501ms

    expect(second.isDuplicate).toBe(false);
  });

  it('clears state and first event is never duplicate again', () => {
    const checker = new DedupChecker();
    const base = { platform: 'ga4' as const, eventName: 'purchase', params: { value: 5 } };

    checker.check({ ...base, timestamp: 1000 });
    checker.clear();
    const after = checker.check({ ...base, timestamp: 1100 });

    expect(after.isDuplicate).toBe(false);
  });
});
