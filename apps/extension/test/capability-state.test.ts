import { describe, expect, it } from 'vitest';
import {
  OPTIONAL_CAPABILITIES,
  optionalCapabilitiesForRuntimeUrl,
  parseActiveSession,
} from '../src/capability-state';

describe('extension capability state', () => {
  it('defines explicit UI controls for every optional Chromium permission', () => {
    expect(OPTIONAL_CAPABILITIES.map(({ permission }) => permission)).toEqual([
      'debugger',
      'downloads',
    ]);
  });

  it('hides Chromium-only debugger controls in Firefox', () => {
    expect(
      optionalCapabilitiesForRuntimeUrl('moz-extension://example/').map(
        ({ permission }) => permission,
      ),
    ).toEqual(['downloads']);
    expect(
      optionalCapabilitiesForRuntimeUrl('chrome-extension://example/').map(
        ({ permission }) => permission,
      ),
    ).toEqual(['debugger', 'downloads']);
  });

  it('accepts only bounded privacy-safe session timestamps', () => {
    expect(parseActiveSession({ authenticatedAt: 100, lastActivityAt: 200 })).toEqual({
      authenticatedAt: 100,
      lastActivityAt: 200,
    });
    expect(
      parseActiveSession({ authenticatedAt: 100, lastActivityAt: 200, token: 'secret' }),
    ).toBeUndefined();
    expect(parseActiveSession({ authenticatedAt: 200, lastActivityAt: 100 })).toBeUndefined();
  });
});
