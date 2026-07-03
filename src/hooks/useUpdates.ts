import { useCallback, useEffect, useState } from 'react';
import type { PackageSource } from '../types/package';
import { checkArcwayUpdates as apiCheckArcwayUpdates } from '../api/packages';
import { updatePackage as apiUpdatePackage, updateAll as apiUpdateAll } from '../api/system';
import { createLogger } from '../utils/logger';

const log = createLogger('updates');

interface UpdateEntry {
  package_id: string;
  name: string;
  source: PackageSource;
  current_version: string;
  new_version: string;
}

export function useUpdates() {
  const [updates, setUpdates] = useState<UpdateEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      log.debug('Checking Arcway updates');
      const data = await apiCheckArcwayUpdates();
      log.info(`Found ${data.length} updates`);
      setUpdates(data);
    } catch (err) {
      log.error(`Failed to check updates: ${err}`);
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updatePackage = useCallback(
    async (id: string) => {
      log.info(`Updating "${id}"`);
      try {
        await apiUpdatePackage(id);
        log.info(`Update OK for "${id}"`);
        await refresh();
      } catch (err) {
        log.error(`Update failed for "${id}": ${err}`);
      }
    },
    [refresh]
  );

  const updateAll = useCallback(async () => {
    log.info('Updating all Arcway packages');
    try {
      await apiUpdateAll();
      log.info('Update all OK');
      await refresh();
    } catch (err) {
      log.error(`Update all failed: ${err}`);
    }
  }, [refresh]);

  return { updates, loading, updatePackage, updateAll, refresh };
}
