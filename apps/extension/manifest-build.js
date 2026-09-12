const FIREFOX_EXTENSION_ID = 'conduit@err0rgod.github.io';

function manifestForTarget(sourceManifest, target) {
  const manifest = structuredClone(sourceManifest);

  if (target === 'unpacked') return manifest;

  delete manifest.key;

  if (target === 'chromium-store') return manifest;

  if (target !== 'firefox') {
    throw new Error(`Unknown extension build target: ${target}`);
  }

  delete manifest.minimum_chrome_version;
  manifest.permissions = manifest.permissions.filter(
    (permission) => permission !== 'tabGroups' && permission !== 'debugger',
  );
  manifest.optional_permissions = manifest.optional_permissions.filter(
    (permission) => permission !== 'debugger',
  );
  manifest.background = { scripts: ['background.js'] };
  manifest.browser_specific_settings = {
    gecko: {
      id: FIREFOX_EXTENSION_ID,
      strict_min_version: '142.0',
      data_collection_permissions: {
        required: ['websiteActivity', 'websiteContent'],
      },
    },
  };
  return manifest;
}

module.exports = { FIREFOX_EXTENSION_ID, manifestForTarget };
