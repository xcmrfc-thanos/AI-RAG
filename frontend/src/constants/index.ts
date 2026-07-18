/**
 * 系统常量配置
 */

// 文档相关常量
export const DOCUMENT_STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

/** 与后端 DocumentStatus 枚举及 kb_dict document_status 数值对齐 */
export const DOCUMENT_STATUS_CODE = {
  DRAFT: 0,
  PUBLISHED: 1,
  ARCHIVED: 2,
  PENDING_REVIEW: 3,
} as const;

export const DOCUMENT_STATUS_TEXT = {
  [DOCUMENT_STATUS.DRAFT]: '草稿',
  [DOCUMENT_STATUS.PENDING_REVIEW]: '待审核',
  [DOCUMENT_STATUS.PUBLISHED]: '已发布',
  [DOCUMENT_STATUS.ARCHIVED]: '已归档',
} as const;

export const DOCUMENT_STATUS_COLORS = {
  [DOCUMENT_STATUS.DRAFT]: 'default',
  [DOCUMENT_STATUS.PENDING_REVIEW]: 'processing',
  [DOCUMENT_STATUS.PUBLISHED]: 'success',
  [DOCUMENT_STATUS.ARCHIVED]: 'warning',
} as const;

// 用户角色常量
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest',
} as const;

export const USER_ROLE_TEXT = {
  [USER_ROLES.ADMIN]: '管理员',
  [USER_ROLES.USER]: '普通用户',
  [USER_ROLES.GUEST]: '访客',
} as const;

// 通知类型常量
export const NOTIFICATION_TYPES = {
  SYSTEM: 'system',
  COMMENT: 'comment',
  MENTION: 'mention',
  REVIEW: 'review',
  LIKE: 'like',
} as const;

export const NOTIFICATION_TYPE_TEXT = {
  [NOTIFICATION_TYPES.SYSTEM]: '系统通知',
  [NOTIFICATION_TYPES.COMMENT]: '评论通知',
  [NOTIFICATION_TYPES.MENTION]: '提及通知',
  [NOTIFICATION_TYPES.REVIEW]: '审核通知',
  [NOTIFICATION_TYPES.LIKE]: '点赞通知',
} as const;

// 审核状态常量
export const REVIEW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const REVIEW_STATUS_TEXT = {
  [REVIEW_STATUS.PENDING]: '待审核',
  [REVIEW_STATUS.APPROVED]: '已通过',
  [REVIEW_STATUS.REJECTED]: '已拒绝',
} as const;

export const REVIEW_STATUS_COLORS = {
  [REVIEW_STATUS.PENDING]: 'processing',
  [REVIEW_STATUS.APPROVED]: 'success',
  [REVIEW_STATUS.REJECTED]: 'error',
} as const;

// 文件类型常量
export const FILE_TYPES = {
  DOCUMENT: '.doc,.docx,.pdf,.txt,.md,.markdown',
  IMAGE: '.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp',
  VIDEO: '.mp4,.avi,.mov,.wmv,.flv,.mkv',
  AUDIO: '.mp3,.wav,.flac,.aac,.ogg',
  ARCHIVE: '.zip,.rar,.7z,.tar,.gz',
} as const;

// 分页配置
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 12,
  PAGE_SIZE_OPTIONS: [12, 24, 48, 96],
} as const;

// 自动保存配置
export const AUTO_SAVE = {
  INTERVAL: 10000, // 10秒
  DEBOUNCE_DELAY: 2000, // 2秒防抖
} as const;

// 上传配置
export const UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: FILE_TYPES.DOCUMENT,
  ALLOWED_IMAGE_TYPES: FILE_TYPES.IMAGE,
} as const;

// 存储键名
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  RECENT_DOCUMENTS: 'recent_documents',
  SEARCH_HISTORY: 'search_history',
} as const;

// API错误码
export const API_ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
  NETWORK_ERROR: 0,
} as const;

// 主题配置
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
} as const;

// 语言配置
export const LANGUAGES = {
  ZH_CN: 'zh-CN',
  EN_US: 'en-US',
} as const;

export const LANGUAGE_TEXT = {
  [LANGUAGES.ZH_CN]: '简体中文',
  [LANGUAGES.EN_US]: 'English',
} as const;

// 路由路径
export const ROUTES = {
  LOGIN: '/login',
  HOME: '/',
  DOCUMENTS: '/documents',
  DOCUMENT_CREATE: '/documents/new',
  DOCUMENT_IMPORT: '/documents/import',
  DOCUMENT_DETAIL: (id: string) => `/documents/${id}`,
  DOCUMENT_EDIT: (id: string) => `/documents/${id}/edit`,
  DOCUMENT_VERSIONS: (id: string) => `/documents/${id}/versions`,
  SEARCH: '/search',
  AI_ASSISTANT: '/ai',
  KNOWLEDGE_GRAPH: '/knowledge-graph',
  PROFILE: '/profile',
  NOTIFICATIONS: '/notifications',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_ROLES: '/admin/roles',
  ADMIN_TEAMS: '/admin/teams',
  ADMIN_CATEGORIES: '/admin/categories',
  ADMIN_REVIEW: '/admin/review',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_STATISTICS: '/admin/statistics',
  SHARE_VIEW: (shareId: string) => `/share/${shareId}`,
} as const;

// 快捷键
export const KEYBOARD_SHORTCUTS = {
  SAVE: 'Ctrl+S',
  SEARCH: 'Ctrl+K',
  NEW_DOCUMENT: 'Ctrl+N',
  BOLD: 'Ctrl+B',
  ITALIC: 'Ctrl+I',
  UNDERLINE: 'Ctrl+U',
} as const;

// 正则表达式
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^1[3-9]\d{9}$/,
  URL: /^https?:\/\/.+/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/,
} as const;

// 日期格式
export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm:ss',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  MONTH: 'YYYY-MM',
  YEAR: 'YYYY',
} as const;

// 图表颜色
export const CHART_COLORS = [
  '#1890ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#fa8c16',
  '#13c2c2',
  '#eb2f96',
] as const;

// 默认配置
export const DEFAULT_CONFIG = {
  SITE_NAME: '企业知识库',
  SITE_DESCRIPTION: '智能企业知识管理平台',
  LOGO: '/logo.svg',
  FAVICON: '/favicon.ico',
} as const;

// AI配置
export const AI_CONFIG = {
  MAX_TOKENS: 4000,
  TEMPERATURE: 0.3,
  DEFAULT_MODEL: 'qwen',
  MODELS: {
    qwen: {
      key: 'qwen',
      displayName: '通义千问',
      description: '阿里云大语言模型，支持多轮对话、文本生成等',
      color: '#2563eb',
    },
    deepseek: {
      key: 'deepseek',
      displayName: 'DeepSeek',
      description: '深度求索大语言模型，擅长代码生成和深度推理',
      color: '#10b981',
    },
  },
} as const;

// 知识图谱配置
export const GRAPH_CONFIG = {
  NODE_SIZE_RANGE: [10, 50],
  LINK_WIDTH_RANGE: [1, 5],
  REPULSION: 200,
  EDGE_LENGTH: 120,
} as const;

// 搜索配置
export const SEARCH_CONFIG = {
  MIN_KEYWORD_LENGTH: 2,
  MAX_RESULTS: 100,
  SUGGESTIONS_LIMIT: 10,
  HISTORY_LIMIT: 20,
} as const;

export { AI_ENTRY_COPY } from './ai-entry';
export type { AiEntryCopy } from './ai-entry';
