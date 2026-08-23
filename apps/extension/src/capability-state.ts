export type OptionalCapabilityPermission = 'debugger' | 'downloads';

export interface ActiveSession {
  authenticatedAt: number;
  lastActivityAt: number;
}

export const OPTIONAL_CAPABILITIES: ReadonlyArray<{
  permission: OptionalCapabilityPermission;
  label: string;
  description: string;
}> = [
  {
    permission: 'debugger',
    label: 'Advanced interaction',
    description: 'Required for hover, physical key events, and approved file uploads.',
  },
  {
    permission: 'downloads',
    label: 'Download visibility',
    description: 'Allows agents with daemon permission to inspect recent download status.',
  },
];

export function parseActiveSession(value: unknown): ActiveSession | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  if (Object.keys(value).some((key) => !['authenticatedAt', 'lastActivityAt'].includes(key))) {
    return undefined;
  }
  if (
    !('authenticatedAt' in value) ||
    typeof value.authenticatedAt !== 'number' ||
    !Number.isInteger(value.authenticatedAt) ||
    value.authenticatedAt < 0 ||
    !('lastActivityAt' in value) ||
    typeof value.lastActivityAt !== 'number' ||
    !Number.isInteger(value.lastActivityAt) ||
    value.lastActivityAt < value.authenticatedAt
  ) {
    return undefined;
  }
  return { authenticatedAt: value.authenticatedAt, lastActivityAt: value.lastActivityAt };
}
