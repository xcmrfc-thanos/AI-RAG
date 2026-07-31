import { describe, expect, it } from 'vitest';
import {
  buildCreateRunPayload,
  buildIdempotencyKey,
  parseWorkflowCommandFromMessage,
  type WorkflowSelection,
} from './selection';

describe('ai-workflow-trigger/selection', () => {
  const selection: WorkflowSelection = {
    workflowId: 10,
    workflowVersionId: 42,
    name: '知识库问答',
  };

  it('builds stable idempotency key format', () => {
    expect(buildIdempotencyKey(7, 42, 'n1')).toBe('ai-wf-7-42-n1');
    expect(buildIdempotencyKey(null, 42, 'n2')).toBe('ai-wf-anon-42-n2');
    expect(buildIdempotencyKey('', 42, 'n3')).toBe('ai-wf-anon-42-n3');
  });

  it('builds createRun payload from structured selection', () => {
    expect(buildCreateRunPayload(selection, '  什么是 ACL？  ', 'ai-wf-7-42-n1')).toEqual({
      workflowVersionId: 42,
      input: { query: '什么是 ACL？' },
      idempotencyKey: 'ai-wf-7-42-n1',
    });
  });

  it('returns null without selection or empty query', () => {
    expect(buildCreateRunPayload(null, 'hello', 'k')).toBeNull();
    expect(buildCreateRunPayload(selection, '   ', 'k')).toBeNull();
  });

  it('never parses @workflow JSON from message body', () => {
    expect(parseWorkflowCommandFromMessage('@知识库问答 {"query":"x"}')).toBeNull();
    expect(parseWorkflowCommandFromMessage('@workflow:foo {"a":1}')).toBeNull();
  });
});
