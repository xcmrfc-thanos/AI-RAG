/**
 * Token存储服务
 *
 * <p>职责说明：</p>
 * <ul>
 *   <li>管理JWT Token的存储和读取</li>
 *   <li>同时支持Cookie和LocalStorage两种存储方式</li>
 *   <li>Cookie存储：用于HTTP请求自动携带</li>
 *   <li>LocalStorage存储：用于前端业务逻辑读取</li>
 *   <li>提供Token过期检查和自动刷新功能</li>
 * </ul>
 *
 * <p>存储策略：</p>
 * <ul>
 *   <li>accessToken：Cookie（HttpOnly）+ LocalStorage（业务使用）</li>
 *   <li>refreshToken：Cookie（HttpOnly）</li>
 *   <li>userInfo：LocalStorage</li>
 * </ul>
 *
 * @author 苏三
 * @since 1.0.0
 */

import type { EntityId } from '@/types';
import { cookieManager } from './cookie';

/**
 * Token信息接口
 */
export interface TokenInfo {
  /** 访问令牌 */
  accessToken: string;
  /** 刷新令牌 */
  refreshToken: string;
  /** Token类型（通常为'Bearer'） */
  tokenType: string;
  /** 过期时间（秒） */
  expiresIn: number;
  /** 过期时间戳 */
  expiresAt: number;
}

/**
 * 用户信息接口
 */
export interface UserInfo {
  userId: EntityId;
  username: string;
  nickname?: string;
  email?: string;
  phone?: string | null;
  avatar?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  status?: number;
}

/**
 * 登录响应接口
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  userInfo: UserInfo;
}

/**
 * Token存储键名常量
 */
const TOKEN_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_TYPE: 'token_type',
  EXPIRES_AT: 'expires_at',
  USER_INFO: 'user_info',
} as const;

/**
 * Token存储服务类
 */
class TokenStorageService {
  /**
   * 保存Token信息
   *
   * <p>同时保存到Cookie和LocalStorage：</p>
   * <ul>
   *   <li>Cookie：主要存储方式，用于从Cookie读取并添加到Header</li>
   *   <li>LocalStorage：备用存储方式，用于前端业务逻辑</li>
   * </ul>
   *
   * @param loginResponse 登录响应数据
   */
  saveToken(loginResponse: LoginResponse): void {
    const { accessToken, refreshToken, tokenType, expiresIn, userInfo } = loginResponse;

    // 计算过期时间戳
    const expiresAt = Date.now() + expiresIn * 1000;

    // 保存到LocalStorage（备用）
    localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
    localStorage.setItem(TOKEN_KEYS.TOKEN_TYPE, tokenType);
    localStorage.setItem(TOKEN_KEYS.EXPIRES_AT, String(expiresAt));
    localStorage.setItem(TOKEN_KEYS.USER_INFO, JSON.stringify(userInfo));

    // 保存到Cookie（主要存储方式）
    // Cookie用于存储Token，前端从Cookie读取后添加到Authorization Header
    const cookieOptions = {
      expires: expiresIn / 86400, // 转换为天数
      path: '/',
      sameSite: 'lax' as const,
    };

    cookieManager.set(TOKEN_KEYS.ACCESS_TOKEN, accessToken, cookieOptions);
    cookieManager.set(TOKEN_KEYS.REFRESH_TOKEN, refreshToken, cookieOptions);

    console.log('✅ Token已保存到Cookie:', accessToken.substring(0, 50) + '...');
  }

  /**
   * 获取访问令牌
   *
   * <p>优先从Cookie获取Token，然后从LocalStorage获取</p>
   *
   * @returns 访问令牌，不存在返回null
   */
  getAccessToken(): string | null {
    // 优先 LocalStorage（完整），Cookie 仅作兜底（避免历史 Cookie 截断导致假 401）
    const fromStorage = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
    if (fromStorage) {
      return fromStorage;
    }
    return cookieManager.get(TOKEN_KEYS.ACCESS_TOKEN);
  }

  /**
   * 获取刷新令牌
   *
   * @returns 刷新令牌，不存在返回null
   */
  getRefreshToken(): string | null {
    const fromStorage = localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
    if (fromStorage) {
      return fromStorage;
    }
    return cookieManager.get(TOKEN_KEYS.REFRESH_TOKEN);
  }

  /**
   * 获取Token类型
   *
   * @returns Token类型，默认'Bearer'
   */
  getTokenType(): string {
    return localStorage.getItem(TOKEN_KEYS.TOKEN_TYPE) || 'Bearer';
  }

  /**
   * 获取完整的Authorization Header值
   *
   * @returns Authorization Header值（如：'Bearer xxx'）
   */
  getAuthorizationHeader(): string {
    const token = this.getAccessToken();
    const tokenType = this.getTokenType();
    return token ? `${tokenType} ${token}` : '';
  }

  /**
   * 检查Token是否过期
   *
   * @param bufferTime 提前时间（秒），默认300秒（5分钟）
   * @returns 是否即将过期或已过期
   */
  isTokenExpiring(bufferTime: number = 300): boolean {
    const expiresAt = localStorage.getItem(TOKEN_KEYS.EXPIRES_AT);
    if (!expiresAt) {
      return true;
    }

    const now = Date.now();
    const expiresAtNum = parseInt(expiresAt, 10);
    const bufferTimeMs = bufferTime * 1000;

    return now >= (expiresAtNum - bufferTimeMs);
  }

  /**
   * 检查Token是否已过期
   *
   * @returns 是否已过期
   */
  isTokenExpired(): boolean {
    const expiresAt = localStorage.getItem(TOKEN_KEYS.EXPIRES_AT);
    if (!expiresAt) {
      return true;
    }

    return Date.now() >= parseInt(expiresAt, 10);
  }

  /**
   * 获取用户信息
   *
   * @returns 用户信息，不存在返回null
   */
  getUserInfo(): UserInfo | null {
    const userInfoStr = localStorage.getItem(TOKEN_KEYS.USER_INFO);
    if (!userInfoStr) {
      return null;
    }

    try {
      return JSON.parse(userInfoStr) as UserInfo;
    } catch {
      return null;
    }
  }

  /**
   * 保存用户信息
   *
   * @param userInfo 用户信息
   */
  saveUserInfo(userInfo: UserInfo): void {
    localStorage.setItem(TOKEN_KEYS.USER_INFO, JSON.stringify(userInfo));
  }

  /**
   * 检查是否已登录
   *
   * @returns 是否已登录
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return token !== null && !this.isTokenExpired();
  }

  /**
   * 清除Token信息
   *
   * <p>同时清除Cookie和LocalStorage中的所有认证信息</p>
   */
  clearToken(): void {
    // 清除LocalStorage
    localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(TOKEN_KEYS.TOKEN_TYPE);
    localStorage.removeItem(TOKEN_KEYS.EXPIRES_AT);
    localStorage.removeItem(TOKEN_KEYS.USER_INFO);

    // 清除Cookie
    cookieManager.remove(TOKEN_KEYS.ACCESS_TOKEN);
    cookieManager.remove(TOKEN_KEYS.REFRESH_TOKEN);
  }

  /**
   * 刷新Token
   *
   * @param newTokenInfo 新的Token信息
   */
  updateToken(newTokenInfo: Partial<TokenInfo>): void {
    const { accessToken, refreshToken } = newTokenInfo;

    if (accessToken) {
      localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
      const expiresIn = parseInt(localStorage.getItem(TOKEN_KEYS.EXPIRES_AT) || '0', 10) - Date.now();
      cookieManager.set(TOKEN_KEYS.ACCESS_TOKEN, accessToken, {
        expires: expiresIn / 86400,
        path: '/',
        sameSite: 'lax',
      });
    }

    if (refreshToken) {
      localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);
      const expiresIn = parseInt(localStorage.getItem(TOKEN_KEYS.EXPIRES_AT) || '0', 10) - Date.now();
      cookieManager.set(TOKEN_KEYS.REFRESH_TOKEN, refreshToken, {
        expires: expiresIn / 86400,
        path: '/',
        sameSite: 'lax',
      });
    }
  }
}

// 导出单例
export const tokenStorage = new TokenStorageService();

// 默认导出
export default tokenStorage;
