# Conduit Extension

The Chromium extension for [Conduit](https://github.com/err0rgod/conduit), an
open-source, local-first browser-control bridge for AI agents.

This repository owns browser execution, the extension UI, and the extension side
of the versioned Conduit protocol. The backend daemon, CLI, and MCP adapter live in
the main Conduit repository.

## Status

Pre-1.0 migration repository. The extension builds and its browser engine and
protocol tests run independently. It has a deterministic unpacked ID and discovers
local connection settings through Chromium Native Messaging.

## Development

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Load `apps/extension/dist` from `chrome://extensions` or `edge://extensions` with
Developer mode enabled. Run `conduit setup` once to register the per-user native
host. The extension then connects automatically without a pairing code.

Conduit does not receive blanket website access at installation. Open the popup on
a site and choose **Allow this site** before an agent can inspect or interact with
that origin. The Chromium grant can be revoked from the same popup and remains a
separate gate from daemon domain/permission policy.

The popup also shows the most recent browser operation and its tab target without
persisting page or form content. **Emergency disconnect** closes the daemon socket,
stops automatic reconnection, and displays a red `STOP` badge until the user
explicitly resumes agent control.

Pending one-time confirmations are reviewed in the popup over the authenticated
daemon socket. Summaries, risk, domain, operation, and expiry are shown as
untrusted text; only the popup can send an approve-once or deny decision.

## Security

The extension connects only to the local Conduit daemon by default. Host access is
optional and limited to explicitly approved HTTP/HTTPS origins. Page content is
untrusted data and cannot grant permissions. Do not install extension artifacts
from untrusted sources.

## License

MIT
