/**
 * 前端 API 服务：auth.service。
 */
import { http } from './request';
import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, User } from '@/types';
import { tokenStorage } from '@/utils/token-storage';

/**
 * 认证服务
 *
 * <p>职责说明：</p>
 * <ul>
 *   <li>用户登录、退出</li>
 *   <li>Token管理（存储、刷新、清除）</li>
 *   <li>获取当前用户信息</li>
 *   <li>用户信息管理</li>
 * </ul>
 *
 * @author 苏三
 * @since 1.0.0
 */
export const authService = {
  /**
   * 用户登录
   *
   * @param data 登录请求参数
   * @returns Promise<LoginResponse>
   */
  login: (data: LoginRequest): Promise<LoginResponse> => {
    return http.post<LoginResponse>('/auth/auth/login', data);
  },

  /**
   * 用户退出
   *
   * @returns Promise<void>
   */
  logout: (): Promise<void> => {
    return http.post<void>('/auth/auth/logout').then(() => {
      // 退出成功后清除本地Token
      tokenStorage.clearToken();
    });
  },

  /**
   * 获取当前用户信息
   *
   * @returns Promise<User>
   */
  getCurrentUser: (): Promise<User> => {
    return http.get<User>('/auth/auth/me');
  },

  /**
   * 刷新Token
   *
   * @param refreshToken 刷新令牌
   * @returns Promise<LoginResponse>
   */
  refreshToken: (refreshToken: string): Promise<LoginResponse> => {
    return http.post<LoginResponse>('/auth/auth/refresh', null, {
      params: { refreshToken },
      // 刷新Token时使用skipAuth，避免死循环
      skipAuth: true,
    });
  },

  /**
   * 修改密码
   *
   * @param data 密码信息
   * @returns Promise<void>
   */
  changePassword: (data: { oldPassword: string; newPassword: string }): Promise<void> => {
    return http.put<void>('/auth/users/password/change', null, {
      params: data,
    });
  },

  /**
   * 更新用户信息
   *
   * @param data 用户信息
   * @returns Promise<User>
   */
  updateProfile: (data: Record<string, unknown>): Promise<void> => {
    return http.put<void>('/auth/users', data);
  },

  /**
   * 上传头像
   *
   * @param file 头像文件
   * @returns Promise<{ url: string }>
   */
  uploadAvatar: (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return http.post<{ url: string }>('/auth/avatar', formData);
  },

  /**
   * 注册
   *
   * @param data 注册请求参数
   * @returns Promise<RegisterResponse> 注册响应（含邮箱验证状态）
   */
  register: (data: RegisterRequest): Promise<RegisterResponse> => {
    return http.post<RegisterResponse>('/auth/auth/register', data);
  },

  /**
   * 邮箱验证激活账户
   *
   * @param token 激活令牌
   * @returns Promise<string> 激活结果消息
   */
  verifyEmail: (token: string): Promise<string> => {
    return http.get<string>('/auth/auth/verify-email', { params: { token } });
  },

  /**
   * 找回密码 - 发送验证码
   *
   * @param email 邮箱
   * @returns Promise<void>
   */
  sendResetCode: (email: string): Promise<void> => {
    return http.post<void>('/auth/auth/password/reset/send-code', { email });
  },

  /**
   * 找回密码 - 验证验证码
   *
   * @param email 邮箱
   * @param code 验证码
   * @returns Promise<void>
   */
  verifyResetCode: (email: string, code: string): Promise<void> => {
    return http.post<void>('/auth/auth/password/reset/verify-code', { email, code });
  },

  /**
   * 找回密码 - 重置密码
   *
   * @param data 重置密码信息
   * @returns Promise<void>
   */
  resetPassword: (data: { email: string; code: string; newPassword: string }): Promise<void> => {
    return http.post<void>('/auth/auth/password/reset', data);
  },

  // ===== Token管理方法 =====

  /**
   * 保存登录信息
   *
   * @param loginResponse 登录响应数据
   */
  saveLoginInfo: (loginResponse: LoginResponse): void => {
    tokenStorage.saveToken(loginResponse as unknown as import('@/utils/token-storage').LoginResponse);
  },

  /**
   * 清除登录信息
   */
  clearLoginInfo: (): void => {
    tokenStorage.clearToken();
  },

  /**
   * 检查登录状态
   *
   * @returns 是否已登录
   */
  isAuthenticated: (): boolean => {
    return tokenStorage.isAuthenticated();
  },

  /**
   * 获取当前用户信息（从本地存储）
   *
   * @returns 用户信息，未登录返回null
   */
  getUserInfo: () => {
    return tokenStorage.getUserInfo();
  },

  /**
   * 获取访问令牌
   *
   * @returns 访问令牌
   */
  getAccessToken: (): string | null => {
    return tokenStorage.getAccessToken();
  },

  /**
   * 获取Authorization Header
   *
   * @returns Authorization Header值
   */
  getAuthorizationHeader: (): string => {
    return tokenStorage.getAuthorizationHeader();
  },
};

export default authService;
