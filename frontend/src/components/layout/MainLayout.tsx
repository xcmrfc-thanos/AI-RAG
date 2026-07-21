import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, Badge, App, Tooltip, Button } from 'antd';
import {
  DownOutlined, BellOutlined, CheckCircleOutlined, CloseCircleOutlined,
  InfoCircleOutlined, MessageOutlined, LikeOutlined,
  FieldTimeOutlined, ClockCircleOutlined, FileTextOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAppStore, useAuthStore, useNotificationStore, useCategoryStore, useTeamStore } from '@/stores';
import { webSocketService } from '@/services/websocket.service';
import type { WsNotificationPayload } from '@/services/websocket.service';
import type { SystemNotification } from '@/types';
import NotificationToast from '@/components/common/NotificationToast';
import UserAvatar from '@/components/common/UserAvatar';
import TeamIcon from '@/components/common/TeamIcon';
import CategoryIcon from '@/components/common/CategoryIcon';
import '@/components/common/NotificationToast.css';
import { resolveNotificationTarget } from '@/utils/notification-link';
import { AI_ENTRY_COPY } from '@/constants/ai-entry';
import { canShowAgentAdminNav, canShowAgentNav } from '@/utils/agent-access';
import { PERMISSIONS, getPrimaryRoleLabel, hasAdminAccess, hasAnyPermission, hasPermission } from '@/utils/permission';
import dashboardService from '@/services/dashboard.service';
import favoriteService from '@/services/favorite.service';

const MAIN_SIDEBAR_STORAGE_KEY = 'main-sidebar-collapsed';

/**
 * 读取主侧栏折叠状态（localStorage）。
 */
function readMainSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(MAIN_SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * 持久化主侧栏折叠状态。
 *
 * @param collapsed 是否折叠
 */
function persistMainSidebarCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(MAIN_SIDEBAR_STORAGE_KEY, String(collapsed));
  } catch {
    // 浏览器禁用存储时仍允许当前会话内切换
  }
}

/** 通知类型 → 图标 + 颜色 */
const NOTIF_ICON_MAP: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  'review-approved':  { icon: <CheckCircleOutlined />, color: '#059669', bg: '#ecfdf5' },
  'review-rejected':  { icon: <CloseCircleOutlined />,  color: '#dc2626', bg: '#fef2f2' },
  'review-submitted': { icon: <ClockCircleOutlined />,   color: '#d97706', bg: '#fffbeb' },
  system:             { icon: <InfoCircleOutlined />,    color: '#2563eb', bg: '#eff6ff' },
  comment:            { icon: <MessageOutlined />,        color: '#7c3aed', bg: '#f5f3ff' },
  mention:            { icon: <FieldTimeOutlined />,      color: '#ea580c', bg: '#fff7ed' },
  like:               { icon: <LikeOutlined />,            color: '#dc2626', bg: '#fef2f2' },
};
const NOTIF_ICON_DEFAULT = { icon: <FileTextOutlined />, color: '#6b7280', bg: '#f9fafb' };

/** 根据通知标题/内容判断审核状态子类型 */
function resolveReviewKey(notif: { title?: string; type?: string }): string {
  if (notif.type !== 'review') return notif.type || '';
  if (notif.title?.includes('通过')) return 'review-approved';
  if (notif.title?.includes('驳回')) return 'review-rejected';
  return 'review-submitted';
}

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, checkAuth, token } = useAuthStore();
  const { unreadCount, addNotification, fetchUnreadCount } = useNotificationStore();
  const { categoryTree, fetchCategoryTree } = useCategoryStore();
  const { teamTree, fetchTeamTree } = useTeamStore();
  const { notification } = App.useApp();
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readMainSidebarCollapsed);
  const [sidebarDocTotal, setSidebarDocTotal] = useState<number | null>(null);
  const [sidebarFavTotal, setSidebarFavTotal] = useState<number | null>(null);
  const currentRoles = user?.roles || (user?.role ? [user.role] : []);
  const canViewFiles = hasAnyPermission(user, [PERMISSIONS.documentList, PERMISSIONS.fileList]);
  const canManageCategories = hasAnyPermission(user, [PERMISSIONS.documentCategory, PERMISSIONS.documentCategoryQuery]);
  const canReviewDocuments = hasPermission(user, PERMISSIONS.documentReview);
  const canManagePermissions = hasPermission(user, PERMISSIONS.systemPermission);
  const canManageUsers = hasPermission(user, PERMISSIONS.systemUser);
  const canManageRoles = hasPermission(user, PERMISSIONS.systemRole);
  const canManageTeams = hasPermission(user, PERMISSIONS.systemTeam);
  const canViewStatistics = hasPermission(user, PERMISSIONS.systemStatistics);
  const canManageSettings = hasPermission(user, PERMISSIONS.systemSettings);
  const isAdminSection = location.pathname.startsWith('/admin');

  /**
   * 切换主侧栏展开/收起并持久化。
   */
  const handleSidebarToggle = () => {
    const nextCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(nextCollapsed);
    persistMainSidebarCollapsed(nextCollapsed);
  };

  // 判断用户是否为审核员（根据角色判断）
  const isReviewer = canReviewDocuments || currentRoles.some((role) => role.toUpperCase().includes('REVIEWER'));

  const openNotificationTarget = useCallback((notif: SystemNotification) => {
    const target = resolveNotificationTarget(notif);
    if (!target.url) {
      return;
    }
    if (target.openInNewTab) {
      window.open(target.url, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(target.url);
  }, [navigate]);

  // 通知弹窗辅助函数
  const showNotificationToast = useCallback((notif: SystemNotification) => {
    const iconKey = resolveReviewKey(notif);
    const cfg = NOTIF_ICON_MAP[iconKey] || NOTIF_ICON_DEFAULT;
    const key = `notif-toast-${notif.id}`;
    notification.open({
      key,
      message: notif.title,
      description: (
        <NotificationToast
          notification={notif}
          onNavigate={() => {
            notification.destroy(key);
            openNotificationTarget(notif);
          }}
        />
      ),
      icon: (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36, height: 36,
          borderRadius: 10,
          background: cfg.bg,
          color: cfg.color,
          fontSize: 18,
        }}>
          {cfg.icon}
        </span>
      ),
      className: 'custom-notif-toast',
      placement: 'topRight',
      duration: 3,
      onClick: () => {
        notification.destroy(key);
        openNotificationTarget(notif);
      },
    });
  }, [notification, openNotificationTarget]);

  // WebSocket 通知 → Store 回调 + 实时弹窗
  const handleWsNotification = useCallback((payload: WsNotificationPayload) => {
    const notif: SystemNotification = {
      id: `${payload.notificationType}-${payload.documentId}-${Date.now()}`,
      type: (payload.notificationType as SystemNotification['type']) || 'system',
      title: payload.title,
      content: payload.content,
      link: resolveNotificationTarget({
        type: payload.notificationType,
        link: payload.link,
        documentId: payload.documentId,
      }).url,
      documentId: payload.documentId ? String(payload.documentId) : undefined,
      read: false,
      createdAt: payload.timestamp || new Date().toISOString(),
    };
    addNotification(notif);
    showNotificationToast(notif);
  }, [addNotification, showNotificationToast]);

  // 审核员广播回调
  const handleReviewerNotification = useCallback((payload: WsNotificationPayload) => {
    const notif: SystemNotification = {
      id: `review-${payload.documentId}-${Date.now()}`,
      type: 'review',
      title: payload.title,
      content: payload.content,
      link: resolveNotificationTarget({
        type: 'review',
        link: payload.link,
        documentId: payload.documentId,
      }).url,
      documentId: payload.documentId ? String(payload.documentId) : undefined,
      read: false,
      createdAt: payload.timestamp || new Date().toISOString(),
    };
    addNotification(notif);
    showNotificationToast(notif);
  }, [addNotification, showNotificationToast]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 加载 App 全局配置（系统名称等）
  const systemName = useAppStore((s) => s.systemName);
  const enableAI = useAppStore((s) => s.enableAI);
  const enableAIWriting = useAppStore((s) => s.enableAIWriting);
  const enableAgent = useAppStore((s) => s.enableAgent);
  const enableFullTextSearch = useAppStore((s) => s.enableFullTextSearch);
  const enableWebSocket = useAppStore((s) => s.enableWebSocket);
  const fetchAppConfig = useAppStore((s) => s.fetchAppConfig);
  useEffect(() => {
    fetchAppConfig();
  }, [fetchAppConfig]);

  // 加载侧边栏分类目录和团队空间数据
  useEffect(() => {
    fetchCategoryTree().catch(() => {});
    fetchTeamTree().catch(() => {});
  }, [fetchCategoryTree, fetchTeamTree]);

  /**
   * 侧栏「全部文档 / 我的收藏」角标：拉真实统计，失败则不展示假数。
   */
  useEffect(() => {
    if (!token) {
      setSidebarDocTotal(null);
      setSidebarFavTotal(null);
      return;
    }
    let cancelled = false;
    dashboardService.getStats()
      .then((res: any) => {
        if (cancelled) return;
        const total = res?.overview?.totalDocuments;
        setSidebarDocTotal(typeof total === 'number' ? total : null);
      })
      .catch(() => {
        if (!cancelled) setSidebarDocTotal(null);
      });
    favoriteService.getFavorites()
      .then((list) => {
        if (cancelled) return;
        setSidebarFavTotal(Array.isArray(list) ? list.length : 0);
      })
      .catch(() => {
        if (!cancelled) setSidebarFavTotal(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token, location.pathname]);

  // WebSocket 连接生命周期
  useEffect(() => {
    if (!enableWebSocket || !user?.id || !token) return;

    // 获取初始未读数
    fetchUnreadCount().catch(() => {
      // 静默处理，不影响主流程
    });

    // 注册回调
    const unsubNotification = webSocketService.onNotification(handleWsNotification);
    const unsubReviewer = webSocketService.onReviewerNotification(handleReviewerNotification);

    // 建立连接（携带 JWT Token）
    const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    webSocketService.connect(authHeader, isReviewer);

    return () => {
      unsubNotification();
      unsubReviewer();
      webSocketService.disconnect();
    };
  }, [enableWebSocket, user?.id, token, isReviewer, handleWsNotification, handleReviewerNotification, fetchUnreadCount]);

  useEffect(() => {
    setShowAdminMenu(hasAdminAccess(user));
  }, [user]);

  const handleNavClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    navigate(path);
  };

  const handleSidebarClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    navigate(path);
  };

  return (
    <>
      {/* Enterprise-Grade Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-left">
          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              )}
            </svg>
          </button>

          <a href="/" className="logo" onClick={(e) => handleNavClick(e, '/')}>
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </div>
            <span>{systemName}</span>
          </a>
          <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <a href="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} onClick={(e) => handleNavClick(e, '/')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              首页
            </a>
            <a href="/documents" className={`nav-link ${location.pathname.startsWith('/documents') ? 'active' : ''}`} onClick={(e) => handleNavClick(e, '/documents')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              文档中心
            </a>
            {canViewFiles && (
              <a href="/files" className={`nav-link ${location.pathname === '/files' ? 'active' : ''}`} onClick={(e) => handleNavClick(e, '/files')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                  <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                文件管理
              </a>
            )}
            <a href="/knowledge-graph" className={`nav-link ${location.pathname === '/knowledge-graph' ? 'active' : ''}`} onClick={(e) => handleNavClick(e, '/knowledge-graph')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="4"></circle>
                <line x1="21.17" y1="8" x2="12" y2="8"></line>
                <line x1="3.95" y1="6.06" x2="8.54" y2="14"></line>
                <line x1="10.88" y1="21.94" x2="15.46" y2="14"></line>
              </svg>
              知识图谱
            </a>
            <a href="/search" className={`nav-link ${location.pathname === '/search' ? 'active' : ''}`} onClick={(e) => handleNavClick(e, '/search')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              {AI_ENTRY_COPY.search.navLabel}
            </a>
            {enableAI && (
            <a href="/ai" className={`nav-link ${location.pathname === '/ai' ? 'active' : ''}`} onClick={(e) => handleNavClick(e, '/ai')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              {AI_ENTRY_COPY.assistant.navLabel}
            </a>
            )}
            {enableAIWriting && (
            <a href="/ai-writing" className={`nav-link ${location.pathname === '/ai-writing' ? 'active' : ''}`} onClick={(e) => handleNavClick(e, '/ai-writing')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              {AI_ENTRY_COPY.writing.navLabel}
            </a>
            )}
            {canShowAgentNav(enableAgent, user) && (
            <a href="/agent" className={`nav-link ${location.pathname === '/agent' ? 'active' : ''}`} onClick={(e) => handleNavClick(e, '/agent')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <path d="M14 14h7v7h-7z"></path>
                <path d="M3 14h7v7H3z"></path>
              </svg>
              {AI_ENTRY_COPY.agent.navLabel}
            </a>
            )}
            {showAdminMenu && (
              <div className="nav-item admin-menu">
                <button
                  type="button"
                  className={`nav-link dropdown-toggle ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24"></path>
                  </svg>
                  系统管理
                  <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                <div className="dropdown-menu">
                  {hasAdminAccess(user) && (
                    <a href="/admin" className="dropdown-item" onClick={(e) => handleNavClick(e, '/admin')}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                      </svg>
                      管理中心
                    </a>
                  )}
                  {canShowAgentAdminNav(enableAgent, user) && (
                    <a
                      href="/admin/agents"
                      className="dropdown-item"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open('/admin/agents', '_blank');
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="M2 17l10 5 10-5"></path>
                        <path d="M2 12l10 5 10-5"></path>
                      </svg>
                      {AI_ENTRY_COPY.agentAdmin.navLabel}
                    </a>
                  )}
                  {canManagePermissions && (
                    <a href="/admin/permissions" className="dropdown-item" onClick={(e) => handleNavClick(e, '/admin/permissions')}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                      权限管理
                    </a>
                  )}
                  {canManageCategories && (
                    <a href="/admin/categories" className="dropdown-item" onClick={(e) => handleNavClick(e, '/admin/categories')}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                      </svg>
                      分类管理
                    </a>
                  )}
                  {canManageTeams && (
                    <a href="/admin/teams" className="dropdown-item" onClick={(e) => handleNavClick(e, '/admin/teams')}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      团队空间管理
                    </a>
                  )}
                  {canManageUsers && (
                    <a href="/admin/users" className="dropdown-item" onClick={(e) => handleNavClick(e, '/admin/users')}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      用户管理
                    </a>
                  )}
                  {canManageRoles && (
                    <a href="/admin/roles" className="dropdown-item" onClick={(e) => handleNavClick(e, '/admin/roles')}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-4z"></path>
                        <path d="M9.5 12l1.5 1.5L14.5 10"></path>
                      </svg>
                      角色管理
                    </a>
                  )}
                  {canReviewDocuments && (
                    <a href="/admin/review" className="dropdown-item" onClick={(e) => handleNavClick(e, '/admin/review')}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      审核管理
                    </a>
                  )}
                  {canViewStatistics && (
                    <a href="/admin/statistics" className="dropdown-item" onClick={(e) => handleNavClick(e, '/admin/statistics')}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                      </svg>
                      统计分析
                    </a>
                  )}
                  {canManageSettings && (
                    <a href="/admin/settings" className="dropdown-item" onClick={(e) => handleNavClick(e, '/admin/settings')}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24"></path>
                      </svg>
                      系统设置
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="navbar-right">
          {/* Mobile Search Button */}
          <button
            className="mobile-search-button"
            onClick={() => navigate('/search')}
            aria-label="Search"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>

          {/* 搜索框 */}
          {enableFullTextSearch && (
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="搜索知识库、文档、问答..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const keyword = (e.target as HTMLInputElement).value.trim();
                  if (keyword) {
                    navigate(`/search?q=${encodeURIComponent(keyword)}`);
                  }
                }
              }}
            />
          </div>
          )}

{/* 团队空间选择器 - 暂时屏蔽 */}
          {/* <Select
            value={selectedTeam ? String(selectedTeam.id) : undefined}
            placeholder="选择团队空间"
            allowClear
            style={{ minWidth: 150, maxWidth: 200 }}
            size="middle"
            onChange={(value) => {
              const team = teamTree.find((t) => String(t.id) === value);
              if (team) {
                setSelectedTeam(team);
                navigate(`/documents?team=${team.id}`);
              }
            }}
            onClear={() => {
              setSelectedTeam(null);
              navigate('/documents');
            }}
            options={teamTree.map((team) => ({
              value: String(team.id),
              label: team.teamName || team.name,
            }))}
          /> */}

          {/* 通知铃铛 */}
          <Badge count={unreadCount} size="small" overflowCount={99} offset={[-2, 2]}>
            <BellOutlined
              onClick={() => navigate('/notifications')}
              style={{
                fontSize: '20px',
                color: 'var(--text-secondary, #475569)',
                cursor: 'pointer',
                padding: '8px 4px 8px 8px',
                borderRadius: '8px',
                transition: 'background-color 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary, #f1f5f9)';
                e.currentTarget.style.color = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary, #475569)';
              }}
            />
          </Badge>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'profile',
                  label: '个人中心',
                  onClick: () => navigate('/profile'),
                },
                {
                  type: 'divider',
                },
                {
                  key: 'logout',
                  label: '退出登录',
                  onClick: async () => {
                    await useAuthStore.getState().logout();
                    navigate('/login');
                  },
                },
              ],
              style: { minWidth: 120 },
            }}
            placement="bottomRight"
            trigger={['click']}
          >
            <div
              className="user-menu"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 16px',
                borderRadius: '8px',
                minWidth: '180px',
                maxWidth: '220px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <UserAvatar
                src={user?.avatar}
                alt={user?.username || '用户'}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
              <div
                className="user-info-container"
                style={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: 'left'
                }}
              >
                <div
                  className="user-name"
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2
                  }}
                >
                  {user?.username || 'John Doe'}
                </div>
                <div
                  className="user-role"
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2
                  }}
                >
                  {getPrimaryRoleLabel(user)}
                </div>
              </div>
              <DownOutlined style={{ fontSize: '10px', color: 'var(--text-muted)' }} />
            </div>
          </Dropdown>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className={`mobile-menu-overlay ${mobileMenuOpen ? 'show' : ''}`}
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}

      {/* Main Container */}
      <div className={`main-container${isAdminSection ? ' main-container--admin' : ''}${!isAdminSection && sidebarCollapsed ? ' is-sidebar-collapsed' : ''}`}>
        {/* Sidebar — 管理后台使用 AdminLayout 自带侧栏 */}
        {!isAdminSection && (
        <aside className={`sidebar${sidebarCollapsed ? ' is-collapsed' : ''}`} id="main-sidebar-navigation" aria-label="知识库导航">
          <div className="sidebar-header">
            {!sidebarCollapsed && <span className="sidebar-header-label">导航</span>}
            <Tooltip title={sidebarCollapsed ? '展开侧栏' : '收起侧栏'} placement="right">
              <Button
                type="text"
                className="sidebar-toggle"
                icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={handleSidebarToggle}
                aria-label={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
                aria-expanded={!sidebarCollapsed}
                aria-controls="main-sidebar-navigation"
              />
            </Tooltip>
          </div>
          <div className="sidebar-section">
            <div className="sidebar-title">知识空间</div>
            <ul className="sidebar-menu">
              <li className={`sidebar-item ${location.pathname === '/' ? 'active' : ''}`}>
                <a href="/" className="sidebar-link" title={sidebarCollapsed ? '全部文档' : undefined} onClick={(e) => handleSidebarClick(e, '/')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span className="sidebar-link-text">全部文档</span>
                  {sidebarDocTotal != null && (
                    <span className="badge">{sidebarDocTotal.toLocaleString('zh-CN')}</span>
                  )}
                </a>
              </li>
              <li className={`sidebar-item ${location.pathname === '/my-documents' ? 'active' : ''}`}>
                <a href="/my-documents" className="sidebar-link" title={sidebarCollapsed ? '我的文档' : undefined} onClick={(e) => handleSidebarClick(e, '/my-documents')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                    <line x1="3" y1="3" x2="8" y2="3"></line>
                    <line x1="3" y1="5" x2="8" y2="5"></line>
                    <line x1="3" y1="7" x2="8" y2="7"></line>
                  </svg>
                  <span className="sidebar-link-text">我的文档</span>
                </a>
              </li>
              <li className={`sidebar-item ${location.pathname === '/drafts' ? 'active' : ''}`}>
                <a href="/drafts" className="sidebar-link" title={sidebarCollapsed ? '草稿箱' : undefined} onClick={(e) => handleSidebarClick(e, '/drafts')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span className="sidebar-link-text">草稿箱</span>
                </a>
              </li>
              <li className={`sidebar-item ${location.pathname === '/favorites' ? 'active' : ''}`}>
                <a href="/favorites" className="sidebar-link" title={sidebarCollapsed ? '我的收藏' : undefined} onClick={(e) => handleSidebarClick(e, '/favorites')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  <span className="sidebar-link-text">我的收藏</span>
                  {sidebarFavTotal != null && sidebarFavTotal > 0 && (
                    <span className="badge">{sidebarFavTotal.toLocaleString('zh-CN')}</span>
                  )}
                </a>
              </li>
              <li className={`sidebar-item ${location.pathname === '/recent-access' ? 'active' : ''}`}>
                <a href="/recent-access" className="sidebar-link" title={sidebarCollapsed ? '最近访问' : undefined} onClick={(e) => handleSidebarClick(e, '/recent-access')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span className="sidebar-link-text">最近访问</span>
                </a>
              </li>
              {canReviewDocuments && (
                <li className={`sidebar-item ${location.pathname === '/admin/review' ? 'active' : ''}`}>
                  <a href="/admin/review" className="sidebar-link" title={sidebarCollapsed ? '待审核' : undefined} onClick={(e) => handleSidebarClick(e, '/admin/review')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span className="sidebar-link-text">待审核</span>
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-title">分类目录</div>
            <ul className="sidebar-menu">
              {categoryTree.map((cat) => {
                const active = location.pathname === '/documents' && location.search.includes(`category=${cat.id}`);
                return (
                  <li key={cat.id} className={`sidebar-item${active ? ' active' : ''}`}>
                    <a href={`/documents?category=${cat.id}`} className="sidebar-link" title={sidebarCollapsed ? cat.name : undefined} onClick={(e) => handleSidebarClick(e, `/documents?category=${cat.id}`)}>
                      <CategoryIcon icon={cat.icon} variant="sidebar" />
                      <span className="sidebar-link-text">{cat.name}</span>
                      {cat.documentCount != null && (
                        <span className="sidebar-count">{cat.documentCount}</span>
                      )}
                    </a>
                  </li>
                );
              })}
              {categoryTree.length === 0 && (
                <li className="sidebar-item sidebar-item--empty">
                  暂无分类
                </li>
              )}
            </ul>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-title">团队空间</div>
            <ul className="sidebar-menu">
              {teamTree.map((team) => {
                const active = location.pathname === '/documents' && location.search.includes(`team=${team.id}`);
                const name = team.teamName || team.name || '';
                return (
                  <li key={team.id} className={`sidebar-item${active ? ' active' : ''}`}>
                    <a href={`/documents?team=${team.id}`} className="sidebar-link" title={sidebarCollapsed ? name : undefined} onClick={(e) => { useTeamStore.getState().setSelectedTeam(team); handleSidebarClick(e, `/documents?team=${team.id}`); }}>
                      <TeamIcon icon={team.icon} variant="sidebar" />
                      <span className="sidebar-link-text">{name}</span>
                    </a>
                  </li>
                );
              })}
              {teamTree.length === 0 && (
                <li className="sidebar-item sidebar-item--empty">
                  暂无团队
                </li>
              )}
            </ul>
          </div>
        </aside>
        )}

        {/* Main Content Area */}
        <main className={`content${isAdminSection ? ' content--admin' : ''}`}>
          <Outlet />
        </main>
      </div>
    </>
  );
};

export default MainLayout;
