import { PIXEL_GLOBALS } from '../shared/constants';
import { sanitizeValue } from '../shared/utils';
import type { ConsentModeState, ExtensionMessage, Platform } from '../shared/types';

declare global {
  interface Window {
    dataLayer?: unknown;
    google_tag_data?: unknown;
    gtag?: (...args: unknown[]) => unknown;
    __pixelscope_injected__?: boolean;
  }
}

type AnyFn = (...args: unknown[]) => unknown;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function postToIsolated(message: ExtensionMessage) {
  window.postMessage({ source: 'pixelscope', ...message }, '*');
}

function captureEvent(args: {
  platform: Platform;
  method: string;
  eventName: string;
  params: Record<string, unknown>;
  origin: 'js_hook' | 'datalayer';
  rawArgs?: unknown[];
}) {
  postToIsolated({
    type: 'PIXEL_EVENT_CAPTURED',
    payload: {
      platform: args.platform,
      method: args.method,
      eventName: args.eventName,
      params: sanitizeValue(args.params),
      timestamp: Date.now(),
      url: location.href,
      origin: args.origin,
      rawArgs: sanitizeValue(args.rawArgs),
    },
  });
}

function captureDataLayerPush(args: unknown[]) {
  captureEvent({
    platform: 'gtm',
    method: 'dataLayer.push',
    eventName: 'dataLayer.push',
    params: { args },
    origin: 'datalayer',
    rawArgs: args,
  });
}

function parseConsentStateFromGoogleTagData(value: unknown): ConsentModeState | null {
  if (!isRecord(value)) return null;
  const consent = (value as { consent?: unknown }).consent;
  if (!isRecord(consent)) return null;

  const getSignal = (key: keyof ConsentModeState) => {
    const v = consent[key as string];
    return v === 'granted' || v === 'denied' ? v : 'unknown';
  };

  const state: ConsentModeState = {
    detected: true,
    version:
      'ad_user_data' in consent || 'ad_personalization' in consent ? 'v2' : 'v1',
    ad_storage: getSignal('ad_storage'),
    analytics_storage: getSignal('analytics_storage'),
    ad_user_data: getSignal('ad_user_data'),
    ad_personalization: getSignal('ad_personalization'),
  };
  return state;
}

function parseConsentStateFromConsentObject(consent: unknown): ConsentModeState | null {
  if (!isRecord(consent)) return null;
  const getSignal = (key: keyof ConsentModeState) => {
    const v = consent[key as string];
    return v === 'granted' || v === 'denied' ? v : 'unknown';
  };
  return {
    detected: true,
    version:
      'ad_user_data' in consent || 'ad_personalization' in consent ? 'v2' : 'v1',
    ad_storage: getSignal('ad_storage'),
    analytics_storage: getSignal('analytics_storage'),
    ad_user_data: getSignal('ad_user_data'),
    ad_personalization: getSignal('ad_personalization'),
  };
}

function captureConsentModeIfPresent() {
  const state =
    parseConsentStateFromGoogleTagData(window.google_tag_data) ??
    parseConsentStateFromConsentObject(
      isRecord(window.google_tag_data) ? (window.google_tag_data as any).consent : null,
    );
  if (!state) return;
  postToIsolated({ type: 'CONSENT_MODE_DETECTED', payload: state });
}

function hookPixelGlobal(globalName: string, platform: Platform) {
  const existing = (window as unknown as Record<string, unknown>)[globalName];
  const originalFn = typeof existing === 'function' ? (existing as AnyFn) : null;

  // Step 5 requirement: preserve any existing queue array if present.
  const existingQueue: unknown[] =
    typeof existing === 'function' && Array.isArray((existing as any).queue)
      ? ((existing as any).queue as unknown[])
      : [];

  const proxyFn: AnyFn = (...args) => {
    // Preserve behavior: call original if present.
    try {
      if (originalFn) originalFn(...args);
    } catch {
      // Never break page scripts.
    }

    // Preserve SDK queue behavior for SDKs that rely on queueing before load.
    // If the original function exists, it may already be managing the queue; only queue if no original.
    if (!originalFn) {
      try {
        (proxyFn as any).queue?.push(args);
      } catch {
        // ignore
      }
    }

    // Capture for PixelScope.
    const method = typeof args[0] === 'string' ? args[0] : String(args[0] ?? '');
    const eventName = typeof args[1] === 'string' ? args[1] : method;
    const params = isRecord(args[2]) ? args[2] : {};
    captureEvent({
      platform,
      method,
      eventName,
      params,
      origin: 'js_hook',
      rawArgs: args,
    });
  };

  // Preserve/imitate common pixel SDK properties.
  try {
    (proxyFn as any).queue = existingQueue;
  } catch {
    // ignore
  }
  try {
    (proxyFn as any).push = (...args: unknown[]) => proxyFn(...args);
  } catch {
    // ignore
  }

  // Copy over other own properties (best-effort) so SDK checks don’t break.
  if (typeof existing === 'function') {
    for (const key of Object.getOwnPropertyNames(existing)) {
      if (key === 'length' || key === 'name' || key === 'arguments' || key === 'caller')
        continue;
      try {
        const desc = Object.getOwnPropertyDescriptor(existing, key);
        if (desc) Object.defineProperty(proxyFn, key, desc);
      } catch {
        // ignore
      }
    }
  }

  (window as unknown as Record<string, unknown>)[globalName] = proxyFn;
}

function hookDataLayer() {
  const existing = window.dataLayer;
  const target = Array.isArray(existing) ? existing : [];

  const proxied = new Proxy(target, {
    get(t, prop, receiver) {
      if (prop === 'push') {
        return (...args: unknown[]) => {
          captureDataLayerPush(args);

          // Also detect Consent Mode signals passed via gtag (which uses dataLayer pushes).
          // Typical shape: ['consent', 'update', { ... }]
          if (args.length) {
            const first = args[0];
            if (Array.isArray(first) && first[0] === 'consent') {
              const state = parseConsentStateFromConsentObject(first[2]);
              if (state) postToIsolated({ type: 'CONSENT_MODE_DETECTED', payload: state });
            }
          }

          return Array.prototype.push.apply(t, args as any);
        };
      }
      return Reflect.get(t, prop, receiver);
    },
  });

  window.dataLayer = proxied;
}

function hookGtagForConsent() {
  if (typeof window.gtag !== 'function') return;
  const original = window.gtag;
  window.gtag = (...args: unknown[]) => {
    try {
      if (args[0] === 'consent') {
        const state = parseConsentStateFromConsentObject(args[2]);
        if (state) postToIsolated({ type: 'CONSENT_MODE_DETECTED', payload: state });
        else captureConsentModeIfPresent();
      }
    } catch {
      // ignore
    }
    return original(...args);
  };
}

(() => {
  if (window.__pixelscope_injected__) return;
  window.__pixelscope_injected__ = true;

  // Hook pixel SDK globals.
  for (const [key, platform] of Object.entries(PIXEL_GLOBALS)) {
    hookPixelGlobal(key, platform);
  }

  // Hook dataLayer + Consent Mode signals.
  hookDataLayer();
  hookGtagForConsent();
  captureConsentModeIfPresent();
})();

