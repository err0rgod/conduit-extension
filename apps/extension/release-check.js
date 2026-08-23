const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { unzipSync } = require('fflate');

const root = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const dist = path.join(root, 'dist');
const artifact = path.join(
  root,
  '..',
  '..',
  'artifacts',
  `conduit-extension-v${manifest.version}.zip`,
);
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
if (JSON.stringify(manifest.optional_permissions) !== JSON.stringify(['debugger', 'downloads'])) {
  fail('optional Chromium permissions do not match the reviewed release set');
}
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(dist, file))) fail(`dist is missing ${file}`);
}
if (!fs.existsSync(artifact)) fail(`release archive is missing: ${artifact}`);

const hash = crypto.createHash('sha256').update(fs.readFileSync(artifact)).digest('hex');
const checksumPath = `${artifact}.sha256`;
const checksum = fs.readFileSync(checksumPath, 'utf8').trim().split(/\s+/u)[0];
if (hash !== checksum) fail(`checksum mismatch for ${artifact}`);
const archivedFiles = Object.keys(unzipSync(fs.readFileSync(artifact))).sort();
if (JSON.stringify(archivedFiles) !== JSON.stringify([...requiredFiles].sort())) {
  fail(`archive contents are unexpected: ${archivedFiles.join(', ')}`);
}

console.log(`Release check passed for Conduit Extension ${manifest.version}.`);
console.log(`Archive: ${artifact}`);
console.log(`SHA-256: ${hash}`);

function fail(message) {
  console.error(`Release check failed: ${message}`);
  process.exit(1);
}
