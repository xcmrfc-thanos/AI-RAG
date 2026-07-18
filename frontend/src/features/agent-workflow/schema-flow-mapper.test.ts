import { describe, expect, it } from 'vitest';
import {
  flowToWorkflow,
  parseWorkflowJson,
  serializeWorkflow,
  workflowToFlow,
} from './schema-flow-mapper';

const SAMPLE = `{
  "schemaVersion": 1,
  "name": "知识库问答",
  "nodes": [
    {
      "id": "search",
      "type": "tool",
      "tool": "hybrid_search",
      "input": { "query": "\${input.query}", "topK": 5 }
    },
    {
      "id": "answer",
      "type": "llm",
      "input": { "prompt": "回答" }
    }
  ],
  "edges": [{ "from": "search", "to": "answer" }]
}`;

/**
 * 验证 Schema ↔ React Flow 往返同构
 */
describe('schema-flow-mapper', () => {
  it('roundtrips schemaVersion=1 JSON', () => {
    const wf = parseWorkflowJson(SAMPLE);
    const { nodes, edges } = workflowToFlow(wf);
    const back = flowToWorkflow(wf.name, nodes, edges);
    expect(back.schemaVersion).toBe(1);
    expect(back.nodes).toHaveLength(2);
    expect(back.edges).toEqual([{ from: 'search', to: 'answer' }]);
    expect(back.nodes[0]).toMatchObject({
      id: 'search',
      type: 'tool',
      tool: 'hybrid_search',
    });
    const again = parseWorkflowJson(serializeWorkflow(back));
    expect(again.nodes.map((n) => n.id)).toEqual(['search', 'answer']);
  });

  it('rejects unsupported schemaVersion', () => {
    expect(() => parseWorkflowJson('{"schemaVersion":2,"name":"x","nodes":[],"edges":[]}')).toThrow(
      /schemaVersion/,
    );
  });

  it('preserves optional inputSchema and uiSchema metadata', () => {
    const wf = parseWorkflowJson(`{
      "schemaVersion": 1,
      "name": "带画布元数据",
      "inputSchema": {
        "query": { "type": "string", "required": true, "label": "用户问题" }
      },
      "uiSchema": {
        "canvasNodes": [
          { "id": "start", "kind": "start", "position": { "x": 0, "y": 120 } },
          { "id": "end", "kind": "end", "position": { "x": 520, "y": 120 } }
        ]
      },
      "nodes": [
        { "id": "answer", "type": "llm", "input": { "prompt": "回答" } }
      ],
      "edges": []
    }`);

    const { nodes, edges } = workflowToFlow(wf);
    const back = flowToWorkflow(wf.name, nodes, edges, wf);

    expect(back.inputSchema).toEqual(wf.inputSchema);
    expect(back.uiSchema?.canvasNodes).toEqual(expect.arrayContaining(
      wf.uiSchema?.canvasNodes || [],
    ));
    const parsedAgain = parseWorkflowJson(serializeWorkflow(back));
    expect(parsedAgain.inputSchema).toEqual(wf.inputSchema);
    expect(parsedAgain.uiSchema?.canvasNodes).toEqual(expect.arrayContaining(
      wf.uiSchema?.canvasNodes || [],
    ));
  });

  it('roundtrips condition node and edge when labels', () => {
    const wf = parseWorkflowJson(`{
      "schemaVersion": 1,
      "name": "条件分支",
      "nodes": [
        {"id": "gate", "type": "condition", "input": {"expression": "\${input.score} >= 60"}},
        {"id": "pass", "type": "llm", "input": {"prompt": "pass"}},
        {"id": "fail", "type": "llm", "input": {"prompt": "fail"}},
        {"id": "join", "type": "llm", "input": {"prompt": "join"}}
      ],
      "edges": [
        {"from": "gate", "to": "pass", "when": "true"},
        {"from": "gate", "to": "fail", "when": "false"},
        {"from": "pass", "to": "join"},
        {"from": "fail", "to": "join"}
      ]
    }`);
    const { nodes, edges } = workflowToFlow(wf);
    const back = flowToWorkflow(wf.name, nodes, edges);
    expect(back.nodes.find((item) => item.id === 'gate')).toMatchObject({
      type: 'condition',
      input: { expression: '${input.score} >= 60' },
    });
    expect(back.edges).toEqual(expect.arrayContaining([
      { from: 'gate', to: 'pass', when: 'true' },
      { from: 'gate', to: 'fail', when: 'false' },
      { from: 'pass', to: 'join' },
      { from: 'fail', to: 'join' },
    ]));
  });

  it('roundtrips virtual start and end nodes outside executable schema', () => {
    const wf = parseWorkflowJson(`{
      "schemaVersion": 1,
      "name": "虚拟节点",
      "inputSchema": { "query": { "type": "string", "required": true } },
      "uiSchema": {
        "canvasNodes": [
          { "id": "start", "kind": "start", "position": { "x": 0, "y": 120 } },
          { "id": "answer", "kind": "llm", "position": { "x": 260, "y": 120 } },
          { "id": "end", "kind": "end", "position": { "x": 520, "y": 120 } }
        ],
        "canvasEdges": [
          { "from": "start", "to": "answer" },
          { "from": "answer", "to": "end" }
        ]
      },
      "nodes": [
        { "id": "answer", "type": "llm", "input": { "prompt": "回答" } }
      ],
      "edges": []
    }`);

    const flow = workflowToFlow(wf);
    expect(flow.nodes.map((item) => item.id)).toEqual(['answer', 'start', 'end']);
    expect(flow.edges.map((item) => [item.source, item.target])).toEqual([
      ['start', 'answer'],
      ['answer', 'end'],
    ]);

    const back = flowToWorkflow(wf.name, flow.nodes, flow.edges, wf);
    expect(back.nodes.map((item) => item.id)).toEqual(['answer']);
    expect(back.edges).toEqual([]);
    expect(back.uiSchema?.canvasNodes?.map((item) => item.id)).toEqual([
      'answer',
      'start',
      'end',
    ]);
    expect(back.uiSchema?.canvasEdges).toEqual([
      { from: 'start', to: 'answer' },
      { from: 'answer', to: 'end' },
    ]);
  });
});
