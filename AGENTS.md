# Conduit Extension agent handoff

This repository is the browser-extension half of Conduit. The backend lives at
`D:\conduit` and `https://github.com/err0rgod/conduit`.

Maintain strict TypeScript, runtime validation at the daemon boundary, minimum
Chromium permissions, meaningful tests, incremental commits, feature branches,
GitHub PRs, and green CI before merges.

Completed milestones:

1. Established the standalone extension repository and stable extension identity.
2. Added loopback-only Native Messaging bootstrap without local pairing codes.
3. Removed required broad site access and added explicit per-origin controls.
4. Published the checksummed `0.1.1` extension artifact from the backend release.
5. Added persistent emergency disconnect/resume and privacy-safe current action status.
6. Added authenticated pending-confirmation review with approve-once and deny controls.
7. Added a bounded recent audit-event viewer that omits arbitrary event details.
8. Added explicit popup-only all-sites grant/revoke controls for the optional HTTP/HTTPS host patterns and published the checksummed `0.1.2` release.

The compatible backend confirmation transport is merged at
`err0rgod/conduit@2f3ba6a81de111476b81be7d2521eae111ee3ac6`. The complete
real-Chromium flow is maintained in the backend E2E suite.

Next priorities are broader iframe/shadow-DOM/download fixtures and coordinated backend
distribution updates. Keep production host permissions optional. Per-site access remains the
recommended default; broad HTTP/HTTPS access may be requested only from an explicit popup click,
must use Chromium's permission state rather than extension storage, and must never bypass daemon
policy.

Installing the extension and running `conduit setup` are the explicit local
authorization events. Automatic bootstrap must accept only the known Conduit
extension identity over loopback; never expose an unauthenticated LAN endpoint.
