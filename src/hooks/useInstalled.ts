import { useCallback, useEffect, useState } from 'react';
import type { Package } from '../types/package';
import { listArcwayInstalled as apiListArcwayInstalled, getFlathubDetail } from '../api/packages';
import { createLogger } from '../utils/logger';

const log = createLogger('installed');

export function useInstalled() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiListArcwayInstalled();
      log.info(`Got ${data.length} installed packages`);

      // Enrich packages without icons by fetching from Flathub
      const enriched = await Promise.all(
        data.map(async (pkg) => {
          if (pkg.icon_url) return pkg;
          // Try to get icon from Flathub for flatpak packages
          if (pkg.source === 'flatpak') {
            const appId = pkg.id.replace('flatpak/', '');
            try {
              const detail = await getFlathubDetail(appId) as Record<string, unknown>;
              const icon = detail.icon as string | undefined;
              const desc = detail.summary as string | undefined;
              return {
                ...pkg,
                icon_url: icon || pkg.icon_url,
                description: desc || pkg.description,
              };
            } catch {
              return pkg;
            }
          }
          return pkg;
        })
      );

      setPackages(enriched);
    } catch (err) {
      log.error(`Failed to fetch installed: ${err}`);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { packages, loading, refresh };
}
