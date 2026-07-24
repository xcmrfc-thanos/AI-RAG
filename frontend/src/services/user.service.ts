/**
 * 前端 API 服务：user.service。
 */
import { http } from './request';
import { User, PageParams } from '@/types';

export interface UserFilter {
  keyword?: string;
  department?: string;
  position?: string;
  role?: string;
  status?: 'active' | 'inactive';
  page?: number;
  pageSize?: number;
}

export interface UserProfileUpdate {
  username?: string;
  email?: string;
  avatar?: string;
  department?: string;
  position?: string;
  phone?: string;
  bio?: string;
}

export interface PasswordChange {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PageData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const userService = {
  // 获取用户列表
  getUsers: async (filter: UserFilter): Promise<PageData<User>> => {
    const response = await http.get<any>('/auth/users/page', {
      params: {
        current: filter.page || 1,
        size: filter.pageSize || 10,
        keyword: filter.keyword,
        role: filter.role,
        status: filter.status,
      },
    });
    return {
      list: response?.records || [],
      total: response?.total || 0,
      page: response?.current || 1,
      pageSize: response?.size || 10,
    };
  },

  // 获取用户详情
  getUser: (id: string) => {
    return http.get<User>(`/auth/users/${id}`);
  },

  // 获取当前用户信息
  getCurrentUser: () => {
    return http.get<User>('/auth/auth/me');
  },

  // 创建用户
  createUser: (data: {
    username: string;
    email: string;
    password?: string;
    realName?: string;
    department?: string;
    position?: string;
    status?: number;
  }) => {
    return http.post<number>('/auth/users', data);
  },

  // 更新用户信息
  updateUser: (id: string, data: Partial<User>) => {
    return http.put<boolean>('/auth/users', { id, ...data });
  },

  // 更新个人资料
  updateProfile: (data: UserProfileUpdate) => {
    return http.put<User>('/auth/users/me/profile', data);
  },

  // 修改密码
  changePassword: (data: PasswordChange) => {
    return http.put<void>('/auth/users/password/change', null, {
      params: {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      },
    });
  },

  // 上传头像
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.post<{ url: string }>('/auth/users/me/avatar', formData);
  },

  // 删除用户
  deleteUser: (id: string) => {
    return http.delete<boolean>(`/auth/users/${id}`);
  },

  // 批量删除用户
  batchDeleteUsers: (ids: string[]) => {
    return http.delete('/auth/users/batch', { data: { ids } });
  },

  // 启用/禁用用户
  toggleUserStatus: (id: string, status: 'active' | 'inactive') => {
    return http.patch(`/auth/users/${id}/status`, { status });
  },

  // 重置用户密码
  resetPassword: (id: string, newPassword: string) => {
    return http.put<boolean>(`/auth/users/${id}/password/reset`, null, {
      params: { newPassword },
    });
  },

  // 获取用户统计
  getUserStats: (userId?: string) => {
    return http.get<{
      documentCount: number;
      viewCount: number;
      likeCount: number;
      commentCount: number;
    }>(userId ? `/auth/users/${userId}/stats` : '/auth/users/me/stats');
  },

  // 获取用户活动
  getUserActivity: (userId?: string, params?: PageParams) => {
    return http.get<{
      list: Array<{ type: string; description: string; createdAt: string }>;
      total: number;
    }>(userId ? `/auth/users/${userId}/activity` : '/auth/users/me/activity', { params });
  },

  // 搜索用户
  searchUsers: (keyword: string) => {
    return http.get<User[]>('/auth/users/search', { params: { keyword } });
  },

  // 获取在线用户
  getOnlineUsers: () => {
    return http.get<User[]>('/auth/users/online');
  },

  // 分配角色给用户
  assignRoles: (userId: string, roleIds: string[], config?: any) => {
    return http.post<boolean>(
      `/auth/users/${userId}/roles`,
      roleIds.map((id) => String(id)),
      config
    );
  },

  // 获取用户角色列表
  getUserRoles: (userId: string, config?: any) => {
    return http.get<Array<string | number>>(`/auth/users/${userId}/roles`, config).then((res) =>
      (res || []).map((id) => String(id))
    );
  },

  // 分配权限给用户
  assignPermissions: (userId: string, permissionIds: string[], config?: any) => {
    return http.post<boolean>(
      `/auth/users/${userId}/permissions`,
      permissionIds.map((id) => String(id)),
      config
    );
  },

  // 获取用户所有权限
  getUserPermissions: (userId: string, config?: any) => {
    return http.get<string[]>(`/auth/users/${userId}/permissions`, config);
  },
};

export default userService;
