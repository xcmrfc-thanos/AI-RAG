import { describe, expect, it } from 'vitest';
import { canShowWorkflowTrigger } from './gate';
import type { User } from '@/types';

function userWith(perms: string[]): User {
  return {
    id: 1,
    username: 'u',
    email: 'u@t.com',
    role: 'ROLE_USER',
    roles: ['ROLE_USER'],
    permissions: perms,
    status: 1,
  };
}

describe('ai-workflow-trigger/gate', () => {
  const base = {
    enableAI: true,
    enableAgent: true,
    enableAiWorkflowTrigger: true,
    user: userWith(['agent:workflow:view', 'agent:run']),
  };

  it('shows when all switches on and user has view/run', () => {
    expect(canShowWorkflowTrigger(base)).toBe(true);
  });

  it('hides when any switch is off', () => {
    expect(canShowWorkflowTrigger({ ...base, enableAI: false })).toBe(false);
    expect(canShowWorkflowTrigger({ ...base, enableAgent: false })).toBe(false);
    expect(canShowWorkflowTrigger({ ...base, enableAiWorkflowTrigger: false })).toBe(false);
  });

  it('hides without agent permissions', () => {
    expect(canShowWorkflowTrigger({ ...base, user: userWith([]) })).toBe(false);
    expect(canShowWorkflowTrigger({ ...base, user: null })).toBe(false);
  });
});
