/**
 * 前端 API 服务：role.service。
 */
import { http } from './request';
import { Role, Permission } from '@/types';

export const roleService = {
  // 获取角色列表
  getRoles: (config?: any) => http.get<Role[]>('/auth/roles/list', config),

  // 获取角色详情
  getRole: (id: string) => {
    return http.get<Role>(`/auth/roles/${id}`);
  },

  // 创建角色
  createRole: (data: { name: string; code: string; description?: string; permissions: string[] }) => {
    const { permissions: _permissions, ...payload } = data;
    return http.post<string | number>('/auth/roles', payload);
  },

  // 更新角色
  updateRole: (
    id: string,
    data: { name?: string; code?: string; description?: string; permissions?: string[] }
  ) => {
    const { permissions: _permissions, ...payload } = data;
    return http.put<boolean>('/auth/roles', { id: String(id), ...payload });
  },

  // 删除角色
  deleteRole: (id: string) => http.delete<boolean>(`/auth/roles/${id}`),

  // 获取所有权限
  getPermissions: () => http.get<Permission[]>('/auth/permissions'),

  // 获取角色权限
  getRolePermissions: (roleId: string, config?: any) =>
    http.get<Array<string | number>>(`/auth/roles/${roleId}/permissions`, config).then((res) =>
      (res || []).map((id) => String(id))
    ),

  // 分配角色权限
  assignPermissions: (roleId: string, permissionIds: string[], config?: any) =>
    http.post<boolean>(
      `/auth/roles/${roleId}/permissions`,
      permissionIds.map((id) => String(id)),
      config
    ),
};

export default roleService;
