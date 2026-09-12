import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('extension manifest permissions', () => {
  it('ships without blanket host access and declares runtime-only HTTP origins', () => {
    const manifest = JSON.parse(
      readFileSync(path.resolve(__dirname, '..', 'manifest.json'), 'utf8'),
    ) as Record<string, unknown>;

    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.optional_host_permissions).toEqual(['http://*/*', 'https://*/*']);
    expect(manifest.permissions).toEqual(
      expect.arrayContaining([
        'activeTab',
        'debugger',
        'nativeMessaging',
        'scripting',
        'storage',
        'tabs',
      ]),
    );
    expect(manifest.optional_permissions).toEqual(['downloads']);
    expect(manifest.icons).toEqual({
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    });
    const packageJson = JSON.parse(
      readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'),
    ) as { version: string };
    const repositoryPackage = JSON.parse(
      readFileSync(path.resolve(__dirname, '..', '..', '..', 'package.json'), 'utf8'),
    ) as { version: string };
    expect(manifest.version).toBe(packageJson.version);
    expect(manifest.version).toBe(repositoryPackage.version);
  });
});
