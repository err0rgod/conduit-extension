export type OptionalCapabilityPermission = 'downloads';
export type RequiredCapabilityPermission = 'debugger';

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
    permission: 'downloads',
    label: 'Download visibility',
    description: 'Allows agents with daemon permission to inspect recent download status.',
  },
];

export const REQUIRED_CAPABILITIES: ReadonlyArray<{
  permission: RequiredCapabilityPermission;
  label: string;
  description: string;
}> = [
  {
    permission: 'debugger',
    label: 'Advanced interaction',
    description:
      'Enabled by Chromium at installation time for hover, physical key events, debugging, and approved file uploads.',
  },
];

export function optionalCapabilitiesForRuntimeUrl(runtimeUrl: string) {
  return OPTIONAL_CAPABILITIES;
}

export function requiredCapabilitiesForRuntimeUrl(runtimeUrl: string) {
  return runtimeUrl.startsWith('moz-extension://') ? [] : REQUIRED_CAPABILITIES;
}

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
