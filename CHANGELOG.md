# Changelog

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
