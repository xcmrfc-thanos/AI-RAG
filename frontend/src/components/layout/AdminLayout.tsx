/**
 * UI 组件：AdminLayout。
 */
import React, { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  UserOutlined,
  SafetyOutlined,
  TeamOutlined,
  FolderOutlined,
  AuditOutlined,
  BarChartOutlined,
  SettingOutlined,
  CloudServerOutlined,
  BookOutlined,
  FileSearchOutlined,
  BellOutlined,
  RobotOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuthStore, useAppStore } from '@/stores';
import { hasAllPermissions, hasAnyPermission } from '@/utils/permission';
import {
  ADMIN_NAV_GROUPS,
  type AdminNavItemConfig,
  isAdminNavActive,
} from '@/constants/admin-nav';
import { canShowAgentAdminNav } from '@/utils/agent-access';
import './AdminLayout.css';

const ADMIN_NAV_ICONS: Record<string, React.ReactNode> = {
  overview: <AppstoreOutlined />,
  users: <UserOutlined />,
  roles: <SafetyOutlined />,
  permissions: <SafetyOutlined />,
  teams: <TeamOutlined />,
  categories: <FolderOutlined />,
  review: <AuditOutlined />,
  agents: <RobotOutlined />,
  statistics: <BarChartOutlined />,
  settings: <SettingOutlined />,
  'system-config': <CloudServerOutlined />,
  dictionary: <BookOutlined />,
  'operation-logs': <FileSearchOutlined />,
  'notification-templates': <BellOutlined />,
};

const ADMIN_SIDEBAR_STORAGE_KEY = 'admin-sidebar-collapsed';

/**
 * readSidebarCollapsed 方法。
 */
function readSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(ADMIN_SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * persistSidebarCollapsed 方法。
 */
function persistSidebarCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(ADMIN_SIDEBAR_STORAGE_KEY, String(collapsed));
  } catch {
    // 浏览器禁用存储时仍允许当前会话内切换。
  }
}

/**
 * 管理后台统一布局：左侧导航 + 子路由内容区（任务 44 / F4）。
 */
const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const enableAgent = useAppStore((state) => state.enableAgent);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);

  /**
   * 按权限与功能开关过滤可见导航项。
   */
  const visibleGroups = useMemo(() => {
    return ADMIN_NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => isNavItemVisible(item, user, enableAgent)),
    })).filter((group) => group.items.length > 0);
  }, [user, enableAgent]);

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    event.preventDefault();
    // Agent 编排：与文档详情一致，新标签单开（无主菜单/管理侧栏）
    if (path === '/admin/agents') {
      window.open(path, '_blank');
      return;
    }
    navigate(path);
  };

  const handleSidebarToggle = () => {
    const nextCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(nextCollapsed);
    persistSidebarCollapsed(nextCollapsed);
  };

  return (
    <div className={`admin-layout${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}`}>
      <aside id="admin-sidebar-navigation" className="admin-layout__sidebar" aria-label="管理后台导航">
        <div className="admin-layout__sidebar-header">
          <div className="admin-layout__sidebar-copy">
            <p className="admin-layout__sidebar-title">管理后台</p>
            <p className="admin-layout__sidebar-desc">统一入口与模块导航</p>
          </div>
          <Tooltip title={sidebarCollapsed ? '展开管理导航' : '收起管理导航'} placement="right">
            <Button
              type="text"
              className="admin-layout__sidebar-toggle"
              icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              aria-label={sidebarCollapsed ? '展开管理导航' : '收起管理导航'}
              aria-expanded={!sidebarCollapsed}
              aria-controls="admin-sidebar-navigation"
              onClick={handleSidebarToggle}
            />
          </Tooltip>
        </div>

        {visibleGroups.map((group) => (
          <div key={group.title} className="admin-layout__section">
            <div className="admin-layout__section-title">{group.title}</div>
            <ul className="admin-layout__menu">
              {group.items.map((item) => {
                const active = isAdminNavActive(item.path, location.pathname);
                const menuLink = (
                  <a
                    href={item.path}
                    className="admin-layout__menu-link"
                    aria-label={sidebarCollapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    onClick={(event) => handleNavClick(event, item.path)}
                  >
                    <span className="admin-layout__menu-icon">
                      {ADMIN_NAV_ICONS[item.key] ?? <AppstoreOutlined />}
                    </span>
                    <span className="admin-layout__menu-label">{item.label}</span>
                  </a>
                );
                return (
                  <li
                    key={item.key}
                    className={`admin-layout__menu-item${active ? ' active' : ''}`}
                  >
                    {sidebarCollapsed ? (
                      <Tooltip title={item.label} placement="right">
                        {menuLink}
                      </Tooltip>
                    ) : menuLink}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </aside>

      <div className="admin-layout__body">
        <Outlet />
      </div>
    </div>
  );
};

/**
 * 判断侧栏项是否对当前用户可见。
 *
 * @param item 导航项
 * @param user 当前用户
 * @param enableAgent Agent 功能开关
 * @returns 是否可见
 */
function isNavItemVisible(
  item: AdminNavItemConfig,
  user: ReturnType<typeof useAuthStore.getState>['user'],
  enableAgent: boolean
): boolean {
  if (item.key === 'agents') {
    return canShowAgentAdminNav(enableAgent, user);
  }
  if (!item.permissions.length) {
    return true;
  }
  if (item.requireAll) {
    return hasAllPermissions(user, item.permissions);
  }
  return hasAnyPermission(user, item.permissions);
}

export default AdminLayout;
