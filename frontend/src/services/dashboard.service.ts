import { http } from './request';
import { DashboardStats } from '@/types';

export const dashboardService = {
  // 获取仪表盘统计数据（对接 kb-statistics /statistics/dashboard）
  getStats: () => {
    return http.get<DashboardStats>('/statistics/dashboard');
  },
};

export default dashboardService;
