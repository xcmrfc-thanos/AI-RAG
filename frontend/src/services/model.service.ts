/**
 * 前端 API 服务：model.service（第8阶段模型库）。
 */
import { http } from './request';
import type { EntityId, PageResponse } from '@/types';

// ==================== 类型定义 ====================

/** 模型类型（后端枚举） */
export type ModelType = 'chat' | 'embedding' | 'rerank' | 'tts' | 'stt' | 'image' | 'other';

/** 模型类型枚举项 */
export interface ModelTypeOption {
  value: ModelType | string;
  label: string;
}

/** 场景下拉选项（不含密钥） */
export interface ModelOption {
  key: string;
  value: string;
  label: string;
  isDefault?: boolean;
  providerKey?: string;
}

/** 模型条目（管理视图） */
export interface ModelItem {
  id: EntityId;
  modelKey: string;
  modelType: ModelType | string;
  displayName?: string;
  isDefault?: 0 | 1;
  dimension?: number;
  modelConfig?: Record<string, unknown>;
  status: 0 | 1;
}

/** 模型提供方（管理视图，仅掩码提示） */
export interface ModelProvider {
  id: EntityId;
  providerKey: string;
  providerName: string;
  baseUrl?: string;
  apiKeyHint?: string;
  extraParams?: Record<string, unknown>;
  status: 0 | 1;
  models: ModelItem[];
}

/** 模型提供方新增/更新请求 */
export interface ModelProviderPayload {
  providerKey: string;
  providerName: string;
  baseUrl?: string;
  apiKey?: string;
  extraParams?: Record<string, unknown>;
  status?: 0 | 1;
  models: ModelItemPayload[];
}

/** 模型条目请求 */
export interface ModelItemPayload {
  modelKey: string;
  modelType: ModelType | string;
  displayName?: string;
  isDefault?: 0 | 1;
  dimension?: number;
  modelConfig?: Record<string, unknown>;
  status?: 0 | 1;
}

/** 连通性测试请求 */
export interface ModelTestPayload {
  baseUrl: string;
  apiKey: string;
  modelKey: string;
  modelType: ModelType | string;
}

const BASE_URL = '/config/models';

/**
 * 模型管理 Service
 *
 * <p>对接后端 ModelProviderController，提供模型库 CRUD、场景下拉与连通测试。</p>
 */
export const modelService = {
  /** 模型类型枚举 */
  listTypes: (): Promise<ModelTypeOption[]> => http.get(`${BASE_URL}/types`),

  /** 场景下拉（不含密钥） */
  listForScene: (type: string): Promise<ModelOption[]> => http.get(BASE_URL, { params: { type } }),

  /** 管理列表（含 api_key_hint） */
  page: (params: { current?: number; size?: number; keyword?: string }): Promise<PageResponse<ModelProvider>> =>
    http.get(`${BASE_URL}/page`, { params }),

  /** 新增提供方（api_key 加密落库） */
  create: (payload: ModelProviderPayload): Promise<EntityId> => http.post(BASE_URL, payload),

  /** 更新提供方（api_key 为空 = 不修改） */
  update: (id: EntityId, payload: ModelProviderPayload): Promise<boolean> =>
    http.put(`${BASE_URL}/${id}`, payload),

  /** 删除提供方（软删） */
  remove: (id: EntityId): Promise<boolean> => http.delete(`${BASE_URL}/${id}`),

  /** 连通性测试 */
  test: (payload: ModelTestPayload): Promise<string> => http.post(`${BASE_URL}/test`, payload),
};
