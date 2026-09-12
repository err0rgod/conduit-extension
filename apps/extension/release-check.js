const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { unzipSync } = require('fflate');

const root = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const dist = path.join(root, 'dist');
const artifactDirectory = path.join(root, '..', '..', 'artifacts');
const requiredFiles = [
  'manifest.json',
  'background.js',
  'popup.js',
  'popup.html',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
];
const expectedExtensionId = 'jkdlmcpkgkooilffjegfjmkanoelbmbl';

if (packageJson.version !== manifest.version) {
  fail(`package.json ${packageJson.version} does not match manifest ${manifest.version}`);
}
if (process.env.RELEASE_TAG && process.env.RELEASE_TAG !== `v${manifest.version}`) {
  fail(`tag ${process.env.RELEASE_TAG} does not match manifest v${manifest.version}`);
}
const digest = crypto
  .createHash('sha256')
  .update(Buffer.from(manifest.key, 'base64'))
  .digest('hex');
const extensionId = [...digest.slice(0, 32)]
  .map((nibble) => String.fromCharCode(97 + Number.parseInt(nibble, 16)))
  .join('');
if (extensionId !== expectedExtensionId) {
  fail(`manifest key produces ${extensionId}, expected ${expectedExtensionId}`);
}
if (manifest.host_permissions !== undefined) fail('production manifest has required host access');
if (!manifest.permissions.includes('debugger')) {
  fail('Chromium manifest must declare the debugger permission');
}
if (JSON.stringify(manifest.optional_permissions) !== JSON.stringify(['downloads'])) {
  fail('optional Chromium permissions do not match the reviewed release set');
}
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(dist, file))) fail(`dist is missing ${file}`);
}
const hashes = {};
for (const target of ['unpacked', 'chromium-store', 'firefox']) {
  const artifact = path.join(
    artifactDirectory,
    `conduit-extension-${target}-v${manifest.version}.zip`,
  );
  if (!fs.existsSync(artifact)) fail(`release archive is missing: ${artifact}`);
  const archive = fs.readFileSync(artifact);
  const hash = crypto.createHash('sha256').update(archive).digest('hex');
  const checksum = fs.readFileSync(`${artifact}.sha256`, 'utf8').trim().split(/\s+/u)[0];
  if (hash !== checksum) fail(`checksum mismatch for ${artifact}`);
  const archived = unzipSync(archive);
  const archivedFiles = Object.keys(archived).sort();
  if (JSON.stringify(archivedFiles) !== JSON.stringify([...requiredFiles].sort())) {
    fail(`${target} archive contents are unexpected: ${archivedFiles.join(', ')}`);
  }
  hashes[target] = hash;
  const archivedManifest = JSON.parse(Buffer.from(archived['manifest.json']).toString('utf8'));
  if (archivedManifest.host_permissions !== undefined) {
    fail(`${target} archive has required host access`);
  }
  if (
    JSON.stringify(archivedManifest.optional_host_permissions) !==
    JSON.stringify(['http://*/*', 'https://*/*'])
  ) {
    fail(`${target} archive optional host permissions are incorrect`);
  }
  if (target === 'unpacked' && !archivedManifest.key) fail('unpacked archive lost its stable key');
  if (target !== 'unpacked' && archivedManifest.key !== undefined) {
    fail(`${target} archive contains the store-forbidden manifest key`);
  }
  if (target === 'firefox') {
    if (archivedManifest.browser_specific_settings?.gecko?.id !== 'conduit@err0rgod.github.io') {
      fail('Firefox archive has an unexpected Gecko ID');
    }
    if (
      JSON.stringify(
        archivedManifest.browser_specific_settings?.gecko?.data_collection_permissions,
      ) !== JSON.stringify({ required: ['websiteActivity', 'websiteContent'] })
    ) {
      fail('Firefox archive has an inaccurate data collection disclosure');
    }
    if (
      JSON.stringify(archivedManifest.background) !== JSON.stringify({ scripts: ['background.js'] })
    ) {
      fail('Firefox archive does not use a Firefox background script');
    }
    if (archivedManifest.optional_permissions?.includes('debugger')) {
      fail('Firefox archive includes the unsupported debugger permission');
    }
    if (archivedManifest.permissions?.includes('debugger')) {
      fail('Firefox archive includes the unsupported debugger permission');
    }
  }
}

console.log(`Release check passed for Conduit Extension ${manifest.version}.`);
for (const [target, hash] of Object.entries(hashes)) console.log(`${target} SHA-256: ${hash}`);

function fail(message) {
  console.error(`Release check failed: ${message}`);
  process.exit(1);
}
