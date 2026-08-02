# Conduit Extension agent handoff

This repository is the browser-extension half of Conduit. The backend lives at
`D:\conduit` and `https://github.com/err0rgod/conduit`.

Maintain strict TypeScript, runtime validation at the daemon boundary, minimum
Chromium permissions, meaningful tests, incremental commits, feature branches,
GitHub PRs, and green CI before merges.

Current migration order:

1. Establish this standalone repository without deleting the working source from
   the backend repository.
2. Add a stable extension identity and loopback-only automatic bootstrap so users
   never copy a pairing code.
3. Validate compatibility with the backend protocol and real Chromium E2E.
4. Publish a signed/checksummed extension artifact.
5. Only then remove extension ownership from the backend repository.

Installing the extension and running `conduit setup` are the explicit local
authorization events. Automatic bootstrap must accept only the known Conduit
extension identity over loopback; never expose an unauthenticated LAN endpoint.
