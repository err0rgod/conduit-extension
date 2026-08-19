import { describe, expect, it } from 'vitest';
import {
  parseConfirmationAccepted,
  parseConfirmationCommand,
  parseConfirmationList,
} from '../src/confirmation-state';

const confirmation = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  requestId: '223e4567-e89b-12d3-a456-426614174000',
  operation: 'browser.navigate',
  risk: 'medium',
  summary: 'Navigate to example.com',
  domain: 'example.com',
  expiresAt: Date.now() + 60_000,
};

describe('extension confirmation state', () => {
  it('accepts only validated confirmation commands', () => {
    expect(parseConfirmationCommand({ type: 'conduit.confirmations.list' })).toEqual({
      type: 'list',
    });
    expect(
      parseConfirmationCommand({
        type: 'conduit.confirmations.respond',
        confirmationId: confirmation.id,
        approved: true,
      }),
    ).toEqual({ type: 'respond', confirmationId: confirmation.id, approved: true });
    expect(
      parseConfirmationCommand({
        type: 'conduit.confirmations.respond',
        confirmationId: 'not-a-uuid',
        approved: true,
      }),
    ).toBeUndefined();
  });

  it('validates daemon confirmation response payloads', () => {
    expect(parseConfirmationList({ confirmations: [confirmation] })).toEqual([confirmation]);
    expect(parseConfirmationList({ confirmations: [{ ...confirmation, risk: 'critical' }] })).toBe(
      undefined,
    );
    expect(parseConfirmationAccepted({ accepted: true })).toBe(true);
    expect(parseConfirmationAccepted({ accepted: 'yes' })).toBeUndefined();
  });
});
