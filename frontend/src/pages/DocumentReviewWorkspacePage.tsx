/**
 * 业务页面：DocumentReviewWorkspacePage。
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Input,
  Modal,
  Row,
  Space,
  Spin,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  HistoryOutlined,
  SendOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { normalizeMarkdown } from '../utils/markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { documentService, reviewService } from '@/services';
import { useAuthStore } from '@/stores';
import type { Document, ReviewTask } from '@/types';

dayjs.locale('zh-cn');

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f5f7fb',
  padding: 24,
};

const cardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: '1px solid #e6ebf2',
  boxShadow: '0 10px 32px rgba(15, 23, 42, 0.06)',
};

const markdownStyle = `
  .review-markdown {
    color: #1f2937;
    line-height: 1.8;
    font-size: 14px;
  }
  .review-markdown h1,
  .review-markdown h2,
  .review-markdown h3,
  .review-markdown h4 {
    color: #111827;
    margin-top: 1.2em;
    margin-bottom: 0.6em;
  }
  .review-markdown p,
  .review-markdown li {
    margin-bottom: 0.75em;
  }
  .review-markdown pre {
    background: #0f172a;
    color: #e2e8f0;
    padding: 16px;
    border-radius: 12px;
    overflow: auto;
  }
  .review-markdown code {
    background: rgba(15, 23, 42, 0.06);
    padding: 2px 6px;
    border-radius: 6px;
  }
  .review-markdown pre code {
    background: transparent;
    padding: 0;
  }
  .review-markdown blockquote {
    margin: 1em 0;
    padding: 12px 16px;
    border-left: 4px solid #93c5fd;
    background: #eff6ff;
    color: #1e3a8a;
    border-radius: 0 10px 10px 0;
  }
`;

const statusMeta: Record<ReviewTask['status'], { text: string; color: string; icon: React.ReactNode }> = {
  pending: { text: '待审核', color: 'gold', icon: <ClockCircleOutlined /> },
  approved: { text: '已通过', color: 'green', icon: <CheckCircleOutlined /> },
  rejected: { text: '已驳回', color: 'red', icon: <CloseCircleOutlined /> },
};

/**
 * documentStatusText。
 */
const documentStatusText = (status: Document['status']) => {
  if (status === 'draft' || status === 0) return '草稿';
  if (status === 'pending_review' || status === 3) return '待审核';
  if (status === 'published' || status === 1) return '已发布';
  if (status === 'archived' || status === 3) return '已归档';
  return '未知';
};

/**
 * canReviewByRoles。
 */
const canReviewByRoles = (roles: string[]) =>
  roles.some((role) => {
    const upperRole = role.toUpperCase();
    return upperRole.includes('REVIEWER') || upperRole.includes('ADMIN');
  });

/**
 * toTimelineColor。
 */
const toTimelineColor = (status: ReviewTask['status']) => {
  if (status === 'approved') return 'green';
  if (status === 'rejected') return 'red';
  return 'blue';
};

export const DocumentReviewWorkspacePage: React.FC = () => {
  const { documentId = '' } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [document, setDocument] = useState<Document | null>(null);
  const [currentTask, setCurrentTask] = useState<ReviewTask | null>(null);
  const [history, setHistory] = useState<ReviewTask[]>([]);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  const currentRoles = useMemo(() => user?.roles || (user?.role ? [user.role] : []), [user?.role, user?.roles]);
  const canReview = canReviewByRoles(currentRoles);
  const pendingTask = currentTask?.status === 'pending' ? currentTask : null;

  /**
   * loadData。
   */
  const loadData = useCallback(async () => {
    if (!documentId) {
      return;
    }
    setLoading(true);
    try {
      const [docRes, currentRes, historyRes] = await Promise.all([
        documentService.getDocument(documentId),
        reviewService.getCurrentReviewTask(documentId),
        reviewService.getReviewHistory(documentId),
      ]);
      setDocument(docRes);
      setCurrentTask(currentRes);
      setHistory(historyRes || []);
    } catch (error: any) {
      message.error(error?.message || '加载审核页失败');
    } finally {
      setLoading(false);
    }
  }, [documentId, message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * submitReview。
   */
  const submitReview = async (status: 'approved' | 'rejected', comment?: string) => {
    if (!pendingTask) {
      message.warning('当前文档没有待处理的审核任务');
      return;
    }
    setSubmitting(true);
    try {
      await reviewService.reviewDocument(pendingTask.id, { status, comment });
      message.success(status === 'approved' ? '审核已通过' : '已驳回该文档');
      setRejectOpen(false);
      setRejectComment('');
      await loadData();
    } catch (error: any) {
      message.error(error?.message || '审核失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const latestTaskMeta = currentTask ? statusMeta[currentTask.status] : null;

  return (
    <div style={pageStyle}>
      <style>{markdownStyle}</style>
      <div style={{ maxWidth: 1480, margin: '0 auto' }}>
        <Card style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <Space size={12} wrap style={{ marginBottom: 10 }}>
                <Tag color="blue" style={{ borderRadius: 999, paddingInline: 10 }}>文档审核页</Tag>
                {latestTaskMeta && (
                  <Tag color={latestTaskMeta.color} icon={latestTaskMeta.icon} style={{ borderRadius: 999, paddingInline: 10 }}>
                    {latestTaskMeta.text}
                  </Tag>
                )}
              </Space>
              <Title level={2} style={{ margin: 0, fontSize: 26 }}>
                {document?.title || currentTask?.documentTitle || '文档审核'}
              </Title>
              <Paragraph style={{ margin: '10px 0 0', color: '#64748b' }}>
                审核通知点击后会直接打开本页面，审核人员可在此集中查看文档内容、审核状态和历史记录。
              </Paragraph>
            </div>
            <Space wrap>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/review')}>
                返回审核管理
              </Button>
              <Button icon={<FileTextOutlined />} onClick={() => window.open(`/documents/${documentId}`, '_blank', 'noopener,noreferrer')}>
                查看文档详情
              </Button>
              <Button onClick={() => window.close()}>
                关闭窗口
              </Button>
            </Space>
          </div>
        </Card>

        <Spin spinning={loading}>
          <Row gutter={[20, 20]} align="top">
            <Col xs={24} xl={16}>
              <Card title="文档内容" style={cardStyle}>
                {document ? (
                  <>
                    <Descriptions column={2} size="small" style={{ marginBottom: 20 }}>
                      <Descriptions.Item label="作者">{document.author?.username || document.authorName || currentTask?.documentAuthor?.username || '未知'}</Descriptions.Item>
                      <Descriptions.Item label="分类">{currentTask?.categoryName || '未分类'}</Descriptions.Item>
                      <Descriptions.Item label="文档状态">{documentStatusText(document.status)}</Descriptions.Item>
                      <Descriptions.Item label="最后更新">{document.updatedAt ? dayjs(document.updatedAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
                    </Descriptions>
                    {document.summary && (
                      <Alert
                        type="info"
                        showIcon
                        message="摘要"
                        description={document.summary}
                        style={{ marginBottom: 20, borderRadius: 12 }}
                      />
                    )}
                    <div className="review-markdown">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                        {normalizeMarkdown(document.content || '暂无文档内容')}
                      </ReactMarkdown>
                    </div>
                  </>
                ) : (
                  <Empty description="未获取到文档内容" />
                )}
              </Card>
            </Col>

            <Col xs={24} xl={8}>
              <Space direction="vertical" size={20} style={{ width: '100%' }}>
                <Card title="当前审核任务" style={cardStyle}>
                  {currentTask ? (
                    <>
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="审核轮次">第 {currentTask.reviewRound || 1} 轮</Descriptions.Item>
                        <Descriptions.Item label="提交时间">{dayjs(currentTask.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
                        <Descriptions.Item label="审核人">{currentTask.reviewer?.username || '待领取 / 待处理'}</Descriptions.Item>
                        <Descriptions.Item label="审核意见">{currentTask.comment || '暂无'}</Descriptions.Item>
                      </Descriptions>

                      <Divider />

                      {!canReview && (
                        <Alert
                          type="warning"
                          showIcon
                          style={{ marginBottom: 16, borderRadius: 12 }}
                          message="当前账号没有审核权限"
                          description="请使用审核员或管理员账号处理该文档。"
                        />
                      )}

                      {pendingTask ? (
                        <Space direction="vertical" style={{ width: '100%' }} size={12}>
                          <Button
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            size="large"
                            block
                            disabled={!canReview}
                            loading={submitting}
                            onClick={() => submitReview('approved')}
                          >
                            审核通过
                          </Button>
                          <Button
                            danger
                            icon={<CloseCircleOutlined />}
                            size="large"
                            block
                            disabled={!canReview}
                            onClick={() => setRejectOpen(true)}
                          >
                            驳回文档
                          </Button>
                          <Text type="secondary">
                            通过后文档会发布，驳回后文档会退回草稿并通知作者。
                          </Text>
                        </Space>
                      ) : (
                        <Alert
                          type={currentTask.status === 'approved' ? 'success' : 'error'}
                          showIcon
                          style={{ borderRadius: 12 }}
                          message={currentTask.status === 'approved' ? '该文档已审核通过' : '该文档已审核驳回'}
                          description="当前任务已处理完成，无需重复审核。"
                        />
                      )}
                    </>
                  ) : (
                    <Empty description="暂无审核任务" />
                  )}
                </Card>

                <Card title={<Space><HistoryOutlined />审核历史</Space>} style={cardStyle}>
                  {history.length > 0 ? (
                    <Timeline
                      items={history.map((item) => ({
                        color: toTimelineColor(item.status),
                        children: (
                          <div>
                            <Space wrap style={{ marginBottom: 4 }}>
                              <Text strong>第 {item.reviewRound || 1} 轮</Text>
                              <Tag color={statusMeta[item.status].color}>{statusMeta[item.status].text}</Tag>
                            </Space>
                            <div style={{ color: '#64748b', fontSize: 13 }}>
                              提交时间：{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                            </div>
                            {item.reviewedAt && (
                              <div style={{ color: '#64748b', fontSize: 13 }}>
                                审核时间：{dayjs(item.reviewedAt).format('YYYY-MM-DD HH:mm:ss')}
                              </div>
                            )}
                            <div style={{ color: '#64748b', fontSize: 13 }}>
                              审核人：{item.reviewer?.username || '待处理'}
                            </div>
                            {item.comment && (
                              <div style={{ marginTop: 6, color: '#1f2937' }}>
                                审核意见：{item.comment}
                              </div>
                            )}
                          </div>
                        ),
                      }))}
                    />
                  ) : (
                    <Empty description="暂无审核历史" />
                  )}
                </Card>
              </Space>
            </Col>
          </Row>
        </Spin>
      </div>

      <Modal
        title="驳回文档"
        open={rejectOpen}
        onCancel={() => {
          if (!submitting) {
            setRejectOpen(false);
            setRejectComment('');
          }
        }}
        onOk={() => submitReview('rejected', rejectComment)}
        confirmLoading={submitting}
        okText="确认驳回"
        cancelText="取消"
        okButtonProps={{ danger: true, icon: <SendOutlined /> }}
        destroyOnHidden
      >
        <TextArea
          rows={5}
          value={rejectComment}
          onChange={(event) => setRejectComment(event.target.value)}
          placeholder="请输入驳回原因，便于作者修改后重新提交。"
          maxLength={500}
          showCount
        />
      </Modal>
    </div>
  );
};

export default DocumentReviewWorkspacePage;
