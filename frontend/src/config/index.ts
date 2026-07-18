/**
 * 应用配置
 */

// API基础URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// WebSocket URL
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || '/ws';

// 应用配置
export const APP_CONFIG = {
  // 应用名称
  name: import.meta.env.VITE_APP_NAME || '企业知识库',

  // 应用描述
  description: import.meta.env.VITE_APP_DESCRIPTION || '智能企业知识管理平台',

  // 版本
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',

  // 环境
  env: import.meta.env.VITE_APP_ENV || 'development',

  // 是否启用调试模式
  debug: import.meta.env.VITE_APP_DEBUG === 'true',

  // 是否启用性能监控
  enablePerformance: import.meta.env.VITE_APP_PERFORMANCE === 'true',

  // 是否启用错误上报
  enableErrorReport: import.meta.env.VITE_APP_ERROR_REPORT === 'true',
} as const;

// 文件上传配置
export const UPLOAD_CONFIG = {
  // 最大文件大小（字节）
  maxFileSize: parseInt(import.meta.env.VITE_UPLOAD_MAX_SIZE || '10485760'), // 10MB

  // 允许的文件类型
  allowedTypes: (import.meta.env.VITE_UPLOAD_ALLOWED_TYPES || '').split(',') || [
    '.doc', '.docx', '.pdf', '.txt', '.md',
    '.xls', '.xlsx', '.ppt', '.pptx',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico',
    '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm',
    '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma',
  ],

  // 上传URL
  uploadUrl: `${API_BASE_URL}/files/upload`,

  // 批量上传URL
  batchUploadUrl: `${API_BASE_URL}/files/batch-upload`,
} as const;

// 存储配置
export const STORAGE_CONFIG = {
  // Token存储键
  tokenKey: 'token',

  // 用户信息存储键
  userKey: 'user',

  // 主题存储键
  themeKey: 'theme',

  // 语言存储键
  languageKey: 'language',

  // 侧边栏状态存储键
  sidebarCollapsedKey: 'sidebar_collapsed',

  // 最近文档存储键
  recentDocumentsKey: 'recent_documents',

  // 搜索历史存储键
  searchHistoryKey: 'search_history',

  // 存储历史记录最大数量
  maxHistoryItems: 20,
} as const;

// 缓存配置
export const CACHE_CONFIG = {
  // 是否启用缓存
  enabled: import.meta.env.VITE_CACHE_ENABLED !== 'false',

  // 缓存过期时间（毫秒）
  defaultTTL: 5 * 60 * 1000, // 5分钟

  // 文档缓存过期时间
  documentTTL: 10 * 60 * 1000, // 10分钟

  // 用户信息缓存过期时间
  userTTL: 30 * 60 * 1000, // 30分钟

  // 分类缓存过期时间
  categoryTTL: 60 * 60 * 1000, // 1小时
} as const;

// 请求配置
export const REQUEST_CONFIG = {
  // 请求超时时间（毫秒）
  timeout: parseInt(import.meta.env.VITE_REQUEST_TIMEOUT || '30000'), // 30秒

  // 重试次数
  retryTimes: parseInt(import.meta.env.VITE_REQUEST_RETRY || '3'),

  // 重试延迟（毫秒）
  retryDelay: parseInt(import.meta.env.VITE_REQUEST_RETRY_DELAY || '1000'),

  // 是否启用请求缓存
  enableCache: import.meta.env.VITE_REQUEST_CACHE === 'true',

  // 是否显示请求日志
  showLog: import.meta.env.VITE_APP_DEBUG === 'true',
} as const;

// 分页配置
export const PAGINATION_CONFIG = {
  // 默认页码
  defaultPage: 1,

  // 默认每页数量
  defaultPageSize: parseInt(import.meta.env.VITE_PAGE_SIZE || '12'),

  // 每页数量选项
  pageSizeOptions: [12, 24, 48, 96],

  // 是否显示快速跳转
  showQuickJumper: true,

  // 是否显示总数
  showTotal: true,
} as const;

// 编辑器配置
export const EDITOR_CONFIG = {
  // 自动保存间隔（毫秒）
  autoSaveInterval: parseInt(import.meta.env.VITE_EDITOR_AUTO_SAVE || '10000'), // 10秒

  // 是否启用自动保存
  enableAutoSave: import.meta.env.VITE_EDITOR_AUTO_SAVE !== 'false',

  // 历史记录最大数量
  maxHistory: 50,

  // 默认编辑器高度
  defaultHeight: 600,

  // 最小编辑器高度
  minHeight: 300,
} as const;

// AI配置
export const AI_CONFIG = {
  // API基础URL
  baseUrl: import.meta.env.VITE_AI_API_URL || `${API_BASE_URL}/ai`,

  // 模型名称
  model: import.meta.env.VITE_AI_MODEL || 'gpt-3.5-turbo',

  // 最大tokens
  maxTokens: parseInt(import.meta.env.VITE_AI_MAX_TOKENS || '2000'),

  // 温度
  temperature: parseFloat(import.meta.env.VITE_AI_TEMPERATURE || '0.7'),

  // 是否启用流式响应
  enableStream: import.meta.env.VITE_AI_STREAM !== 'false',

  // 超时时间（毫秒）
  timeout: parseInt(import.meta.env.VITE_AI_TIMEOUT || '60000'), // 60秒
} as const;

// WebSocket配置
export const WS_CONFIG = {
  // 是否启用WebSocket
  enabled: import.meta.env.VITE_WS_ENABLED === 'true',

  // 重连间隔（毫秒）
  reconnectInterval: parseInt(import.meta.env.VITE_WS_RECONNECT_INTERVAL || '5000'),

  // 最大重连次数
  maxReconnectTimes: parseInt(import.meta.env.VITE_WS_MAX_RECONNECT || '5'),

  // 心跳间隔（毫秒）
  heartbeatInterval: parseInt(import.meta.env.VITE_WS_HEARTBEAT || '30000'), // 30秒
} as const;

// 性能监控配置
export const PERFORMANCE_CONFIG = {
  // 是否启用性能监控
  enabled: APP_CONFIG.enablePerformance,

  // 采样率（0-1）
  sampleRate: parseFloat(import.meta.env.VITE_PERFORMANCE_SAMPLE_RATE || '0.1'),

  // 上报URL
  reportUrl: import.meta.env.VITE_PERFORMANCE_REPORT_URL || `${API_BASE_URL}/performance/report`,

  // 批量上报数量
  batchReportSize: parseInt(import.meta.env.VITE_PERFORMANCE_BATCH_SIZE || '10'),
} as const;

// 错误上报配置
export const ERROR_REPORT_CONFIG = {
  // 是否启用错误上报
  enabled: APP_CONFIG.enableErrorReport,

  // 上报URL
  reportUrl: import.meta.env.VITE_ERROR_REPORT_URL || `${API_BASE_URL}/error/report`,

  // 是否上报console错误
  reportConsoleError: import.meta.env.VITE_ERROR_REPORT_CONSOLE === 'true',

  // 是否上报未捕获的Promise错误
  reportUnhandledRejection: import.meta.env.VITE_ERROR_REPORT_REJECTION === 'true',

  // 是否上报资源加载错误
  reportResourceError: import.meta.env.VITE_ERROR_REPORT_RESOURCE === 'true',
} as const;

// 第三方服务配置
export const THIRD_PARTY_CONFIG = {
  // 百度统计
  baiduAnalytics: {
    enabled: !!import.meta.env.VITE_BAIDU_ANALYTICS_ID,
    id: import.meta.env.VITE_BAIDU_ANALYTICS_ID || '',
  },

  // Google Analytics
  googleAnalytics: {
    enabled: !!import.meta.env.VITE_GA_MEASUREMENT_ID,
    id: import.meta.env.VITE_GA_MEASUREMENT_ID || '',
  },

  // Sentry
  sentry: {
    enabled: !!import.meta.env.VITE_SENTRY_DSN,
    dsn: import.meta.env.VITE_SENTRY_DSN || '',
  },
} as const;

// 导出所有配置
export const config = {
  api: API_BASE_URL,
  wsUrl: WS_BASE_URL,
  app: APP_CONFIG,
  upload: UPLOAD_CONFIG,
  storage: STORAGE_CONFIG,
  cache: CACHE_CONFIG,
  request: REQUEST_CONFIG,
  pagination: PAGINATION_CONFIG,
  editor: EDITOR_CONFIG,
  ai: AI_CONFIG,
  ws: WS_CONFIG,
  performance: PERFORMANCE_CONFIG,
  errorReport: ERROR_REPORT_CONFIG,
  thirdParty: THIRD_PARTY_CONFIG,
} as const;

export default config;
