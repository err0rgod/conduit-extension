import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BrowserActionError,
  ExtensionBrowserEngine,
  hostPermissionPattern,
  normalizeDataUrl,
} from '../src/index';

describe('browser-core screenshot helpers', () => {
  it('normalizes PNG data URLs into protocol screenshot results', () => {
    const result = normalizeDataUrl('data:image/png;base64,aGVsbG8=');

    expect(result).toEqual({
      mimeType: 'image/png',
      data: 'aGVsbG8=',
    });
  });

  it('rejects unsupported screenshot data URL formats', () => {
    expect(() => normalizeDataUrl('data:text/plain;base64,aGVsbG8=')).toThrow(BrowserActionError);
  });
});

describe('host permission patterns', () => {
  it('reduces an HTTP page to the narrow Chromium origin pattern', () => {
    expect(hostPermissionPattern('https://docs.example.com:8443/guide?q=1')).toBe(
      'https://docs.example.com/*',
    );
    expect(hostPermissionPattern('http://127.0.0.1:4173/fixture')).toBe('http://127.0.0.1/*');
  });

  it('rejects browser-internal, file, and malformed URLs', () => {
    expect(hostPermissionPattern('chrome://settings')).toBeUndefined();
    expect(hostPermissionPattern('file:///tmp/private.txt')).toBeUndefined();
    expect(hostPermissionPattern('not a URL')).toBeUndefined();
  });
});

describe('browser host permission enforcement', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('blocks page script execution before Chromium grants the origin', async () => {
    const executeScript = vi.fn();
    vi.stubGlobal('chrome', {
      tabs: { get: vi.fn().mockResolvedValue({ id: 7, url: 'https://example.com/private' }) },
      permissions: { contains: vi.fn().mockResolvedValue(false) },
      scripting: { executeScript },
    });

    await expect(new ExtensionBrowserEngine().getVisibleText({ tabId: 7 })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    expect(executeScript).not.toHaveBeenCalled();
  });

  it('executes only after Chromium confirms the exact origin grant', async () => {
    const executeScript = vi.fn().mockResolvedValue([{ result: 'visible page text' }]);
    const contains = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('chrome', {
      tabs: { get: vi.fn().mockResolvedValue({ id: 7, url: 'https://example.com/private' }) },
      permissions: { contains },
      scripting: { executeScript },
    });

    await expect(new ExtensionBrowserEngine().getVisibleText({ tabId: 7 })).resolves.toBe(
      'visible page text',
    );
    expect(contains).toHaveBeenCalledWith({ origins: ['https://example.com/*'] });
    expect(executeScript).toHaveBeenCalledOnce();
  });
});
