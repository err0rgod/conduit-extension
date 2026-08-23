# Conduit Extension Privacy Policy

Effective date: 2026-08-23

Public policy URL: https://conduit.zerodaily.in/#/privacy

Conduit is a local-first browser extension. The extension does not include analytics,
advertising, telemetry, or a vendor-operated cloud service.

## Data the extension can access

The extension can access tab metadata and, only after the user grants host access through
the browser, page content needed to perform an approved browser action. The recommended default
is a specific HTTP or HTTPS site. The user may also explicitly choose **Allow all sites** in
the popup, which requests only `http://*/*` and `https://*/*` through the browser's native
permission prompt. Optional advanced-interaction and download permissions remain disabled
until the user grants them through the Conduit popup.

Page snapshots, visible text, screenshots, form actions, upload paths, and download metadata
are sent only to the authenticated Conduit daemon on `127.0.0.1`. The daemon applies its own
permission, domain, confirmation, audit-redaction, and retention policies.

## Local storage

The extension stores only operational settings needed to reconnect to the local daemon,
explicit pause state, connection status, and bounded privacy-safe activity metadata. The browser
maintains both per-site and all-sites host permission state; Conduit does not persist a second
broad-access flag. It does not intentionally persist page content, form values, screenshots,
cookies, or arbitrary audit details.

## Sharing and sale

Conduit does not sell personal data. The extension does not send browser data to the Conduit
project maintainers or unrelated third parties. Data leaves the browser only when directed to
the user's locally installed Conduit daemon or when the user configures a separate trusted
Conduit deployment.

## User controls

Users can revoke an individual site or use **Revoke all sites** to remove the broad HTTP/HTTPS
patterns, revoke optional browser capabilities, pause all agent control, remove the extension,
or run `conduit uninstall`. Daemon domain and capability policy remains independently enforced.
Removing the extension clears extension-local storage through Chromium's normal uninstall
behavior.

## Security reports and contact

Report vulnerabilities privately through this repository's GitHub Security Advisories, as
described in [SECURITY.md](SECURITY.md). Privacy questions may be opened as a GitHub discussion
or issue as long as they do not contain sensitive browser data.

## Firefox disclosure

The Firefox package declares `websiteActivity` and `websiteContent` because URLs, tab metadata,
and user-approved page content are transmitted from the extension to the user's local Conduit
daemon. This disclosure does not indicate vendor collection or cloud transmission.
