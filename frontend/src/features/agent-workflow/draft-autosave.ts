import type { WorkflowInputFieldSchema } from './types';

export interface RevisionGate {
  next: () => number;
  acknowledge: (revision: number) => boolean;
  current: () => number;
}

export function createRevisionGate(): RevisionGate {
  let revision = 0;
  return {
    next: () => {
      revision += 1;
      return revision;
    },
    acknowledge: (candidate) => candidate === revision,
    current: () => revision,
  };
}

export function buildDraftInputDefaults(
  schema?: Record<string, WorkflowInputFieldSchema>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema || {})) {
    if (field.defaultValue !== undefined) {
      result[key] = field.defaultValue;
    } else if (field.type === 'number') {
      result[key] = 0;
    } else if (field.type === 'boolean') {
      result[key] = false;
    } else if (key === 'query') {
      result[key] = '请根据知识库回答：什么是 RAG？';
    } else {
      result[key] = '';
    }
  }
  return result;
}

export function validateDraftInput(
  schema: Record<string, WorkflowInputFieldSchema> | undefined,
  input: Record<string, unknown>,
): string[] {
  const errors: string[] = [];
  for (const [key, field] of Object.entries(schema || {})) {
    if (!field.required) continue;
    const value = input[key];
    const missing = value == null || (typeof value === 'string' && value.trim() === '');
    if (missing) errors.push(`${field.label || key}不能为空`);
  }
  return errors;
}

export function draftSaveStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    saving: '保存中', saved: '已自动保存', failed: '保存失败', unsaved: '未保存',
  };
  return labels[status] || '本地草稿';
}
