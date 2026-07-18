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
  Dropdown,
  Row,
  Col,
  Statistic,
  Select,
  Popconfirm,
} from 'antd';
import { App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileTextOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  FolderOutlined,
  FileMarkdownOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  SortAscendingOutlined,
  UploadOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useAuthStore, useDocumentStore } from '@/stores';
import { documentService, categoryService } from '@/services';
import type { DocumentFilter } from '@/types';
import { PERMISSIONS, hasPermission } from '@/utils/permission';
import { EmptyState } from '@/components/common';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Search } = Input;
const { Option } = Select;

export const DraftsPage: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const {
    documents,
    isLoading,
    total,
    currentPage,
    pageSize,
    fetchDocuments,
    setFilter,
    reset,
  } = useDocumentStore();

  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>();
  const [, setSearchKeyword] = useState<string>('');
  const [sortBy, setSortBy] = useState<NonNullable<DocumentFilter['sortBy']>>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const canCreateDocument = hasPermission(user, PERMISSIONS.documentCreate);
  const canEditDocument = hasPermission(user, PERMISSIONS.documentEdit);
  const canDeleteDocument = hasPermission(user, PERMISSIONS.documentDelete);
  const canSubmitReview = hasPermission(user, PERMISSIONS.documentEdit);
  const canSelectDrafts = canDeleteDocument || canSubmitReview;

  // 草稿统计数据
  const draftStats = {
    total: documents.length,
    thisWeek: documents.filter(doc => {
      const createdDate = doc.createdAt;
      const isDraft = doc.status === 0 || doc.status === 'draft';
      return isDraft && createdDate && dayjs(createdDate).isAfter(dayjs().subtract(7, 'day'));
    }).length,
    thisMonth: documents.filter(doc => {
      const createdDate = doc.createdAt;
      const isDraft = doc.status === 0 || doc.status === 'draft';
      return isDraft && createdDate && dayjs(createdDate).isAfter(dayjs().subtract(30, 'day'));
    }).length,
    needAttention: documents.filter(doc => {
      const createdDate = doc.createdAt;
      const isDraft = doc.status === 0 || doc.status === 'draft';
      return isDraft && createdDate && dayjs(createdDate).isBefore(dayjs().subtract(7, 'day'));
    }).length,
  };

  // 加载分类数据
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await categoryService.getCategoryTree();
        setCategories(flattenCategories(data));
      } catch (error) {
        console.error('获取分类失败:', error);
      }
    };
    loadCategories();
    // 分类扁平化函数只服务首次加载，避免函数重建触发重复请求。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 初始加载草稿列表 - 按更新时间倒序，只获取草稿状态
  useEffect(() => {
    // 先清空列表，避免显示上一个页面的数据
    reset();
    // 明确设置草稿filter状态
    setFilter({ status: 0, page: 1, pageSize: 20, sortBy: 'updatedAt', sortOrder: 'desc' });
    fetchDocuments({ status: 0, page: 1, pageSize: 20, sortBy: 'updatedAt', sortOrder: 'desc' });
  }, [fetchDocuments, reset, setFilter]);

  const flattenCategories = (categories: any[], prefix = ''): any[] => {
    const result: any[] = [];
    categories.forEach((cat) => {
      result.push({
        id: cat.id,
        name: cat.name,
        label: prefix ? `${prefix} / ${cat.name}` : cat.name,
        documentCount: cat.documentCount || 0,
      });
      if (cat.children && Array.isArray(cat.children) && cat.children.length > 0) {
        result.push(...flattenCategories(cat.children, cat.name));
      }
    });
    return result;
  };

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

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    setFilter({ keyword: value || undefined, page: 1 });
    fetchDocuments({ status: 0, keyword: value || undefined, page: 1, sortBy: 'updatedAt', sortOrder: 'desc' });
  };

  // 处理分类筛选
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setFilter({ categoryId: value || undefined, page: 1 });
    fetchDocuments({ status: 0, categoryId: value || undefined, page: 1, sortBy: 'updatedAt', sortOrder: 'desc' });
  };

  // 处理排序
  const handleSortChange = (field: NonNullable<DocumentFilter['sortBy']>) => {
    const newSortBy = field;
    const newSortOrder = sortBy === field
      ? (sortOrder === 'asc' ? 'desc' : 'asc')
      : 'desc';
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    fetchDocuments({ status: 0, page: 1, sortBy: newSortBy, sortOrder: newSortOrder });
  };

  // 刷新
  const handleRefresh = () => {
    fetchDocuments({ status: 0, page: currentPage, pageSize, sortBy: 'updatedAt', sortOrder: 'desc' });
  };

  // 删除草稿
  const handleDelete = async (draftId: string) => {
    try {
      await documentService.deleteDocument(draftId);
      message.success('草稿删除成功');
      fetchDocuments({ status: 0, page: currentPage, pageSize, sortBy: 'updatedAt', sortOrder: 'desc' });
    } catch (error) {
      console.error('删除草稿失败:', error);
      message.error('草稿删除失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedDrafts.length === 0) {
      message.warning('请先选择要删除的草稿');
      return;
    }

    try {
      await Promise.all(selectedDrafts.map(id => documentService.deleteDocument(id)));
      message.success(`成功删除 ${selectedDrafts.length} 个草稿`);
      setSelectedDrafts([]);
      fetchDocuments({ status: 0, page: currentPage, pageSize, sortBy: 'updatedAt', sortOrder: 'desc' });
    } catch (error) {
      console.error('批量删除失败:', error);
      message.error('批量删除失败');
    }
  };

  // 发布草稿
  const handlePublish = async (draftId: string) => {
    try {
      await documentService.publishDocument(draftId);
      message.success('已提交审核');
      fetchDocuments({ status: 0, page: currentPage, pageSize, sortBy: 'updatedAt', sortOrder: 'desc' });
    } catch (error) {
      console.error('发布失败:', error);
      message.error('发布失败');
    }
  };

  // 批量发布
  const handleBatchPublish = async () => {
    if (selectedDrafts.length === 0) {
      message.warning('请先选择要发布的草稿');
      return;
    }

    try {
      await Promise.all(selectedDrafts.map(id => documentService.publishDocument(id)));
      message.success(`已提交 ${selectedDrafts.length} 个文档进行审核`);
      setSelectedDrafts([]);
      fetchDocuments({ status: 0, page: currentPage, pageSize, sortBy: 'updatedAt', sortOrder: 'desc' });
    } catch (error) {
      console.error('批量发布失败:', error);
      message.error('批量发布失败');
    }
  };

  // 编辑草稿
  const handleEdit = (draftId: string) => {
    navigate(`/documents/${draftId}/edit?from=drafts`);
  };

  // 查看草稿
  const handleView = (draftId: string) => {
    window.open(`/documents/${draftId}`, '_blank');
  };

  // 表格列定义
  const columns: ColumnsType<any> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: '27%',
      render: (title: string, record: any) => (
        <Space style={{ display: 'flex', overflow: 'hidden' }}>
          <span key="icon">{getFileIcon(title, record.content)}</span>
          <a
            key="title"
            onClick={() => handleView(record.id)}
            style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {title || '未命名草稿'}
          </a>
          {record.autoSaveDismissed === 0 && (
            <Tag
              key="autosave"
              color="blue"
              style={{ flexShrink: 0, fontSize: 11, lineHeight: '18px', padding: '0 6px' }}
            >
              自动保存
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryId',
      key: 'category',
      width: '11%',
      render: (categoryId: string) => {
        const category = categories.find(c => String(c.id) === String(categoryId));
        const name = category?.name;
        if (!name) {
          return <Tag style={{ whiteSpace: 'nowrap' }}>未分类</Tag>;
        }
        const style = getCategoryDisplayStyle(name);
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
            {name}
          </Tag>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '18%',
      sorter: true,
      render: (date: string, _record: any) => {
        // Backend now consistently returns createdAt
        const createdDate = date;
        return (
          <Tooltip title={createdDate}>
            <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {createdDate ? dayjs(createdDate).fromNow() : '-'}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: '最后修改',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: '15%',
      sorter: true,
      render: (date: string, _record: any) => {
        // Backend now consistently returns updatedAt
        const updatedDate = date;
        return (
          <Tooltip title={updatedDate}>
            <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
              {updatedDate ? dayjs(updatedDate).fromNow() : '-'}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: '字数',
      dataIndex: 'contentLength',
      key: 'wordCount',
      width: '7%',
      render: (contentLength: number) => {
        if (!contentLength) return '0';
        return (
          <span style={{ whiteSpace: 'nowrap' }}>
            {contentLength > 1000 ? `${(contentLength / 1000).toFixed(1)}k` : contentLength}
          </span>
        );
      },
    },
    {
      title: '可见性',
      dataIndex: 'isPublic',
      key: 'visibility',
      width: '8%',
      render: (isPublic: any) => {
        const isPublicVal = Number(isPublic);
        return (
          <Tag
            color={isPublicVal === 1 ? 'green' : 'orange'}
            style={{ whiteSpace: 'nowrap' }}
          >
            {isPublicVal === 1 ? '全员可见' : '团队可见'}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: '16%',
      render: (_, record: any) => (
        <Space size="small" style={{ whiteSpace: 'nowrap' }}>
          <Tooltip key="view" title="查看">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record.id)}
            />
          </Tooltip>
          <Tooltip key="history" title="查看本地历史">
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => navigate(`/documents/${record.id}/autosave-history`)}
            />
          </Tooltip>
          {canEditDocument && (
            <Tooltip key="edit" title="编辑">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record.id)}
              />
            </Tooltip>
          )}
          {canSubmitReview && (
            <Popconfirm
              key="publish"
              title="确认提交审核？"
              description="提交后将由审核员审核后发布"
              onConfirm={() => handlePublish(record.id)}
              okText="确认"
              cancelText="取消"
            >
              <Tooltip title="提交审核">
                <Button type="text" style={{ color: '#1677ff' }} icon={<SendOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
          {canDeleteDocument && (
            <Popconfirm
              key="delete"
              title="确认删除该草稿？"
              description="删除后将无法恢复"
              onConfirm={() => handleDelete(record.id)}
              okText="确认"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 行选择配置
  const rowSelection = {
    selectedRowKeys: selectedDrafts,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedDrafts(newSelectedRowKeys as string[]);
    },
  };

  return (
    <div className="drafts-page" style={{ padding: '16px', marginLeft: '-16px', marginTop: '-16px' }}>
      {/* 页面头部 */}
      <div className="page-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
            <FileTextOutlined style={{ marginRight: '8px', color: '#f59e0b' }} />
            草稿箱
          </h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px', marginBottom: 0 }}>
            查看和管理您的未发布文档草稿
          </p>
        </div>
        <Space key="header-actions">
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            刷新
          </Button>
          {canCreateDocument && (
            <Button
              key="import"
              icon={<UploadOutlined />}
              onClick={() => navigate('/documents/import')}
            >
              导入文档
            </Button>
          )}
          {canCreateDocument && (
            <Button
              key="create"
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate('/documents/new')}
            >
              新建草稿
            </Button>
          )}
        </Space>
      </div>

      {/* 草稿统计 */}
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic
              title="草稿总数"
              value={draftStats.total}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic
              title="本周新增"
              value={draftStats.thisWeek}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic
              title="本月新增"
              value={draftStats.thisMonth}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#3b82f6' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic
              title="待处理"
              value={draftStats.needAttention}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选和搜索 */}
      <Card
        variant="borderless"
        style={{ marginBottom: '12px' }}
        extra={
          selectedDrafts.length > 0 && canSelectDrafts && (
            <Space key="batch-actions">
              <span key="selected-count" style={{ color: '#64748b' }}>已选择 {selectedDrafts.length} 项</span>
              {canSubmitReview && (
                <Popconfirm
                  key="batch-publish"
                  title="确认提交选中的草稿进行审核？"
                  description="发布后将对全员可见"
                  onConfirm={handleBatchPublish}
                  okText="确认"
                  cancelText="取消"
                >
                  <Button type="primary" icon={<SendOutlined />}>
                    批量发布
                  </Button>
                </Popconfirm>
              )}
              {canDeleteDocument && (
                <Popconfirm
                  key="batch-delete"
                  title="确认删除选中的草稿？"
                  description="删除后将无法恢复"
                  onConfirm={handleBatchDelete}
                  okText="确认"
                  cancelText="取消"
                >
                  <Button danger icon={<DeleteOutlined />}>
                    批量删除
                  </Button>
                </Popconfirm>
              )}
            </Space>
          )
        }
      >
        <Space size="middle" style={{ width: '100%' }}>
          <Search
            placeholder="搜索草稿标题或内容"
            allowClear
            onSearch={handleSearch}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
            enterButton
          />
          <Select
            placeholder="选择分类"
            allowClear
            style={{ width: 200 }}
            value={selectedCategory}
            onChange={handleCategoryChange}
          >
            {categories.map((cat, index) => (
              <Option key={`cat-${cat.id || index}`} value={cat.id}>
                {cat.label}
              </Option>
            ))}
          </Select>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'updatedAt',
                  label: '按最后修改时间',
                  onClick: () => handleSortChange('updatedAt'),
                },
                {
                  key: 'createdAt',
                  label: '按创建时间',
                  onClick: () => handleSortChange('createdAt'),
                },
                {
                  key: 'title',
                  label: '按标题',
                  onClick: () => handleSortChange('title'),
                },
              ],
            }}
          >
            <Button icon={<SortAscendingOutlined />}>
              排序 {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </Dropdown>
        </Space>
      </Card>

      {/* 草稿列表 */}
      <Card variant="borderless">
        {documents.length === 0 && !isLoading ? (
          <EmptyState
            type="documents"
            descriptionNode={(
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#64748b', marginBottom: '16px', fontSize: 16 }}>
                  暂无草稿文档
                </p>
              </div>
            )}
            footer={canCreateDocument ? (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => navigate('/documents/new')}
              >
                创建第一个草稿
              </Button>
            ) : undefined}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={documents}
            loading={isLoading}
            rowKey="id"
            rowSelection={canSelectDrafts ? rowSelection : undefined}
            scroll={{ x: 'max-content' }}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 个草稿`,
              onChange: (page, size) => {
                setFilter({ page, pageSize: size });
                fetchDocuments({ status: 0, page, pageSize: size, sortBy: 'updatedAt', sortOrder: 'desc' });
              },
            }}
            onRow={(record) => ({
              onDoubleClick: () => handleView(record.id),
            })}
          />
        )}
      </Card>
    </div>
  );
};

export default DraftsPage;
