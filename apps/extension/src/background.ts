import { BrowserActionError, ExtensionBrowserEngine } from '@conduit/browser-core';
import {
  BrowserRequestEnvelope,
  BrowserRequestEnvelopeSchema,
  ExtensionManagementRequestSchema,
  ResponseEnvelope,
  ResponseEnvelopeSchema,
  createEnvelopeBase,
  createErrorResponse,
  createSuccessResponse,
} from '@conduit/protocol';
import {
  DEFAULT_DAEMON_PORT,
  NATIVE_HOST_NAME,
  NATIVE_PROTOCOL_VERSION,
  NativeConnectionSettings,
  parseNativeConnectionSettings,
} from './connection-settings';
import { parseControlCommand, summarizeControlActivity } from './control-state';
import type { ControlCommand } from './control-state';
import {
  parseConfirmationAccepted,
  parseConfirmationCommand,
  parseConfirmationList,
} from './confirmation-state';
import type { ConfirmationCommand } from './confirmation-state';
import { parseAuditCommand, parseAuditList } from './audit-state';
import type { AuditListCommand } from './audit-state';

let daemonSocket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let connectionAttemptInFlight = false;
let controlPaused = false;
let daemonAuthenticated = false;

interface PendingManagementRequest {
  resolve: (response: ResponseEnvelope) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const pendingManagementRequests = new Map<string, PendingManagementRequest>();

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'setup-required';

interface ExtensionDiagnostic {
  phase: string;
  operation?: string;
  requestId?: string;
  message?: string;
  timestamp: number;
}

declare global {
  // Accessible only inside the extension service worker for local diagnostics and E2E assertions.
  var __conduitDiagnostic: ExtensionDiagnostic | undefined;
}

const browserEngine = new ExtensionBrowserEngine();

async function connectDaemon(): Promise<void> {
  if (controlPaused || daemonSocket || connectionAttemptInFlight) {
    return;
  }

  connectionAttemptInFlight = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  setConnectionState('connecting', 'Discovering the local Conduit daemon.');

  try {
    const stored = await chrome.storage.local.get(['daemonPort', 'daemonToken']);
    let port = typeof stored.daemonPort === 'number' ? stored.daemonPort : DEFAULT_DAEMON_PORT;
    let token = typeof stored.daemonToken === 'string' ? stored.daemonToken : undefined;

    if (!token) {
      const settings = await requestNativeConnectionSettings();
      if (!settings) {
        setConnectionState('setup-required', 'Run conduit setup, then retry.');
        setConnectionBadge(false);
        scheduleReconnect();
        return;
      }
      port = settings.daemonPort;
      token = settings.daemonToken;
      await chrome.storage.local.set({ daemonPort: port, daemonToken: token });
    }

    openDaemonSocket(port, token);
  } finally {
    connectionAttemptInFlight = false;
  }
}

function openDaemonSocket(port: number, token: string): void {
  daemonAuthenticated = false;
  daemonSocket = new WebSocket(`ws://127.0.0.1:${port}`);

  daemonSocket.onopen = () => {
    daemonSocket?.send(JSON.stringify({ type: 'auth', payload: { token } }));
  };

  daemonSocket.onmessage = (event) => {
    setDiagnostic('message-received');
    void handleDaemonMessage(event.data);
  };

  let pingInterval: ReturnType<typeof setInterval> | null = null;
  daemonSocket.addEventListener('open', () => {
    pingInterval = setInterval(() => {
      if (daemonSocket?.readyState === WebSocket.OPEN) {
        daemonSocket.send(JSON.stringify(createSuccessResponse({ ping: true }, 'keepalive')));
      }
    }, 20_000);
  });

  daemonSocket.onclose = () => {
    if (pingInterval) clearInterval(pingInterval);
    daemonAuthenticated = false;
    rejectPendingManagementRequests('The Conduit daemon connection closed.');
    daemonSocket = null;
    setConnectionBadge(false);
    if (controlPaused) {
      setConnectionState('disconnected', 'Emergency disconnect is active.');
      setPausedBadge();
    } else {
      setConnectionState('disconnected', 'Waiting for the local Conduit daemon.');
      scheduleReconnect();
    }
  };

  daemonSocket.onerror = (error) => {
    console.error('Conduit daemon connection error', error);
  };
}

function requestNativeConnectionSettings(): Promise<NativeConnectionSettings | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendNativeMessage(
      NATIVE_HOST_NAME,
      { type: 'conduit.get-connection-settings', protocolVersion: NATIVE_PROTOCOL_VERSION },
      (response: unknown) => {
        if (chrome.runtime.lastError) {
          console.info('Conduit native host is not available:', chrome.runtime.lastError.message);
          resolve(null);
          return;
        }
        resolve(parseNativeConnectionSettings(response));
      },
    );
  });
}

function scheduleReconnect(): void {
  if (controlPaused) return;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => void connectDaemon(), 5_000);
}

async function handleDaemonMessage(rawData: string): Promise<void> {
  const parsed = parseJson(rawData);
  if (!parsed.ok) {
    setDiagnostic('invalid-json');
    sendToDaemon(createErrorResponse('INVALID_REQUEST', 'Daemon message was not valid JSON.'));
    return;
  }

  if (isAuthSuccess(parsed.value)) {
    daemonAuthenticated = true;
    setDiagnostic('authenticated');
    setConnectionBadge(true);
    setConnectionState('connected', 'Connected securely to the local Conduit daemon.');
    return;
  }

  if (isAuthFailure(parsed.value)) {
    daemonAuthenticated = false;
    setDiagnostic('authentication-failed');
    console.error('Authentication failed with Conduit daemon.');
    void chrome.storage.local.remove('daemonToken');
    daemonSocket?.close();
    return;
  }

  const managementResponse = ResponseEnvelopeSchema.safeParse(parsed.value);
  if (managementResponse.success && resolveManagementResponse(managementResponse.data)) return;

  const request = BrowserRequestEnvelopeSchema.safeParse(parsed.value);
  if (!request.success) {
    setDiagnostic('request-invalid', undefined, undefined, request.error.message);
    sendToDaemon(
      createErrorResponse('INVALID_REQUEST', 'Daemon request failed protocol validation.'),
    );
    return;
  }

  await executeBrowserRequest(request.data);
}

async function executeBrowserRequest(request: BrowserRequestEnvelope): Promise<void> {
  if (controlPaused) {
    sendToDaemon(
      createErrorResponse('PERMISSION_DENIED', 'Browser control is paused.', request.id),
    );
    return;
  }
  void chrome.storage.local.set({ lastControlActivity: summarizeControlActivity(request) });
  setDiagnostic('executing', request.type, request.id);
  try {
    switch (request.type) {
      case 'browser.list_tabs': {
        const tabs = await browserEngine.listTabs();
        sendToDaemon(createSuccessResponse({ tabs }, request.id));
        return;
      }
      case 'browser.get_active_tab': {
        const tab = await browserEngine.getActiveTab();
        sendToDaemon(createSuccessResponse({ tab }, request.id));
        return;
      }
      case 'browser.open_tab': {
        const tab = await browserEngine.openTab(request.payload.url);
        sendToDaemon(createSuccessResponse({ tab }, request.id));
        return;
      }
      case 'browser.close_tab': {
        await browserEngine.closeTab(request.payload);
        sendToDaemon(createSuccessResponse({ closed: true }, request.id));
        return;
      }
      case 'browser.focus_tab': {
        await browserEngine.focusTab(request.payload);
        sendToDaemon(createSuccessResponse({ focused: true }, request.id));
        return;
      }
      case 'browser.navigate': {
        const tab = await browserEngine.navigate(request.payload, request.payload.url);
        sendToDaemon(createSuccessResponse({ tab }, request.id));
        return;
      }
      case 'browser.go_back': {
        await browserEngine.goBack(request.payload);
        sendToDaemon(createSuccessResponse({ navigated: true }, request.id));
        return;
      }
      case 'browser.go_forward': {
        await browserEngine.goForward(request.payload);
        sendToDaemon(createSuccessResponse({ navigated: true }, request.id));
        return;
      }
      case 'browser.reload': {
        await browserEngine.reload(request.payload);
        sendToDaemon(createSuccessResponse({ reloaded: true }, request.id));
        return;
      }
      case 'browser.snapshot': {
        const snapshot = await browserEngine.getSnapshot(request.payload, request.payload);
        sendToDaemon(createSuccessResponse({ snapshot }, request.id));
        return;
      }
      case 'browser.get_visible_text': {
        const text = await browserEngine.getVisibleText(request.payload);
        sendToDaemon(createSuccessResponse({ text }, request.id));
        return;
      }
      case 'browser.click': {
        await browserEngine.click(request.payload, request.payload);
        sendToDaemon(createSuccessResponse({ clicked: true }, request.id));
        return;
      }
      case 'browser.type': {
        await browserEngine.type(request.payload, request.payload);
        sendToDaemon(createSuccessResponse({ typed: true }, request.id));
        return;
      }
      case 'browser.clear': {
        await browserEngine.clear(request.payload, request.payload);
        sendToDaemon(createSuccessResponse({ cleared: true }, request.id));
        return;
      }
      case 'browser.select': {
        await browserEngine.select(request.payload, request.payload);
        sendToDaemon(createSuccessResponse({ selected: true }, request.id));
        return;
      }
      case 'browser.hover': {
        await browserEngine.hover(request.payload, request.payload);
        sendToDaemon(createSuccessResponse({ hovered: true }, request.id));
        return;
      }
      case 'browser.scroll': {
        await browserEngine.scroll(request.payload, request.payload);
        sendToDaemon(createSuccessResponse({ scrolled: true }, request.id));
        return;
      }
      case 'browser.press_key': {
        await browserEngine.pressKey(request.payload, request.payload);
        sendToDaemon(createSuccessResponse({ pressed: true }, request.id));
        return;
      }
      case 'browser.wait_for': {
        await browserEngine.waitFor(request.payload, request.payload);
        sendToDaemon(createSuccessResponse({ matched: true }, request.id));
        return;
      }
      case 'browser.screenshot': {
        const screenshot = await browserEngine.screenshot(request.payload, request.payload.format);
        sendToDaemon(createSuccessResponse({ screenshot }, request.id));
        return;
      }
      case 'browser.upload_file': {
        await browserEngine.uploadFile(request.payload, request.payload);
        sendToDaemon(createSuccessResponse({ uploaded: true }, request.id));
        return;
      }
      case 'browser.get_downloads': {
        const downloads = await browserEngine.getDownloads();
        sendToDaemon(createSuccessResponse({ downloads }, request.id));
        return;
      }
    }
  } catch (error) {
    setDiagnostic(
      'execution-failed',
      request.type,
      request.id,
      error instanceof Error ? error.message : 'Unexpected browser action failure.',
    );
    if (error instanceof BrowserActionError) {
      sendToDaemon(createErrorResponse(error.code, error.message, request.id));
      return;
    }

    const message = error instanceof Error ? error.message : 'Unexpected browser action failure.';
    sendToDaemon(createErrorResponse('INTERNAL_ERROR', message, request.id));
  }
}

function sendToDaemon(message: unknown): void {
  if (daemonSocket?.readyState === WebSocket.OPEN) {
    daemonSocket.send(JSON.stringify(message));
    setDiagnostic('response-sent');
  } else {
    setDiagnostic('response-dropped', undefined, undefined, 'Daemon socket is not open.');
  }
}

function setDiagnostic(
  phase: string,
  operation?: string,
  requestId?: string,
  message?: string,
): void {
  globalThis.__conduitDiagnostic = {
    phase,
    ...(operation ? { operation } : {}),
    ...(requestId ? { requestId } : {}),
    ...(message ? { message } : {}),
    timestamp: Date.now(),
  };
}

function setConnectionBadge(connected: boolean): void {
  chrome.action.setBadgeText({ text: connected ? 'ON' : 'OFF' });
  chrome.action.setBadgeBackgroundColor({ color: connected ? '#107c41' : '#b42318' });
}

function setPausedBadge(): void {
  chrome.action.setBadgeText({ text: 'STOP' });
  chrome.action.setBadgeBackgroundColor({ color: '#b42318' });
}

function setConnectionState(state: ConnectionState, message: string): void {
  void chrome.storage.local.set({
    connectionState: state,
    connectionMessage: message,
    connectionUpdatedAt: Date.now(),
  });
}

function parseJson(value: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(value) };
  } catch {
    return { ok: false };
  }
}

function isAuthSuccess(value: unknown): value is { type: 'auth_success' } {
  return (
    typeof value === 'object' && value !== null && 'type' in value && value.type === 'auth_success'
  );
}

function isAuthFailure(
  value: unknown,
): value is { type: 'error'; error: { code: 'AUTHENTICATION_FAILED' } } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'error' &&
    'error' in value &&
    typeof value.error === 'object' &&
    value.error !== null &&
    'code' in value.error &&
    value.error.code === 'AUTHENTICATION_FAILED'
  );
}

void initializeControl();

async function initializeControl(): Promise<void> {
  const stored = await chrome.storage.local.get('controlPaused');
  controlPaused = stored.controlPaused === true;
  if (controlPaused) {
    setPausedBadge();
    setConnectionState('disconnected', 'Emergency disconnect is active.');
    return;
  }
  await connectDaemon();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || (!changes.daemonToken && !changes.daemonPort)) {
    return;
  }

  if (daemonSocket) {
    daemonSocket.close();
    return;
  }

  void connectDaemon();
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  const command = parseControlCommand(message);
  const confirmationCommand = parseConfirmationCommand(message);
  const auditCommand = parseAuditCommand(message);
  if (!command && !confirmationCommand && !auditCommand) return false;

  if (!isTrustedPopupSender(sender)) {
    sendResponse({ ok: false, error: 'This command is available only from the Conduit popup.' });
    return false;
  }

  let task: Promise<unknown>;
  if (command) task = handleControlCommand(command).then(() => ({ ok: true }));
  else if (confirmationCommand) task = handleConfirmationCommand(confirmationCommand);
  else if (auditCommand) task = handleAuditCommand(auditCommand);
  else return false;
  void task.then(sendResponse).catch((error: unknown) =>
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'Confirmation request failed.',
    }),
  );
  return true;
});

function isTrustedPopupSender(sender: chrome.runtime.MessageSender): boolean {
  return sender.id === chrome.runtime.id && sender.url === chrome.runtime.getURL('popup.html');
}

async function handleConfirmationCommand(command: ConfirmationCommand): Promise<unknown> {
  if (command.type === 'list') {
    const response = await sendManagementRequest('extension.confirmations.list', {});
    if (!response.success) throw new Error(response.error.message);
    const confirmations = parseConfirmationList(response.payload);
    if (!confirmations) throw new Error('The daemon returned an invalid confirmation list.');
    return { ok: true, confirmations };
  }

  const response = await sendManagementRequest('extension.confirmations.respond', {
    confirmationId: command.confirmationId,
    approved: command.approved,
  });
  if (!response.success) throw new Error(response.error.message);
  const accepted = parseConfirmationAccepted(response.payload);
  if (accepted === undefined)
    throw new Error('The daemon returned an invalid confirmation result.');
  return { ok: true, accepted };
}

async function handleAuditCommand(command: AuditListCommand): Promise<unknown> {
  const response = await sendManagementRequest('extension.audit.list', { limit: command.limit });
  if (!response.success) throw new Error(response.error.message);
  const events = parseAuditList(response.payload);
  if (!events) throw new Error('The daemon returned an invalid audit event list.');
  return { ok: true, events };
}

function sendManagementRequest(
  type: 'extension.confirmations.list' | 'extension.confirmations.respond' | 'extension.audit.list',
  payload: unknown,
): Promise<ResponseEnvelope> {
  if (!daemonAuthenticated || daemonSocket?.readyState !== WebSocket.OPEN) {
    return Promise.reject(new Error('The Conduit daemon is not connected.'));
  }
  const request = ExtensionManagementRequestSchema.parse({
    ...createEnvelopeBase(),
    type,
    payload,
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingManagementRequests.delete(request.id);
      reject(new Error('The daemon did not answer the confirmation request in time.'));
    }, 5_000);
    pendingManagementRequests.set(request.id, { resolve, reject, timer });
    daemonSocket?.send(JSON.stringify(request));
  });
}

function resolveManagementResponse(response: ResponseEnvelope): boolean {
  if (!response.correlationId) return false;
  const pending = pendingManagementRequests.get(response.correlationId);
  if (!pending) return false;
  clearTimeout(pending.timer);
  pendingManagementRequests.delete(response.correlationId);
  pending.resolve(response);
  return true;
}

function rejectPendingManagementRequests(message: string): void {
  for (const pending of pendingManagementRequests.values()) {
    clearTimeout(pending.timer);
    pending.reject(new Error(message));
  }
  pendingManagementRequests.clear();
}

async function handleControlCommand(command: ControlCommand): Promise<void> {
  if (command === 'disconnect') {
    controlPaused = true;
    daemonAuthenticated = false;
    rejectPendingManagementRequests('Emergency disconnect stopped the daemon connection.');
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    await chrome.storage.local.set({ controlPaused: true });
    setConnectionState('disconnected', 'Emergency disconnect is active.');
    setPausedBadge();
    daemonSocket?.close();
    return;
  }

  controlPaused = false;
  await chrome.storage.local.set({ controlPaused: false });
  if (command === 'retry-connection') await chrome.storage.local.remove('daemonToken');
  if (daemonSocket) daemonSocket.close();
  else await connectDaemon();
}
