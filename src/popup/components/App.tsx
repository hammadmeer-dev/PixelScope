import { useEffect } from 'react';
import { OverviewTab } from './OverviewTab';
import { EventsTab } from './EventsTab';
import { PayloadTab } from './PayloadTab';
import { DebugTab } from './DebugTab';
import { usePixelScopeStore } from '../../shared/store';
import { sendToBackground } from '../../shared/message-bus';
import type { TabState } from '../../shared/types';
import icon from '../../../public/icons/icon128.png';

export function App() {
  const activeTab = usePixelScopeStore((s) => s.activeTab);
  const setActiveTab = usePixelScopeStore((s) => s.setActiveTab);
  const setEvents = usePixelScopeStore((s) => s.setEvents);
  const setPlatforms = usePixelScopeStore((s) => s.setPlatforms);
  const setCurrentTabId = usePixelScopeStore((s) => s.setCurrentTabId);
  const setConsentMode = usePixelScopeStore((s) => s.setConsentMode);

  useEffect(() => {
    if (!chrome?.tabs) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return;

      setCurrentTabId(tab.id);

      sendToBackground({ type: 'GET_TAB_STATE', payload: null, tabId: tab.id })
        .then((raw) => {
          const state = raw as TabState | undefined;
          if (!state) return;
          setEvents(state.events ?? []);
          setPlatforms(state.platforms ?? []);
          setConsentMode(state.consentMode);
        })
        .catch(() => {
          // ignore
        });
    });
  }, [setConsentMode, setCurrentTabId, setEvents, setPlatforms]);

  return (
    <div className="w-[380px] bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={icon} alt="PixelScope" className="flex h-9 w-9 items-center justify-center rounded-lg h-5 w-5" />
          <div>
            <h1 className="text-sm font-semibold leading-tight">PixelScope</h1>
            <p className="text-[11px] text-slate-400">Tracking inspector</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>LIVE</span>
        </div>
      </header>

      <nav className="flex border-b border-slate-800 text-xs">
        {(['overview', 'events', 'payload', 'debug'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 capitalize transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-sky-400 bg-slate-900 text-sky-300'
                : 'text-slate-400 hover:bg-slate-900/40'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main className="max-h-[520px] overflow-y-auto px-4 py-3 text-xs">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'events' && <EventsTab />}
        {activeTab === 'payload' && <PayloadTab />}
        {activeTab === 'debug' && <DebugTab />}
      </main>
    </div>
  );
}

