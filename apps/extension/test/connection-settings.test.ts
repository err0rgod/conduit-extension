import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NATIVE_HOST_NAME, parseNativeConnectionSettings } from '../src/connection-settings';

describe('native connection settings', () => {
  it('accepts only a versioned, bounded response with a strong token', () => {
    const valid = {
      type: 'conduit.connection-settings',
      protocolVersion: 1,
      daemonPort: 9222,
      daemonToken: 'a'.repeat(64),
    };
    expect(parseNativeConnectionSettings(valid)).toEqual({
      daemonPort: 9222,
      daemonToken: 'a'.repeat(64),
    });
    expect(parseNativeConnectionSettings({ ...valid, protocolVersion: 2 })).toBeNull();
    expect(parseNativeConnectionSettings({ ...valid, daemonPort: 0 })).toBeNull();
    expect(parseNativeConnectionSettings({ ...valid, daemonToken: 'not-a-token' })).toBeNull();
  });

  it('pins a deterministic unpacked extension identity for native host authorization', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '..', 'manifest.json'), 'utf8'),
    ) as { key: string; permissions: string[] };
    const digest = createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex');
    const extensionId = [...digest.slice(0, 32)]
      .map((nibble) => String.fromCharCode(97 + Number.parseInt(nibble, 16)))
      .join('');

    expect(extensionId).toBe('jkdlmcpkgkooilffjegfjmkanoelbmbl');
    expect(manifest.permissions).toContain('nativeMessaging');
    expect(NATIVE_HOST_NAME).toBe('io.github.err0rgod.conduit');
  });
});
