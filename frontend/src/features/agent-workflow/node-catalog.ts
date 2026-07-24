/**
 * Agent 工作流节点目录：画布、属性表单和变量选择器的单一元数据源
 */

import type { WorkflowToolName } from './types';

export type AgentNodeKind = 'start' | 'end' | WorkflowToolName | 'llm' | 'condition';
export type AgentNodeGroup = 'flow' | 'knowledge' | 'transform' | 'ai' | 'control';

export interface AgentNodeField {
  path: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  description?: string;
}

export interface AgentNodeCatalogItem {
  kind: AgentNodeKind;
  title: string;
  subtitle: string;
  hint: string;
  group: AgentNodeGroup;
  accent: string;
  virtual?: boolean;
  inputs: AgentNodeField[];
  outputs: AgentNodeField[];
}

const field = (
  path: string,
  label: string,
  type: AgentNodeField['type'],
  description?: string,
): AgentNodeField => ({ path, label, type, description });

export const AGENT_NODE_CATALOG: AgentNodeCatalogItem[] = [
  {
    kind: 'start', title: '开始', subtitle: 'input', hint: '定义运行时输入字段',
    group: 'flow', accent: '#16a34a', virtual: true, inputs: [],
    outputs: [field('query', '用户问题', 'string')],
  },
  {
    kind: 'end', title: '结束', subtitle: 'output', hint: '选择最终展示结果',
    group: 'flow', accent: '#16a34a', virtual: true,
    inputs: [field('output', '最终输出', 'object')], outputs: [],
  },
  {
    kind: 'condition', title: '条件分支', subtitle: 'condition',
    hint: '按表达式走 true/false 两路，须汇合到同一终点',
    group: 'control', accent: '#ca8a04',
    inputs: [field('expression', '条件表达式', 'string', '如 ${input.score} >= 60')],
    outputs: [field('result', '布尔结果', 'boolean'), field('expression', '展开后表达式', 'string')],
  },
  {
    kind: 'hybrid_search', title: '混合检索', subtitle: 'hybrid_search',
    hint: '按用户问题检索当前用户可见知识', group: 'knowledge', accent: '#2563eb',
    inputs: [field('query', '检索问题', 'string'), field('topK', '返回条数', 'number')],
    outputs: [field('hits', '命中文档', 'array'), field('hitCount', '命中数', 'number'),
      field('untrustedCorpus', '检索语料', 'string')],
  },
  {
    kind: 'get_document', title: '读取文档', subtitle: 'get_document',
    hint: '按文档 ID 读取有权限访问的正文', group: 'knowledge', accent: '#0d9488',
    inputs: [field('documentId', '文档 ID', 'number'), field('maxChars', '最大字符', 'number')],
    outputs: [field('title', '标题', 'string'), field('content', '正文', 'string'),
      field('untrustedContent', '不可信正文', 'string')],
  },
  {
    kind: 'list_documents', title: '文档列表', subtitle: 'list_documents',
    hint: '按关键词或分类列出当前用户可见文档', group: 'knowledge', accent: '#0284c7',
    inputs: [field('keyword', '关键词', 'string'), field('categoryId', '分类 ID', 'number'),
      field('size', '数量', 'number')],
    outputs: [field('documents', '文档列表', 'array'), field('total', '总数', 'number'),
      field('untrustedCorpus', '列表语料', 'string')],
  },
  {
    kind: 'list_categories', title: '分类列表', subtitle: 'list_categories',
    hint: '读取知识库分类树', group: 'knowledge', accent: '#0891b2', inputs: [],
    outputs: [field('categories', '分类树', 'array'),
      field('flatCategories', '平铺分类', 'array'), field('count', '分类数', 'number')],
  },
  {
    kind: 'list_tags', title: '标签列表', subtitle: 'list_tags',
    hint: '读取热门标签或指定分类标签', group: 'knowledge', accent: '#0f766e',
    inputs: [field('categoryId', '分类 ID', 'number'), field('limit', '数量', 'number')],
    outputs: [field('tags', '标签列表', 'array'), field('count', '标签数', 'number')],
  },
  {
    kind: 'hot_documents', title: '热门文档', subtitle: 'hot_documents',
    hint: '读取热门文档并按当前用户 ACL 过滤', group: 'knowledge', accent: '#ea580c',
    inputs: [field('size', '数量', 'number'), field('type', '热度类型', 'string')],
    outputs: [field('documents', '文档列表', 'array'), field('count', '数量', 'number'),
      field('untrustedCorpus', '列表语料', 'string')],
  },
  {
    kind: 'latest_documents', title: '最新文档', subtitle: 'latest_documents',
    hint: '读取最新文档并按当前用户 ACL 过滤', group: 'knowledge', accent: '#c2410c',
    inputs: [field('size', '数量', 'number')],
    outputs: [field('documents', '文档列表', 'array'), field('count', '数量', 'number'),
      field('untrustedCorpus', '列表语料', 'string')],
  },
  {
    kind: 'graph_search', title: '图谱搜索', subtitle: 'graph_search',
    hint: '搜索知识图谱节点，仅返回关联可见文档的命中', group: 'knowledge', accent: '#7c3aed',
    inputs: [field('keyword', '关键词', 'string'), field('limit', '数量', 'number')],
    outputs: [field('nodes', '图谱节点', 'array'), field('count', '数量', 'number'),
      field('untrustedCorpus', '图谱语料', 'string')],
  },
  {
    kind: 'text_template', title: '文本模板', subtitle: 'text_template',
    hint: '组合上游变量形成稳定文本', group: 'transform', accent: '#d97706',
    inputs: [field('template', '模板文本', 'string')],
    outputs: [field('text', '组合文本', 'string')],
  },
  {
    kind: 'llm', title: '大模型处理', subtitle: 'llm',
    hint: '执行问答、总结、提取、改写或分类', group: 'ai', accent: '#7c3aed',
    inputs: [field('prompt', '提示词', 'string')],
    outputs: [field('text', '生成文本', 'string'), field('model', '使用模型', 'string'),
      field('stub', '是否 Stub', 'boolean')],
  },
];

/**
 * 获取CatalogItem。
 */
export function getCatalogItem(kind: AgentNodeKind): AgentNodeCatalogItem {
  return AGENT_NODE_CATALOG.find((item) => item.kind === kind) || AGENT_NODE_CATALOG[0];
}

/**
 * defaultInputFor 方法。
 */
export function defaultInputFor(kind: AgentNodeKind): Record<string, unknown> {
  switch (kind) {
    case 'hybrid_search': return { query: '${input.query}', mode: 'hybrid', topK: 5 };
    case 'get_document': return { documentId: '${input.documentId}', maxChars: 4000 };
    case 'list_documents': return { keyword: '${input.query}', size: 10 };
    case 'list_categories': return {};
    case 'list_tags': return { limit: 10 };
    case 'hot_documents': return { size: 6, type: 'composite' };
    case 'latest_documents': return { size: 6 };
    case 'graph_search': return { keyword: '${input.query}', limit: 10 };
    case 'text_template': return { template: '资料：${steps.search.output}' };
    case 'llm': return {
      prompt: '根据资料回答问题。\n问题：${input.query}\n资料：${steps.search.output}',
    };
    case 'condition': return { expression: '${input.score} >= 60' };
    default: return {};
  }
}

/**
 * displayTitle 方法。
 */
export function displayTitle(
  schemaType: 'tool' | 'llm' | 'condition' | 'virtual',
  tool?: string,
  kind?: string,
): string {
  const resolved = schemaType === 'llm' || schemaType === 'condition'
    ? schemaType
    : schemaType === 'virtual' ? kind : tool;
  return getCatalogItem((resolved || 'hybrid_search') as AgentNodeKind).title;
}
