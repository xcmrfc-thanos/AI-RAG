/**
 * 前端 API 服务：statistics.service。
 */
import dayjs from 'dayjs';
import { http } from './request';
import { SystemStatistics, DashboardStats, AdminOverview } from '@/types';

// 根据 period 计算日期范围
const getDateRange = (period: 'week' | 'month' | 'year'): { startDate: string; endDate: string } => {
  const endDate = dayjs().format('YYYY-MM-DD');
  const dayMap = { week: 6, month: 29, year: 364 };
  const startDate = dayjs().subtract(dayMap[period], 'days').format('YYYY-MM-DD');
  return { startDate, endDate };
};

export const statisticsService = {
  // 获取系统统计概览
  getSystemStatistics: (params?: { startDate?: string; endDate?: string }) => {
    return http.get<SystemStatistics>('/statistics/overview', { params });
  },

  // 获取仪表板统计数据
  getDashboardStats: () => {
    return http.get<DashboardStats>('/statistics/dashboard');
  },

  // 获取管理后台概览
  getAdminOverview: () => {
    return http.get<AdminOverview>('/statistics/admin-overview');
  },

  // 获取文档趋势
  getDocumentTrend: (params: { period: 'week' | 'month' | 'year' }) => {
    const { startDate, endDate } = getDateRange(params.period);
    return http.get<Array<{ date: string; count: number }>>('/statistics/trend/document', {
      params: { startDate, endDate, type: 'create' },
    });
  },

  // 获取用户活跃度
  getUserActivity: (params: { period: 'week' | 'month' | 'year' }) => {
    const { startDate, endDate } = getDateRange(params.period);
    return http.get<Array<{ date: string; count: number }>>('/statistics/activity/user', {
      params: { startDate, endDate },
    });
  },

  // 获取分类分布
  getCategoryDistribution: () => {
    return http.get<Array<{ name: string; value: number }>>('/statistics/distribution/category');
  },

  // 获取热门文档（复合热度排行）
  getPopularDocuments: (params?: { limit?: number; period?: 'week' | 'month' | 'all' }) => {
    return http.get<Array<{
      documentId: string;
      title: string;
      authorName?: string;
      categoryName?: string;
      viewCount: number;
      likeCount: number;
      favoriteCount: number;
      summary?: string;
      createdAt?: string;
    }>>(
      '/statistics/hot/document',
      { params: { type: 'composite', size: params?.limit || 6 } }
    );
  },

  // 获取最新文档
  getLatestDocuments: (params?: { limit?: number }) => {
    return http.get<Array<{
      documentId: string;
      title: string;
      authorName?: string;
      categoryName?: string;
      viewCount: number;
      likeCount: number;
      favoriteCount: number;
      summary?: string;
      createdAt?: string;
    }>>(
      '/statistics/latest/documents',
      { params: { size: params?.limit || 6 } }
    );
  },

  // 获取活跃用户
  getActiveUsers: (params?: { limit?: number }) => {
    return http.get<Array<{ userId: string; username: string; contribution: number }>>(
      '/statistics/active/user',
      { params: { type: 'create', size: params?.limit || 10 } }
    );
  },
};

export default statisticsService;
