import { create } from 'zustand';
import type { ConsentModeState, EventStatus, PixelEvent, Platform, PlatformSummary } from './types';

export type PixelScopeTabId = number | null;

export interface PixelScopeStore {
  events: PixelEvent[];
  platforms: PlatformSummary[];
  selectedEventId: string | null;
  activeTab: 'overview' | 'events' | 'payload' | 'debug';
  filterPlatform: Platform | 'all';
  filterStatus: EventStatus | 'all';
  searchQuery: string;
  currentTabId: PixelScopeTabId;
  consentMode?: ConsentModeState;

  // Actions
  setEvents: (events: PixelEvent[]) => void;
  setPlatforms: (platforms: PlatformSummary[]) => void;
  selectEvent: (id: string | null) => void;
  setActiveTab: (tab: PixelScopeStore['activeTab']) => void;
  setFilterPlatform: (platform: Platform | 'all') => void;
  setFilterStatus: (status: EventStatus | 'all') => void;
  setSearchQuery: (query: string) => void;
  setCurrentTabId: (tabId: PixelScopeTabId) => void;
  setConsentMode: (consent: ConsentModeState | undefined) => void;
  clearAll: () => void;
}

export const usePixelScopeStore = create<PixelScopeStore>((set) => ({
  events: [],
  platforms: [],
  selectedEventId: null,
  activeTab: 'overview',
  filterPlatform: 'all',
  filterStatus: 'all',
  searchQuery: '',
  currentTabId: null,
  consentMode: undefined,

  setEvents: (events) => set({ events }),
  setPlatforms: (platforms) => set({ platforms }),
  selectEvent: (id) => set({ selectedEventId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setFilterPlatform: (platform) => set({ filterPlatform: platform }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCurrentTabId: (tabId) => set({ currentTabId: tabId }),
  setConsentMode: (consent) => set({ consentMode: consent }),
  clearAll: () =>
    set({
      events: [],
      platforms: [],
      selectedEventId: null,
      filterPlatform: 'all',
      filterStatus: 'all',
      searchQuery: '',
    }),
}));


