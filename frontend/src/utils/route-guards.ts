/**
 * 路由守卫判定（纯函数，供 ProtectedRoute 与单测复用）
 *
 * @author AI-RAG
 */

/**
 * 守卫决策
 */
export type GuardDecision =
  | { type: 'ok' }
  | { type: 'redirect'; to: string };

/**
 * 判定受保护路由是否放行
 *
 * @param input 鉴权与权限输入
 * @returns 放行或重定向目标
 */
export function decideProtectedAccess(input: {
  hasToken: boolean;
  requireAdmin?: boolean;
  hasAdminAccess?: boolean;
  requiredPermissions?: string[];
  hasRequiredPermissions?: boolean;
}): GuardDecision {
  if (!input.hasToken) {
    return { type: 'redirect', to: '/login' };
  }
  if (input.requireAdmin && !input.hasAdminAccess) {
    return { type: 'redirect', to: '/' };
  }
  const required = input.requiredPermissions ?? [];
  if (required.length > 0 && !input.hasRequiredPermissions) {
    return { type: 'redirect', to: '/' };
  }
  return { type: 'ok' };
}

/**
 * AI 功能开关门禁（助手 / 写作）
 *
 * @param featureEnabled 系统设置开关
 * @returns ok 或 disabled
 */
export function getAiFeatureGate(featureEnabled: boolean): 'ok' | 'disabled' {
  return featureEnabled ? 'ok' : 'disabled';
}

/**
 * 收集路由 path 列表（含子路由），用于重复注册检测
 *
 * @param routes 路由表
 * @param parentPath 父 path
 * @returns 规范化绝对 path 列表
 */
export function collectRoutePaths(
  routes: Array<{ path?: string; children?: unknown[] }>,
  parentPath = '',
): string[] {
  const out: string[] = [];
  for (const route of routes) {
    const raw = route.path ?? '';
    let abs: string;
    if (raw.startsWith('/')) {
      abs = raw;
    } else if (!raw) {
      abs = parentPath || '/';
    } else {
      abs = `${parentPath.replace(/\/$/, '')}/${raw}`.replace(/\/+/g, '/');
      if (!abs.startsWith('/')) {
        abs = `/${abs}`;
      }
    }
    if (route.path !== undefined) {
      out.push(abs);
    }
    if (Array.isArray(route.children) && route.children.length > 0) {
      out.push(
        ...collectRoutePaths(
          route.children as Array<{ path?: string; children?: unknown[] }>,
          abs === '/' ? '' : abs,
        ),
      );
    }
  }
  return out;
}

/**
 * 找出重复的路由 path
 *
 * @param paths path 列表
 * @returns 重复 path（去重）
 */
export function findDuplicateRoutePaths(paths: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const p of paths) {
    if (seen.has(p)) {
      dup.add(p);
    } else {
      seen.add(p);
    }
  }
  return [...dup];
}
