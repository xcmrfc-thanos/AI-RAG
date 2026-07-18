import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Card, Button, Space, Tag, Typography, Row, Col,
  Table, Input, message, Modal, Tooltip, Popconfirm,
  DatePicker,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckOutlined, CloseOutlined, EyeOutlined, SearchOutlined,
  ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  ReloadOutlined, UserOutlined, FolderOutlined,
} from '@ant-design/icons';
import { reviewService } from '@/services';
import { useAuthStore } from '@/stores';
import { ReviewTask } from '@/types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { PERMISSIONS, hasPermission } from '@/utils/permission';
import { AdminPageHeader } from '@/components/common';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

// ────────── Design Tokens ──────────
const C = {
  bg: '#f6f7f9',
  surface: '#ffffff',
  border: '#e8ebf0',
  text: '#111827',
  textSec: '#566073',
  textTer: '#8c94a3',
  pending: '#f59e0b',
  pendingBg: 'rgba(245,158,11,0.08)',
  approved: '#10b981',
  approvedBg: 'rgba(16,185,129,0.08)',
  rejected: '#ef4444',
  rejectedBg: 'rgba(239,68,68,0.08)',
  shadow: '0 1px 3px rgba(0,0,0,0.06)',
  radius: 12,
};

const statusMeta: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: '待审核', color: C.pending, bg: C.pendingBg, icon: <ClockCircleOutlined /> },
  approved: { label: '已通过', color: C.approved, bg: C.approvedBg, icon: <CheckCircleOutlined /> },
  rejected: { label: '已驳回', color: C.rejected, bg: C.rejectedBg, icon: <ExclamationCircleOutlined /> },
};

// ────────── Component ──────────
export const ReviewPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const canReview = hasPermission(user, PERMISSIONS.documentReview);
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [activeTab, setActiveTab] = useState('pending');
  const [searchText, setSearchText] = useState('');

  // Reject modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTask, setRejectTask] = useState<ReviewTask | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());

  // ── Filters ──
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [authorFilter, setAuthorFilter] = useState<string | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);

  const loadData = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const [taskRes, statsRes] = await Promise.all([
        reviewService.getReviewTasks({ status, page: 1, pageSize: 100 }),
        reviewService.getReviewStats(),
      ]);
      setTasks(taskRes.list || []);
      setStats(statsRes || { pending: 0, approved: 0, rejected: 0 });
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData('pending'); }, [loadData]);

  // ── Approve ──
  const handleApprove = async (task: ReviewTask) => {
    setSubmittingIds((prev) => new Set(prev).add(task.id));
    try {
      await reviewService.reviewDocument(task.id, { status: 'approved' });
      message.success('审核已通过');
      loadData(activeTab);
    } catch {
      message.error('操作失败，请重试');
    } finally {
      setSubmittingIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  // ── Reject Flow ──
  const openRejectModal = (task: ReviewTask) => {
    setRejectTask(task);
    setRejectComment('');
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectTask) return;
    if (!rejectComment.trim()) {
      message.warning('驳回时请填写审核意见');
      return;
    }
    setSubmittingIds((prev) => new Set(prev).add(rejectTask.id));
    try {
      await reviewService.reviewDocument(rejectTask.id, { status: 'rejected', comment: rejectComment });
      message.success('已驳回');
      setRejectModalOpen(false);
      setRejectTask(null);
      loadData(activeTab);
    } catch {
      message.error('操作失败，请重试');
    } finally {
      setSubmittingIds((prev) => {
        const next = new Set(prev);
        next.delete(rejectTask.id);
        return next;
      });
    }
  };

  // ── Batch Approve ──
  const handleBatchApprove = async () => {
    const pendingTasks = tasks.filter((t) => t.status === 'pending');
    if (!pendingTasks.length) return message.warning('没有待审核的任务');
    try {
      await reviewService.batchReview(pendingTasks.map((t) => t.id), { status: 'approved' });
      message.success(`已批量通过 ${pendingTasks.length} 个任务`);
      loadData(activeTab);
    } catch {
      message.error('批量操作失败');
    }
  };

  // ── Filter ──
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Keyword search
      if (searchText) {
        const keyword = searchText.toLowerCase();
        const matchTitle = t.documentTitle.toLowerCase().includes(keyword);
        const matchAuthor = (t.documentAuthor?.username || '').toLowerCase().includes(keyword);
        if (!matchTitle && !matchAuthor) return false;
      }
      // Date range
      if (dateRange && dateRange[0] && dateRange[1]) {
        const taskDate = dayjs(t.createdAt);
        if (taskDate.isBefore(dateRange[0], 'day') || taskDate.isAfter(dateRange[1], 'day')) return false;
      }
      // Author (text match)
      if (authorFilter && !(t.documentAuthor?.username || '').toLowerCase().includes(authorFilter.toLowerCase())) return false;
      // Category (text match)
      if (categoryFilter && !(t.categoryName || '').toLowerCase().includes(categoryFilter.toLowerCase())) return false;
      return true;
    });
  }, [tasks, searchText, dateRange, authorFilter, categoryFilter]);

  // ── Table Columns ──
  const columns: ColumnsType<ReviewTask> = [
    {
      title: '序号',
      key: 'index',
      width: 64,
      align: 'center',
      render: (_: unknown, __: ReviewTask, index: number) => index + 1,
    },
    {
      title: '文档标题',
      dataIndex: 'documentTitle',
      key: 'title',
      width: 220,
      ellipsis: { showTitle: false },
      render: (title: string, record) => (
        <Tooltip title={title}>
          <a
            onClick={() => window.open(`/documents/${record.documentId}`, '_blank')}
            style={{ fontWeight: 500, color: C.text }}
          >
            {title}
          </a>
        </Tooltip>
      ),
    },
    {
      title: '作者',
      dataIndex: ['documentAuthor', 'username'],
      key: 'author',
      width: 88,
      render: (name: string) => (
        <Text style={{ color: C.textSec, fontSize: 13 }}>
          <UserOutlined style={{ marginRight: 4 }} />{name || '未知'}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 84,
      render: (status: string) => {
        const meta = statusMeta[status] || statusMeta.pending;
        return (
          <Tag style={{ borderRadius: 12, border: 'none', background: meta.bg, color: meta.color, fontSize: 12, padding: '2px 10px' }}>
            {meta.icon} {meta.label}
          </Tag>
        );
      },
    },
    {
      title: '分类',
      dataIndex: 'categoryName',
      key: 'category',
      width: 88,
      render: (name: string | undefined) => name ? (
        <Text style={{ fontSize: 13, color: C.textSec }}>
          <FolderOutlined style={{ marginRight: 4 }} />{name}
        </Text>
      ) : (
        <Text style={{ color: C.textTer, fontSize: 13 }}>-</Text>
      ),
    },
    {
      title: '轮次',
      dataIndex: 'reviewRound',
      key: 'round',
      width: 56,
      align: 'center',
      render: (round: number) => round ?? 1,
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 112,
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      defaultSortOrder: 'descend',
      render: (t: string) => (
        <Tooltip title={dayjs(t).format('YYYY-MM-DD HH:mm:ss')}>
          <Text style={{ fontSize: 13, color: C.textTer }}>{dayjs(t).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: '审核人',
      dataIndex: ['reviewer', 'username'],
      key: 'reviewer',
      width: 88,
      render: (name: string) => name ? (
        <Text style={{ color: C.textSec, fontSize: 13 }}>{name}</Text>
      ) : (
        <Text style={{ color: C.textTer, fontSize: 13 }}>-</Text>
      ),
    },
    {
      title: '审核时间',
      dataIndex: 'reviewedAt',
      key: 'reviewedAt',
      width: 112,
      render: (t: string | undefined) => t ? (
        <Tooltip title={dayjs(t).format('YYYY-MM-DD HH:mm:ss')}>
          <Text style={{ fontSize: 13, color: C.textTer }}>{dayjs(t).fromNow()}</Text>
        </Tooltip>
      ) : (
        <Text style={{ color: C.textTer, fontSize: 13 }}>-</Text>
      ),
    },
    {
      title: '审核意见',
      dataIndex: 'comment',
      key: 'comment',
      width: 120,
      ellipsis: { showTitle: false },
      render: (comment: string | undefined) => comment ? (
        <Tooltip title={comment}>
          <Text style={{ fontSize: 13, color: C.textSec }}>{comment}</Text>
        </Tooltip>
      ) : (
        <Text style={{ color: C.textTer, fontSize: 13 }}>-</Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: ReviewTask) => (
        <Space size={[4, 4]} wrap>
          <Button
            size="small"
            type="link"
            icon={<EyeOutlined />}
            onClick={() => window.open(`/documents/${record.documentId}`, '_blank')}
          >
            预览
          </Button>
          {canReview && record.status === 'pending' && (
            <>
              <Popconfirm
                title="确认通过该文档？"
                onConfirm={() => handleApprove(record)}
                okText="确认"
                cancelText="取消"
              >
                <Button size="small" type="link" icon={<CheckOutlined />} style={{ color: C.approved }} loading={submittingIds.has(record.id)}>
                  通过
                </Button>
              </Popconfirm>
              <Button
                size="small"
                type="link"
                danger
                icon={<CloseOutlined />}
                onClick={() => openRejectModal(record)}
              >
                驳回
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const segments = [
    { key: 'pending', label: '待审核', color: C.pending, bg: C.pendingBg, dot: '#f59e0b' },
    { key: 'approved', label: '已通过', color: C.approved, bg: C.approvedBg, dot: '#10b981' },
    { key: 'rejected', label: '已驳回', color: C.rejected, bg: C.rejectedBg, dot: '#ef4444' },
  ];

  return (
    <div style={{ padding: '16px 20px 20px', background: C.bg, minHeight: '100vh' }}>
      <AdminPageHeader
        title="审核管理"
        description="管理文档审核流程，把控内容质量"
        extra={(
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => loadData(activeTab)} style={{ borderRadius: 8 }}>
              刷新
            </Button>
            {canReview && activeTab === 'pending' && stats.pending > 0 && (
              <Popconfirm
                title={`确认批量通过 ${tasks.filter((t) => t.status === 'pending').length} 个待审核文档？`}
                onConfirm={handleBatchApprove}
                okText="确认"
                cancelText="取消"
            >
              <Button type="primary" icon={<CheckOutlined />} style={{ borderRadius: 8 }}>
                一键通过
              </Button>
            </Popconfirm>
          )}
          </Space>
        )}
      />

      {/* ── Stats ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {[
          { k: 'pending', label: '待审核', color: C.pending, icon: <ClockCircleOutlined /> },
          { k: 'approved', label: '已通过', color: C.approved, icon: <CheckCircleOutlined /> },
          { k: 'rejected', label: '已驳回', color: C.rejected, icon: <CloseOutlined /> },
        ].map((s) => (
          <Col xs={8} sm={8} md={8} key={s.k}>
            <Card
              styles={{ body: { padding: '14px 18px' } }}
              style={{
                borderRadius: C.radius,
                border: activeTab === s.k ? `2px solid ${s.color}` : `1px solid ${C.border}`,
                boxShadow: C.shadow,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              hoverable
              onClick={() => {
                setActiveTab(s.k);
                loadData(s.k);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: C.text }}>
                    {(stats as any)[s.k]}
                  </div>
                  <Text style={{ fontSize: 13, color: C.textTer }}>{s.label}</Text>
                </div>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${s.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: s.color, fontSize: 18,
                }}>
                  {s.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Filter Bar ── */}
      <Card styles={{ body: { padding: '10px 16px 12px' } }} style={{ borderRadius: C.radius, border: `1px solid ${C.border}`, boxShadow: C.shadow, marginBottom: 12 }}>
        {/* Row 1: Status segmented filter */}
        <div style={{
          display: 'inline-flex', background: '#f1f5f9', borderRadius: 10, padding: 3,
          border: `1px solid ${C.border}`, marginBottom: 10,
        }}>
          {segments.map((seg) => {
            const active = activeTab === seg.key;
            const count = stats[seg.key as keyof typeof stats];
            return (
              <button
                key={seg.key}
                onClick={() => { setActiveTab(seg.key); loadData(seg.key); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 16px', borderRadius: 8, border: 'none',
                  cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
                  color: active ? '#fff' : C.textSec,
                  background: active ? seg.color : 'transparent',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  outline: 'none', lineHeight: '20px',
                  fontFamily: 'inherit',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: active ? 'rgba(255,255,255,0.8)' : seg.dot,
                  flexShrink: 0,
                }} />
                {seg.label}
                {count > 0 && (
                  <span style={{
                    minWidth: 18, height: 18, lineHeight: '18px', textAlign: 'center',
                    borderRadius: 9, fontSize: 11, fontWeight: 600,
                    padding: '0 5px',
                    background: active ? 'rgba(255,255,255,0.25)' : seg.bg,
                    color: active ? '#fff' : seg.color,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Row 2: Search + date + author + category */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <Input
            prefix={<SearchOutlined style={{ color: C.textTer }} />}
            placeholder="搜索标题或作者..."
            allowClear
            style={{ width: 240, borderRadius: 8 }}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <div style={{ width: 1, height: 22, background: C.border }} />

          <RangePicker
            value={dateRange as any}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
            placeholder={['开始日期', '结束日期']}
            size="middle"
            style={{ borderRadius: 8, width: 240 }}
            allowClear
          />

          <Input
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value || undefined)}
            placeholder="提交人"
            allowClear
            size="middle"
            style={{ borderRadius: 8, width: 120 }}
          />

          <Input
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value || undefined)}
            placeholder="文档分类"
            allowClear
            size="middle"
            style={{ borderRadius: 8, width: 120 }}
          />
        </div>
      </Card>

      {/* ── Table ── */}
      <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: C.radius, border: `1px solid ${C.border}`, boxShadow: C.shadow }}>
        <Table<ReviewTask>
          rowKey="id"
          columns={columns}
          dataSource={filteredTasks}
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `共 ${total} 条`,
          }}
          size="middle"
          locale={{
            emptyText: (
              <div style={{ padding: '40px 0' }}>
                <Text style={{ color: C.textTer, fontSize: 14 }}>暂无数据</Text>
              </div>
            ),
          }}
        />
      </Card>

      {/* ── Reject Modal ── */}
      <Modal
        title="驳回审核"
        open={rejectModalOpen}
        onOk={handleRejectConfirm}
        onCancel={() => {
          setRejectModalOpen(false);
          setRejectTask(null);
        }}
        confirmLoading={submittingIds.has(rejectTask?.id || '')}
        okText="确认驳回"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <div style={{ marginBottom: 8 }}>
          <Text strong>文档：</Text>
          <Text>{rejectTask?.documentTitle}</Text>
        </div>
        <TextArea
          rows={4}
          value={rejectComment}
          onChange={(e) => setRejectComment(e.target.value)}
          placeholder="请输入驳回原因（必填）..."
          style={{ borderRadius: 8 }}
        />
      </Modal>
    </div>
  );
};

export default ReviewPage;
