/**
 * Cookie管理工具
 *
 * <p>功能说明：</p>
 * <ul>
 *   <li>提供Cookie的读取、设置、删除操作</li>
 *   <li>支持HttpOnly和Secure属性</li>
 *   <li>支持SameSite属性（CSRF防护）</li>
 *   <li>支持过期时间设置</li>
 * </ul>
 *
 * <p>安全特性：</p>
 * <ul>
 *   <li>HttpOnly：防止XSS攻击窃取Cookie</li>
 *   <li>Secure：只在HTTPS下传输</li>
 *   <li>SameSite：防止CSRF攻击</li>
 * </ul>
 *
 * @author 苏三
 * @since 1.0.0
 */

/**
 * Cookie选项接口
 */
export interface CookieOptions {
  /** Cookie过期时间（天），默认7天 */
  expires?: number;
  /** Cookie路径，默认'/' */
  path?: string;
  /** Cookie域名 */
  domain?: string;
  /** 是否只允许HTTPS传输（生产环境建议开启） */
  secure?: boolean;
  /** 是否为HttpOnly（防止XSS，需服务端设置） */
  httpOnly?: boolean;
  /** SameSite属性（'strict' | 'lax' | 'none'） */
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Cookie管理类
 */
class CookieManager {
  /**
   * 默认Cookie配置
   */
  private readonly defaultOptions: CookieOptions = {
    expires: 7, // 7天过期
    path: '/', // 所有路径可用
    secure: false, // 开发环境不使用HTTPS（生产环境改为true）
    sameSite: 'lax', // 防止CSRF，允许跨站导航
  };

  /**
   * 设置Cookie
   *
   * @param key Cookie键
   * @param value Cookie值（会自动进行URI编码）
   * @param options Cookie选项
   */
  set(key: string, value: string, options: CookieOptions = {}): void {
    const mergedOptions = { ...this.defaultOptions, ...options };

    // 构建Cookie字符串
    let cookieString = `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;

    // 添加过期时间
    if (mergedOptions.expires) {
      const date = new Date();
      date.setTime(date.getTime() + mergedOptions.expires * 24 * 60 * 60 * 1000);
      cookieString += `; expires=${date.toUTCString()}`;
    }

    // 添加路径
    if (mergedOptions.path) {
      cookieString += `; path=${mergedOptions.path}`;
    }

    // 添加域名
    if (mergedOptions.domain) {
      cookieString += `; domain=${mergedOptions.domain}`;
    }

    // 添加Secure标志
    if (mergedOptions.secure) {
      cookieString += '; secure';
    }

    // 添加SameSite标志
    if (mergedOptions.sameSite) {
      cookieString += `; samesite=${mergedOptions.sameSite}`;
    }

    // 设置Cookie
    document.cookie = cookieString;
  }

  /**
   * 获取Cookie值
   *
   * @param key Cookie键
   * @returns Cookie值（已解码），不存在返回null
   */
  get(key: string): string | null {
    const encodedKey = encodeURIComponent(key);
    const cookies = document.cookie.split(';');

    for (const cookie of cookies) {
      const raw = cookie.trim();
      if (!raw) {
        continue;
      }
      // 只按第一个 '=' 分割，避免 JWT/Base64 值中的 '=' 被截断
      const eq = raw.indexOf('=');
      if (eq < 0) {
        continue;
      }
      const cookieKey = raw.substring(0, eq);
      const cookieValue = raw.substring(eq + 1);
      if (cookieKey === encodedKey) {
        try {
          return cookieValue ? decodeURIComponent(cookieValue) : '';
        } catch {
          return cookieValue || '';
        }
      }
    }

    return null;
  }

  /**
   * 删除Cookie
   *
   * @param key Cookie键
   * @param options Cookie选项（主要用到path和domain）
   */
  remove(key: string, options: CookieOptions = {}): void {
    // 设置过期时间为过去，使Cookie失效
    this.set(key, '', {
      ...options,
      expires: -1, // 立即过期
    });
  }

  /**
   * 检查Cookie是否存在
   *
   * @param key Cookie键
   * @returns 是否存在
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * 获取所有Cookie键值对
   *
   * @returns Cookie对象
   */
  getAll(): Record<string, string> {
    const cookies: Record<string, string> = {};
    const cookieStrings = document.cookie.split(';');

    for (const cookieString of cookieStrings) {
      const raw = cookieString.trim();
      if (!raw) {
        continue;
      }
      const eq = raw.indexOf('=');
      if (eq < 0) {
        continue;
      }
      const key = raw.substring(0, eq);
      const value = raw.substring(eq + 1);
      try {
        cookies[decodeURIComponent(key)] = decodeURIComponent(value);
      } catch {
        cookies[key] = value;
      }
    }

    return cookies;
  }

  /**
   * 清除所有Cookie
   *
   * @param options Cookie选项
   */
  clearAll(options: CookieOptions = {}): void {
    const cookies = this.getAll();
    Object.keys(cookies).forEach(key => {
      this.remove(key, options);
    });
  }
}

// 导出单例
export const cookieManager = new CookieManager();

// 默认导出
export default cookieManager;
