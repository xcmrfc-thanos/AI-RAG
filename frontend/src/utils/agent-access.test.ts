import { describe, expect, it } from 'vitest';
import type { User } from '@/types';
import {
  canShowAgentAdminNav,
  canShowAgentNav,
  extractAgentAnswer,
  getAgentAdminPageGate,
  getAgentRunPageGate,
} from '@/utils/agent-access';
import { AGENT_PERMISSIONS } from '@/constants/ai-entry';

/**
 * 构造测试用户
 *
 * @param permissions 权限码
 * @param roles 角色
 * @returns 用户
 */
function userOf(permissions: string[], roles: string[] = ['USER']): User {
  return {
    id: 1,
    username: 'u',
    email: 'u@test.com',
    status: 1,
    permissions,
    roles,
  };
}

describe('agent-access', () => {
  it('功能关闭时导航不可见且页面为 disabled', () => {
    const admin = userOf([], ['ROLE_SUPER_ADMIN']);
    expect(canShowAgentNav(false, admin)).toBe(false);
    expect(canShowAgentAdminNav(false, admin)).toBe(false);
    expect(getAgentRunPageGate(false, admin)).toBe('disabled');
    expect(getAgentAdminPageGate(false, admin)).toBe('disabled');
  });

  it('普通用户无权限时不可见运行入口', () => {
    const normal = userOf([]);
    expect(canShowAgentNav(true, normal)).toBe(false);
    expect(getAgentRunPageGate(true, normal)).toBe('forbidden');
    expect(canShowAgentAdminNav(true, normal)).toBe(false);
  });

  it('拥有 view/run 的用户可见运行入口，不可见管理入口', () => {
    const runner = userOf([AGENT_PERMISSIONS.workflowView, AGENT_PERMISSIONS.run]);
    expect(canShowAgentNav(true, runner)).toBe(true);
    expect(getAgentRunPageGate(true, runner)).toBe('ok');
    expect(canShowAgentAdminNav(true, runner)).toBe(false);
    expect(getAgentAdminPageGate(true, runner)).toBe('forbidden');
  });

  it('管理员可见管理入口', () => {
    const admin = userOf([AGENT_PERMISSIONS.workflowEdit], ['ROLE_SUPER_ADMIN']);
    expect(canShowAgentAdminNav(true, admin)).toBe(true);
    expect(getAgentAdminPageGate(true, admin)).toBe('ok');
  });

  it('成功/失败输出可解析', () => {
    expect(extractAgentAnswer('{"text":"你好"}')).toBe('你好');
    expect(extractAgentAnswer(null)).toBe('');
  });
});
