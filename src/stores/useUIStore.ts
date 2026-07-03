import { create } from 'zustand';
import { createLogger } from '../utils/logger';

const log = createLogger('ui');

type Page = 'home' | 'search' | 'installed' | 'updates' | 'settings' | 'detail' | 'profile' | 'about';

interface UIState {
  activePage: Page;
  viewMode: 'grid' | 'list';
  sidebarOpen: boolean;
  history: Page[];
  navigate: (page: Page) => void;
  goBack: () => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  activePage: 'home',
  viewMode: 'grid',
  sidebarOpen: true,
  history: [],

  navigate: (page: Page) => {
    const current = get().activePage;
    // Don't push to history if navigating to the same page
    if (current !== page) {
      log.debug(`navigate("${page}") from "${current}"`);
      set({ activePage: page, history: [...get().history, current] });
    }
  },

  goBack: () => {
    const history = get().history;
    if (history.length > 0) {
      const prev = history[history.length - 1];
      log.debug(`goBack() → "${prev}"`);
      set({ activePage: prev, history: history.slice(0, -1) });
    } else {
      log.debug('goBack() → home (no history)');
      set({ activePage: 'home', history: [] });
    }
  },

  setViewMode: (mode: 'grid' | 'list') => set({ viewMode: mode }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
