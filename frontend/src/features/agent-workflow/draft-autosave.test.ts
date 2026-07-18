import { describe, expect, it } from 'vitest';
import {
  buildDraftInputDefaults,
  createRevisionGate,
  validateDraftInput,
} from './draft-autosave';

describe('draft-autosave', () => {
  it('acknowledges only the latest save revision', () => {
    const gate = createRevisionGate();
    const first = gate.next();
    const second = gate.next();
    expect(gate.acknowledge(first)).toBe(false);
    expect(gate.acknowledge(second)).toBe(true);
  });

  it('builds draft input defaults from input schema', () => {
    expect(buildDraftInputDefaults({
      query: { type: 'string', required: true, defaultValue: '测试问题' },
      count: { type: 'number', defaultValue: 3 },
      enabled: { type: 'boolean' },
    })).toEqual({ query: '测试问题', count: 3, enabled: false });
  });

  it('uses a runnable prompt for a query field without an explicit default', () => {
    expect(buildDraftInputDefaults({
      query: { type: 'string', required: true },
      topic: { type: 'string' },
    })).toEqual({ query: '请根据知识库回答：什么是 RAG？', topic: '' });
  });

  it('reports missing required draft inputs', () => {
    expect(validateDraftInput({
      query: { type: 'string', required: true, label: '问题' },
      count: { type: 'number', required: true, label: '数量' },
    }, { query: '   ', count: null })).toEqual(['问题不能为空', '数量不能为空']);
  });
});
