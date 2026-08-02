type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'setup-required';

document.addEventListener('DOMContentLoaded', () => {
  const stateElement = document.getElementById('connection-state') as HTMLSpanElement;
  const messageElement = document.getElementById('connection-message') as HTMLParagraphElement;
  const portElement = document.getElementById('daemon-port') as HTMLSpanElement;
  const retryButton = document.getElementById('retry') as HTMLButtonElement;

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
