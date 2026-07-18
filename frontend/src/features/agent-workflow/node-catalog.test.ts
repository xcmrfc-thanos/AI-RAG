import { describe, expect, it } from 'vitest';
import { AGENT_NODE_CATALOG, defaultInputFor, getCatalogItem } from './node-catalog';

describe('node-catalog', () => {
  it('contains the approved virtual, read-only, transform, and llm nodes', () => {
    expect(AGENT_NODE_CATALOG.map((item) => item.kind)).toEqual([
      'start',
      'end',
      'condition',
      'hybrid_search',
      'get_document',
      'list_documents',
      'list_categories',
      'list_tags',
      'hot_documents',
      'latest_documents',
      'graph_search',
      'text_template',
      'llm',
    ]);
    expect(getCatalogItem('start').virtual).toBe(true);
    expect(getCatalogItem('condition').group).toBe('control');
    expect(getCatalogItem('list_documents').group).toBe('knowledge');
    expect(getCatalogItem('graph_search').group).toBe('knowledge');
  });

  it('provides usable default inputs and output metadata', () => {
    expect(defaultInputFor('list_documents')).toMatchObject({ size: 10 });
    expect(defaultInputFor('list_tags')).toMatchObject({ limit: 10 });
    expect(defaultInputFor('hot_documents')).toMatchObject({ size: 6, type: 'composite' });
    expect(defaultInputFor('graph_search')).toMatchObject({ limit: 10 });
    expect(defaultInputFor('text_template')).toMatchObject({ template: expect.any(String) });
    expect(defaultInputFor('condition')).toMatchObject({ expression: expect.any(String) });
    expect(getCatalogItem('llm').outputs.map((field) => field.path)).toContain('text');
    expect(getCatalogItem('condition').outputs.map((field) => field.path)).toContain('result');
  });
});
