type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'setup-required';

import { hostPermissionPattern } from '@conduit/browser-core';
import type { AuditEvent, ConfirmationRequest } from '@conduit/protocol';

document.addEventListener('DOMContentLoaded', () => {
  const stateElement = document.getElementById('connection-state') as HTMLSpanElement;
  const messageElement = document.getElementById('connection-message') as HTMLParagraphElement;
  const portElement = document.getElementById('daemon-port') as HTMLSpanElement;
  const retryButton = document.getElementById('retry') as HTMLButtonElement;
  const siteName = document.getElementById('site-name') as HTMLSpanElement;
  const siteAccess = document.getElementById('site-access') as HTMLSpanElement;
  const allowSiteButton = document.getElementById('allow-site') as HTMLButtonElement;
  const revokeSiteButton = document.getElementById('revoke-site') as HTMLButtonElement;
  const controlState = document.getElementById('control-state') as HTMLSpanElement;
  const controlTarget = document.getElementById('control-target') as HTMLSpanElement;
  const lastAction = document.getElementById('last-action') as HTMLSpanElement;
  const disconnectButton = document.getElementById('disconnect') as HTMLButtonElement;
  const resumeButton = document.getElementById('resume') as HTMLButtonElement;
  const confirmationCount = document.getElementById('confirmation-count') as HTMLSpanElement;
  const confirmationMessage = document.getElementById(
    'confirmation-message',
  ) as HTMLParagraphElement;
  const confirmationList = document.getElementById('confirmation-list') as HTMLDivElement;
  const refreshConfirmations = document.getElementById(
    'refresh-confirmations',
  ) as HTMLButtonElement;
  const auditCount = document.getElementById('audit-count') as HTMLSpanElement;
  const auditMessage = document.getElementById('audit-message') as HTMLParagraphElement;
  const auditList = document.getElementById('audit-list') as HTMLDivElement;
  const refreshAudit = document.getElementById('refresh-audit') as HTMLButtonElement;
  let activePattern: string | undefined;

  const render = (values: {
    connectionState?: ConnectionState;
    connectionMessage?: string;
    daemonPort?: number;
  }) => {
    const state = values.connectionState ?? 'connecting';
    stateElement.textContent = state.replace('-', ' ');
    stateElement.dataset.state = state;
    messageElement.textContent =
      values.connectionMessage ?? 'Discovering the local Conduit daemon.';
    portElement.textContent = String(values.daemonPort ?? 9222);
  };

  chrome.storage.local.get(['connectionState', 'connectionMessage', 'daemonPort'], (values) =>
    render(values),
  );

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    void chrome.storage.local
      .get(['connectionState', 'connectionMessage', 'daemonPort'])
      .then(render);
    void renderControlState();
    if (changes.connectionState) {
      void renderConfirmations();
      void renderAuditEvents();
    }
  });

  const renderControlState = async () => {
    const values = await chrome.storage.local.get(['controlPaused', 'lastControlActivity']);
    const paused = values.controlPaused === true;
    controlState.textContent = paused ? 'paused' : 'ready';
    controlState.dataset.paused = String(paused);
    disconnectButton.hidden = paused;
    resumeButton.hidden = !paused;

    const activity = values.lastControlActivity;
    if (!isControlActivity(activity)) {
      controlTarget.textContent = 'No browser action yet';
      lastAction.textContent = 'None';
      return;
    }
    controlTarget.textContent = activity.target;
    const operation = activity.operation.replace(/^browser\./u, '').replaceAll('_', ' ');
    lastAction.textContent = `${operation} · ${new Date(activity.timestamp).toLocaleTimeString()}`;
  };

  void renderControlState();

  const renderSiteAccess = async () => {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const tab =
      tabs.find((candidate) => candidate.active && hostPermissionPattern(candidate.url ?? '')) ??
      tabs
        .filter((candidate) => hostPermissionPattern(candidate.url ?? ''))
        .sort((left, right) => (right.lastAccessed ?? 0) - (left.lastAccessed ?? 0))[0];
    activePattern = tab?.url ? hostPermissionPattern(tab.url) : undefined;
    if (!activePattern) {
      siteName.textContent = 'Restricted browser page';
      siteAccess.textContent = 'unavailable';
      siteAccess.dataset.granted = 'false';
      allowSiteButton.disabled = true;
      revokeSiteButton.hidden = true;
      return;
    }
    siteName.textContent = new URL(tab.url as string).hostname;
    const granted = await chrome.permissions.contains({ origins: [activePattern] });
    siteAccess.textContent = granted ? 'allowed' : 'not allowed';
    siteAccess.dataset.granted = String(granted);
    allowSiteButton.hidden = granted;
    allowSiteButton.disabled = false;
    revokeSiteButton.hidden = !granted;
  };

  void renderSiteAccess();

  const renderConfirmations = async () => {
    confirmationCount.textContent = 'checking';
    refreshConfirmations.disabled = true;
    try {
      const response = await sendPopupMessage<ConfirmationListResult>({
        type: 'conduit.confirmations.list',
      });
      if (!response.ok) throw new Error(response.error);
      confirmationList.replaceChildren(
        ...response.confirmations.map((confirmation) => confirmationCard(confirmation)),
      );
      confirmationCount.textContent = String(response.confirmations.length);
      confirmationMessage.textContent = response.confirmations.length
        ? 'Page content is untrusted. Approve only the action summarized here.'
        : 'No agent action is waiting for your review.';
    } catch (error) {
      confirmationList.replaceChildren();
      confirmationCount.textContent = 'unavailable';
      confirmationMessage.textContent =
        error instanceof Error ? error.message : 'Could not load pending confirmations.';
    } finally {
      refreshConfirmations.disabled = false;
    }
  };

  const confirmationCard = (confirmation: ConfirmationRequest): HTMLElement => {
    const card = document.createElement('article');
    card.className = 'confirmation-card';
    card.dataset.risk = confirmation.risk;

    const summary = document.createElement('p');
    summary.className = 'confirmation-summary';
    summary.textContent = confirmation.summary;

    const meta = document.createElement('p');
    meta.className = 'confirmation-meta';
    const target = confirmation.domain ? ` on ${confirmation.domain}` : '';
    const expiry = new Date(confirmation.expiresAt).toLocaleTimeString();
    meta.textContent = `${confirmation.risk} risk · ${confirmation.operation}${target} · expires ${expiry}`;

    const decisions = document.createElement('div');
    decisions.className = 'confirmation-decisions';
    const deny = document.createElement('button');
    deny.type = 'button';
    deny.className = 'secondary';
    deny.textContent = 'Deny';
    const approve = document.createElement('button');
    approve.type = 'button';
    approve.textContent = 'Approve once';
    if (confirmation.risk === 'high') approve.className = 'danger';

    const respond = async (approved: boolean) => {
      deny.disabled = true;
      approve.disabled = true;
      try {
        const response = await sendPopupMessage<ConfirmationDecisionResult>({
          type: 'conduit.confirmations.respond',
          confirmationId: confirmation.id,
          approved,
        });
        if (!response.ok || !response.accepted) {
          confirmationMessage.textContent = response.ok
            ? 'This confirmation expired or was already answered.'
            : response.error;
          deny.disabled = false;
          approve.disabled = false;
          return;
        }
        await renderConfirmations();
      } catch (error) {
        confirmationMessage.textContent =
          error instanceof Error ? error.message : 'Could not answer the confirmation.';
        deny.disabled = false;
        approve.disabled = false;
      }
    };
    deny.addEventListener('click', () => void respond(false));
    approve.addEventListener('click', () => void respond(true));
    decisions.append(deny, approve);
    card.append(summary, meta, decisions);
    return card;
  };

  refreshConfirmations.addEventListener('click', () => void renderConfirmations());
  void renderConfirmations();

  const renderAuditEvents = async () => {
    auditCount.textContent = 'checking';
    refreshAudit.disabled = true;
    try {
      const response = await sendPopupMessage<AuditListResult>({
        type: 'conduit.audit.list',
        limit: 20,
      });
      if (!response.ok) throw new Error(response.error);
      auditList.replaceChildren(...response.events.map((event) => auditEventCard(event)));
      auditCount.textContent = String(response.events.length);
      auditMessage.textContent = response.events.length
        ? 'Sensitive values are redacted; arbitrary event details are hidden here.'
        : 'No audit events are available for this daemon session.';
    } catch (error) {
      auditList.replaceChildren();
      auditCount.textContent = 'unavailable';
      auditMessage.textContent =
        error instanceof Error ? error.message : 'Could not load recent audit events.';
    } finally {
      refreshAudit.disabled = false;
    }
  };

  const auditEventCard = (event: AuditEvent): HTMLElement => {
    const card = document.createElement('article');
    card.className = 'audit-event';
    card.dataset.outcome = event.outcome;
    const type = document.createElement('p');
    type.className = 'audit-type';
    type.textContent = `${event.type} / ${event.outcome}`;
    const meta = document.createElement('p');
    meta.className = 'audit-meta';
    const scope = [event.operation, event.domain].filter(Boolean).join(' / ');
    meta.textContent = `${new Date(event.timestamp).toLocaleTimeString()}${scope ? ` / ${scope}` : ''}`;
    card.append(type, meta);
    return card;
  };

  refreshAudit.addEventListener('click', () => void renderAuditEvents());
  void renderAuditEvents();

  allowSiteButton.addEventListener('click', async () => {
    if (!activePattern) return;
    allowSiteButton.disabled = true;
    await chrome.permissions.request({ origins: [activePattern] });
    await renderSiteAccess();
  });

  revokeSiteButton.addEventListener('click', async () => {
    if (!activePattern) return;
    revokeSiteButton.disabled = true;
    await chrome.permissions.remove({ origins: [activePattern] });
    revokeSiteButton.disabled = false;
    await renderSiteAccess();
  });

  disconnectButton.addEventListener('click', () => {
    disconnectButton.disabled = true;
    chrome.runtime.sendMessage({ type: 'conduit.disconnect' }, () => {
      disconnectButton.disabled = false;
      void renderControlState();
    });
  });

  resumeButton.addEventListener('click', () => {
    resumeButton.disabled = true;
    chrome.runtime.sendMessage({ type: 'conduit.resume' }, () => {
      resumeButton.disabled = false;
      void renderControlState();
    });
  });

  retryButton.addEventListener('click', () => {
    retryButton.disabled = true;
    messageElement.textContent = 'Retrying native host discovery…';
    chrome.runtime.sendMessage({ type: 'conduit.retry-connection' }, () => {
      window.setTimeout(() => {
        retryButton.disabled = false;
      }, 1_000);
    });
  });
});

type ConfirmationListResult =
  { ok: true; confirmations: ConfirmationRequest[] } | { ok: false; error: string };

type ConfirmationDecisionResult = { ok: true; accepted: boolean } | { ok: false; error: string };

type AuditListResult = { ok: true; events: AuditEvent[] } | { ok: false; error: string };

function sendPopupMessage<T>(message: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: T) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

function isControlActivity(
  value: unknown,
): value is { operation: string; target: string; timestamp: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'operation' in value &&
    typeof value.operation === 'string' &&
    'target' in value &&
    typeof value.target === 'string' &&
    'timestamp' in value &&
    typeof value.timestamp === 'number'
  );
}
