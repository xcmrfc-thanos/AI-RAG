import { describe, expect, it } from 'vitest';
import {
  expandPermissionAliases,
  hasPermission,
  PERMISSIONS,
} from './permission';
import type { User } from '@/types';

const userWith = (permissions: string[]): User => ({
  id: 1,
  username: 'u',
  email: 'u@t.com',
  role: 'ROLE_USER',
  roles: ['ROLE_USER'],
  permissions,
  status: 1,
});

describe('permission aliases', () => {
  it('expands document:list and file:list as equivalents', () => {
    expect(expandPermissionAliases(PERMISSIONS.documentList)).toEqual([
      PERMISSIONS.documentList,
      PERMISSIONS.fileList,
    ]);
    expect(expandPermissionAliases(PERMISSIONS.fileList)).toContain(PERMISSIONS.documentList);
  });

  it('allows file:list holders to pass document:list checks', () => {
    const user = userWith([PERMISSIONS.fileList]);
    expect(hasPermission(user, PERMISSIONS.documentList)).toBe(true);
    expect(hasPermission(user, PERMISSIONS.fileList)).toBe(true);
  });

  it('allows document:list holders to pass file:list checks', () => {
    const user = userWith([PERMISSIONS.documentList]);
    expect(hasPermission(user, PERMISSIONS.fileList)).toBe(true);
  });
});
