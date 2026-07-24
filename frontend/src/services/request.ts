/**
 * 前端 API 服务：request。
 */
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { messageHolder as message } from '@/utils/message-holder';
import { tokenStorage } from '@/utils/token-storage';
import type { LoginResponse } from '@/utils/token-storage';

/**
 * HTTP请求配置
 *
 * <p>功能说明：</p>
 * <ul>
 *   <li>统一配置axios实例</li>
 *   <li>请求拦截：自动添加Token、处理加密</li>
 *   <li>响应拦截：统一处理响应数据、错误处理</li>
 *   <li>Token刷新：自动刷新过期Token</li>
 * </ul>
 *
 * @author 苏三
 * @since 1.0.0
 */

// 扩展AxiosRequestConfig类型，添加自定义配置选项
interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  // 是否跳过Token验证
  skipAuth?: boolean;
  // 是否跳过错误提示
  skipErrorToast?: boolean;
  // 是否显示加载动画
  showLoading?: boolean;
  // 下载模式：返回完整 AxiosResponse 以便读取 Content-Disposition 等响应头
  _download?: boolean;
}

interface ApiErrorPayload {
  message?: string;
}

type DefaultResponseData = AxiosResponse['data'];

/**
 * 创建axios实例
 *
 * <p>配置说明：</p>
 * <ul>
 *   <li>withCredentials: false - 不依赖Cookie自动携带</li>
 *   <li>Token通过Authorization Header传递（推荐方式）</li>
 *   <li>开发环境可以通过浏览器插件手动设置Cookie进行测试</li>
 * </ul>
 */
const request: AxiosInstance = axios.create({
  baseURL: '/api', // 使用代理路径，避免CORS问题
  timeout: 120000, // 2分钟，支持长耗时操作如文档导入
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
    'Accept': 'application/json;charset=UTF-8',
  },
  withCredentials: false, // 不自动携带Cookie，使用Authorization Header
});

/**
 * 是否正在刷新Token
 */
let isRefreshing = false;

/**
 * 等待队列（Token刷新期间暂停的请求）
 */
let requests: Array<(token: string) => void> = [];

/**
 * 未授权跳转锁，避免并发 401 反复 toast / 整页刷新
 */
let unauthorizedHandling = false;

/**
 * 请求拦截器
 *
 * <p>主要功能：</p>
 * <ol>
 *   <li>自动添加Authorization Header</li>
 *   <li>添加CSRF Token</li>
 *   <li>添加请求追踪ID</li>
 *   <li>开发环境日志输出</li>
 * </ol>
 */
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const customConfig = config as CustomAxiosRequestConfig;

    // 如果不是跳过认证的请求，添加Token
    if (!customConfig.skipAuth) {
      const authHeader = tokenStorage.getAuthorizationHeader();

      if (authHeader && config.headers) {
        config.headers.Authorization = authHeader;
      } else if (import.meta.env.DEV) {
        console.warn('⚠️ Token未找到，请求可能失败');
      }
    }

    // 添加CSRF Token（如果存在）
    const csrfToken = document
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute('content');
    if (csrfToken && config.headers) {
      config.headers['X-CSRF-TOKEN'] = csrfToken;
    }

    // 添加请求追踪ID（用于日志追踪）
    if (config.headers) {
      config.headers['X-Request-ID'] = generateRequestId();
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器
 *
 * <p>主要功能：</p>
 * <ol>
 *   <li>统一处理响应数据结构</li>
 *   <li>处理业务错误码</li>
 *   <li>自动刷新Token</li>
 *   <li>统一错误处理</li>
 * </ol>
 */
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data, config } = response;
    const customConfig = config as CustomAxiosRequestConfig;

    // 下载请求：直接返回完整的 AxiosResponse，以便读取 Content-Disposition 等响应头
    if (customConfig._download) {
      return response;
    }

    // 根据后端响应结构处理
    // 后端统一返回格式：{ code, message, data, timestamp }
    if (data && typeof data === 'object' && 'code' in data) {
      if (data.code === 200) {
        // 成功响应，返回data字段
        return data.data;
      }

      // 401未授权：清除Token并跳转登录页
      if (data.code === 401) {
        if (!customConfig.skipAuth) {
          handleUnauthorized();
        }
        return Promise.reject(new Error(data.message || '未授权，请重新登录'));
      }

      // 其他业务错误
      const errorMessage = data.message || '请求失败';
      if (!customConfig.skipErrorToast) {
        message.error(errorMessage);
      }
      return Promise.reject(new Error(errorMessage));
    }

    // 非标准响应格式，直接返回
    return data;
  },
  (error: AxiosError) => {
    const { config, response } = error;
    const customConfig = config as CustomAxiosRequestConfig;

    // 处理401未授权错误
    if (response?.status === 401) {
      // 刷新接口自身 401：直接登出（避免递归刷新）
      if (customConfig?.skipAuth) {
        handleUnauthorized();
        return Promise.reject(new Error('未授权，请重新登录'));
      }
      // 其余请求：进入刷新队列（含并发 401）
      return handleTokenExpired(error);
    }

    // 处理其他错误
    return handleRequestError(error, customConfig);
  }
);

/**
 * 处理Token过期
 *
 * @param error 原始错误
 * @returns Promise
 */
function handleTokenExpired(error: AxiosError): Promise<unknown> {
  // 如果正在刷新Token，将请求加入等待队列
  if (isRefreshing) {
    return new Promise((resolve) => {
      requests.push((token: string) => {
        const originalRequest = error.config;
        if (originalRequest?.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        resolve(request(originalRequest!));
      });
    });
  }

  isRefreshing = true;

  // 尝试刷新Token
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    // 没有刷新Token，直接跳转登录
    handleUnauthorized();
    isRefreshing = false;
    return Promise.reject(new Error('未授权，请重新登录'));
  }

  // 调用刷新Token接口
  return request
    .post('/auth/auth/refresh', null, {
      params: { refreshToken },
      skipAuth: true,
    } as CustomAxiosRequestConfig)
    .then((newTokenInfo) => {
      const tokenInfo = newTokenInfo as unknown as LoginResponse;
      // 保存新Token
      tokenStorage.saveToken(tokenInfo);

      // 执行等待队列中的请求
      requests.forEach((callback) => callback(tokenInfo.accessToken));
      requests = [];

      // 重试当前请求
      const originalRequest = error.config;
      if (originalRequest?.headers) {
        originalRequest.headers.Authorization = `Bearer ${tokenInfo.accessToken}`;
      }
      return request(originalRequest!);
    })
    .catch(() => {
      // 刷新失败，清除Token并跳转登录
      tokenStorage.clearToken();
      handleUnauthorized();
      return Promise.reject(new Error('Token刷新失败，请重新登录'));
    })
    .finally(() => {
      isRefreshing = false;
    });
}

/**
 * 处理未授权错误（只执行一次，避免登录页死循环刷新）
 */
function handleUnauthorized(): void {
  if (unauthorizedHandling) {
    return;
  }
  unauthorizedHandling = true;

  // 清除Token
  tokenStorage.clearToken();

  // 清除用户信息及zustand持久化数据
  localStorage.removeItem('user');
  localStorage.removeItem('auth-storage');

  const onLoginPage = window.location.pathname.startsWith('/login');
  if (!onLoginPage) {
    message.warning('登录已过期，请重新登录');
    setTimeout(() => {
      window.location.href = '/login';
      unauthorizedHandling = false;
    }, 800);
  } else {
    unauthorizedHandling = false;
  }
}

/**
 * 处理请求错误
 *
 * @param error Axios错误对象
 * @param customConfig 自定义配置
 * @returns Promise
 */
function handleRequestError(
  error: AxiosError,
  customConfig: CustomAxiosRequestConfig
): Promise<never> {
  let errorMessage: string;

  if (error.response) {
    const { status, data } = error.response;
    const apiMessage = (data as ApiErrorPayload | undefined)?.message;

    switch (status) {
      case 400:
        errorMessage = apiMessage || '请求参数错误';
        break;
      case 403:
        errorMessage = apiMessage || '权限不足，无法访问';
        break;
      case 404:
        errorMessage = '请求资源不存在';
        break;
      case 500:
        errorMessage = '服务器错误，请稍后重试';
        break;
      case 502:
        errorMessage = '网关错误，请稍后重试';
        break;
      case 503:
        errorMessage = '服务暂时不可用，请稍后重试';
        break;
      default:
        errorMessage = apiMessage || `请求失败 (${status})`;
    }
  } else if (error.request) {
    // 请求已发送但没有收到响应
    errorMessage = '网络错误，请检查网络连接';
  } else {
    // 请求配置错误
    errorMessage = error.message || '请求配置错误';
  }

  // 显示错误提示
  if (!customConfig?.skipErrorToast) {
    message.error(errorMessage);
  }

  return Promise.reject(new Error(errorMessage));
}

/**
 * 生成请求追踪ID
 *
 * @returns 追踪ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 封装常用请求方法
 */
export const http = {
  get: <T = DefaultResponseData>(url: string, config?: CustomAxiosRequestConfig): Promise<T> => {
    return request.get(url, config);
  },

  post: <T = DefaultResponseData>(
    url: string,
    data?: unknown,
    config?: CustomAxiosRequestConfig
  ): Promise<T> => {
    return request.post(url, data, config);
  },

  put: <T = DefaultResponseData>(
    url: string,
    data?: unknown,
    config?: CustomAxiosRequestConfig
  ): Promise<T> => {
    return request.put(url, data, config);
  },

  delete: <T = DefaultResponseData>(url: string, config?: CustomAxiosRequestConfig): Promise<T> => {
    return request.delete(url, config);
  },

  patch: <T = DefaultResponseData>(
    url: string,
    data?: unknown,
    config?: CustomAxiosRequestConfig
  ): Promise<T> => {
    return request.patch(url, data, config);
  },

  /**
   * 表单提交（用于文件上传等，支持 onUploadProgress 等 axios 配置）
   *
   * @param url 请求地址
   * @param data FormData 表单数据
   * @param config 可选 axios 配置（如 onUploadProgress）
   * @returns 响应数据
   */
  postForm: <T = DefaultResponseData>(
    url: string,
    data: FormData,
    config?: CustomAxiosRequestConfig
  ): Promise<T> => {
    return request.post(url, data, {
      ...config,
      headers: {
        // 不手动设置 Content-Type，让浏览器自动设置（包括 boundary）
        'Content-Type': undefined,
        ...(config?.headers || {}),
      },
    });
  },

  /**
   * 下载文件
   */
  download: (url: string, filename?: string): Promise<void> => {
    return request.get(url, {
      responseType: 'blob',
      _download: true,
    } as CustomAxiosRequestConfig).then(async (response: AxiosResponse) => {
      const contentType = (response.headers?.['content-type'] as string | undefined) || '';
      // 业务错误常以 JSON Blob 返回，避免误存为 PDF
      if (contentType.includes('application/json')) {
        const text = await (response.data as Blob).text();
        let errorMessage = '下载失败';
        try {
          const payload = JSON.parse(text) as { message?: string };
          errorMessage = payload.message || errorMessage;
        } catch {
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // 尝试从 Content-Disposition 响应头中提取文件名
      let finalFilename = filename || 'download.pdf';
      const contentDisposition = response.headers?.['content-disposition'];
      if (contentDisposition) {
        // 优先匹配 filename*=UTF-8''xxx 格式（RFC 5987）
        const rfc5987Match = contentDisposition.match(/filename\*=UTF-8''([^"';]+)/);
        if (rfc5987Match) {
          try {
            finalFilename = decodeURIComponent(rfc5987Match[1]);
          } catch {
            finalFilename = rfc5987Match[1];
          }
        } else {
          // 回退匹配 filename="xxx" 格式
          const standardMatch = contentDisposition.match(/filename="([^"]+)"/);
          if (standardMatch) {
            finalFilename = standardMatch[1];
          }
        }
      }

      const blobType = contentType.split(';')[0].trim() || 'application/octet-stream';
      const blob = new Blob([response.data], { type: blobType });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    });
  },

  /**
   * POST方式下载文件（用于批量导出等场景）
   */
  downloadPost: (url: string, data: unknown, filename?: string): Promise<void> => {
    return request.post(url, data, {
      responseType: 'blob',
    } as CustomAxiosRequestConfig).then((response: AxiosResponse) => {
      let finalFilename = filename || 'export.zip';
      const contentDisposition = response.headers?.['content-disposition'];
      if (contentDisposition) {
        const rfc5987Match = contentDisposition.match(/filename\*=UTF-8''([^"';]+)/);
        if (rfc5987Match) {
          try {
            finalFilename = decodeURIComponent(rfc5987Match[1]);
          } catch {
            finalFilename = rfc5987Match[1];
          }
        } else {
          const standardMatch = contentDisposition.match(/filename="([^"]+)"/);
          if (standardMatch) {
            finalFilename = standardMatch[1];
          }
        }
      }

      const blob = new Blob([response.data], { type: 'application/zip' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    });
  },
};

export default request;
