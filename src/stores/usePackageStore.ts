import { create } from 'zustand';
import type { Package } from '../types/package';
import { searchPackages as apiSearchPackages } from '../api/packages';
import { createLogger } from '../utils/logger';

const log = createLogger('store');

interface PackageState {
  packages: Package[];
  searchQuery: string;
  searchResults: Package[];
  selectedPackage: Package | null;
  loading: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  selectPackage: (pkg: Package | null) => void;
  clearSearch: () => void;
  setPackages: (packages: Package[]) => void;
}

export const usePackageStore = create<PackageState>((set) => ({
  packages: [],
  searchQuery: '',
  searchResults: [],
  selectedPackage: null,
  loading: false,
  error: null,

  search: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [], searchQuery: query, loading: false, error: null });
      return;
    }
    log.info(`store.search("${query}")`);
    set({ loading: true, searchQuery: query, error: null });
    try {
      const results = await apiSearchPackages(query);
      log.info(`store.search => ${results.length} results`);
      set({ searchResults: results, loading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      log.error(`store.search failed: ${msg}`);
      set({ error: msg, loading: false });
    }
  },

  selectPackage: (pkg) => {
    log.debug(`selectPackage("${pkg?.name ?? 'null'}")`);
    set({ selectedPackage: pkg });
  },
  clearSearch: () => {
    log.debug('clearSearch');
    set({ searchResults: [], searchQuery: '', error: null });
  },
  setPackages: (packages) => set({ packages }),
}));
