# Browser store submission

The release command creates separate store-ready archives under `artifacts/`:

- `conduit-extension-chromium-store-v<version>.zip` is shared by Chrome, Edge, and
  Brave. It intentionally omits the manifest `key` required only by the unpacked build.
- `conduit-extension-firefox-v<version>.zip` uses a Firefox background script, a fixed
  Gecko ID, Firefox data-collection disclosure metadata, and no `debugger` permission.

## Identity requirement

The unpacked build remains pinned to Chromium ID `jkdlmcpkgkooilffjegfjmkanoelbmbl`.
Chrome Web Store and Microsoft Edge Add-ons assign their own IDs because store packages
must not contain `manifest.key`. Record each assigned ID and run
`conduit extension trust <id>` before testing that store build. Firefox uses
`conduit@err0rgod.github.io`, which the backend trusts by default. Never broaden Native
Messaging to accept arbitrary extension origins. Store ownership, signing keys, and account
recovery must be controlled by the project owner.

The published Chrome Web Store listing is:
https://chromewebstore.google.com/detail/conduit-extension/gjhipjgiapijcdnflldnoenafeegmfpc

## Permission justifications

- `nativeMessaging`: discovers the authenticated loopback daemon after explicit `conduit setup`.
- `tabs` and, on Chromium, `tabGroups`: lists, focuses, navigates, groups, and closes
  user-requested tabs.
- `scripting`: performs approved actions only on origins separately granted by the user.
- `storage`: preserves connection, emergency-pause, and privacy-safe status state.
- `activeTab`: enables user-initiated active-tab operations such as screenshots.
- Optional HTTP/HTTPS hosts: requested per site by default, or as the exact `http://*/*` and
  `https://*/*` pair after the user explicitly clicks **Allow all sites** in the popup. No host
  is required at install time, the background worker never makes the broad request, and the
  permission can be revoked from the popup.
- Optional Chromium `debugger`: requested explicitly for hover, physical key events, and
  approved uploads. Firefox omits it and reports those operations as unsupported.
- Optional `downloads`: requested explicitly to observe bounded recent download status.
- Firefox data disclosure: `websiteActivity` and `websiteContent` are sent to the user's
  authenticated local daemon as described in [PRIVACY.md](PRIVACY.md); no vendor analytics or
  cloud collection is present.

## Listing material

- Product name: `Conduit Extension`
- Short description: `Secure local-first browser control for AI agents.`
- Category: Developer Tools or Productivity
- Privacy policy: `https://conduit.zerodaily.in/#/privacy`.
- Support URL: `https://github.com/err0rgod/conduit-extension/issues`
- Homepage: `https://github.com/err0rgod/conduit`
- Use `apps/extension/assets/icons/icon-128.png` as the product icon.
- Capture at least one current popup screenshot without personal domains, audit data, or tokens.

## Release procedure

1. Merge a green release PR into `main`.
2. Run `pnpm extension:release` and `pnpm --filter @conduit/extension release:check`.
3. Verify each ZIP checksum and test it in a fresh browser profile with the compatible backend.
4. Tag the exact commit as `v<manifest version>`; the release workflow publishes the ZIP and
   checksum to this repository.
5. Upload the unchanged Chromium ZIP to Chrome Web Store and Edge Add-ons. Use the same
   Chromium ZIP for Brave distribution. Upload the unchanged Firefox ZIP to Firefox Add-ons.
6. Add the assigned Chromium store IDs with `conduit extension trust <id>` and publish those
   IDs in the next backend default configuration once stable.
7. Verify Native Messaging, optional permission prompts, emergency pause, and update behavior.
8. Promote each item publicly only after its store ID and update path are confirmed.
