/**
 * 功能模块：WorkflowCanvasEditor。
 */
import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import AgentWorkbench from './AgentWorkbench';
import type { RunStepState } from './run-debug';
import type { WorkflowTemplateKey } from './workflow-templates';
import './AgentWorkbench.css';
import './WorkflowCanvasEditor.css';

export interface WorkflowCanvasEditorProps {
  value: string;
  onChange: (json: string) => void;
  name: string;
  runSteps?: RunStepState[];
  focusedNodeId?: string | null;
  onApplyTemplate?: (key: WorkflowTemplateKey) => void;
}

/**
 * WorkflowCanvasEditor 组件。
 */
const WorkflowCanvasEditor: React.FC<WorkflowCanvasEditorProps> = (props) => (
  <ReactFlowProvider>
    <AgentWorkbench {...props} />
  </ReactFlowProvider>
);

export default WorkflowCanvasEditor;
