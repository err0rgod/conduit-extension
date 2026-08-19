import { describe, expect, it } from 'vitest';
import { parseControlCommand, summarizeControlActivity } from '../src/control-state';

describe('extension control state', () => {
  it('accepts only explicit internal control commands', () => {
    expect(parseControlCommand({ type: 'conduit.disconnect' })).toBe('disconnect');
    expect(parseControlCommand({ type: 'conduit.resume' })).toBe('resume');
    expect(parseControlCommand({ type: 'conduit.retry-connection' })).toBe('retry-connection');
    expect(parseControlCommand({ type: 'browser.click' })).toBeUndefined();
    expect(parseControlCommand(null)).toBeUndefined();
  });

  it('records bounded action metadata without page or form content', () => {
    expect(
      summarizeControlActivity(
        { type: 'browser.type', payload: { tabId: 42, text: 'never persist me' } },
        123,
      ),
    ).toEqual({ operation: 'browser.type', target: 'Tab 42', timestamp: 123 });
    expect(
      summarizeControlActivity({ type: 'browser.screenshot', payload: { format: 'png' } }, 456),
    ).toEqual({ operation: 'browser.screenshot', target: 'Active browser tab', timestamp: 456 });
  });
});
