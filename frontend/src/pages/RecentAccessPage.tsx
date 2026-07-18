import React, { useState, useEffect } from 'react';
import {
  List,
  Button,
  Popconfirm,
  Tag,
  Tooltip,
  Card,
} from 'antd';
import {
  ClockCircleOutlined,
  DeleteOutlined,
  ClearOutlined,
  CalendarOutlined,
  FolderOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { accessService } from '../services/access.service';
import { useNavigate } from 'react-router-dom';
import { EmptyState, PageLoading, DocumentListCard } from '@/components/common';
import './RecentAccessPage.css';

const COLORS = {
  primary: '#2563eb',
  bgPrimary: '#ffffff',
  bgSecondary: '#f8fafc',
  bgTertiary: '#f1f5f9',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#94a3b8',
  borderColor: '#e2e8f0',
};

/**
 * 文档访问记录类型定义
 */
interface DocumentAccess {
  id: string;
  userId: string;
  documentId: string;
  documentTitle: string;
  summary: string;
  categoryName: string;
  authorName: string;
  accessTime: string;
  status: number;
}

/**
 * 最近访问页面
 *
 * 按照一线大厂标准设计，提供专业的用户体验
 */
const RecentAccessPage: React.FC = () => {
  const [accessList, setAccessList] = useState<DocumentAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  /**
   * 获取最近访问记录
   */
  const fetchRecentAccess = async () => {
    setLoading(true);
    try {
      const data = await accessService.getRecentAccess(20);
      setAccessList(data);
    } catch (error) {
      console.error('获取最近访问记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 删除单条访问记录
   */
  const handleDelete = async (documentId: string) => {
    try {
      await accessService.deleteAccess(documentId);
      setAccessList((prev) => prev.filter((item) => item.documentId !== documentId));
    } catch (error) {
      console.error('删除访问记录失败:', error);
    }
  };

  /**
   * 清空所有访问记录
   */
  const handleClearAll = async () => {
    try {
      await accessService.clearAllAccess();
      setAccessList([]);
    } catch (error) {
      console.error('清空访问记录失败:', error);
    }
  };

  /**
   * 跳转到文档详情页
   */
  const handleViewDocument = (documentId: string) => {
    navigate(`/documents/${documentId}`);
  };

  /**
   * 格式化时间显示
   */
  const formatTime = (timeStr: string): string => {
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // 小于1分钟
    if (diff < 60000) {
      return '刚刚';
    }
    // 小于1小时
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    }
    // 小于24小时
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    }
    // 小于7天
    if (diff < 604800000) {
      return `${Math.floor(diff / 86400000)}天前`;
    }
    // 显示完整日期
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * 获取状态标签
   */
  const getStatusTag = (status: number) => {
    const statusMap: Record<number, { color: string; text: string }> = {
      0: { color: 'default', text: '草稿' },
      1: { color: 'success', text: '已发布' },
      2: { color: 'warning', text: '已归档' },
      3: { color: 'processing', text: '待审核' },
    };
    const item = statusMap[status] || { color: 'default', text: '未知' };
    return (
      <Tag color={item.color}>{item.text}</Tag>
    );
  };

  useEffect(() => {
    fetchRecentAccess();
  }, []);

  return (
    <div style={{
      padding: '8px 12px 12px 8px',
      marginLeft: '-16px',
      marginTop: '-8px',
      backgroundColor: COLORS.bgSecondary,
      minHeight: 'calc(100vh - 64px)',
    }}>
      {/* 页面头部 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: COLORS.textPrimary,
          margin: 0,
        }}>
          最近访问
        </h1>
        {accessList.length > 0 && (
          <Popconfirm
            title="确定清空所有访问记录吗？"
            onConfirm={handleClearAll}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              danger
              icon={<ClearOutlined />}
            >
              清空记录
            </Button>
          </Popconfirm>
        )}
      </div>

      <div style={{
        padding: '24px',
        maxWidth: '1600px',
        margin: '0 auto',
      }}>
        {loading ? (
          <PageLoading />
        ) : accessList.length === 0 ? (
          <Card className="empty-card">
            <EmptyState
              type="generic"
              message="暂无访问记录"
              actionText="去浏览文档"
              onAction={() => navigate('/documents')}
            />
          </Card>
        ) : (
          <div className="access-list-container">
            <div className="access-count-badge">
              <ClockCircleOutlined />
              <span>共 {accessList.length} 条记录</span>
            </div>

            <List
              grid={{ gutter: 16, column: 1 }}
              dataSource={accessList}
              renderItem={(item) => (
                <List.Item key={item.id}>
                  <DocumentListCard
                    title={item.documentTitle}
                    summary={item.summary}
                    categoryName={item.categoryName}
                    authorName={item.authorName}
                    timeLabel={formatTime(item.accessTime)}
                    statusTag={getStatusTag(item.status)}
                    categoryIcon={<FolderOutlined className="meta-icon" />}
                    authorIcon={<UserOutlined className="meta-icon" />}
                    timeIcon={<CalendarOutlined className="meta-icon" />}
                    onClick={() => handleViewDocument(item.documentId)}
                    actions={
                      <Tooltip title="删除记录">
                        <Popconfirm
                          title="确定删除这条访问记录吗？"
                          onConfirm={() => handleDelete(item.documentId)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>
                      </Tooltip>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentAccessPage;
