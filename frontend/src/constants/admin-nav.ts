import { PERMISSIONS } from '@/utils/permission';

/**
 * 管理后台侧栏导航项配置。
 */
export interface AdminNavItemConfig {
  key: string;
  label: string;
  path: string;
  /** 为空表示管理中心入口，对已具备后台访问权限的用户可见 */
  permissions: string[];
  requireAll?: boolean;
}

/**
 * 管理后台侧栏分组配置。
 */
export interface AdminNavGroupConfig {
  title: string;
  items: AdminNavItemConfig[];
}

/**
 * 管理后台统一侧栏菜单（任务 44 / F4）。
 */
export const ADMIN_NAV_GROUPS: AdminNavGroupConfig[] = [
  {
    title: '概览',
    items: [
      {
        key: 'overview',
        label: '管理中心',
        path: '/admin',
        permissions: [],
      },
    ],
  },
  {
    title: '用户与权限',
    items: [
      {
        key: 'users',
        label: '用户管理',
        path: '/admin/users',
        permissions: [PERMISSIONS.systemUser],
      },
      {
        key: 'roles',
        label: '角色管理',
        path: '/admin/roles',
        permissions: [PERMISSIONS.systemRole],
      },
      {
        key: 'permissions',
        label: '权限管理',
        path: '/admin/permissions',
        permissions: [PERMISSIONS.systemPermission],
      },
      {
        key: 'teams',
        label: '团队管理',
        path: '/admin/teams',
        permissions: [PERMISSIONS.systemTeam],
      },
    ],
  },
  {
    title: '内容与审核',
    items: [
      {
        key: 'categories',
        label: '分类管理',
        path: '/admin/categories',
        permissions: [PERMISSIONS.documentCategory, PERMISSIONS.documentCategoryQuery],
      },
      {
        key: 'review',
        label: '文档审核',
        path: '/admin/review',
        permissions: [PERMISSIONS.documentReview],
      },
      {
        key: 'agents',
        label: 'Agent 编排',
        path: '/admin/agents',
        permissions: [
          PERMISSIONS.agentWorkflowEdit,
          PERMISSIONS.agentWorkflowPublish,
          PERMISSIONS.systemSettings,
        ],
      },
    ],
  },
  {
    title: '数据与运维',
    items: [
      {
        key: 'statistics',
        label: '统计分析',
        path: '/admin/statistics',
        permissions: [PERMISSIONS.systemStatistics],
      },
    ],
  },
  {
    title: '系统',
    items: [
      {
        key: 'settings',
        label: '系统设置',
        path: '/admin/settings',
        permissions: [PERMISSIONS.systemSettings],
      },
      {
        key: 'system-config',
        label: '系统配置',
        path: '/admin/system-config',
        permissions: [PERMISSIONS.systemSettings],
      },
      {
        key: 'dictionary',
        label: '数据字典',
        path: '/admin/dictionary',
        permissions: [PERMISSIONS.systemSettings],
      },
      {
        key: 'operation-logs',
        label: '操作日志',
        path: '/admin/operation-logs',
        permissions: [PERMISSIONS.systemSettings],
      },
      {
        key: 'notification-templates',
        label: '通知模板',
        path: '/admin/notification-templates',
        permissions: [PERMISSIONS.systemSettings],
      },
    ],
  },
];

/**
 * 判断导航项是否对应当前路径。
 */
export const isAdminNavActive = (path: string, currentPath: string): boolean => {
  if (path === '/admin') {
    return currentPath === '/admin';
  }
  return currentPath === path || currentPath.startsWith(`${path}/`);
};
