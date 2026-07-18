import { http } from './request';
import { Team, TeamMember } from '@/types';

export const teamService = {
  // 分页查询团队
  getTeams: (params?: { current?: number; size?: number; teamName?: string; status?: number }) => {
    return http.post<{
      current: number;
      size: number;
      total: number;
      pages: number;
      records: Team[];
    }>('/auth/teams/page', params || {});
  },

  // 获取团队树
  getTeamTree: (rootOnly = false) => {
    return http.get<Team[]>('/auth/teams/tree', { params: { rootOnly }, skipAuth: true } as any);
  },

  // 获取团队详情
  getTeam: (id: string) => {
    return http.get<Team>(`/auth/teams/${id}`);
  },

  // 创建团队
  createTeam: (data: { teamName: string; teamCode: string; description?: string; icon?: string; leaderId: string; parentId?: string }) => {
    return http.post<number>('/auth/teams', data);
  },

  // 更新团队
  updateTeam: (data: { id: string; teamName?: string; teamCode?: string; description?: string; icon?: string; leaderId?: string; status?: number }) => {
    return http.put<boolean>('/auth/teams', data);
  },

  // 删除团队
  deleteTeam: (id: string) => {
    return http.delete<boolean>(`/auth/teams/${id}`);
  },

  // 添加团队成员（批量）
  addMembers: (teamId: string, userIds: string[]) => {
    return http.post<boolean>(`/auth/teams/${teamId}/members`, userIds);
  },

  // 移除团队成员（批量）
  removeMembers: (teamId: string, userIds: string[]) => {
    return http.delete<boolean>(`/auth/teams/${teamId}/members`, { data: userIds } as any);
  },

  // 获取团队成员列表
  getTeamMembers: (teamId: string) => {
    return http.get<TeamMember[]>(`/auth/teams/${teamId}/members`);
  },
};

export default teamService;
