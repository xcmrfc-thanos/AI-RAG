import { http } from './request';

export interface PermissionVO {
  id: string | number;
  name: string;
  code: string;
  type: string;
  parentId: string | number;
  menuUrl?: string;
  apiUrl?: string;
  method?: string;
  description?: string;
  sortOrder?: number;
  status?: number;
  children?: PermissionVO[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionTreeNode extends PermissionVO {
  children?: PermissionTreeNode[];
  key?: string | number;
  title?: string;
}

const permissionService = {
  getPermissionTree: (config?: any) => {
    return http.get<PermissionTreeNode[]>('/auth/permissions/tree', config);
  },

  getAllPermissions: (config?: any) => {
    return http.get<PermissionVO[]>('/auth/permissions/list', config);
  },

  getPermissionById: (id: string, config?: any) => {
    return http.get<PermissionVO>(`/auth/permissions/${id}`, config);
  },

  getPermissionsByParentId: (id: string, config?: any) => {
    return http.get<PermissionVO[]>(`/auth/permissions/${id}/children`, config);
  },

  pagePermissions: (current: number, size: number, keyword?: string, config?: any) => {
    const params: any = { current, size };
    if (keyword) {
      params.keyword = keyword;
    }
    return http.get<{ records: PermissionVO[]; total: number }>('/auth/permissions/page', { ...config, params });
  },

  createPermission: (data: Partial<PermissionVO>, config?: any) => {
    return http.post<string | number>('/auth/permissions', data, config);
  },

  updatePermission: (data: Partial<PermissionVO>, config?: any) => {
    return http.put<boolean>('/auth/permissions', data, config);
  },

  deletePermission: (id: string, config?: any) => {
    return http.delete<boolean>(`/auth/permissions/${id}`, config);
  },
};

export default permissionService;
