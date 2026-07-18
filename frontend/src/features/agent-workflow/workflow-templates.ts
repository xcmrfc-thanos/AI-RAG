import type { WorkflowDefinitionV1, WorkflowNodeV1 } from './types';

export type WorkflowTemplateKey =
  | 'knowledge-qa'
  | 'document-summary'
  | 'topic-digest'
  | 'blank';

export interface WorkflowTemplateMeta {
  key: WorkflowTemplateKey;
  title: string;
  description: string;
  steps: string;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplateMeta[] = [
  {
    key: 'knowledge-qa',
    title: '知识库问答',
    description: '检索当前用户可见知识，再由大模型生成答案。',
    steps: '开始 → 混合检索 → 大模型 → 结束',
  },
  {
    key: 'document-summary',
    title: '指定文档总结',
    description: '输入文档 ID，读取正文后生成结构化摘要。',
    steps: '开始 → 读取文档 → 大模型 → 结束',
  },
  {
    key: 'topic-digest',
    title: '主题资料汇总',
    description: '按关键词列出资料、拼接语料并生成主题汇总。',
    steps: '开始 → 文档列表 → 文本模板 → 大模型 → 结束',
  },
  {
    key: 'blank',
    title: '空白画布',
    description: '只保留开始和结束节点，从节点库自行搭建。',
    steps: '开始 → 结束',
  },
];

export function createWorkflowTemplate(key: WorkflowTemplateKey): WorkflowDefinitionV1 {
  const definition = TEMPLATE_FACTORIES[key]();
  return JSON.parse(JSON.stringify(definition)) as WorkflowDefinitionV1;
}

export function createWorkflowTemplateJson(key: WorkflowTemplateKey): string {
  return JSON.stringify(createWorkflowTemplate(key), null, 2);
}

const TEMPLATE_FACTORIES: Record<WorkflowTemplateKey, () => WorkflowDefinitionV1> = {
  'knowledge-qa': () => buildDefinition(
    '知识库问答',
    { query: { type: 'string', required: true, label: '用户问题' } },
    [
      toolNode('search', 'hybrid_search', {
        query: '${input.query}', mode: 'hybrid', topK: 5,
      }),
      llmNode('answer', '根据检索结果回答问题。\n问题：${input.query}\n资料：${steps.search.output.untrustedCorpus}'),
    ],
    ['search', 'answer'],
  ),
  'document-summary': () => buildDefinition(
    '指定文档总结',
    { documentId: { type: 'number', required: true, label: '文档 ID' } },
    [
      toolNode('document', 'get_document', {
        documentId: '${input.documentId}', maxChars: 8000,
      }),
      llmNode('summary', '请提炼文档的主题、要点和结论。\n文档：${steps.document.output.untrustedContent}'),
    ],
    ['document', 'summary'],
  ),
  'topic-digest': () => buildDefinition(
    '主题资料汇总',
    { keyword: { type: 'string', required: true, label: '主题关键词' } },
    [
      toolNode('documents', 'list_documents', { keyword: '${input.keyword}', size: 10 }),
      toolNode('context', 'text_template', {
        template: '主题：${input.keyword}\n资料列表：${steps.documents.output.untrustedCorpus}',
      }),
      llmNode('digest', '请基于资料形成主题综述，标明主要观点与可继续研究的问题。\n${steps.context.output.text}'),
    ],
    ['documents', 'context', 'digest'],
  ),
  blank: () => buildDefinition('空白工作流', {}, [], []),
};

export const DEFAULT_WORKFLOW_TEMPLATE_JSON = createWorkflowTemplateJson('knowledge-qa');

function buildDefinition(
  name: string,
  inputSchema: WorkflowDefinitionV1['inputSchema'],
  nodes: WorkflowNodeV1[],
  chain: string[],
): WorkflowDefinitionV1 {
  const visualChain = ['start', ...chain, 'end'];
  return {
    schemaVersion: 1,
    name,
    inputSchema,
    uiSchema: {
      canvasNodes: visualChain.map((id, index) => ({
        id,
        kind: id === 'start' || id === 'end'
          ? id
          : nodeKind(nodes.find((node) => node.id === id)),
        position: { x: 40 + index * 260, y: 120 },
      })),
      canvasEdges: visualChain.slice(0, -1).map((from, index) => ({
        from,
        to: visualChain[index + 1],
      })),
      endOutput: chain.length > 0 ? `\${steps.${chain.at(-1)}.output.text}` : '',
    },
    nodes,
    edges: chain.slice(0, -1).map((from, index) => ({ from, to: chain[index + 1] })),
  };
}

function toolNode(
  id: string,
  tool: Extract<WorkflowNodeV1, { type: 'tool' }>['tool'],
  input: Record<string, unknown>,
): WorkflowNodeV1 {
  return { id, type: 'tool', tool, input };
}

function llmNode(id: string, prompt: string): WorkflowNodeV1 {
  return { id, type: 'llm', input: { prompt } };
}

function nodeKind(node?: WorkflowNodeV1): string {
  if (!node) return 'end';
  return node.type === 'llm' ? 'llm' : node.tool;
}
