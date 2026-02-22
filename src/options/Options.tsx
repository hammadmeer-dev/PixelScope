import { useEffect, useState } from 'react';
import { PLATFORM_META } from '../shared/constants';
import type { Platform } from '../shared/types';

// ─── Types ────────────────────────────────────────────────────────────────

type Theme = 'dark' | 'light' | 'system';
type Retention = 'session' | '24h';

interface Settings {
  enabledPlatforms: Record<Platform, boolean>;
  badgeCount: boolean;
  desktopErrors: boolean;
  theme: Theme;
  retention: Retention;
}

const ALL_PLATFORMS = Object.keys(PLATFORM_META) as Platform[];

const DEFAULTS: Settings = {
  enabledPlatforms: Object.fromEntries(ALL_PLATFORMS.map((p) => [p, true])) as Record<Platform, boolean>,
  badgeCount: true,
  desktopErrors: false,
  theme: 'dark',
  retention: 'session',
};

const STORAGE_KEY = 'pixelscope:settings';

async function loadSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      const stored = result[STORAGE_KEY] as Partial<Settings> | undefined;
      resolve({ ...DEFAULTS, ...stored });
    });
  });
}

async function saveSettings(s: Settings): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: s }, resolve);
  });
}

async function clearAllData(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.session.clear(resolve);
  });
}

// ─── Components ───────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-sky-500' : 'bg-slate-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
      {children}
    </h2>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">{children}</div>
  );
}

// ─── Main Options component ───────────────────────────────────────────────

export function Options() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clearConfirm, setClearConfirm] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const updatePlatform = (platform: Platform, enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      enabledPlatforms: { ...prev.enabledPlatforms, [platform]: enabled },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pixelscope-settings.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string) as Partial<Settings>;
        setSettings((prev) => ({ ...prev, ...parsed }));
        setSaved(false);
      } catch {
        // Invalid JSON — ignore silently
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearData = async () => {
    if (!clearConfirm) {
      setClearConfirm(true);
      setTimeout(() => setClearConfirm(false), 4000);
      return;
    }
    await clearAllData();
    setClearConfirm(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400 text-sm">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 text-sm">
      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-emerald-400 text-sm font-bold text-white">
            PS
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-100">PixelScope Settings</h1>
            <p className="text-[11px] text-slate-500">Configure tracking inspector behaviour</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* ── Platform toggles ─────────────────────────────────────── */}
          <section>
            <SectionTitle>Platforms</SectionTitle>
            <Card>
              <div className="space-y-3">
                {ALL_PLATFORMS.map((platform) => {
                  const meta = PLATFORM_META[platform];
                  return (
                    <div key={platform} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{meta.emoji}</span>
                        <span className="text-[13px] text-slate-200">{meta.name}</span>
                      </div>
                      <Toggle
                        checked={settings.enabledPlatforms[platform] ?? true}
                        onChange={(v) => updatePlatform(platform, v)}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>

          {/* ── Notifications ────────────────────────────────────────── */}
          <section>
            <SectionTitle>Notifications</SectionTitle>
            <Card>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] text-slate-200">Badge event count</div>
                    <div className="text-[11px] text-slate-500">Show total event count on extension icon</div>
                  </div>
                  <Toggle
                    checked={settings.badgeCount}
                    onChange={(v) => update('badgeCount', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] text-slate-200">Desktop notifications for errors</div>
                    <div className="text-[11px] text-slate-500">Show OS notification when an error is detected</div>
                  </div>
                  <Toggle
                    checked={settings.desktopErrors}
                    onChange={(v) => update('desktopErrors', v)}
                  />
                </div>
              </div>
            </Card>
          </section>

          {/* ── Appearance ───────────────────────────────────────────── */}
          <section>
            <SectionTitle>Appearance</SectionTitle>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] text-slate-200">Theme</div>
                  <div className="text-[11px] text-slate-500">Visual theme for the popup and panel</div>
                </div>
                <select
                  value={settings.theme}
                  onChange={(e) => update('theme', e.target.value as Theme)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[12px] text-slate-200"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </div>
            </Card>
          </section>

          {/* ── Data retention ───────────────────────────────────────── */}
          <section>
            <SectionTitle>Data Retention</SectionTitle>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] text-slate-200">Keep captured events</div>
                  <div className="text-[11px] text-slate-500">How long to store events between page navigations</div>
                </div>
                <select
                  value={settings.retention}
                  onChange={(e) => update('retention', e.target.value as Retention)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[12px] text-slate-200"
                >
                  <option value="session">Session only</option>
                  <option value="24h">Keep for 24 hours</option>
                </select>
              </div>
            </Card>
          </section>

          {/* ── Import / Export ──────────────────────────────────────── */}
          <section>
            <SectionTitle>Settings Backup</SectionTitle>
            <Card>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleExportSettings}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-[12px] text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  Export Settings JSON
                </button>
                <label className="flex-1 cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-center text-[12px] text-slate-200 hover:bg-slate-700 transition-colors">
                  Import Settings JSON
                  <input type="file" accept=".json" className="hidden" onChange={handleImportSettings} />
                </label>
              </div>
            </Card>
          </section>

          {/* ── Danger zone ─────────────────────────────────────────── */}
          <section>
            <SectionTitle>Danger Zone</SectionTitle>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] text-red-400">Clear all stored event data</div>
                  <div className="text-[11px] text-slate-500">
                    Permanently deletes all captured events from session storage
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearData}
                  className={`rounded-lg px-4 py-2 text-[12px] font-medium transition-colors ${
                    clearConfirm
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  }`}
                >
                  {clearConfirm ? 'Click again to confirm' : 'Clear All Data'}
                </button>
              </div>
            </Card>
          </section>
        </div>

        {/* ── Save button / status ─────────────────────────────────── */}
        <div className="mt-8 flex items-center justify-end gap-3">
          {saved && (
            <span className="text-[12px] text-emerald-400">✓ Settings saved</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-sky-500 px-6 py-2 text-sm font-semibold text-white hover:bg-sky-400 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
