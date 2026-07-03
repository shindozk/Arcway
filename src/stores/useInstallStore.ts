import { create } from 'zustand';
import type { PackageSource, ProgressEvent } from '../types/package';
import { installPackage as apiInstall, uninstallPackage as apiUninstall } from '../api/system';

interface InstallOperation {
  packageId: string;
  source: PackageSource;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  message: string;
  action: 'install' | 'uninstall';
}

interface InstallState {
  activeInstalls: Map<string, InstallOperation>;
  install: (id: string, source: PackageSource) => Promise<void>;
  uninstall: (id: string, source: PackageSource) => Promise<void>;
  updateProgress: (event: ProgressEvent) => void;
  removeProgress: (id: string) => void;
  getProgress: (id: string) => InstallOperation | undefined;
}

export const useInstallStore = create<InstallState>((set, get) => ({
  activeInstalls: new Map(),

  install: async (id: string, source: PackageSource) => {
    const op: InstallOperation = {
      packageId: id,
      source,
      status: 'pending',
      progress: 0,
      message: 'Preparing...',
      action: 'install',
    };
    set((state) => {
      const next = new Map(state.activeInstalls);
      next.set(id, op);
      return { activeInstalls: next };
    });

    try {
      set((state) => {
        const next = new Map(state.activeInstalls);
        const existing = next.get(id);
        if (existing) next.set(id, { ...existing, status: 'running', message: 'Installing...' });
        return { activeInstalls: next };
      });
      await apiInstall(id, source);
      set((state) => {
        const next = new Map(state.activeInstalls);
        next.set(id, {
          packageId: id,
          source,
          status: 'completed',
          progress: 100,
          message: 'Installed',
          action: 'install',
        });
        return { activeInstalls: next };
      });
    } catch (err) {
      set((state) => {
        const next = new Map(state.activeInstalls);
        next.set(id, {
          packageId: id,
          source,
          status: 'error',
          progress: 0,
          message: err instanceof Error ? err.message : 'Install failed',
          action: 'install',
        });
        return { activeInstalls: next };
      });
    }
  },

  uninstall: async (id: string, source: PackageSource) => {
    const op: InstallOperation = {
      packageId: id,
      source,
      status: 'pending',
      progress: 0,
      message: 'Preparing removal...',
      action: 'uninstall',
    };
    set((state) => {
      const next = new Map(state.activeInstalls);
      next.set(id, op);
      return { activeInstalls: next };
    });

    try {
      set((state) => {
        const next = new Map(state.activeInstalls);
        const existing = next.get(id);
        if (existing) next.set(id, { ...existing, status: 'running', message: 'Uninstalling...' });
        return { activeInstalls: next };
      });
      await apiUninstall(id, source);
      set((state) => {
        const next = new Map(state.activeInstalls);
        next.set(id, {
          packageId: id,
          source,
          status: 'completed',
          progress: 100,
          message: 'Uninstalled',
          action: 'uninstall',
        });
        return { activeInstalls: next };
      });
    } catch (err) {
      set((state) => {
        const next = new Map(state.activeInstalls);
        next.set(id, {
          packageId: id,
          source,
          status: 'error',
          progress: 0,
          message: err instanceof Error ? err.message : 'Uninstall failed',
          action: 'uninstall',
        });
        return { activeInstalls: next };
      });
    }
  },

  updateProgress: (event: ProgressEvent) => {
    set((state) => {
      const next = new Map(state.activeInstalls);
      const existing = next.get(event.package_id);
      if (existing) {
        next.set(event.package_id, {
          ...existing,
          progress: event.percentage ?? existing.progress,
          message: event.message,
          status: 'running',
        });
      }
      return { activeInstalls: next };
    });
  },

  removeProgress: (id: string) => {
    set((state) => {
      const next = new Map(state.activeInstalls);
      next.delete(id);
      return { activeInstalls: next };
    });
  },

  getProgress: (id: string) => {
    return get().activeInstalls.get(id);
  },
}));
