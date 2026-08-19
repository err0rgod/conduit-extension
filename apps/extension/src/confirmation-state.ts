import {
  ConfirmationRequest,
  ConfirmationRequestSchema,
  ConfirmationResponseSchema,
} from '@conduit/protocol';

export type ConfirmationCommand =
  { type: 'list' } | { type: 'respond'; confirmationId: string; approved: boolean };

export function parseConfirmationCommand(value: unknown): ConfirmationCommand | undefined {
  if (!isRecord(value) || typeof value.type !== 'string') return undefined;
  if (value.type === 'conduit.confirmations.list') {
    return Object.keys(value).length === 1 ? { type: 'list' } : undefined;
  }
  if (value.type !== 'conduit.confirmations.respond') return undefined;
  if (Object.keys(value).some((key) => !['type', 'confirmationId', 'approved'].includes(key))) {
    return undefined;
  }
  const parsed = ConfirmationResponseSchema.safeParse({
    confirmationId: value.confirmationId,
    approved: value.approved,
  });
  if (!parsed.success) return undefined;
  return { type: 'respond', ...parsed.data };
}

export function parseConfirmationList(payload: unknown): ConfirmationRequest[] | undefined {
  if (!isRecord(payload)) return undefined;
  const parsed = ConfirmationRequestSchema.array().safeParse(payload.confirmations);
  return parsed.success ? parsed.data : undefined;
}

export function parseConfirmationAccepted(payload: unknown): boolean | undefined {
  if (!isRecord(payload) || typeof payload.accepted !== 'boolean') return undefined;
  return payload.accepted;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
