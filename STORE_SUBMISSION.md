# Browser store submission

The release ZIP in `artifacts/` is suitable for Chrome Web Store or Microsoft Edge Add-ons
submission after the checks below are satisfied.

## Identity requirement

Native Messaging is pinned to extension ID `jkdlmcpkgkooilffjegfjmkanoelbmbl`. The store item
must preserve that exact ID. Before publishing, upload a private test item and verify its ID;
do not publish or update `conduit setup` if the ID differs. Store ownership, signing keys, and
account recovery must be controlled by the project owner.

## Permission justifications

- `nativeMessaging`: discovers the authenticated loopback daemon after explicit `conduit setup`.
- `tabs` and `tabGroups`: lists, focuses, navigates, groups, and closes user-requested tabs.
- `scripting`: performs approved actions only on origins separately granted by the user.
- `storage`: preserves connection, emergency-pause, and privacy-safe status state.
- `activeTab`: enables user-initiated active-tab operations such as screenshots.
- Optional HTTP/HTTPS hosts: requested per site from the popup; no production host is required
  at install time.
- Optional `debugger`: requested explicitly for hover, physical key events, and approved uploads.
- Optional `downloads`: requested explicitly to observe bounded recent download status.

## Listing material

- Product name: `Conduit Extension`
- Short description: `Secure local-first browser control for AI agents.`
- Category: Developer Tools or Productivity
- Privacy policy: publish [PRIVACY.md](PRIVACY.md) at a stable HTTPS URL.
- Support URL: `https://github.com/err0rgod/conduit-extension/issues`
- Homepage: `https://github.com/err0rgod/conduit`
- Use `apps/extension/assets/icons/icon-128.png` as the product icon.
- Capture at least one current popup screenshot without personal domains, audit data, or tokens.

## Release procedure

1. Merge a green release PR into `main`.
2. Run `pnpm extension:release` and `pnpm --filter @conduit/extension release:check`.
3. Verify the ZIP checksum and test it in a fresh Chromium profile with the compatible backend.
4. Tag the exact commit as `v<manifest version>`; the release workflow publishes the ZIP and
   checksum to this repository.
5. Upload that unchanged ZIP to the private store item and complete the store privacy disclosures.
6. Verify Native Messaging, optional permission prompts, emergency pause, and update behavior.
7. Promote the item publicly only after the store ID and update path are confirmed.
