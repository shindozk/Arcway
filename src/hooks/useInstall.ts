import { useCallback, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { PackageSource, ProgressEvent } from '../types/package';
import { useInstallStore } from '../stores/useInstallStore';

export function useInstall() {
  const installAction = useInstallStore((s) => s.install);
  const uninstallAction = useInstallStore((s) => s.uninstall);
  const updateProgress = useInstallStore((s) => s.updateProgress);
  const removeProgress = useInstallStore((s) => s.removeProgress);
  const getProgress = useInstallStore((s) => s.getProgress);
  const activeInstalls = useInstallStore((s) => s.activeInstalls);

  useEffect(() => {
    const unlisten = listen<ProgressEvent>('install-progress', (event) => {
      updateProgress(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [updateProgress]);

  const install = useCallback(
    async (id: string, source: PackageSource) => {
      await installAction(id, source);
    },
    [installAction]
  );

  const uninstall = useCallback(
    async (id: string, source: PackageSource) => {
      await uninstallAction(id, source);
    },
    [uninstallAction]
  );

  const getProgressInfo = useCallback(
    (id: string) => {
      return getProgress(id);
    },
    [getProgress]
  );

  const clearCompleted = useCallback(
    (id: string) => {
      const op = getProgress(id);
      if (op && (op.status === 'completed' || op.status === 'error')) {
        removeProgress(id);
      }
    },
    [getProgress, removeProgress]
  );

  return {
    install,
    uninstall,
    getProgress: getProgressInfo,
    activeInstalls,
    clearCompleted,
  };
}
