/**
 * 业务页面：DocumentVersionsPage。
 */
import React, { useEffect, useState } from 'react';
import {
  Card,
  List,
  Typography,
  Tag,
  Button,
  Space,
  Modal,
  Result,
  Tooltip,
  Popconfirm,
  Spin,
  Descriptions,
} from 'antd';
import { App } from 'antd';
import {
  HistoryOutlined,
  UserOutlined,
  ClockCircleOutlined,
  RollbackOutlined,
  EyeOutlined,
  DiffOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common';
import UserAvatar from '@/components/common/UserAvatar';
import { useVersionStore } from '@/stores';
import { DocumentVersion } from '@/types';
import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const { Text } = Typography;

export const DocumentVersionsPage: React.FC = () => {
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { versions, isLoading, isComparing, compareResult, fetchVersions, restoreVersion, compareVersions } =
    useVersionStore();

  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [compareModalVisible, setCompareModalVisible] = useState(false);

  useEffect(() => {
    if (id) {
      fetchVersions(id);
    }
  }, [fetchVersions, id]);

  /**
   * handleRestore。
   */
  const handleRestore = async (versionId: string) => {
    if (!id) return;

    try {
      await restoreVersion(id, versionId);
      message.success('版本恢复成功');
      // 重新获取版本列表
      await fetchVersions(id);
    } catch (error) {
      // Error handled
    }
  };

  /**
   * handlePreview。
   */
  const handlePreview = (version: DocumentVersion) => {
    setPreviewVersion(version);
    setPreviewVisible(true);
  };

  /**
   * handleCompare。
   */
  const handleCompare = () => {
    if (selectedVersions.length !== 2) {
      message.warning('请选择两个版本进行比较');
      return;
    }

    if (!id) return;

    setCompareModalVisible(true);
    compareVersions(id, selectedVersions[0], selectedVersions[1]);
  };

  const getVersionStatusTag = (version: DocumentVersion) => {
    if (version.isCurrent) {
      return <Tag color="green">当前版本</Tag>;
    }
    return <Tag>历史版本</Tag>;
  };

  return (
    <div>
      <PageHeader
        title="版本历史"
        subtitle="查看和恢复文档历史版本"
        extra={
          <Space>
            <Button
              icon={<RollbackOutlined />}
              disabled={selectedVersions.length !== 2}
              onClick={handleCompare}
            >
              比较版本
            </Button>
            <Button onClick={() => navigate(`/documents/${id}`)}>返回文档</Button>
          </Space>
        }
      />

      <Card style={{ borderRadius: 12 }}>
        <Spin spinning={isLoading}>
          {versions.length === 0 ? (
            <Result
              icon={<HistoryOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
              title="暂无版本历史"
              subTitle="该文档还没有任何版本记录"
            />
          ) : (
            <List
              dataSource={versions}
              renderItem={(version) => (
                <List.Item
                  key={version.id}
                  style={{
                    padding: '16px',
                    borderRadius: 8,
                    background: '#fff',
                    marginBottom: 8,
                    border: '1px solid #f0f0f0',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const selectedIndex = selectedVersions.indexOf(version.id);
                    if (selectedIndex > -1) {
                      setSelectedVersions(selectedVersions.filter((id) => id !== version.id));
                    } else if (selectedVersions.length < 2) {
                      setSelectedVersions([...selectedVersions, version.id]);
                    }
                  }}
                  actions={[
                    <Tooltip title="预览此版本">
                      <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(version);
                        }}
                      />
                    </Tooltip>,
                    !version.isCurrent && (
                      <Popconfirm
                        title="确定要恢复到此版本吗？"
                        description="恢复后将创建一个新版本"
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          handleRestore(version.id);
                        }}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button
                          type="text"
                          icon={<RollbackOutlined />}
                          onClick={(e) => e.stopPropagation()}
                          danger
                        >
                          恢复
                        </Button>
                      </Popconfirm>
                    ),
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          position: 'relative',
                          display: 'inline-block',
                        }}
                      >
                        <UserAvatar
                          src={version.author.avatar}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: selectedVersions.includes(version.id)
                              ? '2px solid #1890ff'
                              : '2px solid transparent',
                          }}
                        />
                        {selectedVersions.includes(version.id) && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: -4,
                              right: -4,
                              background: '#1890ff',
                              color: '#fff',
                              borderRadius: '50%',
                              width: 20,
                              height: 20,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 'bold',
                            }}
                          >
                            {selectedVersions.indexOf(version.id) + 1}
                          </div>
                        )}
                      </div>
                    }
                    title={
                      <Space>
                        <Text strong>v{version.version}</Text>
                        {getVersionStatusTag(version)}
                        <Text type="secondary">|</Text>
                        <Text>{version.title}</Text>
                      </Space>
                    }
                    description={
                      <div>
                        <Space size="large">
                          <Text type="secondary">
                            <ClockCircleOutlined /> {dayjs(version.createdAt).format('YYYY-MM-DD HH:mm')}
                          </Text>
                          <Text type="secondary">
                            <UserOutlined /> {version.author.username}
                          </Text>
                          {version.changeLog && (
                            <Text type="secondary">{version.changeLog}</Text>
                          )}
                        </Space>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Card>

      {/* 版本预览Modal */}
      <Modal
        title={`版本预览 - ${previewVersion?.version}`}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
          !previewVersion?.isCurrent && (
            <Popconfirm
              key="restore"
              title="确定要恢复到此版本吗？"
              onConfirm={() => {
                if (previewVersion && id) {
                  handleRestore(previewVersion.id);
                  setPreviewVisible(false);
                }
              }}
              okText="确定"
              cancelText="取消"
            >
              <Button type="primary" icon={<RollbackOutlined />} danger>
                恢复此版本
              </Button>
            </Popconfirm>
          ),
        ]}
        width={800}
      >
        {previewVersion && (
          <div>
            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="版本号">{previewVersion.version}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(previewVersion.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="创建人">{previewVersion.author.username}</Descriptions.Item>
              <Descriptions.Item label="变更说明">
                {previewVersion.changeLog || '-'}
              </Descriptions.Item>
            </Descriptions>
            <Card title="内容预览" size="small">
              <div style={{ maxHeight: 400, overflow: 'auto' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {previewVersion.content}
                </ReactMarkdown>
              </div>
            </Card>
          </div>
        )}
      </Modal>

      {/* 版本比较Modal */}
      <Modal
        title={
          <Space>
            <DiffOutlined />
            <span>版本比较</span>
          </Space>
        }
        open={compareModalVisible}
        onCancel={() => setCompareModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setCompareModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={1000}
      >
        {isComparing ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : compareResult ? (
          <div>
            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="旧版本">
                v{compareResult.old.version} ({dayjs(compareResult.old.createdAt).format('YYYY-MM-DD')})
              </Descriptions.Item>
              <Descriptions.Item label="新版本">
                v{compareResult.new.version} ({dayjs(compareResult.new.createdAt).format('YYYY-MM-DD')})
              </Descriptions.Item>
            </Descriptions>
            <Card title="差异对比" size="small">
              <div
                dangerouslySetInnerHTML={{ __html: compareResult.diff }}
                style={{
                  maxHeight: 400,
                  overflow: 'auto',
                  fontFamily: 'Monaco, Menlo, monospace',
                  fontSize: 13,
                }}
              />
            </Card>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default DocumentVersionsPage;
