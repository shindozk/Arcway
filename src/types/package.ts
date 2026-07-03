export enum PackageSource {
  Flatpak = 'flatpak',
  Yay = 'yay',
  Paru = 'paru',
}

export interface Package {
  id: string;
  name: string;
  description: string;
  source: PackageSource;
  version: string;
  installed_version?: string;
  size?: number;
  icon_url?: string;
  screenshot_url?: string;
  homepage?: string;
  license?: string;
  tags: string[];
}

export interface InstalledPackage {
  package_id: string;
  name: string;
  source: PackageSource;
  version: string;
  size?: number;
}

export interface UpdateInfo {
  package_id: string;
  name: string;
  source: PackageSource;
  current_version: string;
  new_version: string;
}

export interface ProgressEvent {
  package_id: string;
  message: string;
  percentage?: number;
}

export interface Settings {
  theme_seed_color: string;
  dark_mode: boolean;
  enabled_sources: PackageSource[];
  cache_duration_minutes: number;
}

export interface Screenshot {
  src: string;
  width: string;
  height: string;
  thumb?: string;
}

export interface PackageDetailInfo {
  id: string;
  name: string;
  summary: string;
  description: string;
  icon: string;
  developer_name?: string;
  homepage?: string;
  license?: string;
  categories: string[];
  keywords: string[];
  screenshots: Screenshot[];
  version?: string;
  project_license?: string;
  content_rating?: string;
}
