import { invoke } from '@tauri-apps/api/core';
import { PackageSource, type Package } from '../types/package';
import { createLogger } from '../utils/logger';

const log = createLogger('api');

export async function searchPackages(
  query: string,
  sources?: PackageSource[]
): Promise<Package[]> {
  log.info(`search("${query}", sources=${sources?.join(',') ?? 'all'})`);
  const result = await invoke<Package[]>('search_packages', {
    query,
    sources: sources?.map((s) => s),
  });
  log.info(`search => ${result.length} results`);
  return result;
}

export async function getFeaturedPackages(limit: number = 20): Promise<Package[]> {
  log.info(`getFeatured(limit=${limit})`);
  const result = await invoke<Package[]>('get_featured_packages', { limit });
  log.info(`getFeatured => ${result.length} apps`);
  return result;
}

export async function getScreenshots(
  appIds: string[]
): Promise<Array<[string, string | null]>> {
  log.info(`getScreenshots(${appIds.length} apps)`);
  const result = await invoke<Array<[string, string | null]>>('get_screenshots', { appIds });
  log.info(`getScreenshots => ${result.filter(([, s]) => s !== null).length} with screenshots`);
  return result;
}

export async function getPackageDetail(
  id: string,
  source: PackageSource
): Promise<Package> {
  log.info(`getDetail("${id}", ${source})`);
  const result = await invoke<Package>('get_package_detail', { id, source });
  log.info(`getDetail => "${result?.name ?? 'null'}"`);
  return result;
}

export async function listInstalled(): Promise<Package[]> {
  log.info('listInstalled()');
  const result = await invoke<Package[]>('list_installed');
  log.info(`listInstalled => ${result.length} packages`);
  return result;
}

export async function listArcwayInstalled(): Promise<Package[]> {
  log.info('listArcwayInstalled()');
  const result = await invoke<Package[]>('list_arcway_installed');
  log.info(`listArcwayInstalled => ${result.length} packages`);
  return result;
}

export async function checkArcwayUpdates(): Promise<
  Array<{
    package_id: string;
    name: string;
    source: PackageSource;
    current_version: string;
    new_version: string;
  }>
> {
  log.info('checkArcwayUpdates()');
  const result = await invoke<Array<{ package_id: string; name: string; source: PackageSource; current_version: string; new_version: string }>>('check_arcway_updates');
  log.info(`checkArcwayUpdates => ${result.length} updates`);
  return result;
}

export async function checkUpdates(): Promise<
  Array<{
    package_id: string;
    name: string;
    source: PackageSource;
    current_version: string;
    new_version: string;
  }>
> {
  log.info('checkUpdates()');
  const result = await invoke<Array<{ package_id: string; name: string; source: PackageSource; current_version: string; new_version: string }>>('check_updates');
  log.info(`checkUpdates => ${result.length} updates`);
  return result;
}

export async function getFlathubDetail(appId: string): Promise<Record<string, unknown>> {
  log.info(`getFlathubDetail("${appId}")`);
  const result = await invoke<Record<string, unknown>>('get_flathub_detail', { appId });
  log.info(`getFlathubDetail => OK`);
  return result;
}

export async function getTrendingPackages(limit: number = 30): Promise<Package[]> {
  log.info(`getTrending(limit=${limit})`);
  const result = await invoke<Package[]>('get_trending_packages', { limit });
  log.info(`getTrending => ${result.length} apps`);
  return result;
}

export async function getRecentlyUpdatedPackages(limit: number = 30): Promise<Package[]> {
  log.info(`getRecentlyUpdated(limit=${limit})`);
  const result = await invoke<Package[]>('get_recently_updated_packages', { limit });
  log.info(`getRecentlyUpdated => ${result.length} apps`);
  return result;
}

export async function getRecentlyAddedPackages(limit: number = 30): Promise<Package[]> {
  log.info(`getRecentlyAdded(limit=${limit})`);
  const result = await invoke<Package[]>('get_recently_added_packages', { limit });
  log.info(`getRecentlyAdded => ${result.length} apps`);
  return result;
}

export async function getCategoryPackages(category: string, limit: number = 30): Promise<Package[]> {
  log.info(`getCategory("${category}", limit=${limit})`);
  const result = await invoke<Package[]>('get_category_packages', { category, limit });
  log.info(`getCategory => ${result.length} apps`);
  return result;
}
