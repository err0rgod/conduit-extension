# Changelog

## [1.1.4] - Unreleased

The next extension release line is `1.1.4`.

### Distribution

- The Chrome Web Store listing is temporarily unavailable. Use the verified unpacked GitHub archive with Chrome Developer mode until the listing returns.

## [0.1.3] - 2026-08-23

### Added

- One key-free Chromium store archive shared by Chrome, Edge, and Brave.
- A Firefox archive with Gecko identity, event-page background, and current AMO data disclosure.
- Deterministic checksums and archive-manifest validation for every browser target.

### Fixed

- Removed the development-only manifest `key` from browser-store uploads, fixing the Chrome Web
  Store rejection.
- Firefox no longer exposes Chromium-only debugger permission controls and reports unsupported
  advanced interactions clearly.

## [0.1.2] - 2026-08-23

### Added

- Explicit popup controls for optional advanced-interaction and download permissions.
- Authenticated-session start and last-activity visibility without page content or tokens.
- Opt-in allow-all and revoke-all site access controls using Chromium's runtime permission prompt.
- Deterministic extension icons, versioned ZIP packaging, SHA-256 output, and release validation.
- Browser-store privacy, identity, permission-justification, and submission documentation.

### Security

- Browser requests and management responses are rejected until strict daemon authentication
  succeeds.
- Non-text socket messages, malformed authentication responses, and authentication timeouts
  close the connection.
- Keepalive messages now use a valid protocol envelope.

## [0.1.1] - 2026-08-20

- Published as part of the checksummed Conduit backend release.
- Removed required broad host access and added explicit per-site Chromium grants.
