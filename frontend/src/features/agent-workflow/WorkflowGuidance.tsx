import React, { memo } from 'react';
import { Alert, Collapse, Space, Tag, Typography } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import './WorkflowGuidance.css';

const { Text } = Typography;

interface WorkflowGuidanceProps {
  draftJson: string;
}

const WorkflowGuidance: React.FC<WorkflowGuidanceProps> = ({ draftJson }) => (
  <div className="wf-guidance">
    <Alert
      type="info"
      showIcon
      title="推荐流程：编排 → 校验 → 试运行草稿 → 发布"
      description={(
        <Space wrap size={[6, 6]}>
          {['拖入并连接节点', '配置字段和上游变量', '校验草稿', '试运行并查看节点轨迹', '确认后发布']
            .map((item) => <Tag icon={<CheckCircleOutlined />} key={item}>{item}</Tag>)}
        </Space>
      )}
    />
    <Collapse
      ghost
      size="small"
      items={[
        {
          key: 'variables',
          label: '变量引用示例',
          children: (
            <Text code>
              {'${input.query} · ${steps.search.output.untrustedCorpus} · ${steps.answer.output.text}'}
            </Text>
          ),
        },
        {
          key: 'json',
          label: '高级：查看当前工作流 JSON',
          children: <pre className="wf-guidance__json">{draftJson}</pre>,
        },
      ]}
    />
  </div>
);

export default memo(WorkflowGuidance);
