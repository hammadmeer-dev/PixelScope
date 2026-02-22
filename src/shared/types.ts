export type Platform =
  | 'meta'
  | 'tiktok'
  | 'snapchat'
  | 'ms_uet'
  | 'twitter'
  | 'linkedin'
  | 'pinterest'
  | 'ga4'
  | 'gtm';

export type EventStatus = 'ok' | 'warning' | 'error';

export interface PixelEvent {
  id: string; // uuid
  platform: Platform;
  method: string; // 'track', 'init', 'pagevisit', etc.
  eventName: string; // 'Purchase', 'PageView', etc.
  params: Record<string, unknown>;
  timestamp: number; // Date.now()
  url: string; // page URL where event fired
  origin: 'js_hook' | 'network' | 'datalayer';
  status: EventStatus;
  warnings: string[]; // e.g. ['Missing required field: currency']
  errors: string[];
  raw?: string; // raw network payload if captured
  scriptSource?: 'gtm' | 'hardcoded' | 'unknown';
}

export interface PlatformSummary {
  platform: Platform;
  detected: boolean;
  eventCount: number;
  status: EventStatus; // worst status across all events
  pixelId?: string; // extracted pixel/tag ID
}

export interface TabState {
  tabId: number;
  url: string;
  events: PixelEvent[];
  platforms: PlatformSummary[];
  consentMode?: ConsentModeState;
}

export interface ConsentModeState {
  detected: boolean;
  version?: 'v1' | 'v2';
  ad_storage: 'granted' | 'denied' | 'unknown';
  analytics_storage: 'granted' | 'denied' | 'unknown';
  ad_user_data: 'granted' | 'denied' | 'unknown';
  ad_personalization: 'granted' | 'denied' | 'unknown';
}

// Message bus types
export type MessageType =
  | 'PIXEL_EVENT_CAPTURED'
  | 'GET_TAB_STATE'
  | 'TAB_STATE_RESPONSE'
  | 'CLEAR_TAB_STATE'
  | 'CONSENT_MODE_DETECTED';

export interface ExtensionMessage {
  type: MessageType;
  payload: unknown;
  tabId?: number;
}

