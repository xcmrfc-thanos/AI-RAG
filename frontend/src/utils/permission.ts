import type { User } from '@/types';

/**
 * 前端权限码常量。
 *
 * <p>集中维护页面路由、菜单和按钮使用的权限码，避免分散硬编码。</p>
 */
export const PERMISSIONS = {
  documentList: 'document:list',
  /** 历史菜单码；与 document:list 互为别名 */
  fileList: 'file:list',
  documentCreate: 'document:create',
  documentEdit: 'document:edit',
  documentDelete: 'document:delete',
  documentReview: 'document:review',
  documentCategory: 'document:category',
  documentCategoryQuery: 'document:category:query',
  documentTag: 'document:tag',
  documentVersion: 'document:version',
  systemUser: 'system:user',
  systemRole: 'system:role',
  systemPermission: 'system:permission',
  systemPermissionCreate: 'system:permission:create',
  systemPermissionEdit: 'system:permission:edit',
  systemPermissionDelete: 'system:permission:delete',
  systemTeam: 'system:team',
  systemStatistics: 'system:statistics',
  systemSettings: 'system:settings',
  agentWorkflowView: 'agent:workflow:view',
  agentRun: 'agent:run',
  agentWorkflowEdit: 'agent:workflow:edit',
  agentWorkflowPublish: 'agent:workflow:publish',
} as const;

/**
 * 权限码别名：校验任一即可通过（兼容历史 file:* 与现行 document:*）
 */
const PERMISSION_ALIASES: Record<string, string[]> = {
  [PERMISSIONS.documentList]: [PERMISSIONS.documentList, PERMISSIONS.fileList],
  [PERMISSIONS.fileList]: [PERMISSIONS.documentList, PERMISSIONS.fileList],
};

/**
 * 展开权限码及其历史别名
 *
 * @param permission 权限码
 * @returns 等价权限码列表
 */
export function expandPermissionAliases(permission: string): string[] {
  return PERMISSION_ALIASES[permission] || [permission];
}

const SUPER_ADMIN_ROLES = new Set(['ROLE_SUPER_ADMIN', 'SUPER_ADMIN']);

export const ADMIN_PERMISSION_CODES = [
  PERMISSIONS.systemUser,
  PERMISSIONS.systemRole,
  PERMISSIONS.systemPermission,
  PERMISSIONS.systemTeam,
  PERMISSIONS.systemStatistics,
  PERMISSIONS.systemSettings,
  PERMISSIONS.documentCategory,
  PERMISSIONS.documentCategoryQuery,
  PERMISSIONS.documentReview,
];

/**
 * 获取用户角色编码集合。
 *
 * @param user 当前登录用户
 * @returns 角色编码数组
 */
export function getUserRoles(user?: User | null): string[] {
  if (!user) {
    return [];
  }
  const roles = user.roles && user.roles.length > 0
    ? user.roles
    : user.role
      ? [user.role]
      : [];
  return Array.from(new Set(roles.filter(Boolean)));
}

/**
 * 获取用户权限码集合。
 *
 * @param user 当前登录用户
 * @returns 权限码数组
 */
export function getUserPermissions(user?: User | null): string[] {
  if (!user?.permissions?.length) {
    return [];
  }
  return Array.from(new Set(user.permissions.filter(Boolean)));
}

/**
 * 判断用户是否为超级管理员。
 *
 * @param user 当前登录用户
 * @returns 是否超级管理员
 */
export function isSuperAdmin(user?: User | null): boolean {
  return getUserRoles(user).some((role) => SUPER_ADMIN_ROLES.has(role));
}

/**
 * 判断用户是否拥有单个权限。
 *
 * @param user 当前登录用户
 * @param permission 权限码
 * @returns 是否拥有权限
 */
export function hasPermission(user: User | null | undefined, permission?: string | null): boolean {
  if (!permission) {
    return true;
  }
  if (isSuperAdmin(user)) {
    return true;
  }
  const owned = new Set(getUserPermissions(user));
  return expandPermissionAliases(permission).some((code) => owned.has(code));
}

/**
 * 判断用户是否拥有任一权限。
 *
 * @param user 当前登录用户
 * @param permissions 权限码列表
 * @returns 是否拥有任一权限
 */
export function hasAnyPermission(user: User | null | undefined, permissions: string[]): boolean {
  if (!permissions.length) {
    return true;
  }
  if (isSuperAdmin(user)) {
    return true;
  }
  const userPermissions = new Set(getUserPermissions(user));
  return permissions.some((permission) =>
    expandPermissionAliases(permission).some((code) => userPermissions.has(code)));
}

/**
 * 判断用户是否拥有全部权限。
 *
 * @param user 当前登录用户
 * @param permissions 权限码列表
 * @returns 是否拥有全部权限
 */
export function hasAllPermissions(user: User | null | undefined, permissions: string[]): boolean {
  if (!permissions.length) {
    return true;
  }
  if (isSuperAdmin(user)) {
    return true;
  }
  const userPermissions = new Set(getUserPermissions(user));
  return permissions.every((permission) =>
    expandPermissionAliases(permission).some((code) => userPermissions.has(code)));
}

/**
 * 判断用户是否具备后台管理入口访问权限。
 *
 * @param user 当前登录用户
 * @returns 是否可访问后台
 */
export function hasAdminAccess(user?: User | null): boolean {
  return hasAnyPermission(user, ADMIN_PERMISSION_CODES);
}

/**
 * 获取界面展示用角色名称。
 *
 * @param user 当前登录用户
 * @returns 角色展示文案
 */
export function getPrimaryRoleLabel(user?: User | null): string {
  const roles = getUserRoles(user);
  if (roles.some((role) => role.includes('SUPER_ADMIN'))) {
    return '超级管理员';
  }
  if (roles.some((role) => role.includes('ADMIN'))) {
    return '管理员';
  }
  if (roles.some((role) => role.includes('REVIEWER'))) {
    return '审核员';
  }
  if (roles.some((role) => role.includes('EDITOR'))) {
    return '编辑';
  }
  return '知识成员';
}
