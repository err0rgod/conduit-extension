import { ALL_HTTPS_HOST_PATTERNS } from '@conduit/browser-core';

export async function hasAllSiteAccess(permissions: typeof chrome.permissions): Promise<boolean> {
  return permissions.contains({ origins: [...ALL_HTTPS_HOST_PATTERNS] });
}

export async function requestAllSiteAccess(
  permissions: typeof chrome.permissions,
): Promise<boolean> {
  return permissions.request({ origins: [...ALL_HTTPS_HOST_PATTERNS] });
}

export async function revokeAllSiteAccess(
  permissions: typeof chrome.permissions,
): Promise<boolean> {
  return permissions.remove({ origins: [...ALL_HTTPS_HOST_PATTERNS] });
}
