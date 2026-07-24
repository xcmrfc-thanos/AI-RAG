/**
 * 业务页面：DashboardPage。
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dashboardService from '@/services/dashboard.service';
import statisticsService from '@/services/statistics.service';
import documentService from '@/services/document.service';
import type { EntityId } from '@/types';
import { useAppStore, useAuthStore } from '@/stores';
import { PERMISSIONS, hasPermission } from '@/utils/permission';
import {
  DocumentCard,
  DocumentsGrid,
  DOCUMENT_CARD_GRADIENTS,
  formatDocumentCardNumber,
  resolveDocumentCategoryType,
} from '@/components/common';
import { AI_ENTRY_COPY } from '@/constants/ai-entry';

/**
 * DashboardPage 页面组件。
 */
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const systemName = useAppStore((s) => s.systemName);
  const enableAI = useAppStore((s) => s.enableAI);
  const canCreateDocument = hasPermission(user, PERMISSIONS.documentCreate);
  const [isListView, setIsListView] = useState(false);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    aiSearchCount: 0,
    aiQaCount: 0,
    activeUserCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [latestDocuments, setLatestDocuments] = useState<any[]>([]);
  const [latestDocsLoading, setLatestDocsLoading] = useState(true);
  const [hotDocuments, setHotDocuments] = useState<any[]>([]);
  const [hotDocsLoading, setHotDocsLoading] = useState(true);

  // 获取最新文档：直接走文档中心真源（统计投影常滞后，去假数据后不能再依赖空投影）
  useEffect(() => {
    let cancelled = false;
    documentService.getDocuments({
      status: 1,
      page: 1,
      pageSize: 6,
      sortBy: 'publishTime',
      sortOrder: 'desc',
    })
      .then((page) => {
        if (cancelled) return;
        const list = (page.list || []).map((d: any) => ({
          documentId: d.id,
          title: d.title,
          authorName: d.authorName,
          categoryName: d.categoryName,
          viewCount: d.viewCount || 0,
          favoriteCount: d.favoriteCount || 0,
          summary: d.summary,
          createdAt: d.publishTime || d.updatedAt || d.createdAt,
        }));
        setLatestDocuments(list);
      })
      .catch((err) => console.error('获取最新文档失败:', err))
      .finally(() => {
        if (!cancelled) setLatestDocsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    dashboardService.getStats()
      .then((res: any) => {
        // 响应拦截器已解包 data.data，res 即 DashboardVO
        const overview = res?.overview;
        if (overview) {
          setStats({
            totalDocuments: Number(overview.totalDocuments) || 0,
            aiSearchCount: Number(overview.aiSearchCount) || 0,
            aiQaCount: Number(overview.aiQaCount) || 0,
            activeUserCount: Number(overview.activeUserCount) || 0,
          });
        }
      })
      .catch((err: any) => {
        console.error('获取仪表盘数据失败:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    // 文档总数以文档分页为准，校正统计投影滞后导致的「2 篇」假象
    documentService.getDocuments({ status: 1, page: 1, pageSize: 1 })
      .then((page) => {
        const total = Number(page?.total);
        if (Number.isFinite(total) && total >= 0) {
          setStats((prev) => ({ ...prev, totalDocuments: total }));
        }
      })
      .catch(() => {});
  }, []);

  // 获取热门文档：统计为空时回退文档中心
  useEffect(() => {
    let cancelled = false;
    /**
     * 将文档列表项映射为首页卡片字段。
     */
    const mapDocs = (list: any[]) =>
      (list || []).map((d) => ({
        documentId: d.id,
        title: d.title,
        authorName: d.authorName,
        categoryName: d.categoryName,
        viewCount: d.viewCount || 0,
        favoriteCount: d.favoriteCount || 0,
        summary: d.summary,
        createdAt: d.publishTime || d.updatedAt || d.createdAt,
      }));

    statisticsService.getPopularDocuments({ limit: 6 })
      .then(async (docs) => {
        if (cancelled) return;
        if (docs && docs.length > 0) {
          setHotDocuments(docs);
          return;
        }
        const page = await documentService.getDocuments({
          status: 1,
          page: 1,
          pageSize: 6,
          sortBy: 'viewCount',
          sortOrder: 'desc',
        });
        if (!cancelled) setHotDocuments(mapDocs(page.list || []));
      })
      .catch(async (err) => {
        console.error('获取热门文档失败，尝试回退文档列表:', err);
        try {
          const page = await documentService.getDocuments({
            status: 1,
            page: 1,
            pageSize: 6,
            sortBy: 'publishTime',
            sortOrder: 'desc',
          });
          if (!cancelled) setHotDocuments(mapDocs(page.list || []));
        } catch (e) {
          console.error('热门文档回退失败:', e);
        }
      })
      .finally(() => {
        if (!cancelled) setHotDocsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDocumentClick = (id: EntityId) => {
    window.open(`/documents/${id}`, '_blank');
  };

  const techStack = [
    { name: 'Java 21', version: 'LTS版本', icon: 'Java', gradient: 'linear-gradient(135deg, #2563eb, #8b5cf6)' },
    { name: 'Spring Boot 3.2', version: '企业级框架', icon: 'S', gradient: 'linear-gradient(135deg, #6DB33F, #4CAF50)' },
    { name: 'Redis 7.2', version: '高性能缓存', icon: 'R', gradient: 'linear-gradient(135deg, #FF6B6B, #EE5A24)' },
    { name: 'MySQL 8.0', version: '关系型数据库', icon: 'M', gradient: 'linear-gradient(135deg, #4479A1, #274C77)' },
    { name: 'PostgreSQL 16', version: '高级数据库', icon: 'PG', gradient: 'linear-gradient(135deg, #336791, #205E75)' },
    { name: 'Elasticsearch 8', version: '搜索引擎', icon: 'ES', gradient: 'linear-gradient(135deg, #F29111, #D66D18)' },
    { name: 'Qwen3-Max', version: '对话模型', icon: 'AI', gradient: 'linear-gradient(135deg, #6366f1, #0ea5e9)' },
    { name: 'React 18', version: '前端框架', icon: 'Re', gradient: 'linear-gradient(135deg, #61DAFB, #21A4C7)' },
  ];

  /**
   * handleSuggestionClick。
   */
  const handleSuggestionClick = (text: string) => {
    navigate('/ai', { state: { query: text } });
  };

  /**
   * 首页快捷芯片：按产品边界跳转对应入口。
   */
  const handleDashboardChipClick = (e: React.MouseEvent, target: 'search' | 'writing' | 'assistant', payload?: string) => {
    e.stopPropagation();
    if (target === 'search') {
      navigate('/search');
      return;
    }
    if (target === 'writing') {
      navigate(payload ? `/ai-writing?title=${encodeURIComponent(payload)}` : '/ai-writing');
      return;
    }
    if (payload) {
      handleSuggestionClick(payload);
    }
  };

  const handleStatCardClick = () => {
    navigate('/documents');
  };

  const renderDocCard = (doc: any, index: number, badge?: { label: string; className: string }) => {
    const docId = doc.documentId || doc.id;
    return (
      <DocumentCard
        key={docId}
        title={doc.title}
        excerpt={doc.summary || doc.excerpt || ''}
        authorName={doc.authorName || '未知'}
        categoryName={doc.categoryName || '文档'}
        categoryType={resolveDocumentCategoryType(doc.categoryName)}
        publishTime={doc.createdAt || ''}
        viewCount={doc.viewCount || 0}
        favoriteCount={doc.favoriteCount || 0}
        previewGradient={DOCUMENT_CARD_GRADIENTS[index % DOCUMENT_CARD_GRADIENTS.length]}
        trendBadge={badge}
        listView={isListView}
        onClick={() => handleDocumentClick(docId)}
      />
    );
  };

  const renderDocSection = (title: string, docs: any[], sectionLoading: boolean, badge?: { label: string; className: string }) => (
    <>
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        <div className="section-header-right">
          <span className="section-more" onClick={() => navigate('/documents')}>
            更多 <span className="section-more-arrow">&rsaquo;</span>
          </span>
          <div className="view-toggle">
            <div
              className={`view-btn ${!isListView ? 'active' : ''}`}
              onClick={() => setIsListView(false)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </div>
            <div
              className={`view-btn ${isListView ? 'active' : ''}`}
              onClick={() => setIsListView(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </div>
          </div>
        </div>
      </div>
      <DocumentsGrid listView={isListView}>
        {sectionLoading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>加载中...</div>
        ) : docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>暂无{title}</div>
        ) : (
          docs.map((doc, index) => renderDocCard(doc, index, badge))
        )}
      </DocumentsGrid>
    </>
  );

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{systemName}</h1>
          <p className="page-subtitle">基于AI技术的下一代企业知识管理平台</p>
        </div>
        <div className="action-buttons">
          {canCreateDocument && (
            <button className="btn btn-secondary" onClick={() => navigate('/documents/import')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              导入文档
            </button>
          )}
          {canCreateDocument && (
            <button className="btn btn-primary" onClick={() => navigate('/documents/new')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              新建文档
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card" onClick={handleStatCardClick}>
          <div className="stat-header">
            <div className="stat-icon blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div className="stat-trend up">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
              +12.5%
            </div>
          </div>
          <div className="stat-value">{loading ? '-' : formatDocumentCardNumber(stats.totalDocuments)}</div>
          <div className="stat-label">文档总数</div>
        </div>

        <div className="stat-card" onClick={handleStatCardClick}>
          <div className="stat-header">
            <div className="stat-icon green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <div className="stat-trend up">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
              实时
            </div>
          </div>
          <div className="stat-value">{loading ? '-' : formatDocumentCardNumber(stats.aiSearchCount)}</div>
          <div className="stat-label">AI智能搜索</div>
        </div>

        <div className="stat-card" onClick={handleStatCardClick}>
          <div className="stat-header">
            <div className="stat-icon purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div className="stat-trend up">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
              实时
            </div>
          </div>
          <div className="stat-value">{loading ? '-' : formatDocumentCardNumber(stats.aiQaCount)}</div>
          <div className="stat-label">AI问答次数</div>
        </div>

        <div className="stat-card" onClick={handleStatCardClick}>
          <div className="stat-header">
            <div className="stat-icon orange">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div className="stat-trend up">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
              近30天
            </div>
          </div>
          <div className="stat-value">{loading ? '-' : formatDocumentCardNumber(stats.activeUserCount)}</div>
          <div className="stat-label">活跃用户</div>
        </div>
      </div>

      {/* AI Assistant Section */}
      {enableAI && (
      <div className="ai-assistant-section" onClick={() => navigate('/ai')}>
        <div className="ai-header">
          <div className="ai-avatar">🤖</div>
          <div className="ai-info">
            <h3>{AI_ENTRY_COPY.dashboard.sectionTitle}</h3>
            <p>{AI_ENTRY_COPY.dashboard.sectionSubtitle}</p>
          </div>
          <div className="ai-status">
            <span className="dot"></span>
            在线服务中
          </div>
        </div>
        <div className="ai-input-area">
          <div className="ai-input">
            <textarea
              placeholder={AI_ENTRY_COPY.dashboard.textareaPlaceholder}
              readOnly
            />
            <div className="ai-suggestions">
              <span
                className="suggestion-chip"
                onClick={(e) => handleDashboardChipClick(e, 'search')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                智能搜索文档
              </span>
              <span
                className="suggestion-chip"
                onClick={(e) => handleDashboardChipClick(e, 'writing', '生成数据分析报告')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                生成数据分析报告
              </span>
              <span
                className="suggestion-chip"
                onClick={(e) => handleDashboardChipClick(e, 'writing', '辅助文档编写')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                辅助文档编写
              </span>
              <span
                className="suggestion-chip"
                onClick={(e) => handleDashboardChipClick(e, 'assistant', '提供创新建议')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                </svg>
                提供创新建议
              </span>
              <span
                className="suggestion-chip"
                onClick={(e) => handleDashboardChipClick(e, 'assistant', '知识点总结')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="6"></circle>
                  <circle cx="12" cy="12" r="2"></circle>
                </svg>
                知识点总结
              </span>
            </div>
          </div>
          <button className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            发送
          </button>
        </div>
      </div>
      )}

      {/* 最新文档 */}
      {renderDocSection('最新文档', latestDocuments, latestDocsLoading, { label: 'NEW', className: 'new' })}

      {/* 热门文档 */}
      {renderDocSection('热门文档', hotDocuments, hotDocsLoading, { label: 'HOT', className: 'hot' })}

      {/* Tech Stack Section */}
      <div className="tech-stack-section">
        <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '8px' }}>
          核心技术栈
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '32px' }}>
          采用业界领先的技术架构，确保系统的高性能、高可用和可扩展性
        </p>

        <div className="tech-grid">
          {techStack.map((tech, index) => (
            <div key={index} className="tech-item">
              <div
                className="tech-icon"
                style={{
                  background: tech.gradient,
                }}
              >
                {tech.icon}
              </div>
              <div className="tech-name">{tech.name}</div>
              <div className="tech-version">{tech.version}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
