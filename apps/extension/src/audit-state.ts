import { AuditEvent, AuditEventSchema } from '@conduit/protocol';

export interface AuditListCommand {
  type: 'list';
  limit: number;
}

export function parseAuditCommand(value: unknown): AuditListCommand | undefined {
  if (!isRecord(value) || value.type !== 'conduit.audit.list') return undefined;
  if (Object.keys(value).some((key) => !['type', 'limit'].includes(key))) return undefined;
  const limit = value.limit ?? 20;
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return undefined;
  }
  return { type: 'list', limit };
}

export function parseAuditList(payload: unknown): AuditEvent[] | undefined {
  if (!isRecord(payload)) return undefined;
  const parsed = AuditEventSchema.array().max(100).safeParse(payload.events);
  return parsed.success ? parsed.data : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
