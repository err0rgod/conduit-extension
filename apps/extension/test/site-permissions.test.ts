import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  hasAllSiteAccess,
  requestAllSiteAccess,
  revokeAllSiteAccess,
} from '../src/site-permissions';

function permissions() {
  return {
    contains: vi.fn().mockResolvedValue(true),
    request: vi.fn().mockResolvedValue(true),
    remove: vi.fn().mockResolvedValue(true),
  } as unknown as typeof chrome.permissions;
}

describe('popup all-site permission handlers', () => {
  it('renders opt-in broad-access controls beside the current-site controls', () => {
    const popup = readFileSync(path.resolve(__dirname, '..', 'popup.html'), 'utf8');
    const currentSiteSection = popup.slice(
      popup.indexOf('aria-labelledby="site-label"'),
      popup.indexOf('aria-labelledby="capabilities-label"'),
    );
    expect(currentSiteSection).toContain('id="allow-site"');
    expect(currentSiteSection).toContain('id="revoke-site"');
    expect(currentSiteSection).toContain('id="allow-all-sites"');
    expect(currentSiteSection).toContain('id="revoke-all-sites" hidden');
  });

  it('checks the exact broad HTTP and HTTPS origins at render time', async () => {
    const api = permissions();
    await expect(hasAllSiteAccess(api)).resolves.toBe(true);
    expect(api.contains).toHaveBeenCalledWith({ origins: ['http://*/*', 'https://*/*'] });
  });

  it('requests broad origins through the caller-provided popup permission API', async () => {
    const api = permissions();
    await expect(requestAllSiteAccess(api)).resolves.toBe(true);
    expect(api.request).toHaveBeenCalledWith({ origins: ['http://*/*', 'https://*/*'] });
  });

  it('revokes only the declared broad origins', async () => {
    const api = permissions();
    await expect(revokeAllSiteAccess(api)).resolves.toBe(true);
    expect(api.remove).toHaveBeenCalledWith({ origins: ['http://*/*', 'https://*/*'] });
  });
});
