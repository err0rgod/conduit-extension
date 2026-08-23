import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';

describe('extension release package', () => {
  it('creates a deterministic complete ZIP with a matching checksum', () => {
    const extensionRoot = path.resolve(import.meta.dirname, '..');
    const repositoryRoot = path.resolve(extensionRoot, '..', '..');
    const packageJson = JSON.parse(
      readFileSync(path.join(extensionRoot, 'package.json'), 'utf8'),
    ) as { version: string };
    const archivePath = path.join(
      repositoryRoot,
      'artifacts',
      `conduit-extension-v${packageJson.version}.zip`,
    );

    execFileSync(process.execPath, ['build.js'], { cwd: extensionRoot });
    execFileSync(process.execPath, ['package.js'], { cwd: extensionRoot });
    const firstArchive = readFileSync(archivePath);
    execFileSync(process.execPath, ['package.js'], { cwd: extensionRoot });
    const secondArchive = readFileSync(archivePath);
    expect(secondArchive).toEqual(firstArchive);

    const files = unzipSync(secondArchive);
    expect(Object.keys(files).sort()).toEqual([
      'background.js',
      'icons/icon-128.png',
      'icons/icon-16.png',
      'icons/icon-32.png',
      'icons/icon-48.png',
      'manifest.json',
      'popup.html',
      'popup.js',
    ]);
    const manifest = JSON.parse(strFromU8(files['manifest.json'])) as { version: string };
    expect(manifest.version).toBe(packageJson.version);

    const expectedHash = createHash('sha256').update(secondArchive).digest('hex');
    const checksum = readFileSync(`${archivePath}.sha256`, 'utf8').trim().split(/\s+/u)[0];
    expect(checksum).toBe(expectedHash);
  });
});
