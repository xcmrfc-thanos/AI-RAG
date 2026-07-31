import { describe, expect, it } from 'vitest';
import { EMBED_MSG, buildEmbedReady, parseEmbedInit } from './protocol';

describe('embed protocol', () => {
  const origin = 'http://127.0.0.1:3002';

  it('accepts valid INIT from expected origin', () => {
    const parsed = parseEmbedInit(
      { type: EMBED_MSG.INIT, token: 'abc', allowedOrigin: origin, knowledgeScope: 'ticket' },
      origin,
      origin,
    );
    expect(parsed?.token).toBe('abc');
    expect(parsed?.knowledgeScope).toBe('ticket');
  });

  it('rejects forged origin', () => {
    expect(
      parseEmbedInit(
        { type: EMBED_MSG.INIT, token: 'abc', allowedOrigin: origin },
        origin,
        'https://evil.example',
      ),
    ).toBeNull();
  });

  it('rejects token in mismatched allowedOrigin', () => {
    expect(
      parseEmbedInit(
        { type: EMBED_MSG.INIT, token: 'abc', allowedOrigin: 'https://other' },
        origin,
        origin,
      ),
    ).toBeNull();
  });

  it('builds READY', () => {
    expect(buildEmbedReady()).toEqual({ type: EMBED_MSG.READY });
  });
});
