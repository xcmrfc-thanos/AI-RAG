import { http } from './request';
import { SystemNotification } from '@/types';

export const notificationService = {
  // 获取通知列表
  getNotifications: (params?: { page?: number; pageSize?: number; type?: string; isRead?: number }) => {
    const requestParams: Record<string, any> = {};
    if (params?.page !== undefined) {
      requestParams.current = params.page;
    }
    if (params?.pageSize !== undefined) {
      requestParams.size = params.pageSize;
    }
    if (params?.isRead !== undefined) {
      requestParams.isRead = params.isRead;
    }
    return http.get<{ records: SystemNotification[]; total: number; current: number; size: number }>('/notifications', {
      params: requestParams,
    });
  },

  // 获取未读通知数量
  getUnreadCount: () => {
    return http.get<number>('/notifications/unread-count');
  },

  // 标记为已读
  markAsRead: (id: string) => {
    return http.put(`/notifications/${id}/read`);
  },

  // 批量标记为已读
  markAllAsRead: () => {
    return http.put('/notifications/read-all');
  },

  // 删除通知
  deleteNotification: (id: string) => {
    return http.delete(`/notifications/${id}`);
  },

  // 清空所有通知
  clearAll: () => {
    return http.delete('/notifications/all');
  },
};

export default notificationService;
