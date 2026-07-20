import { http } from './request';
import type { SystemSettings, SystemStatus } from '@/types';

const BASE_URL = '/config/settings';

/**
 * 系统设置Service
 *
 * <p>对接后端 SettingsController，提供按分组读写系统设置的统一入口。
 * 与 foundation.service.ts 中的 SystemConfig CRUD 不同，
 * 本Service面向设置页面的分组展示和批量更新场景。</p>
 */
export const settingsService = {
  /**
   * 获取全部系统设置（含系统状态）
   *
   * 返回结构: { basic, security, storage, notification, ai, status }
   */
  getSettings: (): Promise<SystemSettings> =>
    http.get(BASE_URL),

  /**
   * 按分组批量更新设置
   *
   * @param section - 分组标识: basic | security | storage | notification | ai | export | rag | graph | agent
   * @param settings - 该分组下需要更新的字段键值对
   */
  updateSettings: (section: string, settings: Record<string, unknown>): Promise<boolean> =>
    http.put(BASE_URL, { section, settings }),

  /**
   * 获取系统运行状态
   */
  getSystemStatus: (): Promise<SystemStatus> =>
    http.get(`${BASE_URL}/status`),

  /**
   * 清理系统缓存
   */
  clearCache: (): Promise<string> =>
    http.post(`${BASE_URL}/cache/clear`),

  /**
   * 创建数据备份
   */
  createBackup: (): Promise<string> =>
    http.post(`${BASE_URL}/backup`),

  /**
   * 发送测试邮件
   *
   * @param email - 目标邮箱地址
   */
  testEmail: (email: string): Promise<void> =>
    http.post(`${BASE_URL}/test-email`, { email }),
};
