import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';

describe('extension release package', () => {
  it('creates deterministic unpacked, Chromium store, and Firefox ZIPs', () => {
    const extensionRoot = path.resolve(import.meta.dirname, '..');
    const repositoryRoot = path.resolve(extensionRoot, '..', '..');
    const packageJson = JSON.parse(
      readFileSync(path.join(extensionRoot, 'package.json'), 'utf8'),
    ) as { version: string };
    execFileSync(process.execPath, ['build.js'], { cwd: extensionRoot });
    execFileSync(process.execPath, ['package.js'], { cwd: extensionRoot });
    const targets = ['unpacked', 'chromium-store', 'firefox'] as const;
    const firstArchives = new Map(
      targets.map((target) => [target, readFileSync(archivePath(target))]),
    );
    execFileSync(process.execPath, ['package.js'], { cwd: extensionRoot });

    for (const target of targets) {
      const path = archivePath(target);
      const archive = readFileSync(path);
      expect(archive).toEqual(firstArchives.get(target));
      expect(Object.keys(unzipSync(archive)).sort()).toEqual(expectedFiles);
      const expectedHash = createHash('sha256').update(archive).digest('hex');
      const checksum = readFileSync(`${path}.sha256`, 'utf8').trim().split(/\s+/u)[0];
      expect(checksum).toBe(expectedHash);
    }

    const unpackedManifest = archivedManifest('unpacked');
    expect(unpackedManifest.key).toBeTypeOf('string');

    const chromiumManifest = archivedManifest('chromium-store');
    expect(chromiumManifest.key).toBeUndefined();
    expect(chromiumManifest.background).toEqual({
      service_worker: 'background.js',
      type: 'module',
    });

    const firefoxManifest = archivedManifest('firefox');
    expect(firefoxManifest.key).toBeUndefined();
    expect(firefoxManifest.minimum_chrome_version).toBeUndefined();
    expect(firefoxManifest.background).toEqual({ scripts: ['background.js'] });
    expect(firefoxManifest.permissions).not.toContain('tabGroups');
    expect(firefoxManifest.optional_permissions).toEqual(['downloads']);
    expect(firefoxManifest.browser_specific_settings).toEqual({
      gecko: {
        id: 'conduit@err0rgod.github.io',
        strict_min_version: '142.0',
        data_collection_permissions: {
          required: ['websiteActivity', 'websiteContent'],
        },
      },
    });

    function archivePath(target: (typeof targets)[number]): string {
      return path.join(
        repositoryRoot,
        'artifacts',
        `conduit-extension-${target}-v${packageJson.version}.zip`,
      );
    }

    function archivedManifest(target: (typeof targets)[number]): Record<string, unknown> {
      const files = unzipSync(readFileSync(archivePath(target)));
      return JSON.parse(strFromU8(files['manifest.json'])) as Record<string, unknown>;
    }
  });
});

const expectedFiles = [
  'background.js',
  'icons/icon-128.png',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'manifest.json',
  'popup.html',
  'popup.js',
];
