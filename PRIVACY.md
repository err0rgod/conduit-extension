# Conduit Extension Privacy Policy

Effective date: 2026-08-23

Conduit is a local-first browser extension. The extension does not include analytics,
advertising, telemetry, or a vendor-operated cloud service.

## Data the extension can access

The extension can access tab metadata and, only after the user grants a specific HTTP or
HTTPS site through Chromium, page content needed to perform an approved browser action.
Optional advanced-interaction and download permissions remain disabled until the user grants
them through the Conduit popup.

Page snapshots, visible text, screenshots, form actions, upload paths, and download metadata
are sent only to the authenticated Conduit daemon on `127.0.0.1`. The daemon applies its own
permission, domain, confirmation, audit-redaction, and retention policies.

## Local storage

The extension stores only operational settings needed to reconnect to the local daemon,
explicit pause state, connection status, permission state maintained by Chromium, and bounded
privacy-safe activity metadata. It does not intentionally persist page content, form values,
screenshots, cookies, or arbitrary audit details.

## Sharing and sale

Conduit does not sell personal data. The extension does not send browser data to the Conduit
project maintainers or unrelated third parties. Data leaves the browser only when directed to
the user's locally installed Conduit daemon or when the user configures a separate trusted
Conduit deployment.

## User controls

Users can revoke individual or all site grants, revoke optional Chromium capabilities, pause
all agent control, remove the extension, or run `conduit uninstall`. Removing the extension
clears extension-local storage through Chromium's normal uninstall behavior.

## Security reports and contact

Report vulnerabilities privately through this repository's GitHub Security Advisories, as
described in [SECURITY.md](SECURITY.md). Privacy questions may be opened as a GitHub discussion
or issue as long as they do not contain sensitive browser data.
