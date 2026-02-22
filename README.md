# PixelScope — Tracking Pixel Inspector

> A Chrome Extension (Manifest V3) for real-time detection, inspection, and validation of tracking pixels across **9 ad/analytics platforms**.
> Think of it as Google Tag Assistant extended to cover Meta, TikTok, Snapchat, Microsoft UET, Twitter/X, LinkedIn, Pinterest, GA4, and GTM — all in one panel.

---

## 🚦 Project Status

| Phase | Status |
|---|---|
| Core infrastructure (Steps 1–11) | ✅ Complete |
| Popup UI — all 4 tabs (Step 12) | ✅ Complete |
| Export / Dedup / Badge logic (Steps 15–17) | ✅ Complete (in service worker) |
| Build config / CRXJS (Step 18) | ✅ Complete |
| **DevTools Panel (Step 13)** | ✅ Complete |
| **Options Page (Step 14)** | ✅ Complete |
| **Vitest test suite (Step 19)** | ✅ 34/34 tests passing |
| Extension icons (Step 20) | ⚠️ Placeholder PNGs needed |

---

## 🧱 Tech Stack

| Concern | Tool |
|---|---|
| Build | Vite 7 + CRXJS Vite Plugin |
| Language | TypeScript (strict) |
| UI | React 18 + Tailwind CSS v3 |
| State | Zustand v5 |
| Testing | Vitest |
| Chrome types | `@types/chrome` |
| Linting | ESLint 9 + Prettier |

---

## 📁 Folder Structure

```
pixelscope/
├── manifest.json                  ← MV3 manifest
├── vite.config.ts                 ← CRXJS + multi-entry build
├── package.json
├── tailwind.config.ts
│
├── src/
│   ├── background/
│   │   └── service-worker.ts      ← Tab state, validation, badge, dedup, export
│   │
│   ├── content/
│   │   ├── injector.ts            ← MAIN world: hooks window.fbq, ttq, etc. + Consent Mode
│   │   ├── network-interceptor.ts ← ISOLATED world: patches fetch + XHR, bridges postMessage
│   │   └── datalayer-observer.ts  ← (placeholder — datalayer watching is in injector.ts)
│   │
│   ├── devtools/
│   │   ├── devtools.html          ← Registers the DevTools panel
│   │   ├── devtools.ts            ← Calls chrome.devtools.panels.create()
│   │   └── panel/
│   │       ├── Panel.tsx          ← ⚠️ STUB — full layout needed
│   │       ├── EventStream.tsx    ← ⚠️ STUB
│   │       ├── PayloadInspector.tsx ← ⚠️ STUB
│   │       ├── DataLayerTimeline.tsx ← ⚠️ STUB
│   │       ├── main.tsx
│   │       └── panel.html
│   │
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── components/
│   │       ├── App.tsx            ← Tab nav, fetches tab state on open
│   │       ├── OverviewTab.tsx    ← Platforms list, summary chips, export button
│   │       ├── EventsTab.tsx      ← Filterable event list with search
│   │       ├── PayloadTab.tsx     ← JSON payload view, warnings/errors, copy
│   │       └── DebugTab.tsx       ← Consent Mode, dataLayer pushes, script origins
│   │
│   ├── options/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── Options.tsx            ← ⚠️ STUB — settings page needed
│   │
│   ├── shared/
│   │   ├── types.ts               ← PixelEvent, TabState, ConsentModeState, MessageType
│   │   ├── constants.ts           ← PIXEL_GLOBALS, ENDPOINT_PATTERNS, PLATFORM_META
│   │   ├── message-bus.ts         ← Typed sendToBackground / onMessage helpers
│   │   └── store.ts               ← Zustand store (events, platforms, filters, consentMode)
│   │
│   └── parsers/
│       ├── meta.ts                ← Meta Pixel parser (fbq)
│       ├── tiktok.ts              ← TikTok Pixel (ttq)
│       ├── snapchat.ts            ← Snapchat Pixel (snaptr)
│       ├── microsoft-uet.ts       ← Microsoft UET (uetq)
│       ├── twitter.ts             ← Twitter/X Pixel (twq)
│       ├── linkedin.ts            ← LinkedIn Insight Tag (lintrk)
│       ├── pinterest.ts           ← Pinterest Tag (pintrk)
│       ├── ga4.ts                 ← Google Analytics 4 (dataLayer + /g/collect)
│       ├── gtm.ts                 ← Google Tag Manager (dataLayer, container detection)
│       └── validator.ts           ← Validation rules engine (required/recommended fields)
│
├── public/
│   └── icons/                     ← ⚠️ icon16/32/48/128.png needed
│
└── tests/
    └── smoke.test.ts              ← ⚠️ Only bootstrap; real tests needed
```

---

## 🔍 Architecture Overview

### Data Flow

```
Page JS (MAIN world)
  └─ injector.ts hooks window.fbq, ttq, etc.
       └─ window.postMessage({ source:'pixelscope', ...event })
            └─ network-interceptor.ts listens (ISOLATED world)
                 └─ chrome.runtime.sendMessage → service-worker.ts
                      ├─ validatePixelEvent()
                      ├─ applyDedupWarning()
                      ├─ applyDuplicatePixelIdWarning()
                      ├─ chrome.storage.session (persist TabState)
                      └─ chrome.action.setBadge*()

Network traffic
  └─ network-interceptor.ts patches fetch + XHR
       └─ Matches ENDPOINT_PATTERNS → captureNetworkEvent()
            └─ chrome.runtime.sendMessage → same service-worker pipeline

Popup
  └─ App.tsx on open sends GET_TAB_STATE
       └─ service-worker replies with full TabState
            └─ Zustand store hydrated → React renders 4 tabs
```

### Key Design Decisions

1. **MAIN world injection** — `injector.ts` runs in the page's own JavaScript context so it can intercept `window.fbq` before the pixel SDK overwrites it. It cannot use `chrome.runtime` directly, so it uses `window.postMessage` as a bridge.

2. **`chrome.storage.session` for persistence** — MV3 service workers unload after ~30s inactivity. All tab state is persisted via `chrome.storage.session` so it survives worker restarts.

3. **Dedup fingerprint window** — Events are fingerprinted as `platform:eventName:stableStringify(params)`. If the same fingerprint fires twice within 500ms on the same tab, a warning is attached.

4. **Validation tiers** — `validator.ts` distinguishes between `error` (required field missing) and `warning` (recommended field missing). Platform + event name combinations map to rule sets.

---

## 🚀 Local Development

```bash
# Install dependencies
npm install

# Start dev build (with CRXJS hot reload)
npm run dev

# Production build
npm run build

# Run tests
npm test

# Lint
npm run lint
```

### Loading in Chrome

1. Run `npm run build` to produce `dist/`
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `dist/` folder
5. Pin the PixelScope icon from the extensions toolbar

---

## 🛠️ Platforms Supported

| Platform | JS Global | Network Endpoint | Emoji |
|---|---|---|---|
| Meta Pixel | `window.fbq` | `facebook.com/tr` | 📘 |
| TikTok Pixel | `window.ttq` | `analytics.tiktok.com` | 🎵 |
| Snapchat Pixel | `window.snaptr` | `tr.snapchat.com` | 👻 |
| Microsoft UET | `window.uetq` | `bat.bing.com/action` | 🪟 |
| Twitter/X Pixel | `window.twq` | `t.co/i/adsct` | 𝕏 |
| LinkedIn Insight | `window.lintrk` | `px.ads.linkedin.com` | 💼 |
| Pinterest Tag | `window.pintrk` | `ct.pinterest.com` | 📌 |
| Google Analytics 4 | `window.dataLayer` | `google-analytics.com/g/collect` | 📊 |
| Google Tag Manager | `window.dataLayer` | `googletagmanager.com/gtm.js` | 🏷 |

---

## 📋 Message Types

Typed messages exchanged between extension contexts via `chrome.runtime`:

| Message Type | Direction | Purpose |
|---|---|---|
| `PIXEL_EVENT_CAPTURED` | content → background | Forward a detected pixel event |
| `CONSENT_MODE_DETECTED` | content → background | Forward Google Consent Mode state |
| `GET_TAB_STATE` | popup/devtools → background | Request current tab's full state |
| `TAB_STATE_RESPONSE` | background → popup/devtools | Response with `TabState` |
| `CLEAR_TAB_STATE` | popup → background | Reset all events for the tab |

---

## 🧪 Pending Tests (Step 19)

The following Vitest tests need to be written in `tests/`:

```
tests/
├── parsers/
│   ├── meta.test.ts        — parse() with Purchase, PageView, init
│   ├── ga4.test.ts         — URL-encoded /g/collect body parsing
│   └── validator.test.ts   — Meta missing currency (warning), GA4 missing transaction_id (error)
└── utils/
    └── dedup.test.ts       — Same event ≤500ms = warning; >500ms = no warning
```

---

## 📌 What's Left to Implement

### Step 13 — DevTools Panel (Priority: High)
- `Panel.tsx` — two-pane layout (event list left, payload inspector right), toolbar
- `EventStream.tsx` — capped virtualized list, auto-scroll, pause button
- `PayloadInspector.tsx` — recursive collapsible JSON tree, field annotations
- `DataLayerTimeline.tsx` — ordered dataLayer push viewer with conversion highlighting
- Wire long-lived `chrome.runtime.connect()` port for real-time event streaming

### Step 14 — Options Page (Priority: Medium)
- Platform toggle switches (stored in `chrome.storage.sync`)
- Notification settings, theme selector, data retention
- Export/Import settings JSON, "Clear All Data" danger button

### Step 19 — Tests (Priority: Medium)
- Parser unit tests, validator rule tests, dedup logic tests

### Step 20 — Icons (Priority: Low)
- Generate or place actual icons at `public/icons/icon16/32/48/128.png`

---

## 📄 Permissions Required

| Permission | Reason |
|---|---|
| `storage` | Persist tab state across service worker restarts |
| `tabs` | Query active tab, read tab URL |
| `scripting` | Fallback for MAIN world script injection |
| `webRequest` | Network traffic inspection |
| `webNavigation` | Detect page navigations to clear stale state |
| `activeTab` | Badge updates for the current tab |
| `host_permissions: <all_urls>` | Intercept requests on any website |

---

## 🗂️ Version History

| Version | Notes |
|---|---|
| 0.0.0 | Initial scaffold — Steps 1–12, 15–18 implemented |

---

*This README is maintained as AI context alongside the codebase. Update the **Project Status** table and **Version History** as each remaining step is completed.*
