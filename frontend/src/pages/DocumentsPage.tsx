import React, { useEffect, useState } from 'react';
import {
  Input,
  Button,
  Modal,
  Dropdown,
} from 'antd';
import { App } from 'antd';
import {
  MoreOutlined,
  EyeOutlined,
  FileTextOutlined,
  DeleteOutlined,
  ExportOutlined,
  EditOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  StarOutlined,
  FileMarkdownOutlined,
  FolderOutlined,
  CodeOutlined,
  DollarOutlined,
  TeamOutlined,
  LayoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore, useDocumentStore, useFavoriteStore, useTeamStore } from '@/stores';
import { formatFileSize } from '@/utils';
import { documentService, categoryService } from '@/services';
import UserAvatar from '@/components/common/UserAvatar';
import TeamIcon from '@/components/common/TeamIcon';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { PERMISSIONS, hasPermission } from '@/utils/permission';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Search } = Input;

// 样式常量，完全按照原型定义
const COLORS = {
  primary: '#2563eb',
  primaryDark: '#1e40af',
  primaryLight: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  bgPrimary: '#ffffff',
  bgSecondary: '#f8fafc',
  bgTertiary: '#f1f5f9',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  borderColor: '#e2e8f0',
  borderColorLight: '#f1f5f9',
};

export const DocumentsPage: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const canCreateDocument = hasPermission(user, PERMISSIONS.documentCreate);
  const canEditDocument = hasPermission(user, PERMISSIONS.documentEdit);
  const canDeleteDocument = hasPermission(user, PERMISSIONS.documentDelete);
  const {
    documents,
    isLoading,
    total,
    currentPage,
    pageSize,
    fetchDocuments,
    setFilter,
  } = useDocumentStore();
  const { toggleFavorite } = useFavoriteStore();
  const { teamTree, selectedTeam, setSelectedTeam } = useTeamStore();

  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>();
  const [selectedTag, setSelectedTag] = useState<string>('全部');
  const [selectedStatus, setSelectedStatus] = useState<string>();
  const [sortBy, setSortBy] = useState<string>('updatedAt');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [, setFavoriteLoading] = useState<string | null>(null);

  // 组件挂载时执行：从URL参数中读取分类和团队筛选条件
  useEffect(() => {
    fetchCategories();
    // 分类目录仅在页面首次挂载时加载。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 同步快捷标签高亮：当 selectedCategory 或 categories 变化时更新
  useEffect(() => {
    if (!selectedCategory) {
      setSelectedTag('全部');
    } else if (categories.length > 0) {
      const matched = categories.find((cat: any) => String(cat.id) === String(selectedCategory));
      if (matched) {
        setSelectedTag(matched.name);
      }
    }
  }, [selectedCategory, categories]);

  // 监听URL参数变化（侧边栏点击同一页面导航时，不会重新挂载组件）
  useEffect(() => {
    const categoryIdFromUrl = searchParams.get('category');
    const teamIdFromUrl = searchParams.get('team');

    // 同步团队空间上下文到 store
    if (teamIdFromUrl) {
      const findTeam = (teams: any[], id: string): any | undefined => {
        for (const t of teams) {
          if (String(t.id) === String(id)) return t;
          if (t.children?.length) {
            const found = findTeam(t.children, id);
            if (found) return found;
          }
        }
        return undefined;
      };
      const found = findTeam(teamTree, teamIdFromUrl);
      if (found) {
        setSelectedTeam(found);
      }
    } else {
      setSelectedTeam(null);
    }

    // 同步URL参数到filter状态并请求数据
    const newFilter: any = { status: 1, page: 1, pageSize: 12, sortBy: 'publishTime', sortOrder: 'desc' as const };
    if (categoryIdFromUrl) {
      newFilter.categoryId = categoryIdFromUrl;
      setSelectedCategory(categoryIdFromUrl);
    } else {
      setSelectedCategory(undefined);
    }
    if (teamIdFromUrl) {
      newFilter.teamId = teamIdFromUrl;
    }

    setFilter(newFilter);
    fetchDocuments(newFilter);
  }, [fetchDocuments, searchParams, setFilter, setSelectedTeam, teamTree]);

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getCategoryTree();
      setCategories(flattenCategories(data));
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

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

  // 构建基础筛选条件（保留URL中的teamId、搜索关键字、已选分类和状态）
  const buildFilter = (overrides: Record<string, any> = {}): any => {
    const teamIdFromUrl = searchParams.get('team');
    const base = { status: 1, page: 1, pageSize: 12, sortBy: 'publishTime' as const, sortOrder: 'desc' as const };
    return {
      ...base,
      ...(teamIdFromUrl ? { teamId: teamIdFromUrl } : {}),
      ...(searchKeyword ? { keyword: searchKeyword } : {}),
      ...(selectedCategory ? { categoryId: selectedCategory } : {}),
      ...(selectedStatus ? { status: selectedStatus === 'published' ? 1 : selectedStatus === 'archived' ? 2 : selectedStatus === 'draft' ? 0 : selectedStatus === 'pending_review' ? 3 : 1 } : {}),
      ...overrides,
    };
  };

  // 搜索处理
  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    const newFilter = buildFilter({ keyword: value || undefined });
    setFilter(newFilter);
    fetchDocuments(newFilter);
  };

  // 分类筛选
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedCategory(value);
    // 同步快捷标签高亮
    if (!value) {
      setSelectedTag('全部');
    } else {
      const matchedCat = categories.find((cat: any) => String(cat.id) === value);
      setSelectedTag(matchedCat ? matchedCat.name : '');
    }
    const newFilter = buildFilter({ categoryId: value || undefined });
    setFilter(newFilter);
    fetchDocuments(newFilter);
  };

  // 状态筛选
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedStatus(value);
    // 如果选择"全部"或空值，默认显示已发布的文档
    const statusValue = value === 'published' ? 1 : value === 'archived' ? 2 : value === 'draft' ? 0 : value === 'pending_review' ? 3 : 1;
    const newFilter = buildFilter({ status: statusValue });
    setFilter(newFilter);
    fetchDocuments(newFilter);
  };

  // 排序筛选
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSortBy(value);
    const newFilter = buildFilter({ sortBy: value as 'updatedAt' | 'createdAt' | 'publishTime' });
    setFilter(newFilter);
    fetchDocuments(newFilter);
  };

  // 分页处理
  const handlePageChange = (page: number, size?: number) => {
    const newPageSize = size || pageSize;
    const newFilter = buildFilter({ page, pageSize: newPageSize });
    setFilter(newFilter);
    fetchDocuments(newFilter);
  };

  // 辅助函数：处理后端返回的文档数据
  const normalizeDocument = (doc: any): any => {
    return {
      ...doc,
      id: String(doc.id),
      tags: doc.tags ? (typeof doc.tags === 'string' ? doc.tags.split(',').filter(Boolean) : doc.tags) : [],
      author: doc.author || {
        id: String(doc.authorId),
        username: doc.authorName,
        avatar: undefined,
      },
      status: doc.status === 1 ? 'published' : doc.status === 2 ? 'archived' : doc.status === 3 ? 'pending_review' : 'draft',
      content: doc.content || '',
      summary: doc.summary || '',
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      publishTime: doc.publishTime || (doc.status === 1 || doc.status === 3 ? doc.updatedAt : null),
      viewCount: doc.viewCount || 0,
      likeCount: doc.likeCount || 0,
      commentCount: doc.commentCount || 0,
    };
  };

  const normalizedDocuments = documents.map(normalizeDocument);

  // 获取分类图标
  const _getCategoryIcon = (categoryName: string) => {
    const name = categoryName?.toLowerCase() || '';
    if (name.includes('技术') || name.includes('开发') || name.includes('后端') || name.includes('前端')) {
      return <CodeOutlined style={{ fontSize: 16, color: COLORS.textSecondary }} />;
    }
    if (name.includes('业务') || name.includes('流程')) {
      return <LayoutOutlined style={{ fontSize: 16, color: COLORS.textSecondary }} />;
    }
    if (name.includes('人力') || name.includes('人事')) {
      return <TeamOutlined style={{ fontSize: 16, color: COLORS.textSecondary }} />;
    }
    if (name.includes('产品') || name.includes('设计')) {
      return <LayoutOutlined style={{ fontSize: 16, color: COLORS.textSecondary }} />;
    }
    if (name.includes('财务') || name.includes('报销')) {
      return <DollarOutlined style={{ fontSize: 16, color: COLORS.textSecondary }} />;
    }
    return <FolderOutlined style={{ fontSize: 16, color: COLORS.textSecondary }} />;
  };

  // 获取分类名称（优先使用API返回的categoryName，降级到本地查找）
  const getCategoryName = (categoryId?: string | number, apiCategoryName?: string) => {
    if (apiCategoryName) return apiCategoryName;
    if (categoryId == null) return '未分类';
    const cat = categories.find(c => String(c.id) === String(categoryId));
    return cat?.name || '未分类';
  };

  // 获取分类徽章样式（基于分类名称）
  const getCategoryBadgeStyle = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('技术') || name.includes('开发')) {
      return 'tech';
    }
    if (name.includes('业务')) {
      return 'business';
    }
    return 'ai';
  };

  // 处理复选框选择
  const handleSelectDocument = (documentId: string, checked: boolean) => {
    if (checked) {
      setSelectedDocuments([...selectedDocuments, documentId]);
    } else {
      setSelectedDocuments(selectedDocuments.filter(id => id !== documentId));
    }
  };

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDocuments(normalizedDocuments.map(doc => doc.id));
    } else {
      setSelectedDocuments([]);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedDocuments.length === 0) {
      message.warning('请先选择要删除的文档');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedDocuments.length} 个文档吗？`,
      onOk: async () => {
        setBatchLoading(true);
        try {
          await Promise.all(selectedDocuments.map(id => documentService.deleteDocument(id)));
          message.success('删除成功');
          setSelectedDocuments([]);
          fetchDocuments(buildFilter());
        } catch (error) {
          message.error('删除失败');
        } finally {
          setBatchLoading(false);
        }
      },
    });
  };

  // 批量导出
  const _handleBatchExport = async () => {
    if (selectedDocuments.length === 0) {
      message.warning('请先选择要导出的文档');
      return;
    }
    message.warning('导出功能暂未实现，请联系管理员');
  };

  // 删除单个文档
  const handleDeleteDocument = (documentId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个文档吗？',
      onOk: async () => {
        try {
          await documentService.deleteDocument(documentId);
          message.success('删除成功');
          fetchDocuments(buildFilter());
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  // 文档操作
  const handleDocumentAction = async (action: string, documentId: string, e?: React.MouseEvent) => {
    // 阻止事件冒泡，避免触发文档行的点击事件
    if (e) {
      e.stopPropagation();
    }

    switch (action) {
      case 'view':
        navigate(`/documents/${documentId}`);
        break;
      case 'edit':
        navigate(`/documents/${documentId}/edit`);
        break;
      case 'share':
        try {
          const shareData = {
            documentId: documentId,
            shareType: 1,
            expireType: 1,
            accessLimit: 0,
            requirePassword: 0,
          };
          const result = await documentService.createShare(shareData);
          const shareUrl = `${window.location.origin}/share/${result.shareId}`;
          await navigator.clipboard.writeText(shareUrl);
          message.success('分享链接已复制到剪贴板');
        } catch (error: any) {
          const errorMessage = error?.message || '操作失败';
          message.error(errorMessage);
        }
        break;
      case 'favorite':
        setFavoriteLoading(documentId);
        try {
          const newStatus = await toggleFavorite(documentId);
          message.success(newStatus ? '已添加到收藏' : '已取消收藏');
        } catch (error) {
          console.error('收藏操作失败:', error);
          message.error('操作失败，请重试');
        } finally {
          setFavoriteLoading(null);
        }
        break;
      case 'download':
        message.warning('下载功能暂未实现');
        break;
      case 'delete':
        handleDeleteDocument(documentId);
        break;
    }
  };

  // 操作菜单项
  const getActionMenuItems = () => {
    const items: any[] = [
      {
        key: 'view',
        label: '查看文档',
        icon: <EyeOutlined />,
      },
      {
        key: 'share',
        label: '分享文档',
        icon: <ShareAltOutlined />,
      },
      {
        key: 'favorite',
        label: '添加收藏',
        icon: <StarOutlined />,
      },
      {
        key: 'download',
        label: '下载文档',
        icon: <DownloadOutlined />,
      },
    ];
    if (canEditDocument) {
      items.splice(1, 0, {
        key: 'edit',
        label: '编辑文档',
        icon: <EditOutlined />,
      });
    }
    if (canDeleteDocument) {
      items.push(
        {
          type: 'divider',
        },
        {
          key: 'delete',
          label: '删除文档',
          icon: <DeleteOutlined />,
          danger: true,
        }
      );
    }
    return items;
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: COLORS.textPrimary,
            margin: 0,
          }}>
            文档中心
          </h1>
          {selectedTeam && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              color: '#3b82f6',
              fontSize: '13px',
              fontWeight: 500,
              border: '1px solid #bfdbfe',
            }}>
              <TeamIcon icon={selectedTeam.icon} variant="sidebar" />
              {selectedTeam.teamName || selectedTeam.name}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {canCreateDocument && (
            <button
              onClick={() => navigate('/documents/import')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: `1px solid ${COLORS.borderColor}`,
                backgroundColor: COLORS.bgPrimary,
                color: COLORS.textPrimary,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.bgTertiary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.bgPrimary;
              }}
            >
              <ExportOutlined />
              导入文档
            </button>
          )}
          {canCreateDocument && (
            <button
              onClick={() => {
                const teamId = searchParams.get('team');
                navigate(teamId ? `/documents/new?team=${teamId}` : '/documents/new');
              }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb, #1e40af)',
                color: 'white',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              新建文档
            </button>
          )}
        </div>
      </div>

      {/* 筛选栏 */}
      <div style={{
        background: COLORS.bgPrimary,
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '16px',
        border: `1px solid ${COLORS.borderColor}`,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Search
              placeholder="搜索文档标题、摘要、标签..."
              allowClear
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                if (!e.target.value) {
                  handleSearch('');
                }
              }}
              onSearch={handleSearch}
              style={{ width: 260 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '14px',
              fontWeight: 600,
              color: COLORS.textSecondary,
            }}>
              分类:
            </span>
            <select
              value={selectedCategory || ''}
              onChange={handleCategoryChange}
              style={{
                padding: '8px 16px',
                border: `1px solid ${COLORS.borderColor}`,
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: COLORS.bgPrimary,
                color: COLORS.textPrimary,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <option value="">全部分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '14px',
              fontWeight: 600,
              color: COLORS.textSecondary,
            }}>
              状态:
            </span>
            <select
              value={selectedStatus || ''}
              onChange={handleStatusChange}
              style={{
                padding: '8px 16px',
                border: `1px solid ${COLORS.borderColor}`,
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: COLORS.bgPrimary,
                color: COLORS.textPrimary,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <option value="">全部状态</option>
              <option value="published">已发布</option>
              <option value="pending_review">待审核</option>
              <option value="draft">草稿</option>
              <option value="archived">已归档</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '14px',
              fontWeight: 600,
              color: COLORS.textSecondary,
            }}>
              排序:
            </span>
            <select
              value={sortBy}
              onChange={handleSortChange}
              style={{
                padding: '8px 16px',
                border: `1px solid ${COLORS.borderColor}`,
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: COLORS.bgPrimary,
                color: COLORS.textPrimary,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <option value="updatedAt">最近更新</option>
              <option value="createdAt">最新创建</option>
              <option value="viewCount">浏览最多</option>
              <option value="likeCount">点赞最多</option>
            </select>
          </div>

          {selectedDocuments.length > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: COLORS.textSecondary }}>
                已选择 {selectedDocuments.length} 项
              </span>
              <Button size="small" onClick={() => setSelectedDocuments([])}>
                清除选择
              </Button>
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                loading={batchLoading}
                onClick={handleBatchDelete}
              >
                批量删除
              </Button>
            </div>
          )}
        </div>

        {/* 标签筛选 */}
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginTop: '12px',
        }}>
          {(() => {
            // 从分类数据中取顶层分类作为快捷标签
            const topCategories = categories.filter((cat: any) => cat.name === cat.label);
            const tags = ['全部', ...topCategories.slice(0, 8).map((cat: any) => cat.name)];
            return tags.map((tag) => {
              const isActive = selectedTag === tag;
              return (
                <span
                  key={tag}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: `1px solid ${isActive ? COLORS.primary : COLORS.borderColor}`,
                    backgroundColor: isActive ? COLORS.primary : COLORS.bgPrimary,
                    color: isActive ? 'white' : COLORS.textSecondary,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = COLORS.primary;
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.borderColor = COLORS.primary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = COLORS.bgPrimary;
                      e.currentTarget.style.color = COLORS.textSecondary;
                      e.currentTarget.style.borderColor = COLORS.borderColor;
                    }
                  }}
                  onClick={() => {
                    setSelectedTag(tag);
                    if (tag === '全部') {
                      setSelectedCategory(undefined);
                      const newFilter = buildFilter({ categoryId: undefined });
                      setFilter(newFilter);
                      fetchDocuments(newFilter);
                    } else {
                      // 从分类列表中按名称匹配，获取分类 ID
                      const matchedCategory = categories.find(
                        (cat: any) => cat.name === tag
                      );
                      if (matchedCategory) {
                        setSelectedCategory(String(matchedCategory.id));
                        const newFilter = buildFilter({ categoryId: matchedCategory.id });
                        setFilter(newFilter);
                        fetchDocuments(newFilter);
                      }
                    }
                  }}
                >
                  {tag}
                </span>
              );
            });
          })()}
        </div>
      </div>

      {/* 文档列表 */}
      {isLoading ? (
        <div style={{
          background: COLORS.bgPrimary,
          borderRadius: '16px',
          border: `1px solid ${COLORS.borderColorLight}`,
          padding: '60px 24px',
          textAlign: 'center',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
        }}>
          <FileTextOutlined style={{ fontSize: 48, color: COLORS.textMuted }} />
          <div style={{ marginTop: 16, fontSize: 16, color: COLORS.textSecondary }}>
            加载中...
          </div>
        </div>
      ) : normalizedDocuments.length === 0 ? (
        <div style={{
          background: COLORS.bgPrimary,
          borderRadius: '16px',
          border: `1px solid ${COLORS.borderColorLight}`,
          padding: '80px 24px',
          textAlign: 'center',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
        }}>
          <FileTextOutlined style={{ fontSize: 64, color: '#d1d5db' }} />
          <div style={{
            marginTop: 16,
            marginBottom: 8,
            fontSize: 20,
            fontWeight: 600,
            color: COLORS.textPrimary,
          }}>
            暂无文档
          </div>
          <div style={{
            fontSize: 14,
            color: COLORS.textSecondary,
            marginBottom: 24,
          }}>
            开始创建你的第一个文档吧
          </div>
          {canCreateDocument && (
            <Button
              type="primary"
              icon={<FileMarkdownOutlined />}
              onClick={() => {
                const teamId = searchParams.get('team');
                navigate(teamId ? `/documents/new?team=${teamId}` : '/documents/new');
              }}
            >
              创建文档
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* 文档表格 */}
          <div style={{
            background: COLORS.bgPrimary,
            borderRadius: '16px',
            border: `1px solid ${COLORS.borderColorLight}`,
            overflow: 'hidden',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
          }}>
            {/* 表头 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '40px 4fr 120px 70px 100px 80px 80px 140px 80px',
              gap: '12px',
              padding: '12px 20px',
              backgroundColor: COLORS.bgTertiary,
              borderBottom: `1px solid ${COLORS.borderColor}`,
              fontSize: '13px',
              fontWeight: 600,
              color: COLORS.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <input
                  type="checkbox"
                  checked={selectedDocuments.length > 0 && selectedDocuments.length === normalizedDocuments.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    border: `2px solid ${COLORS.borderColor}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                />
              </div>
              <div>文档名称</div>
              <div>分类</div>
              <div>浏览量</div>
              <div>作者</div>
              <div>状态</div>
              <div>可见性</div>
              <div>发布时间</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>操作</div>
            </div>

            {/* 表格行 */}
            {normalizedDocuments.map((doc) => (
              <div
                key={`${doc.id}-${doc.createdAt}`}
                onClick={(e) => {
                  e.preventDefault();
                  window.open(`/documents/${doc.id}`, '_blank');
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 4fr 120px 70px 100px 80px 80px 140px 80px',
                  gap: '12px',
                  padding: '16px 20px',
                  borderBottom: `1px solid ${COLORS.borderColorLight}`,
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  position: 'relative',
                  minHeight: '64px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.bgSecondary;
                  e.currentTarget.style.transform = 'translateX(2px)';
                  const leftBorder = e.currentTarget.querySelector('.left-border');
                  if (leftBorder) {
                    (leftBorder as HTMLElement).style.opacity = '1';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                  const leftBorder = e.currentTarget.querySelector('.left-border');
                  if (leftBorder) {
                    (leftBorder as HTMLElement).style.opacity = '0';
                  }
                }}
              >
                {/* 左侧强调条 */}
                <div
                  className="left-border"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '3px',
                    background: 'linear-gradient(180deg, #2563eb, #8b5cf6)',
                    opacity: 0,
                    transition: 'opacity 0.15s',
                  }}
                />

                {/* 选择框 */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedDocuments.includes(doc.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectDocument(doc.id, e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '18px',
                      height: '18px',
                      border: `2px solid ${COLORS.borderColor}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  />
                </div>

                {/* 文档名称 */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: COLORS.bgTertiary,
                      color: COLORS.textSecondary,
                    }}>
                      <FileMarkdownOutlined style={{ fontSize: 20 }} />
                    </div>
                    <div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: COLORS.textPrimary,
                        marginBottom: '4px',
                        lineHeight: '1.4',
                      }}>
                        {doc.title}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: COLORS.textMuted,
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                      }}>
                        <span>更新于 {dayjs(doc.updatedAt).fromNow()}</span>
                        <span>·</span>
                        <span>{formatFileSize(doc.fileSize || doc.contentLength || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 分类 */}
                <div>
                  {(() => {
                    const categoryDisplayName = doc.categoryName || getCategoryName(doc.categoryId);
                    if (!categoryDisplayName || categoryDisplayName === '未分类') {
                      return (
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: 'rgba(100, 116, 139, 0.1)',
                          color: COLORS.textMuted,
                        }}>
                          未分类
                        </span>
                      );
                    }
                    const badgeStyle = getCategoryBadgeStyle(categoryDisplayName);
                    return (
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        backgroundColor: badgeStyle === 'tech'
                          ? 'rgba(37, 99, 235, 0.1)'
                          : badgeStyle === 'business'
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'rgba(139, 92, 246, 0.1)',
                        color: badgeStyle === 'tech'
                          ? COLORS.primary
                          : badgeStyle === 'business'
                          ? COLORS.success
                          : COLORS.secondary,
                      }}>
                        {categoryDisplayName}
                      </span>
                    );
                  })()}
                </div>

                {/* 浏览量 */}
                <div>
                  <span style={{ fontSize: '13px', color: COLORS.textPrimary, fontWeight: 500 }}>
                    {doc.viewCount?.toLocaleString() || 0}
                  </span>
                </div>

                {/* 作者 */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserAvatar
                      src={doc.author?.avatar}
                      alt={doc.author?.username || doc.authorName || ''}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                    <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>
                      {doc.author?.username || doc.authorName || '未知'}
                    </span>
                  </div>
                </div>

                {/* 状态 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    display: 'inline-block',
                    backgroundColor: doc.status === 'published' ? COLORS.success : doc.status === 'pending_review' ? COLORS.warning : COLORS.textMuted,
                  }} />
                  <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>
                    {doc.status === 'published' ? '已发布' : doc.status === 'pending_review' ? '待审核' : doc.status === 'draft' ? '草稿' : '已归档'}
                  </span>
                </div>

                {/* 可见性 */}
                <div>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 500,
                    backgroundColor: doc.isPublic === 1 || doc.isPublic === true
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(245, 158, 11, 0.1)',
                    color: doc.isPublic === 1 || doc.isPublic === true
                      ? COLORS.success
                      : '#d97706',
                  }}>
                    {doc.isPublic === 1 || doc.isPublic === true ? '全员可见' : '团队可见'}
                  </span>
                </div>

                {/* 发布时间 */}
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>
                    {doc.publishTime ? dayjs(doc.publishTime).format('YYYY-MM-DD HH:mm:ss') : doc.status === 'published' || doc.status === 'pending_review' ? dayjs(doc.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                  </span>
                </div>

                {/* 操作 */}
                <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                  <Dropdown
                    menu={{
                      items: getActionMenuItems().map(item => ({
                        ...item,
                        onClick: ({ domEvent }) => {
                          handleDocumentAction(item.key, doc.id, domEvent as React.MouseEvent);
                        },
                        danger: item.danger,
                      })),
                    }}
                    trigger={['click']}
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: COLORS.textMuted,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = COLORS.bgTertiary;
                        e.currentTarget.style.color = COLORS.textPrimary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = COLORS.textMuted;
                      }}
                    >
                      <MoreOutlined style={{ fontSize: 16 }} />
                    </div>
                  </Dropdown>
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            backgroundColor: COLORS.bgPrimary,
            borderTop: `1px solid ${COLORS.borderColor}`,
            borderRadius: '0 0 16px 16px',
          }}>
            <span style={{ fontSize: '14px', color: COLORS.textSecondary }}>
              显示 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, total)} 条，共 {total.toLocaleString()} 条文档
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 10px',
                  border: `1px solid ${COLORS.borderColor}`,
                  borderRadius: '8px',
                  backgroundColor: COLORS.bgPrimary,
                  color: currentPage === 1 ? COLORS.textMuted : COLORS.textSecondary,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  opacity: currentPage === 1 ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.backgroundColor = COLORS.bgTertiary;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.bgPrimary;
                }}
              >
                上一页
              </button>

              {/* 计算显示的页码 */}
              {(() => {
                const totalPages = Math.ceil(total / pageSize);
                const pages: (number | string)[] = [];

                // 总是显示第一页
                if (totalPages > 0) {
                  pages.push(1);
                }

                // 如果当前页距离第一页超过2，添加省略号
                if (currentPage > 3) {
                  pages.push('...');
                }

                // 显示当前页附近的页码
                for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                  pages.push(i);
                }

                // 如果最后一页距离当前页超过2，添加省略号
                if (currentPage < totalPages - 2) {
                  pages.push('...');
                }

                // 总是显示最后一页
                if (totalPages > 1) {
                  pages.push(totalPages);
                }

                return pages.map((page, index) => {
                  if (page === '...') {
                    return (
                      <span
                        key={`ellipsis-${index}`}
                        style={{
                          padding: '8px 4px',
                          color: COLORS.textSecondary,
                          fontSize: '14px',
                        }}
                      >
                        ...
                      </span>
                    );
                  }

                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page as number)}
                      style={{
                        padding: '8px 12px',
                        border: `1px solid ${currentPage === page ? COLORS.primary : COLORS.borderColor}`,
                        borderRadius: '8px',
                        backgroundColor: currentPage === page ? COLORS.primary : COLORS.bgPrimary,
                        color: currentPage === page ? 'white' : COLORS.textSecondary,
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== page) {
                          e.currentTarget.style.backgroundColor = COLORS.bgTertiary;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== page) {
                          e.currentTarget.style.backgroundColor = COLORS.bgPrimary;
                        }
                      }}
                    >
                      {page}
                    </button>
                  );
                });
              })()}

              <button
                onClick={() => currentPage < Math.ceil(total / pageSize) && handlePageChange(currentPage + 1)}
                disabled={currentPage >= Math.ceil(total / pageSize)}
                style={{
                  padding: '6px 10px',
                  border: `1px solid ${COLORS.borderColor}`,
                  borderRadius: '8px',
                  backgroundColor: COLORS.bgPrimary,
                  color: currentPage >= Math.ceil(total / pageSize) ? COLORS.textMuted : COLORS.textSecondary,
                  cursor: currentPage >= Math.ceil(total / pageSize) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  opacity: currentPage >= Math.ceil(total / pageSize) ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (currentPage < Math.ceil(total / pageSize)) {
                    e.currentTarget.style.backgroundColor = COLORS.bgTertiary;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.bgPrimary;
                }}
              >
                下一页
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DocumentsPage;
