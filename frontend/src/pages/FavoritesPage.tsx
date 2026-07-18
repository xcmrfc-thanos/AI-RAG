import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Tooltip,
  Popconfirm,
  Row,
  Col,
  Statistic,
} from 'antd';
import { App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileTextOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  StarFilled,
  ClockCircleOutlined,
  FolderOutlined,
  UserOutlined,
  FileMarkdownOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import { useFavoriteStore } from '@/stores';
import { favoriteService } from '@/services';
import { EmptyState } from '@/components/common';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Search } = Input;

export const FavoritesPage: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const {
    favoriteDocuments,
    isLoading,
    loadFavorites,
  } = useFavoriteStore();

  const [selectedFavorites, setSelectedFavorites] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const getCategoryDisplayStyle = (categoryName: string): { bg: string; color: string; borderColor: string } => {
    const name = categoryName.toLowerCase();
    if (name.includes('技术') || name.includes('开发')) {
      return { bg: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', borderColor: 'rgba(37, 99, 235, 0.25)' };
    }
    if (name.includes('业务')) {
      return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.25)' };
    }
    return { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.25)' };
  };

  // 初始加载收藏列表
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchKeyword(value);
  };

  // 刷新
  const handleRefresh = () => {
    loadFavorites();
  };

  // 取消收藏
  const handleRemoveFavorite = async (documentId: string) => {
    try {
      await favoriteService.removeFavorite(documentId);
      message.success('取消收藏成功');
      loadFavorites();
    } catch (error) {
      console.error('取消收藏失败:', error);
      message.error('取消收藏失败');
    }
  };

  // 批量取消收藏
  const handleBatchRemove = async () => {
    if (selectedFavorites.length === 0) {
      message.warning('请先选择要取消收藏的文档');
      return;
    }

    try {
      await Promise.all(selectedFavorites.map(id => favoriteService.removeFavorite(id)));
      message.success(`成功取消收藏 ${selectedFavorites.length} 个文档`);
      setSelectedFavorites([]);
      loadFavorites();
    } catch (error) {
      console.error('批量取消收藏失败:', error);
      message.error('批量取消收藏失败');
    }
  };

  // 编辑文档
  const _handleEdit = (documentId: string) => {
    navigate(`/documents/${documentId}/edit`);
  };

  // 查看文档
  const handleView = (documentId: string) => {
    navigate(`/documents/${documentId}`);
  };

  // 获取文件图标
  const getFileIcon = (title: string, content: string) => {
    if (content?.includes('```') || title?.endsWith('.md')) {
      return <FileMarkdownOutlined style={{ fontSize: 24, color: '#8b5cf6' }} />;
    }
    if (title?.endsWith('.pdf')) {
      return <FilePdfOutlined style={{ fontSize: 24, color: '#ef4444' }} />;
    }
    if (title?.endsWith('.doc') || title?.endsWith('.docx')) {
      return <FileWordOutlined style={{ fontSize: 24, color: '#2563eb' }} />;
    }
    if (title?.endsWith('.xls') || title?.endsWith('.xlsx')) {
      return <FileExcelOutlined style={{ fontSize: 24, color: '#10b981' }} />;
    }
    if (title?.endsWith('.ppt') || title?.endsWith('.pptx')) {
      return <FilePptOutlined style={{ fontSize: 24, color: '#f97316' }} />;
    }
    return <FileTextOutlined style={{ fontSize: 24, color: '#64748b' }} />;
  };

  // 过滤数据
  const filteredDocuments = favoriteDocuments.filter(doc => {
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      return (
        (doc.documentTitle && doc.documentTitle.toLowerCase().includes(keyword)) ||
        (doc.documentSummary && doc.documentSummary.toLowerCase().includes(keyword))
      );
    }
    return true;
  });

  // 表格列定义
  const columns: ColumnsType<any> = [
    {
      title: '标题',
      dataIndex: 'documentTitle',
      key: 'title',
      width: '35%',
      render: (title: string, record: any) => (
        <Space style={{ display: 'flex', overflow: 'hidden' }}>
          <span key="icon">{getFileIcon(title, record.content)}</span>
          <a
            key="title"
            onClick={() => handleView(record.documentId)}
            style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {title || '未命名文档'}
          </a>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'documentCategoryName',
      key: 'category',
      width: '12%',
      render: (categoryName: string) => {
        if (!categoryName) {
          return <Tag style={{ whiteSpace: 'nowrap' }}>未分类</Tag>;
        }
        const style = getCategoryDisplayStyle(categoryName);
        return (
          <Tag
            icon={<FolderOutlined />}
            style={{
              whiteSpace: 'nowrap',
              backgroundColor: style.bg,
              color: style.color,
              borderColor: style.borderColor,
              fontWeight: 500,
            }}
          >
            {categoryName}
          </Tag>
        );
      },
    },
    {
      title: '作者',
      dataIndex: 'documentAuthorName',
      key: 'author',
      width: '10%',
      render: (authorName: string) => (
        <Space style={{ fontSize: '13px' }}>
          <UserOutlined style={{ color: '#64748b' }} />
          <span>{authorName || '未知'}</span>
        </Space>
      ),
    },
    {
      title: '收藏时间',
      dataIndex: 'favoriteTime',
      key: 'favoriteTime',
      width: '18%',
      render: (time: string) => (
        <Tooltip title={time}>
          <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: '15%',
      render: (_, record: any) => (
        <Space size="small" style={{ whiteSpace: 'nowrap' }}>
          <Tooltip key="view" title="查看">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record.documentId)}
            />
          </Tooltip>
          <Tooltip key="remove" title="取消收藏">
            <Popconfirm
              title="确认取消收藏？"
              description="取消后将不再显示在收藏列表中"
              onConfirm={() => handleRemoveFavorite(record.documentId)}
              okText="确认"
              cancelText="取消"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 行选择配置
  const rowSelection = {
    selectedRowKeys: selectedFavorites,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedFavorites(newSelectedRowKeys as string[]);
    },
  };

  return (
    <div className="favorites-page" style={{ padding: '16px', marginLeft: '-16px', marginTop: '-16px' }}>
      {/* 页面头部 */}
      <div className="page-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
            <StarFilled style={{ marginRight: '8px', color: '#f59e0b' }} />
            我的收藏
          </h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px', marginBottom: 0 }}>
            查看和管理您收藏的文档
          </p>
        </div>
        <Space>
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            刷新
          </Button>
        </Space>
      </div>

      {/* 收藏统计 */}
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic
              title="收藏总数"
              value={filteredDocuments.length}
              prefix={<HeartOutlined />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic
              title="本周新增"
              value={filteredDocuments.filter(doc => {
                const createdDate = doc.favoriteTime;
                return createdDate && dayjs(createdDate).isAfter(dayjs().subtract(7, 'day'));
              }).length}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic
              title="本月新增"
              value={filteredDocuments.filter(doc => {
                const createdDate = doc.favoriteTime;
                return createdDate && dayjs(createdDate).isAfter(dayjs().subtract(30, 'day'));
              }).length}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#3b82f6' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic
              title="未分类"
              value={filteredDocuments.filter(doc => !doc.documentCategoryName).length}
              prefix={<FolderOutlined />}
              valueStyle={{ color: '#8b5cf6' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选和搜索 */}
      <Card
        variant="borderless"
        style={{ marginBottom: '12px' }}
        extra={
          selectedFavorites.length > 0 && (
            <Space>
              <span key="selected-count" style={{ color: '#64748b' }}>已选择 {selectedFavorites.length} 项</span>
              <Popconfirm
                key="batch-remove"
                title="确认取消收藏选中的文档？"
                description="取消后将不再显示在收藏列表中"
                onConfirm={handleBatchRemove}
                okText="确认"
                cancelText="取消"
              >
                <Button danger icon={<DeleteOutlined />}>
                  批量取消收藏
                </Button>
              </Popconfirm>
            </Space>
          )
        }
      >
        <Space size="middle" style={{ width: '100%' }}>
          <Search
            placeholder="搜索收藏文档标题或内容"
            allowClear
            onSearch={handleSearch}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
            enterButton
          />
        </Space>
      </Card>

      {/* 收藏列表 */}
      <Card variant="borderless">
        {filteredDocuments.length === 0 && !isLoading ? (
          <EmptyState
            type="documents"
            descriptionNode={(
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#64748b', marginBottom: '16px', fontSize: 16 }}>
                  暂无收藏文档
                </p>
                <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
                  去文档中心发现感兴趣的文档并收藏吧
                </p>
              </div>
            )}
            footer={(
              <Button
                type="primary"
                icon={<FolderOutlined />}
                onClick={() => navigate('/documents')}
              >
                前往文档中心
              </Button>
            )}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredDocuments}
            loading={isLoading}
            rowSelection={rowSelection}
            scroll={{ x: 'max-content' }}
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 个收藏`,
            }}
            onRow={(record) => ({
              onDoubleClick: () => handleView(record.documentId),
            })}
          />
        )}
      </Card>
    </div>
  );
};

export default FavoritesPage;
