/**
 * 前端 API 服务：foundation.service。
 */
import { http } from './request';
import { EntityId, PageResponse } from '@/types';

// ==================== 类型定义 ====================

/**
 * 通知相关类型
 */
export interface FoundationNotification {
  id: EntityId;
  userId: EntityId;
  userName?: string;
  notificationType: 'system' | 'comment' | 'mention' | 'review' | 'like';
  title: string;
  content: string;
  link?: string;
  relatedType?: string;
  relatedId?: EntityId;
  isRead: 0 | 1;
  readTime?: string;
  createdAt: string;
}

export interface NotificationListParams {
  current?: number;
  size?: number;
  userId?: EntityId;
  isRead?: 0 | 1;
}

export interface SendNotificationData {
  userId: EntityId;
  notificationType: FoundationNotification['notificationType'];
  title: string;
  content: string;
  link?: string;
  relatedType?: string;
  relatedId?: EntityId;
}

/**
 * 系统配置相关类型
 */
export interface SystemConfig {
  id: EntityId;
  configKey: string;
  configValue: string;
  configType: 'string' | 'number' | 'boolean' | 'json';
  category: 'AI' | 'STORAGE' | 'NOTIFICATION' | 'SECURITY' | 'SYSTEM' | string;
  description?: string;
  isPublic: 0 | 1;
  createdAt: string;
  updatedAt: string;
}

export interface SystemConfigListParams {
  current?: number;
  size?: number;
  category?: string;
}

export interface CreateSystemConfigData {
  configKey: string;
  configValue: string;
  configType: SystemConfig['configType'];
  category: string;
  description?: string;
  isPublic?: 0 | 1;
}

export interface PublicConfigs {
  [key: string]: string;
}

/** 公开配置项 */
export interface PublicConfigItem {
  id: EntityId;
  configKey: string;
  configValue: string;
  configType: string;
  category: string;
  description?: string;
  isPublic: 0 | 1;
  createdAt: string;
  updatedAt: string;
}

/**
 * 操作日志相关类型
 */
export interface OperationLog {
  id: EntityId;
  module: string;
  operationType: string;
  operationDesc: string;
  requestMethod: string;
  requestUrl: string;
  requestParams?: string;
  responseResult?: string;
  userId?: EntityId;
  username?: string;
  ipAddress?: string;
  location?: string;
  userAgent?: string;
  executeTime?: number;
  status: 0 | 1;
  errorMsg?: string;
  createdAt: string;
}

export interface OperationLogListParams {
  current?: number;
  size?: number;
  module?: string;
  operationType?: string;
  username?: string;
  startTime?: string;
  endTime?: string;
}

export interface LogStatistics {
  totalLogs: number;
  successLogs: number;
  failedLogs: number;
  operationTypeStats: Record<string, number>;
  moduleStats: Record<string, number>;
  userStats: Array<{ username: string; count: number }>;
  trendData: Array<{ date: string; count: number }>;
}

/**
 * 字典相关类型
 */
export interface Dict {
  id: EntityId;
  dictCode: string;
  dictName: string;
  dictType: string;
  description?: string;
  sort: number;
  status: 0 | 1;
  createdAt: string;
  updatedAt: string;
}

export interface DictListParams {
  current?: number;
  size?: number;
  keyword?: string;
}

export interface CreateDictData {
  dictCode: string;
  dictName: string;
  dictType: string;
  description?: string;
  sort?: number;
  status?: 0 | 1;
}

export interface DictData {
  id: EntityId;
  dictId: EntityId;
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  dictSort: number;
  cssClass?: string;
  listClass?: string;
  isDefault: 0 | 1;
  status: 0 | 1;
  createdAt: string;
}

export interface CreateDictDataData {
  dictLabel: string;
  dictValue: string;
  dictSort?: number;
  cssClass?: string;
  listClass?: string;
  isDefault?: 0 | 1;
  status?: 0 | 1;
}

// ==================== 通知相关API ====================

/**
 * 获取通知列表（分页）
 */
export const getNotifications = (params?: NotificationListParams) => {
  return http.get<PageResponse<FoundationNotification>>('/notifications', { params });
};

/**
 * 获取通知详情
 */
export const getNotificationDetail = (id: EntityId) => {
  return http.get<FoundationNotification>(`/notifications/${id}`);
};

/**
 * 发送通知
 */
export const sendNotification = (data: SendNotificationData) => {
  return http.post<boolean>('/notifications', data);
};

/**
 * 标记已读
 */
export const markAsRead = (id: EntityId) => {
  return http.put<boolean>(`/notifications/${id}/read`);
};

/**
 * 全部标记已读
 */
export const markAllAsRead = (userId: EntityId) => {
  return http.put<boolean>('/notifications/read-all', null, { params: { userId } });
};

/**
 * 删除通知
 */
export const deleteNotification = (id: EntityId) => {
  return http.delete<boolean>(`/notifications/${id}`);
};

/**
 * 获取未读数量
 */
export const getUnreadCount = (userId: EntityId) => {
  return http.get<number>('/notifications/unread-count', { params: { userId } });
};

// ==================== 系统配置相关API ====================

/**
 * 获取配置列表（分页）
 */
export const getSystemConfigs = (params?: SystemConfigListParams) => {
  return http.get<PageResponse<SystemConfig>>('/config', { params });
};

/**
 * 获取配置项
 */
export const getSystemConfig = (key: string) => {
  return http.get<SystemConfig>(`/config/${key}`);
};

/**
 * 创建配置
 */
export const createSystemConfig = (data: CreateSystemConfigData) => {
  return http.post<boolean>('/config', data);
};

/**
 * 更新配置
 */
export const updateSystemConfig = (key: string, data: CreateSystemConfigData) => {
  return http.put<boolean>(`/config/${key}`, data);
};

/**
 * 删除配置
 */
export const deleteSystemConfig = (key: string) => {
  return http.delete<boolean>(`/config/${key}`);
};

/**
 * 按分类获取配置
 */
export const getConfigsByCategory = (category: string) => {
  return http.get<SystemConfig[]>(`/config/category/${category}`);
};

/**
 * 获取公开配置
 *
 * <p>兼容两种后端返回格式：</p>
 * <ul>
 *   <li>旧格式: {@code {key: value}} Map</li>
 *   <li>新格式: {@code [{configKey, configValue}]} 数组</li>
 * </ul>
 */
export const getPublicConfigs = () => {
  return http.get<any>('/config/public').then((data): PublicConfigs => {
    // 新格式：数组 [{configKey, configValue}, ...]
    if (Array.isArray(data)) {
      const configs: PublicConfigs = {};
      data.forEach((item: PublicConfigItem) => {
        configs[item.configKey] = item.configValue;
      });
      return configs;
    }
    // 旧格式：已经是 {key: value} Map
    return data;
  });
};

// ==================== 操作日志相关API ====================

/**
 * 获取日志列表（分页）
 */
export const getOperationLogs = (params?: OperationLogListParams) => {
  return http.get<PageResponse<OperationLog>>('/logs', { params });
};

/**
 * 获取日志详情
 */
export const getOperationLogDetail = (id: EntityId) => {
  return http.get<OperationLog>(`/logs/${id}`);
};

/**
 * 获取日志统计
 */
export const getLogStatistics = (params?: { startTime?: string; endTime?: string }) => {
  return http.get<LogStatistics>('/logs/statistics', { params });
};

/**
 * 删除指定日期前的日志
 */
export const deleteLogsBeforeDate = (date: string) => {
  return http.delete<number>('/logs/before-date', { params: { beforeDate: date } });
};

// ==================== 字典相关API ====================

/**
 * 获取字典类型列表
 */
export const getDicts = (params?: DictListParams) => {
  return http.get<PageResponse<Dict>>('/dicts', { params });
};

/**
 * 获取字典详情
 */
export const getDictByCode = (code: string) => {
  return http.get<Dict>(`/dicts/${code}`);
};

/**
 * 创建字典
 */
export const createDict = (data: CreateDictData) => {
  return http.post<boolean>('/dicts', data);
};

/**
 * 更新字典
 */
export const updateDict = (code: string, data: CreateDictData) => {
  return http.put<boolean>(`/dicts/${code}`, data);
};

/**
 * 删除字典
 */
export const deleteDict = (code: string) => {
  return http.delete<boolean>(`/dicts/${code}`);
};

/**
 * 获取字典数据
 */
export const getDictData = (code: string) => {
  return http.get<DictData[]>(`/dicts/${code}/data`);
};

/**
 * 添加字典数据
 */
export const addDictData = (code: string, data: CreateDictDataData) => {
  return http.post<boolean>(`/dicts/${code}/data`, data);
};

/**
 * 更新字典数据
 */
export const updateDictData = (code: string, data: CreateDictDataData & { id: EntityId }) => {
  return http.put<boolean>(`/dicts/${code}/data`, data);
};

/**
 * 删除字典数据
 */
export const deleteDictData = (code: string, id: EntityId) => {
  return http.delete<boolean>(`/dicts/${code}/data/${id}`);
};

// ==================== 敏感词 ====================

export interface SensitiveWord {
  /** 主键 */
  id?: number | string;
  /** 词条原文 */
  word: string;
  /** 分类 */
  category?: string;
  /** 策略 block/replace/audit */
  action?: string;
  /** 替换文本 */
  replaceTo?: string;
  /** 是否启用 0/1 */
  enabled?: number;
  /** 备注 */
  remark?: string;
  /** 更新时间 */
  updatedAt?: string;
}

export interface SensitiveRegex {
  /** 主键 */
  id?: number | string;
  /** 规则名称 */
  name: string;
  /** Java 正则 */
  pattern: string;
  /** 分类 */
  category?: string;
  /** 策略 */
  action?: string;
  /** 替换文本 */
  replaceTo?: string;
  /** 是否启用 */
  enabled?: number;
  /** 备注 */
  remark?: string;
}

export interface SensitiveHomophone {
  /** 主键 */
  id?: number | string;
  /** 源 */
  src: string;
  /** 目标 */
  dst: string;
  /** 是否启用 */
  enabled?: number;
  /** 备注 */
  remark?: string;
}

export interface SensitiveCheckResult {
  /** 是否应拦截 */
  blocked: boolean;
  /** 是否有命中 */
  hit: boolean;
  /** 替换后文本 */
  filteredText: string;
  /** 命中明细 */
  hits: Array<{
    type: string;
    word: string;
    category: string;
    action: string;
    start: number;
    end: number;
  }>;
}

/** 分页查询敏感词（兼容 MyBatis IPage.records） */
export const listSensitiveWords = async (params?: {
  current?: number;
  size?: number;
  keyword?: string;
  category?: string;
  enabled?: number;
}): Promise<PageResponse<SensitiveWord>> => {
  const data = await http.get<{
    records?: SensitiveWord[];
    list?: SensitiveWord[];
    total?: number;
    current?: number;
    size?: number;
  }>('/sensitive-words', { params });
  const list = data?.list ?? data?.records ?? [];
  const total = data?.total ?? 0;
  const page = data?.current ?? params?.current ?? 1;
  const pageSize = data?.size ?? params?.size ?? 20;
  return {
    list,
    total,
    page,
    pageSize,
    totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
  };
};

/** 新增敏感词 */
export const createSensitiveWord = (data: SensitiveWord) =>
  http.post<boolean>('/sensitive-words', data);

/** 更新敏感词 */
export const updateSensitiveWord = (id: EntityId, data: SensitiveWord) =>
  http.put<boolean>(`/sensitive-words/${id}`, data);

/** 删除敏感词 */
export const deleteSensitiveWord = (id: EntityId) =>
  http.delete<boolean>(`/sensitive-words/${id}`);

/** 批量导入 */
export const importSensitiveWords = (data: { text: string; category?: string; action?: string }) =>
  http.post<{ imported: number }>('/sensitive-words/import', data);

/** 试检测 */
export const checkSensitiveText = (text: string) =>
  http.post<SensitiveCheckResult>('/sensitive-words/check', { text });

/** 重载引擎 */
export const reloadSensitiveEngine = () =>
  http.post<boolean>('/sensitive-words/reload');

/** 正则列表 */
export const listSensitiveRegex = () =>
  http.get<SensitiveRegex[]>('/sensitive-words/regex');

/** 保存正则 */
export const saveSensitiveRegex = (data: SensitiveRegex) =>
  http.post<boolean>('/sensitive-words/regex', data);

/** 删除正则 */
export const deleteSensitiveRegex = (id: EntityId) =>
  http.delete<boolean>(`/sensitive-words/regex/${id}`);

/** 谐音列表 */
export const listSensitiveHomophones = () =>
  http.get<SensitiveHomophone[]>('/sensitive-words/homophones');

/** 保存谐音 */
export const saveSensitiveHomophone = (data: SensitiveHomophone) =>
  http.post<boolean>('/sensitive-words/homophones', data);

/** 删除谐音 */
export const deleteSensitiveHomophone = (id: EntityId) =>
  http.delete<boolean>(`/sensitive-words/homophones/${id}`);

// ==================== 通知模板相关类型 ====================

export interface NotificationTemplate {
  id?: EntityId;
  templateCode: string;
  templateName: string;
  notificationType: 'EMAIL' | 'SMS' | 'WECHAT' | 'SYSTEM' | 'BROWSER';
  title: string;
  content: string;
  variables?: string;
  description?: string;
  isActive: 0 | 1;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateListParams {
  current?: number;
  size?: number;
  notificationType?: string;
}

// ==================== 通知模板相关API ====================

/**
 * 获取通知模板列表（分页）
 */
export const getNotificationTemplates = (params?: TemplateListParams) => {
  return http.get<PageResponse<NotificationTemplate>>('/notifications/templates', { params });
};

/**
 * 获取所有启用的模板
 */
export const getActiveTemplates = () => {
  return http.get<NotificationTemplate[]>('/notifications/templates/active');
};

/**
 * 获取模板详情
 */
export const getNotificationTemplateDetail = (id: EntityId) => {
  return http.get<NotificationTemplate>(`/notifications/templates/${id}`);
};

/**
 * 创建模板
 */
export const createNotificationTemplate = (data: NotificationTemplate) => {
  return http.post<boolean>('/notifications/templates', data);
};

/**
 * 更新模板
 */
export const updateNotificationTemplate = (id: EntityId, data: NotificationTemplate) => {
  return http.put<boolean>(`/notifications/templates/${id}`, data);
};

/**
 * 删除模板
 */
export const deleteNotificationTemplate = (id: EntityId) => {
  return http.delete<boolean>(`/notifications/templates/${id}`);
};

/**
 * 测试发送模板
 */
export const testNotificationTemplate = (id: EntityId, target: string) => {
  return http.post<boolean>(`/notifications/templates/${id}/test`, null, { params: { target } });
};

// ==================== 导出服务对象 ====================

/**
 * Foundation基础服务
 *
 * 提供通知管理、系统配置、操作日志、字典管理等基础功能的API接口
 */
export const foundationService = {
  // 通知相关
  notification: {
    list: getNotifications,
    detail: getNotificationDetail,
    send: sendNotification,
    markAsRead,
    markAllAsRead,
    delete: deleteNotification,
    unreadCount: getUnreadCount,
  },

  // 系统配置相关
  config: {
    list: getSystemConfigs,
    get: getSystemConfig,
    create: createSystemConfig,
    update: updateSystemConfig,
    delete: deleteSystemConfig,
    getByCategory: getConfigsByCategory,
    getPublic: getPublicConfigs,
  },

  // 操作日志相关
  log: {
    list: getOperationLogs,
    detail: getOperationLogDetail,
    statistics: getLogStatistics,
    deleteBeforeDate: deleteLogsBeforeDate,
  },

  // 通知模板相关
  notificationTemplate: {
    list: getNotificationTemplates,
    listActive: getActiveTemplates,
    detail: getNotificationTemplateDetail,
    create: createNotificationTemplate,
    update: updateNotificationTemplate,
    delete: deleteNotificationTemplate,
    test: testNotificationTemplate,
  },

  // 字典相关
  dict: {
    list: getDicts,
    getByCode: getDictByCode,
    create: createDict,
    update: updateDict,
    delete: deleteDict,
    getData: getDictData,
    addData: addDictData,
    updateData: updateDictData,
    deleteData: deleteDictData,
  },

  // 敏感词（L1/L1.5）
  sensitive: {
    list: listSensitiveWords,
    create: createSensitiveWord,
    update: updateSensitiveWord,
    delete: deleteSensitiveWord,
    import: importSensitiveWords,
    check: checkSensitiveText,
    reload: reloadSensitiveEngine,
    listRegex: listSensitiveRegex,
    saveRegex: saveSensitiveRegex,
    deleteRegex: deleteSensitiveRegex,
    listHomophones: listSensitiveHomophones,
    saveHomophone: saveSensitiveHomophone,
    deleteHomophone: deleteSensitiveHomophone,
  },
};

export default foundationService;
