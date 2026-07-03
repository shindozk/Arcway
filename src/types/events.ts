export interface InstallProgressPayload {
  package_id: string;
  message: string;
  percentage?: number;
}

export interface PackageInstalledPayload {
  package_id: string;
  source: string;
}

export interface PackageUninstalledPayload {
  package_id: string;
  source: string;
}

export interface UpdatesAvailablePayload {
  count: number;
}

export interface AppEvent {
  type: string;
  payload: unknown;
}

export type EventName =
  | 'install-progress'
  | 'package-installed'
  | 'package-uninstalled'
  | 'updates-available'
  | 'cache-cleared';

export type EventPayloadMap = {
  'install-progress': InstallProgressPayload;
  'package-installed': PackageInstalledPayload;
  'package-uninstalled': PackageUninstalledPayload;
  'updates-available': UpdatesAvailablePayload;
  'cache-cleared': Record<string, never>;
};
