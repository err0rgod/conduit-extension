const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { zipSync } = require('fflate');

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));

if (packageJson.version !== manifest.version) {
  throw new Error(`Package ${packageJson.version} does not match manifest ${manifest.version}.`);
}

const archiveDirectory = path.join(__dirname, '..', '..', 'artifacts');
fs.mkdirSync(archiveDirectory, { recursive: true });
const targets = [
  { name: 'unpacked', directory: path.join(__dirname, 'dist') },
  { name: 'chromium-store', directory: path.join(__dirname, 'dist-chromium-store') },
  { name: 'firefox', directory: path.join(__dirname, 'dist-firefox') },
];

for (const target of targets) packageTarget(target);

function packageTarget(target) {
  if (!fs.existsSync(target.directory)) {
    throw new Error(`Extension build is missing: ${target.directory}`);
  }
  const files = {};
  for (const entry of walk(target.directory)) {
    const relative = path.relative(target.directory, entry).replaceAll(path.sep, '/');
    files[relative] = fs.readFileSync(entry);
  }
  const archiveName = `conduit-extension-${target.name}-v${manifest.version}.zip`;
  const archivePath = path.join(archiveDirectory, archiveName);
  const archive = zipSync(files, { level: 6, mtime: new Date('2000-01-01T00:00:00.000Z') });
  fs.writeFileSync(archivePath, archive);
  const checksum = crypto.createHash('sha256').update(archive).digest('hex');
  fs.writeFileSync(`${archivePath}.sha256`, `${checksum}  ${archiveName}\n`);

  console.log(`${target.name} extension packaged in ${archivePath}`);
  console.log(`SHA-256 ${checksum}`);
}

function walk(directory) {
  const entries = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) entries.push(...walk(fullPath));
    else entries.push(fullPath);
  }
  return entries.sort();
}
