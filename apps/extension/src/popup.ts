type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'setup-required';

import { hostPermissionPattern } from '@conduit/browser-core';

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
