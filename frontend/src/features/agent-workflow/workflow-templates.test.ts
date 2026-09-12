import { describe, expect, it } from 'vitest';
import { createWorkflowTemplate } from './workflow-templates';

describe('workflow-templates', () => {
  it('creates a knowledge base Q&A chain', () => {
    const template = createWorkflowTemplate('knowledge-qa');
    expect(template.inputSchema).toHaveProperty('query');
    expect(template.nodes.map(nodeLabel)).toEqual(['hybrid_search', 'llm']);
    expect(template.edges).toEqual([{ from: 'search', to: 'answer' }]);
  });

  it('creates a document summary chain', () => {
    const template = createWorkflowTemplate('document-summary');
    expect(template.inputSchema).toHaveProperty('documentId');
    expect(template.nodes.map(nodeLabel)).toEqual(['get_document', 'llm']);
    expect(template.nodes[0].input.documentId).toBe('${input.documentId}');
  });

  it('creates a topic digest chain', () => {
    const template = createWorkflowTemplate('topic-digest');
    expect(template.inputSchema).toHaveProperty('keyword');
    expect(template.nodes.map(nodeLabel)).toEqual(['list_documents', 'text_template', 'llm']);
    expect(template.edges).toHaveLength(2);
  });

  it('creates an empty visual canvas without executable nodes', () => {
    const template = createWorkflowTemplate('blank');
    expect(template.nodes).toEqual([]);
    expect(template.edges).toEqual([]);
    expect(template.uiSchema?.canvasNodes?.map((node) => node.kind)).toEqual(['start', 'end']);
  });
});

function nodeLabel(node: ReturnType<typeof createWorkflowTemplate>['nodes'][number]): string {
  return node.type === 'llm' ? 'llm' : (node as { tool?: string }).tool ?? 'end';
}
