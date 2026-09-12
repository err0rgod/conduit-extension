# Conduit Extension

The Chromium extension for [Conduit](https://github.com/err0rgod/conduit), an
open-source, local-first browser-control bridge for AI agents.

This repository owns browser execution, the extension UI, and the extension side
of the versioned Conduit protocol. The backend daemon, CLI, and MCP adapter live in
the main Conduit repository.

## Status

Pre-1.0 migration repository. The extension builds and its browser engine and
protocol tests run independently. Chrome users can install the live [Chrome Web
Store listing](https://chromewebstore.google.com/detail/conduit-extension/gjhipjgiapijcdnflldnoenafeegmfpc).
For development or recovery, download the verified unpacked archive from the
[v1.1.4 GitHub release](https://github.com/err0rgod/conduit-extension/releases/tag/v1.1.4),
extract it, open `chrome://extensions`, enable Developer mode, choose Load unpacked,
and select the folder containing `manifest.json`. This archive has deterministic
Chromium ID `jkdlmcpkgkooilffjegfjmkanoelbmbl`, which Conduit trusts by default.
Browser-store builds omit the manifest `key` and use identities assigned by each
store. See [STORE_SUBMISSION.md](STORE_SUBMISSION.md).

Firefox users can install the approved add-on directly from
[Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/conduit/).

## Development

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm extension:release
pnpm --filter @conduit/extension release:check
```

Load `apps/extension/dist` from `chrome://extensions`, `edge://extensions`, or
`brave://extensions` with Developer mode enabled. Run `conduit setup` once to register
the per-user native host. The unpacked extension then connects automatically without a
pairing code.

Conduit does not receive blanket website access at installation. Open the popup on
a site and choose **Allow this site** before an agent can inspect or interact with
that origin. Per-site access is the recommended default, and the Chromium grant can
be revoked from the same popup.

For an explicitly broad local workflow, **Allow all sites** requests exactly
`http://*/*` and `https://*/*` inside the popup click gesture and Chromium displays
its native permission prompt. Chromium owns the resulting permission state; Conduit
does not persist a separate flag, and the background service worker never requests
those origins. **Revoke all sites** removes the two broad patterns. Both controls
remain separate from daemon capability and domain policy, so no browser host grant
bypasses those enforcement points.

The popup also shows the most recent browser operation and its tab target without
persisting page or form content. **Emergency disconnect** closes the daemon socket,
stops automatic reconnection, and displays a red `STOP` badge until the user
explicitly resumes agent control.

Pending one-time confirmations are reviewed in the popup over the authenticated
daemon socket. Summaries, risk, domain, operation, and expiry are shown as
untrusted text; only the popup can send an approve-once or deny decision.

The popup also requests at most 20 recent structured audit events. It shows only
event type, outcome, operation/domain scope, and time; sensitive values are
redacted by the daemon and arbitrary event details remain hidden from this view.

Chromium declares the `debugger` capability at installation time because Chrome does
not support requesting that permission later through `chrome.permissions.request`.
The popup reports its installation-managed state. Recent download visibility
(`downloads`) remains optional and can be granted or revoked there. The popup also
lets the user explicitly grant or revoke all HTTP/HTTPS sites and inspect the current
authenticated daemon session start and last-activity time. Firefox omits the
Chromium-only `debugger` capability, so hover, physical key input, and approved file
uploads report that advanced interaction is unsupported there.

`pnpm extension:release` creates three checksummed artifacts under `artifacts/`:

- `conduit-extension-chromium-store-v<version>.zip` for Chrome Web Store, Microsoft
  Edge Add-ons, and Brave.
- `conduit-extension-firefox-v<version>.zip` for Firefox Add-ons.
- `conduit-extension-unpacked-v<version>.zip` for deterministic local development.

Only the unpacked artifact contains the development `key`. Tagged releases publish
these exact files after the complete validation suite passes.

## Security

The extension connects only to the local Conduit daemon by default. Host access is
optional: users can approve one HTTP/HTTPS origin at a time or deliberately request
the two broad HTTP/HTTPS patterns from the popup. Page content is untrusted data and
cannot grant permissions. Chromium host access never replaces daemon policy. Do not
install extension artifacts from untrusted sources.

## License

MIT
