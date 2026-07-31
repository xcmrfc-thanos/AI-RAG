import { describe, expect, it } from 'vitest';
import { shouldSkipAppConfigFetch } from './app-config-refresh';

describe('shouldSkipAppConfigFetch', () => {
  it('skips only when already loaded and not forced', () => {
    expect(shouldSkipAppConfigFetch(false)).toBe(false);
    expect(shouldSkipAppConfigFetch(false, true)).toBe(false);
    expect(shouldSkipAppConfigFetch(true)).toBe(true);
    expect(shouldSkipAppConfigFetch(true, false)).toBe(true);
    expect(shouldSkipAppConfigFetch(true, true)).toBe(false);
  });
});
