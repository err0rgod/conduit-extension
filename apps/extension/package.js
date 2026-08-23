const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { zipSync } = require('fflate');

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

fs.copyFileSync(path.join(__dirname, 'manifest.json'), path.join(distDir, 'manifest.json'));

if (fs.existsSync(path.join(__dirname, 'popup.html'))) {
  fs.copyFileSync(path.join(__dirname, 'popup.html'), path.join(distDir, 'popup.html'));
}

const files = {};
for (const entry of walk(distDir)) {
  const relative = path.relative(distDir, entry).replaceAll(path.sep, '/');
  files[relative] = fs.readFileSync(entry);
}

if (packageJson.version !== manifest.version) {
  throw new Error(`Package ${packageJson.version} does not match manifest ${manifest.version}.`);
}

const archiveDirectory = path.join(__dirname, '..', '..', 'artifacts');
fs.mkdirSync(archiveDirectory, { recursive: true });
const archiveName = `conduit-extension-v${manifest.version}.zip`;
const archivePath = path.join(archiveDirectory, archiveName);
const archive = zipSync(files, { level: 6, mtime: new Date('2000-01-01T00:00:00.000Z') });
fs.writeFileSync(archivePath, archive);
const checksum = crypto.createHash('sha256').update(archive).digest('hex');
fs.writeFileSync(`${archivePath}.sha256`, `${checksum}  ${archiveName}\n`);

console.log(`Extension packaged in ${archivePath}`);
console.log(`SHA-256 ${checksum}`);

function walk(directory) {
  const entries = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) entries.push(...walk(fullPath));
    else entries.push(fullPath);
  }
  return entries.sort();
}
