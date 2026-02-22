import type { ConsentModeState, EventStatus, ExtensionMessage, PixelEvent, Platform, PlatformSummary, TabState } from '../shared/types';
import { validatePixelEvent } from '../parsers/validator';

const TAB_STATE_PREFIX = 'pixelscope:tabstate:'; // + tabId
const DEDUP_WINDOW_MS = 500;

type StoredTabState = TabState;

const recentEventFingerprints = new Map<number, Map<string, number>>(); // tabId -> fingerprint -> lastSeenTs
const pixelIdsPerTab = new Map<number, Set<string>>(); // tabId -> set of pixelIds

function now() {
  return Date.now();
}

function uuid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function statusRank(status: EventStatus): number {
  if (status === 'error') return 2;
  if (status === 'warning') return 1;
  return 0;
}

function worstStatus(a: EventStatus, b: EventStatus): EventStatus {
  return statusRank(a) >= statusRank(b) ? a : b;
}

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  const stringify = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(stringify);
    if (v instanceof Date) return v.toISOString();

    const obj = v as Record<string, unknown>;
    if (seen.has(obj)) return '[Circular]';
    seen.add(obj);

    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = stringify(obj[key]);
    }
    return out;
  };

  return JSON.stringify(stringify(value));
}

async function loadTabState(tabId: number): Promise<StoredTabState> {
  const key = `${TAB_STATE_PREFIX}${tabId}`;
  const result = await chrome.storage.session.get(key);
  const state = result[key] as StoredTabState | undefined;
  if (state) return state;

  // Default empty state
  return {
    tabId,
    url: '',
    events: [],
    platforms: [],
  };
}

async function saveTabState(state: StoredTabState): Promise<void> {
  const key = `${TAB_STATE_PREFIX}${state.tabId}`;
  await chrome.storage.session.set({ [key]: state });
}

async function clearTabState(tabId: number): Promise<void> {
  const key = `${TAB_STATE_PREFIX}${tabId}`;
  await chrome.storage.session.remove(key);
  recentEventFingerprints.delete(tabId);
  pixelIdsPerTab.delete(tabId);
  await setBadge(tabId, 0, 'ok');
}

function extractPixelId(event: PixelEvent): string | undefined {
  const params = event.params as Record<string, unknown>;

  const candidateKeys: string[] = [
    'pixel_id',
    'tag_id',
    'conversion_id',
    'partner_id',
    'measurement_id',
    'container_id',
    'id',
  ];

  for (const key of candidateKeys) {
    const value = params?.[key];
    if (typeof value === 'string' && value) return value;
  }

  return undefined;
}

function recalcPlatformSummaries(events: PixelEvent[]): PlatformSummary[] {
  const map = new Map<Platform, PlatformSummary>();
  for (const ev of events) {
    const existing = map.get(ev.platform);
    const nextStatus = existing ? worstStatus(existing.status, ev.status) : ev.status;
    const pixelId = extractPixelId(ev) ?? existing?.pixelId;
    map.set(ev.platform, {
      platform: ev.platform,
      detected: true,
      eventCount: (existing?.eventCount ?? 0) + 1,
      status: nextStatus,
      pixelId,
    });
  }
  return Array.from(map.values());
}

function getWorstStatusFromPlatforms(platforms: PlatformSummary[]): EventStatus {
  let s: EventStatus = 'ok';
  for (const p of platforms) s = worstStatus(s, p.status);
  return s;
}

async function setBadge(tabId: number, count: number, status: EventStatus) {
  const text = count > 99 ? '99+' : count > 0 ? String(count) : '';
  await chrome.action.setBadgeText({ tabId, text });
  await chrome.action.setBadgeBackgroundColor({
    tabId,
    color: status === 'error' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#10b981',
  });
}

function applyDedupWarning(tabId: number, event: PixelEvent) {
  const ts = event.timestamp;
  const fingerprint = `${event.platform}:${event.eventName}:${stableStringify(event.params)}`;

  const perTab = recentEventFingerprints.get(tabId) ?? new Map<string, number>();
  recentEventFingerprints.set(tabId, perTab);

  const last = perTab.get(fingerprint);
  if (typeof last === 'number' && ts - last <= DEDUP_WINDOW_MS) {
    event.warnings.push('Potential duplicate event — same event fired within 500ms');
    event.status = worstStatus(event.status, 'warning');
  }
  perTab.set(fingerprint, ts);

  // Prune old entries (cheap).
  for (const [fp, lastSeen] of perTab.entries()) {
    if (ts - lastSeen > DEDUP_WINDOW_MS) perTab.delete(fp);
  }
}

function applyDuplicatePixelIdWarning(tabId: number, event: PixelEvent) {
  const pixelId = extractPixelId(event);
  if (!pixelId) return;

  const perTab = pixelIdsPerTab.get(tabId) ?? new Set<string>();
  pixelIdsPerTab.set(tabId, perTab);

  if (perTab.has(pixelId)) {
    event.warnings.push(
      'Potential duplicate pixel installation — same Pixel ID detected more than once on this page.',
    );
    event.status = worstStatus(event.status, 'warning');
  } else {
    perTab.add(pixelId);
  }
}

function buildPixelEventFromPayload(payload: any, pageUrlFallback: string): PixelEvent {
  const platform = payload?.platform as Platform;
  const method = typeof payload?.method === 'string' ? payload.method : 'unknown';
  const eventName = typeof payload?.eventName === 'string' ? payload.eventName : 'unknown';
  const params =
    payload?.params && typeof payload.params === 'object' && !Array.isArray(payload.params)
      ? (payload.params as Record<string, unknown>)
      : {};
  const timestamp = typeof payload?.timestamp === 'number' ? payload.timestamp : now();
  const url = typeof payload?.url === 'string' ? payload.url : pageUrlFallback;
  const origin = payload?.origin === 'network' || payload?.origin === 'datalayer' ? payload.origin : 'js_hook';

  const base: PixelEvent = {
    id: uuid(),
    platform,
    method,
    eventName,
    params,
    timestamp,
    url,
    origin,
    status: 'ok',
    warnings: [],
    errors: [],
    raw: typeof payload?.raw === 'string' ? payload.raw : undefined,
    scriptSource: payload?.scriptSource,
  };

  return base;
}

async function ingestPixelEvent(tabId: number, senderUrl: string, payload: unknown) {
  const state = await loadTabState(tabId);
  state.url = senderUrl || state.url;

  const ev = buildPixelEventFromPayload(payload as any, senderUrl);

  // Validate and attach status/warnings/errors
  const validation = validatePixelEvent(ev);
  ev.status = validation.status;
  ev.warnings.push(...validation.warnings);
  ev.errors.push(...validation.errors);

  // Dedup check
  applyDedupWarning(tabId, ev);
  // Duplicate pixel installation check
  applyDuplicatePixelIdWarning(tabId, ev);

  state.events.push(ev);
  state.platforms = recalcPlatformSummaries(state.events);

  await saveTabState(state);
  await setBadge(tabId, state.events.length, getWorstStatusFromPlatforms(state.platforms));
}

async function ingestConsentMode(tabId: number, senderUrl: string, payload: unknown) {
  const state = await loadTabState(tabId);
  state.url = senderUrl || state.url;
  state.consentMode = payload as ConsentModeState;
  await saveTabState(state);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const msg = message as ExtensionMessage;
  const tabId = msg.tabId ?? sender.tab?.id;

  // Most flows are tab-scoped; if we can't attribute, ignore.
  if (!tabId) return;
  const senderUrl = sender.tab?.url ?? '';

  if (msg.type === 'PIXEL_EVENT_CAPTURED') {
    ingestPixelEvent(tabId, senderUrl, msg.payload).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === 'CONSENT_MODE_DETECTED') {
    ingestConsentMode(tabId, senderUrl, msg.payload).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === 'GET_TAB_STATE') {
    loadTabState(tabId).then((state) => sendResponse(state));
    return true;
  }

  if (msg.type === 'CLEAR_TAB_STATE') {
    clearTabState(tabId).then(() => sendResponse({ ok: true }));
    return true;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void clearTabState(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    void clearTabState(tabId);
    // Preserve latest URL for next events (will be filled in on ingest)
    if (typeof tab.url === 'string') {
      void saveTabState({ tabId, url: tab.url, events: [], platforms: [] });
    }
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  // Best-effort: update badge for the active tab (in case SW restarted).
  loadTabState(tabId)
    .then((state) => setBadge(tabId, state.events.length, getWorstStatusFromPlatforms(state.platforms)))
    .catch(() => {});
});

chrome.runtime.onInstalled.addListener(() => {
  // no-op
});

export {};

