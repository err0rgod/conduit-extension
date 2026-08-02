# Conduit Extension

The Chromium extension for [Conduit](https://github.com/err0rgod/conduit), an
open-source, local-first browser-control bridge for AI agents.

This repository owns browser execution, the extension UI, and the extension side
of the versioned Conduit protocol. The backend daemon, CLI, and MCP adapter live in
the main Conduit repository.

## Status

Pre-1.0 migration repository. The extension builds and its browser engine and
protocol tests run independently. Automatic local bootstrap and coordinated
release compatibility are the next migration milestones.

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
Developer mode enabled.

## Security

The extension connects only to the local Conduit daemon by default. Page content
is untrusted data and cannot grant permissions. Do not install extension artifacts
from untrusted sources.

## License

MIT
