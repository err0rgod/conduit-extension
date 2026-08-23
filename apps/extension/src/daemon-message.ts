import {
  BrowserRequestEnvelope,
  BrowserRequestEnvelopeSchema,
  ResponseEnvelope,
  ResponseEnvelopeSchema,
} from '@conduit/protocol';

export type ParsedDaemonMessage =
  | { kind: 'auth-success' }
  | { kind: 'auth-failure'; message: string }
  | { kind: 'authentication-required' }
  | { kind: 'management-response'; response: ResponseEnvelope }
  | { kind: 'browser-request'; request: BrowserRequestEnvelope }
  | { kind: 'invalid'; message: string };

export function parseDaemonMessage(value: unknown, authenticated: boolean): ParsedDaemonMessage {
  if (!authenticated) {
    if (isStrictRecord(value, ['type']) && value.type === 'auth_success') {
      return { kind: 'auth-success' };
    }

    if (
      isStrictRecord(value, ['type', 'error']) &&
      value.type === 'error' &&
      isStrictRecord(value.error, ['code', 'message']) &&
      value.error.code === 'AUTHENTICATION_FAILED' &&
      typeof value.error.message === 'string' &&
      value.error.message.length > 0
    ) {
      return { kind: 'auth-failure', message: value.error.message };
    }

    return { kind: 'authentication-required' };
  }

  const managementResponse = ResponseEnvelopeSchema.safeParse(value);
  if (managementResponse.success) {
    return { kind: 'management-response', response: managementResponse.data };
  }

  const request = BrowserRequestEnvelopeSchema.safeParse(value);
  if (request.success) {
    return { kind: 'browser-request', request: request.data };
  }

  return { kind: 'invalid', message: request.error.message };
}

function isStrictRecord(value: unknown, keys: string[]): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length && actualKeys.every((key) => keys.includes(key));
}
