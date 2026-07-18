import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  List,
  Typography,
  Input,
  Divider,
  Tag,
} from 'antd';
import { App } from 'antd';
import {
  RobotOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  CheckOutlined,
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface AIWritingAssistantProps {
  content: string;
  onSelectSuggestion: (suggestion: string) => void;
  onGenerateContent: (content: string) => void;
}

export const AIWritingAssistant: React.FC<AIWritingAssistantProps> = ({
  content,
  onSelectSuggestion,
  onGenerateContent,
}) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'suggest' | 'generate'>('suggest');

  const handleGetSuggestions = async () => {
    if (!content.trim()) {
      message.warning('请先输入一些内容');
      return;
    }

    setLoading(true);
    try {
      // 这里应该调用AI API获取建议
      // const result = await aiService.getWritingSuggestions(content);
      // 模拟响应
      setTimeout(() => {
        setSuggestions([
          '建议添加更多实例来说明这个概念',
          '可以在开头添加一个概述段落',
          '建议使用图表来展示数据',
          '可以添加相关链接和引用',
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      setLoading(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!prompt.trim()) {
      message.warning('请输入生成提示');
      return;
    }

    setLoading(true);
    try {
      // 调用AI生成内容
      // const result = await aiService.generateContent(prompt);
      message.success('内容生成成功');
      onGenerateContent(`AI生成的内容：${prompt}`);
      setPrompt('');
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const quickPrompts = [
    '继续扩展这个主题',
    '添加代码示例',
    '总结当前内容',
    '优化语言表达',
    '添加注意事项',
  ];

  return (
    <Card
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          <span>AI写作助手</span>
        </Space>
      }
      size="small"
      style={{ height: '100%' }}
      styles={{ body: { padding: 16 } }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Button
            type={activeTab === 'suggest' ? 'primary' : 'default'}
            icon={<BulbOutlined />}
            onClick={() => setActiveTab('suggest')}
            style={{ marginRight: 8 }}
          >
            智能建议
          </Button>
          <Button
            type={activeTab === 'generate' ? 'primary' : 'default'}
            icon={<ThunderboltOutlined />}
            onClick={() => setActiveTab('generate')}
          >
            内容生成
          </Button>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {activeTab === 'suggest' && (
          <div>
            <Button
              type="primary"
              icon={<BulbOutlined />}
              onClick={handleGetSuggestions}
              loading={loading}
              block
            >
              获取写作建议
            </Button>

            {suggestions.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text strong>优化建议：</Text>
                <List
                  size="small"
                  dataSource={suggestions}
                  renderItem={(item, index) => (
                    <List.Item
                      style={{ cursor: 'pointer', padding: '8px 0' }}
                      onClick={() => onSelectSuggestion(item)}
                    >
                      <Space>
                        <Tag color="blue">{index + 1}</Tag>
                        <Text>{item}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'generate' && (
          <div>
            <Paragraph style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              输入提示词，AI将为您生成内容
            </Paragraph>

            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ fontSize: 12 }}>
                快捷提示：
              </Text>
              <div style={{ marginTop: 8 }}>
                <Space wrap>
                  {quickPrompts.map((qp) => (
                    <Tag
                      key={qp}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setPrompt(qp)}
                    >
                      {qp}
                    </Tag>
                  ))}
                </Space>
              </div>
            </div>

            <TextArea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="输入您想要生成的内容提示..."
              autoSize={{ minRows: 3, maxRows: 6 }}
              style={{ marginBottom: 8 }}
            />

            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleGenerateContent}
              loading={loading}
              block
            >
              生成内容
            </Button>
          </div>
        )}

        <Divider style={{ margin: '8px 0' }} />

        <div>
          <Text strong style={{ fontSize: 12 }}>
            写作技巧：
          </Text>
          <List
            size="small"
            dataSource={[
              '使用清晰的标题结构',
              '添加代码示例和图表',
              '保持段落简洁',
              '使用列表组织信息',
            ]}
            renderItem={(item) => (
              <List.Item style={{ padding: '4px 0', fontSize: 12 }}>
                <CheckOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                <Text type="secondary">{item}</Text>
              </List.Item>
            )}
          />
        </div>
      </Space>
    </Card>
  );
};
