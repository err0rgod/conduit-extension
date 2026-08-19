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
      expect.arrayContaining(['activeTab', 'nativeMessaging', 'scripting', 'storage', 'tabs']),
    );
  });
});
