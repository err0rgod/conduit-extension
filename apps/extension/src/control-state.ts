export type ControlCommand = 'disconnect' | 'resume' | 'retry-connection';

export interface ControlActivity {
  operation: string;
  target: string;
  timestamp: number;
}

export function parseControlCommand(value: unknown): ControlCommand | undefined {
  if (typeof value !== 'object' || value === null || !('type' in value)) return undefined;
  switch (value.type) {
    case 'conduit.disconnect':
      return 'disconnect';
    case 'conduit.resume':
      return 'resume';
    case 'conduit.retry-connection':
      return 'retry-connection';
    default:
      return undefined;
  }
}

export function summarizeControlActivity(
  request: { type: string; payload: unknown },
  timestamp = Date.now(),
): ControlActivity {
  const tabId = tabIdFromPayload(request.payload);
  return {
    operation: request.type,
    target: tabId === undefined ? 'Active browser tab' : `Tab ${tabId}`,
    timestamp,
  };
}

function tabIdFromPayload(payload: unknown): number | undefined {
  if (typeof payload !== 'object' || payload === null || !('tabId' in payload)) return undefined;
  return typeof payload.tabId === 'number' && Number.isInteger(payload.tabId)
    ? payload.tabId
    : undefined;
}
