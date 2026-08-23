const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { manifestForTarget } = require('./manifest-build');

const root = __dirname;
const distDir = path.join(root, 'dist');
const chromiumStoreDistDir = path.join(root, 'dist-chromium-store');
const firefoxDistDir = path.join(root, 'dist-firefox');
const sourceManifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

async function build() {
  for (const directory of [distDir, chromiumStoreDistDir, firefoxDistDir]) {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.mkdirSync(directory, { recursive: true });
  }

  await buildScripts(distDir, ['chrome120', 'edge120'], 'esm', false);
  copyStaticFiles(distDir);
  writeManifest(distDir, manifestForTarget(sourceManifest, 'unpacked'));

  fs.cpSync(distDir, chromiumStoreDistDir, { recursive: true });
  writeManifest(chromiumStoreDistDir, manifestForTarget(sourceManifest, 'chromium-store'));

  await buildScripts(firefoxDistDir, ['firefox142'], 'iife', true);
  copyStaticFiles(firefoxDistDir);
  writeManifest(firefoxDistDir, manifestForTarget(sourceManifest, 'firefox'));
}

async function buildScripts(outdir, target, format, firefox) {
  await esbuild.build({
    entryPoints: {
      background: path.join(root, 'src', 'background.ts'),
      popup: path.join(root, 'src', 'popup.ts'),
    },
    outdir,
    bundle: true,
    format,
    platform: 'browser',
    target,
    define: { __CONDUIT_FIREFOX__: String(firefox) },
    sourcemap: false,
    logLevel: 'info',
  });
}

function copyStaticFiles(directory) {
  fs.copyFileSync(path.join(root, 'popup.html'), path.join(directory, 'popup.html'));
  fs.cpSync(path.join(root, 'assets', 'icons'), path.join(directory, 'icons'), {
    recursive: true,
  });
}

function writeManifest(directory, manifest) {
  fs.writeFileSync(path.join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
