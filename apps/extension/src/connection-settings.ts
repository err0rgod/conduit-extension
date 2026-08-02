export const NATIVE_HOST_NAME = 'io.github.err0rgod.conduit';
export const NATIVE_PROTOCOL_VERSION = 1;
export const DEFAULT_DAEMON_PORT = 9222;

export interface NativeConnectionSettings {
  daemonPort: number;
  daemonToken: string;
}

export function parseNativeConnectionSettings(value: unknown): NativeConnectionSettings | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('type' in value) ||
    value.type !== 'conduit.connection-settings' ||
    !('protocolVersion' in value) ||
    value.protocolVersion !== NATIVE_PROTOCOL_VERSION ||
    !('daemonPort' in value) ||
    typeof value.daemonPort !== 'number' ||
    !Number.isInteger(value.daemonPort) ||
    value.daemonPort < 1 ||
    value.daemonPort > 65_535 ||
    !('daemonToken' in value) ||
    typeof value.daemonToken !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(value.daemonToken)
  ) {
    return null;
  }

  return { daemonPort: value.daemonPort, daemonToken: value.daemonToken };
}
