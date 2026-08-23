import { describe, expect, it } from 'vitest';
import { createEnvelopeBase, createSuccessResponse } from '@conduit/protocol';
import { parseDaemonMessage } from '../src/daemon-message';

describe('daemon message authentication boundary', () => {
  it('accepts only strict authentication responses before browser traffic', () => {
    expect(parseDaemonMessage({ type: 'auth_success' }, false)).toEqual({
      kind: 'auth-success',
    });
    expect(parseDaemonMessage({ type: 'auth_success', trusted: true }, false)).toEqual({
      kind: 'authentication-required',
    });
    expect(
      parseDaemonMessage(
        {
          type: 'error',
          error: { code: 'AUTHENTICATION_FAILED', message: 'Invalid token.' },
        },
        false,
      ),
    ).toEqual({ kind: 'auth-failure', message: 'Invalid token.' });
  });

  it('blocks valid browser commands until authentication succeeds', () => {
    const request = {
      ...createEnvelopeBase(),
      type: 'browser.list_tabs',
      payload: {},
    };

    expect(parseDaemonMessage(request, false)).toEqual({ kind: 'authentication-required' });
    expect(parseDaemonMessage(request, true)).toMatchObject({
      kind: 'browser-request',
      request: { type: 'browser.list_tabs' },
    });
  });

  it('routes correlated management responses only after authentication', () => {
    const response = createSuccessResponse({ confirmations: [] }, crypto.randomUUID());

    expect(parseDaemonMessage(response, false)).toEqual({ kind: 'authentication-required' });
    expect(parseDaemonMessage(response, true)).toEqual({
      kind: 'management-response',
      response,
    });
  });
});
