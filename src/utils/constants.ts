import { PackageSource } from '../types/package';

export const APP_NAME = 'Arcway';

export const CATEGORIES = [
  'Development',
  'System',
  'Graphics',
  'Audio & Video',
  'Office',
  'Internet',
  'Games',
  'Education',
  'Science',
  'Utilities',
  'Network',
  'Security',
] as const;

export const SOURCE_COLORS: Record<PackageSource, string> = {
  [PackageSource.Flatpak]: '#4a86cf',
  [PackageSource.Yay]: '#1793d1',
  [PackageSource.Paru]: '#ff6b35',
};

export const SOURCE_LABELS: Record<PackageSource, string> = {
  [PackageSource.Flatpak]: 'Flatpak',
  [PackageSource.Yay]: 'AUR',
  [PackageSource.Paru]: 'Paru',
};

export const DEBOUNCE_DELAY = 300;

export const DEFAULT_SEED_COLOR = '#6750A4';

export const APP_VERSION = '0.1.0';
