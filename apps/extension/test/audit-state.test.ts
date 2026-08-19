import { describe, expect, it } from 'vitest';
import { parseAuditCommand, parseAuditList } from '../src/audit-state';

const event = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  timestamp: 1_720_000_000_000,
  type: 'browser.action',
  outcome: 'success',
  operation: 'browser.snapshot',
  domain: 'example.com',
};

describe('extension audit state', () => {
  it('accepts only bounded explicit list commands', () => {
    expect(parseAuditCommand({ type: 'conduit.audit.list' })).toEqual({ type: 'list', limit: 20 });
    expect(parseAuditCommand({ type: 'conduit.audit.list', limit: 50 })).toEqual({
      type: 'list',
      limit: 50,
    });
    expect(parseAuditCommand({ type: 'conduit.audit.list', limit: 101 })).toBeUndefined();
    expect(
      parseAuditCommand({ type: 'conduit.audit.list', limit: 10, token: 'secret' }),
    ).toBeUndefined();
  });

  it('validates structured bounded audit payloads', () => {
    expect(parseAuditList({ events: [event] })).toEqual([event]);
    expect(parseAuditList({ events: [{ ...event, outcome: 'maybe' }] })).toBeUndefined();
    expect(parseAuditList({ events: Array.from({ length: 101 }, () => event) })).toBeUndefined();
  });
});
