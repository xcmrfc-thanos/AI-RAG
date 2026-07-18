import { describe, expect, it } from 'vitest';
import {
  collectRoutePaths,
  decideProtectedAccess,
  findDuplicateRoutePaths,
  getAiFeatureGate,
} from '@/utils/route-guards';
import { appRoutes } from '@/router';

describe('route-guards', () => {
  /**
   * 未登录必须跳转登录页（与网关 401 / 任务 56 一致）
   */
  it('未登录访问受保护路由重定向到 /login', () => {
    expect(
      decideProtectedAccess({ hasToken: false }),
    ).toEqual({ type: 'redirect', to: '/login' });
  });

  /**
   * 已登录且无额外权限要求时放行
   */
  it('已登录可进入受保护路由', () => {
    expect(decideProtectedAccess({ hasToken: true })).toEqual({ type: 'ok' });
  });

  /**
   * 管理员要求不满足时回首页
   */
  it('非管理员访问管理路由回首页', () => {
    expect(
      decideProtectedAccess({
        hasToken: true,
        requireAdmin: true,
        hasAdminAccess: false,
      }),
    ).toEqual({ type: 'redirect', to: '/' });
  });

  /**
   * AI 开关关闭态
   */
  it('AI 功能关闭时门禁为 disabled', () => {
    expect(getAiFeatureGate(false)).toBe('disabled');
    expect(getAiFeatureGate(true)).toBe('ok');
  });

  /**
   * 路由表无重复 path（任务 63）
   */
  it('应用路由表无重复 path', () => {
    const paths = collectRoutePaths(appRoutes);
    expect(findDuplicateRoutePaths(paths)).toEqual([]);
    expect(paths).toContain('/documents/:id/edit');
    expect(paths).toContain('/ai');
    expect(paths).toContain('/ai-writing');
  });
});
