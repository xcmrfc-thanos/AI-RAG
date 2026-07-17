# Agent 画布上下文操作与连线快捷交互 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Agent 线性工作流画布增加 Dify 式节点/连线右键菜单、连线就地插入与断开、复制粘贴和安全快捷键。

**Architecture:** 保持 `AgentWorkbench` 为状态协调层，把图变换放入纯函数，把菜单、边内选择器和快捷键拆成独立组件/Hook。所有工作流变更继续通过现有 `commit()` 和历史栈，保持 Schema v1、线性校验和自动保存链路不变。

**Tech Stack:** React 18、TypeScript、Ant Design、`@xyflow/react`、Vitest、Vite。

---

## Task 1: 用纯函数补齐断开、复制和粘贴行为

**Files:**
- Modify: `frontend/src/features/agent-workflow/workflow-editor-operations.ts`
- Modify: `frontend/src/features/agent-workflow/workflow-editor-operations.test.ts`

- [x] **Step 1: 写失败测试**

新增用例并直接断言真实图结果：

```ts
it('disconnects only the requested edge', () => {
  const result = disconnectEdge([edge('e1', 'start', 'a'), edge('e2', 'a', 'end')], 'e1');
  expect(result.map((item) => item.id)).toEqual(['e2']);
});

it('copies node data without sharing nested input', () => {
  const copied = copyFlowNode(node('a', 'llm'));
  copied.input.prompt = 'changed';
  expect(nodes[0].data.input.prompt).not.toBe('changed');
});

it('pastes a real node with a new id and requested position', () => {
  const pasted = pasteFlowNode(copied, 'llm2', { x: 320, y: 180 });
  expect(pasted).toMatchObject({ id: 'llm2', position: { x: 320, y: 180 } });
});
```

- [x] **Step 2: 验证 RED**

Run：

```powershell
npm run test -- --run src/features/agent-workflow/workflow-editor-operations.test.ts
```

Expected：FAIL，提示 `disconnectEdge`、`copyFlowNode` 或 `pasteFlowNode` 未导出。

- [x] **Step 3: 最小实现**

实现：

```ts
disconnectEdge(edges, edgeId): Edge[]
copyFlowNode(node): CopiedFlowNode | null
pasteFlowNode(copied, id, position): Node<FlowNodeData>
positionBetweenConnectedNodes(nodes, edge): XYPosition
```

虚拟节点复制返回 `null`；输入对象必须深复制一层现有 JSON 数据结构；断开不存在的边时返回原边数组。

- [x] **Step 4: 验证 GREEN 并提交**

Run 同 Step 2，Expected：全部 PASS。

Commit：

```text
feat(agent): 补齐画布复制与断开操作
```

## Task 2: 增加上下文菜单与连线就地选择器

**Files:**
- Create: `frontend/src/features/agent-workflow/WorkflowContextMenu.tsx`
- Create: `frontend/src/features/agent-workflow/EdgeActionPopover.tsx`
- Modify: `frontend/src/features/agent-workflow/WorkflowEdge.tsx`
- Modify: `frontend/src/features/agent-workflow/WorkflowCanvasEditor.css`

- [x] **Step 1: 实现菜单展示模型**

`WorkflowContextMenu` 接收 `kind: 'node' | 'edge' | 'pane'`、屏幕坐标、动作能力和回调。节点菜单渲染配置/复制/创建副本/删除；边菜单渲染插入/断开；画布菜单渲染粘贴/自动布局/适应画布。危险动作使用红色并带图标，所有菜单项使用原生 button、`role=menuitem` 和 44px 命中区域。

- [x] **Step 2: 实现边内节点选择器**

`EdgeActionPopover` 使用 `AGENT_NODE_CATALOG`，排除 `start/end`，支持中文名、工具名和说明搜索。选择节点调用 `onInsert(kind)`，底部“断开此连接”调用 `onDisconnect()`。

- [x] **Step 3: 改造边触发器**

`WorkflowEdge` 的加号改为切换当前边弹层；边数据回调改为：

```ts
onToggleActions(edgeId)
onInsert(edgeId, kind)
onDisconnect(edgeId)
actionsOpen
```

点击、右键和弹层内部操作必须阻止冒泡，避免意外平移或取消选择。

- [x] **Step 4: 定向验证**

Run：

```powershell
npm run lint
npm run type-check
```

Expected：0 error / 0 warning，TypeScript exit 0。

## Task 3: 集成右键目标、剪贴板、快捷键和历史

**Files:**
- Create: `frontend/src/features/agent-workflow/useWorkflowCanvasShortcuts.ts`
- Modify: `frontend/src/features/agent-workflow/AgentWorkbench.tsx`
- Modify: `frontend/src/features/agent-workflow/WorkflowCanvasEditor.css`

- [x] **Step 1: 集成右键目标**

在 React Flow 接入 `onNodeContextMenu`、`onEdgeContextMenu`、`onPaneContextMenu`。保存相对画布坐标，右键目标同步选择，点击画布、移动视口、Escape 或执行动作后关闭。

- [x] **Step 2: 集成边插入与断开**

插入时使用 `positionBetweenConnectedNodes` 创建新节点，再调用现有 `insertNodeOnEdge`，通过 `commit()` 一次写入节点和两条新边。断开使用 `disconnectEdge` 并通过 `commit()` 写入历史。

- [x] **Step 3: 集成内部剪贴板**

复制保存 `CopiedFlowNode`；粘贴生成新 ID，位置优先使用最近鼠标位置，回退到画布中心；创建副本使用原节点右下偏移。所有新节点自动选中。

- [x] **Step 4: 实现安全快捷键**

`useWorkflowCanvasShortcuts` 监听 Ctrl/Cmd+C/V/D、Delete/Backspace 和 Escape。若事件目标是 `input`、`textarea`、`select` 或 `contenteditable` 则直接返回。快捷键只调用传入动作，不读取全局工作流状态。

- [x] **Step 5: 控制文件边界**

将菜单和快捷键逻辑留在新文件中，确保 `AgentWorkbench.tsx` 不继续膨胀；若集成后仍超过 300 行，将 ReactFlow 主体 JSX 提取为 `WorkflowCanvasSurface.tsx`，保持行为不变。

- [x] **Step 6: 定向验证并提交**

Run：

```powershell
npm run test -- --run src/features/agent-workflow
npm run lint
npm run type-check
```

Expected：全部 PASS。

Commit：

```text
feat(agent): 增加画布右键与快捷操作
```

## Task 4: 完整验证、运行态验收和进度同步

**Files:**
- Modify: `docs/plans/2026-07-17-agent画布体验优化进度.md`
- Modify: `readme_plan.md`

- [x] **Step 1: 完整前端门禁**

```powershell
npm run lint
npm run type-check
npm run test
npm run build
```

Expected：lint 0/0、type-check exit 0、全部 Vitest 通过、build exit 0。

- [ ] **Step 2: 运行态检查**

自动化部分已完成：`/admin/agents` 返回 HTTP 200，Vite 客户端正常加载。当前会话未提供浏览器自动化插件，节点右键、连线加号和快捷键的视觉交互由用户在已启动页面完成最终确认。

保持 `AI_RAG_GATEWAY_URL=http://127.0.0.1:18080` 的 Vite 服务运行，检查 `/admin/agents` HTTP 200。浏览器验证：节点右键菜单、连线加号就地插入、连线断开、复制粘贴、创建副本、Delete、撤销/重做和输入框快捷键保护。

- [x] **Step 3: 更新进度文档**

记录 Dify 参考、实际交互、测试数量、构建结果和提交哈希；不宣称条件分支、循环或多选能力。

- [x] **Step 4: 提交与根仓引用**

Frontend：

```text
feat(agent): 完成画布上下文操作
```

Root：

```text
docs(agent): 同步画布快捷交互进度
chore(frontend): 接入画布快捷交互
```

不 push。
