# Security Policy

Report vulnerabilities privately through GitHub Security Advisories in this
repository. Do not include credentials, browser data, or private screenshots in a
public issue.

The extension treats webpage content as untrusted data and delegates
authentication, authorization, domain policy, and confirmation decisions to the
local Conduit daemon.

Confirmation summaries are treated as untrusted text. They are runtime validated
on both sides of the authenticated daemon socket and rendered with DOM
`textContent`. Only Conduit's own popup page can send approve-once or deny
commands; webpage content and other extension contexts cannot approve actions.
