# Security Policy

Report vulnerabilities privately through GitHub Security Advisories in this
repository. Do not include credentials, browser data, or private screenshots in a
public issue.

The extension treats webpage content as untrusted data and delegates
authentication, authorization, domain policy, and confirmation decisions to the
local Conduit daemon.

The extension accepts browser requests only after a strict authentication-success
message on the current loopback WebSocket. Browser requests received before that
state, malformed authentication messages, binary messages, and authentication
timeouts close the connection. Native Messaging remains pinned to Conduit's stable
extension identity.

Confirmation summaries are treated as untrusted text. They are runtime validated
on both sides of the authenticated daemon socket and rendered with DOM
`textContent`. Only Conduit's own popup page can send approve-once or deny
commands; webpage content and other extension contexts cannot approve actions.

The audit viewer accepts at most 100 runtime-validated events from the
authenticated daemon response and requests 20 by default. It intentionally omits
the free-form `details` field from the UI even after daemon redaction.

Optional `debugger` and `downloads` capabilities are disabled until explicitly
granted from the popup and can be revoked there. HTTP/HTTPS site grants remain
optional and can be revoked individually or all at once.
