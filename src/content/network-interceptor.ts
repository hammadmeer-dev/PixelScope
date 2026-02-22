import { ENDPOINT_PATTERNS } from '../shared/constants';
import type { ExtensionMessage, Platform } from '../shared/types';

declare global {
  interface Window {
    __pixelscope_network_patched__?: boolean;
  }
}

type CaptureNetworkArgs = {
  url: string;
  method: string;
  requestBody?: unknown;
  responseBody?: string;
  responseStatus?: number;
};

const MAX_BODY_CHARS = 50_000;

function getPlatformForUrl(url: string): Platform | null {
  for (const { pattern, platform } of ENDPOINT_PATTERNS) {
    if (pattern.test(url)) return platform;
  }
  return null;
}

function clampBody(text: string | undefined): string | undefined {
  if (typeof text !== 'string') return undefined;
  return text.length > MAX_BODY_CHARS ? `${text.slice(0, MAX_BODY_CHARS)}…(truncated)` : text;
}

function safeStringify(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof URLSearchParams) return value.toString();
  if (value instanceof FormData) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of value.entries()) out[k] = v;
    return JSON.stringify(out);
  }
  if (value instanceof Blob) return `Blob(${value.type || 'unknown'}, ${value.size} bytes)`;
  if (value instanceof ArrayBuffer) return `ArrayBuffer(${value.byteLength} bytes)`;
  if (ArrayBuffer.isView(value)) return `ArrayBufferView(${value.byteLength} bytes)`;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[unserializable]';
    }
  }
  return String(value);
}

function sendToBackground(message: ExtensionMessage) {
  try {
    chrome.runtime.sendMessage(message);
  } catch {
    // ignore
  }
}

function captureNetworkEvent(platform: Platform, args: CaptureNetworkArgs) {
  sendToBackground({
    type: 'PIXEL_EVENT_CAPTURED',
    payload: {
      platform,
      method: args.method,
      eventName: 'network',
      params: {
        url: args.url,
        requestBody: args.requestBody,
        responseStatus: args.responseStatus,
      },
      timestamp: Date.now(),
      url: location.href,
      origin: 'network',
      raw: clampBody(args.responseBody),
    },
  });
}

async function tryReadRequestBody(input: RequestInfo | URL, init?: RequestInit) {
  // Best-effort. Step 6 requires response capture; request capture is optional.
  if (init?.body != null) return safeStringify(init.body);
  if (typeof input === 'string' || input instanceof URL) return undefined;
  try {
    const cloned = input.clone();
    return await cloned.text();
  } catch {
    return undefined;
  }
}

function patchFetch() {
  const originalFetch = window.fetch;
  if (typeof originalFetch !== 'function') return;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method =
      init?.method ??
      (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET');

    const response = await originalFetch(input as any, init);

    // Step 6: check against ENDPOINT_PATTERNS after response.
    const matchUrl = response.url || requestUrl;
    const platform = getPlatformForUrl(matchUrl);
    if (platform) {
      const requestBody = await tryReadRequestBody(input, init);
      let responseBody: string | undefined;
      let responseStatus: number | undefined;

      try {
        responseStatus = response.status;
        // Step 6: clone response, read body; return original untouched.
        responseBody = await response.clone().text();
      } catch {
        // Opaque/cors responses may throw on read.
      }

      captureNetworkEvent(platform, {
        url: matchUrl,
        method,
        requestBody,
        responseBody,
        responseStatus,
      });
    }

    return response; // untouched
  };
}

function patchXHR() {
  const XHR = XMLHttpRequest;
  if (!XHR) return;

  const originalOpen = XHR.prototype.open;
  const originalSend = XHR.prototype.send;

  XHR.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
    (this as any).__pixelscope_url__ = typeof url === 'string' ? url : url.href;
    (this as any).__pixelscope_method__ = method;
    return originalOpen.apply(this, [method as any, url as any, ...rest] as any);
  };

  XHR.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    const url = (this as any).__pixelscope_url__ as string | undefined;
    const method = ((this as any).__pixelscope_method__ as string | undefined) ?? 'GET';
    const platform = url ? getPlatformForUrl(url) : null;
    const requestBody = safeStringify(body);

    if (platform && url) {
      this.addEventListener(
        'load',
        () => {
          let responseBody: string | undefined;
          try {
            responseBody = typeof this.responseText === 'string' ? this.responseText : undefined;
          } catch {
            // ignore
          }

          captureNetworkEvent(platform, {
            url,
            method,
            requestBody,
            responseBody: clampBody(responseBody),
            responseStatus: this.status,
          });
        },
        { once: true },
      );
    }

    return originalSend.call(this, body as any);
  };
}

function bridgeMainWorldMessages() {
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window) return;
    const data = event.data as any;
    if (!data || data.source !== 'pixelscope') return;

    // Forward as-is (injector already shaped it like ExtensionMessage).
    if (typeof data.type === 'string') {
      const msg: ExtensionMessage = {
        type: data.type,
        payload: data.payload,
        tabId: data.tabId,
      };
      sendToBackground(msg);
    }
  });
}

(() => {
  if (window.__pixelscope_network_patched__) return;
  window.__pixelscope_network_patched__ = true;

  bridgeMainWorldMessages();
  patchFetch();
  patchXHR();
})();

