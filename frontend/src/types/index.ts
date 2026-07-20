export type EntityId = string | number;

// 用户相关类型
export interface User {
  id: EntityId;
  username: string;
  nickname?: string;
  realName?: string;
  email: string;
  phone?: string;
  avatar?: string;
  gender?: number;
  status: number | 'active' | 'inactive';
  remark?: string;
  department?: string;
  position?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
  lastLoginTime?: string;
  lastLoginIp?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  realName: string;
  teamId: string;
  phone?: string;
}

/** 注册响应（支持邮箱验证流程） */
export interface RegisterResponse {
  emailVerificationRequired: boolean;
  message: string;
  loginInfo?: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    userInfo: {
      userId: string;
      username: string;
      nickname?: string;
      email?: string;
      phone?: string;
      avatar?: string;
      roles: string[];
      permissions: string[];
    };
  };
}

// 文档相关类型
export interface Document {
  id: string;
  title: string;
  content: string;
  summary?: string;
  categoryId?: string;
  teamId?: string;
  teamName?: string;
  tags?: string[] | string;
  author?: User;   // 可选，后端可能只返回authorId和authorName
  status: 'draft' | 'pending_review' | 'published' | 'archived' | number;  // 支持字符串和数字
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  favoriteCount?: number;
  isPublic?: boolean | number;
  isLiked?: boolean;
  createdAt?: string;
  updatedAt?: string;
  authorId?: string;     // 后端可能只返回authorId
  authorName?: string;   // 后端可能只返回authorName
  documentType?: number;
  isTop?: number;
  isRecommend?: number;
  publishTime?: string;
  fileSize?: number;        // 文件大小（字节），后端 DocumentVO 返回
  contentLength?: number;   // 内容长度（字符数），后端 DocumentVO 返回
  autoSaveDismissed?: number; // 自动保存提示关闭状态：null=非自动保存, 0=未关闭, 1=已关闭
  allowComment?: number;
  visibility?: number;
  source?: number;
  sort?: number;
}

export interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  parentId?: string;
  sort: number;
  documentCount: number;
}

export interface CategoryTree extends Omit<DocumentCategory, 'documentCount'> {
  children?: CategoryTree[];
  documentCount?: number;
  level?: number;
  sortOrder?: number;
}

export interface DocumentFilter {
  keyword?: string;
  categoryId?: string | number;  // 支持字符串或数字
  teamId?: string | number;  // 团队ID筛选
  tags?: string[];
  status?: Document['status'];  // 支持字符串或数字
  authorId?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount' | 'publishTime' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface DocumentListResponse {
  list: Document[];
  total: number;
  page: number;
  pageSize: number;
}

// 评论相关类型
export interface Comment {
  id: string | number;
  documentId: string | number;
  parentId?: string | number;
  rootId?: string | number;
  content: string;
  commenterId: string | number;
  commenterName: string;
  commenterAvatar?: string;
  replyToUserId?: string | number;
  replyToUserName?: string;
  status?: number;
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
  createdAt: string;
  replies?: Comment[];
}

// AI相关类型
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: Citation[];
  fromKnowledgeBase?: boolean;
  graphContext?: GraphContext;
}

/** KAG知识图谱上下文 */
export interface GraphContext {
  entities?: GraphEntity[];
  paths?: GraphPath[];
  chunks?: GraphChunk[];
  hasResults?: boolean;
}

export interface GraphEntity {
  name: string;
  type: string;
  description?: string;
  connectionCount?: number;
}

export interface GraphPath {
  nodes: string[];
  relations: string[];
  hops: number;
}

export interface GraphChunk {
  chunkId: string;
  docId: EntityId;
  docTitle: string;
  content: string;
  heading?: string;
}

/** RAG引用来源 */
export interface Citation {
  index: number;
  documentId: EntityId;
  documentTitle: string;
  excerpt: string;
  relevanceScore: number;
}

/**
 * 打开引用来源对应的文档详情页（新标签，与文档中心一致）。
 *
 * @param citation 引用条目
 */
export function openCitationDocument(citation: Pick<Citation, 'documentId'>): void {
  const id = citation?.documentId;
  if (id == null || id === '') {
    return;
  }
  window.open(`/documents/${id}`, '_blank', 'noopener,noreferrer');
}

export interface AIConversation {
  id: string | number;
  title: string;
  messages: AIMessage[];
  messageCount?: number;
  model?: string;
  status?: number;
  tokensUsed?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AIRequest {
  question: string;
  conversationId?: string;
  model?: string;
  context?: {
    documentIds?: string[];
    knowledgeBase?: boolean;
    enableKag?: boolean;
  };
}

export interface AIModelOption {
  key: string;
  displayName: string;
  description: string;
  isDefault?: boolean;
}

// 通用类型
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface PageParams {
  page: number;
  pageSize: number;
}

export interface PageResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 路由相关类型
export interface RouteItem {
  path: string;
  title: string;
  icon?: React.ReactNode;
  children?: RouteItem[];
  hidden?: boolean;
  requiresAuth?: boolean;
}

// 表单相关类型
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'email' | 'textarea' | 'select' | 'checkbox' | 'radio';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string | number }[];
  rules?: any[];
}

export interface FormData {
  [key: string]: any;
}

// 通知类型
export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// 统计相关类型
export interface DashboardStats {
  overview: {
    totalDocuments: number;
    totalUsers: number;
    todayDocuments: number;
    todayUsers: number;
    totalViews: number;
    todayViews: number;
    totalLikes: number;
    totalFavorites: number;
    totalComments: number;
    pendingReviews: number;
    aiSearchCount: number;
    aiQaCount: number;
    activeUserCount: number;
  };
  documentTrend: Array<{ date: string; count: number }>;
  categoryDistribution: Array<{ name: string; value: number }>;
  hotDocuments: Array<{
    documentId: EntityId;
    title: string;
    viewCount: number;
    likeCount: number;
  }>;
  activeUsers: Array<{ name: string; count: number }>;
}

// 知识图谱相关类型
export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: 'KnowledgeDocument' | 'KnowledgeEntity' | 'DocumentChunk';
  value?: number;
  description?: string;
  properties?: Record<string, any>;
  [key: string]: any;
}

export interface KnowledgeGraphLink {
  source: string;
  target: string;
  relation: string;
  label?: string;
  value?: number;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeGraphNode[];
  links: KnowledgeGraphLink[];
}

// 搜索相关类型
export interface ChunkResult {
  chunkId: string;
  content: string;
  heading?: string;
  score: number;
  bm25Score: number;
  vectorScore: number;
}

export interface SearchResult {
  id: string;
  title: string;
  summary?: string;
  highlights?: string[];
  categoryName?: string;
  tagNames?: string[];
  creatorName?: string;
  teamName?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  publishAt?: string;
  score: number;
  bm25Score?: number;
  vectorScore?: number;
  rerankScore?: number;
  chunks?: ChunkResult[];
}

export interface SearchResponse {
  records: SearchResult[];
  total: number;
  current: number;
  size: number;
}

// 版本管理相关类型
export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  title: string;
  content: string;
  changeLog?: string;
  author: User;
  createdAt: string;
  isCurrent: boolean;
}

// 角色相关类型
export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  status?: number;
  permissions: string[];
  userCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  module: string;
  description?: string;
}

// 团队相关类型
export interface Team {
  id: string;
  teamName: string;
  name?: string; // 兼容旧字段
  teamCode?: string;
  description?: string;
  icon?: string;
  leaderId?: EntityId;
  leaderName?: string;
  leader?: User;
  parentId?: EntityId;
  parentName?: string;
  level?: number;
  path?: string;
  memberCount: number;
  docCount?: number;
  status?: number;
  sort?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  children?: Team[];
}

// 团队成员相关类型
export interface TeamMember {
  userId: string;
  username: string;
  realName?: string;
  avatar?: string;
  role: string;
  joinedAt: string;
}

// 审核相关类型
export interface ReviewTask {
  id: string;
  documentId: string;
  documentTitle: string;
  documentAuthor: User;
  reviewerId: string;
  reviewer?: User;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  reviewRound?: number;
  createdAt: string;
  reviewedAt?: string;
  categoryId?: string;
  categoryName?: string;
}

// 通知相关类型
export interface SystemNotification {
  id: string;
  type: 'system' | 'comment' | 'mention' | 'review' | 'like';
  title: string;
  content: string;
  link?: string;
  documentId?: string;
  read: boolean;
  createdAt: string;
}

// AI反馈相关类型
export interface AIFeedback {
  messageId: string;
  conversationId: string;
  type: 'like' | 'dislike';
  comment?: string;
}

// 统计相关类型
export interface SystemStatistics {
  documentStats: {
    total: number;
    published: number;
    draft: number;
    todayUploads: number;
  };
  userStats: {
    total: number;
    active: number;
    newToday: number;
  };
  viewStats: {
    total: number;
    today: number;
    trend: Array<{ date: string; count: number }>;
  };
  categoryStats: Array<{ name: string; count: number }>;
}

/** 管理后台概览（/statistics/admin-overview） */
export interface AdminOverview {
  totalUsers?: number;
  totalDocuments?: number;
  pendingReviews?: number;
  systemHealth?: number;
  totalRoles?: number;
  totalCategories?: number;
  totalTeams?: number;
  totalComments?: number;
  totalLikes?: number;
  totalFavorites?: number;
  totalViews?: number;
  aiSearchCount?: number;
  aiQaCount?: number;
}

// 协作相关类型
export interface DocumentCollaborator {
  userId: string;
  user: User;
  role: 'owner' | 'editor' | 'viewer';
  isEditing: boolean;
  lastEditTime?: string;
}

// AI写作相关类型
export interface WritingRequest {
  topic: string;
  requirements?: string;
  contentType: 'article' | 'report' | 'documentation' | 'email' | 'announcement';
  style: 'formal' | 'casual' | 'technical' | 'creative' | 'academic';
  tone: 'neutral' | 'enthusiastic' | 'serious' | 'friendly' | 'authoritative';
  length?: number;
  existingContent?: string;
  actionType: 'generate' | 'expand' | 'optimize' | 'continue';
  templateId?: string;
  model?: string;
}

export interface WritingResult {
  content: string;
  tokens: number;
  wordCount: number;
  model: string;
}

export interface WritingTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  prompt: string;
  suggestedContentType?: string;
  suggestedStyle?: string;
}

export interface ContentTypeOption {
  value: string;
  label: string;
  description: string;
}

export interface StyleOption {
  value: string;
  label: string;
  description: string;
}

export interface ToneOption {
  value: string;
  label: string;
}

// AI快捷问题类型
export interface AIQuickQuestion {
  id: string;
  title: string;
  question: string;
  icon?: string;
  category?: string;
}

// AI知识引用类型
export interface AIKnowledgeReference {
  documentId: string;
  documentTitle: string;
  excerpt: string;
  relevance: number;
  url?: string;
}

// AI响应扩展类型
export interface AIResponse {
  answer: string;
  conversationId: string;
  messageId: string;
  references?: AIKnowledgeReference[];
  suggestedQuestions?: string[];
}

// 系统设置相关类型
export interface SystemSettings {
  basic: BasicSettings;
  security: SecuritySettings;
  storage: StorageSettings;
  notification: NotificationSettings;
  ai: AISettings;
  /** 文档导出 / PDF 水印 */
  export?: ExportSettings;
  /** 检索 / RAG */
  rag?: RagSettings;
  /** 知识图谱 / KAG */
  graph?: GraphSettings;
  /** Agent 工作流 */
  agent?: AgentSettings;
  /** 审计与合规 */
  compliance?: ComplianceSettings;
  status: SystemStatus;
}

export interface BasicSettings {
  systemName: string;
  systemDescription: string;
  systemVersion: string;
  defaultLanguage: string;
  timezone: string;
  allowRegistration: boolean;
  requireApproval: boolean;
  enableComments: boolean;
  enableAI: boolean;
  enableAIWriting: boolean;
  enableAgent: boolean;
  enableFullTextSearch: boolean;
}

export interface SecuritySettings {
  passwordPolicy: 'low' | 'medium' | 'high';
  sessionTimeout: number;
  enable2FA: boolean;
  ipRestriction: boolean;
  passwordMinLength: number;
  requireSpecialChar: boolean;
  loginMaxRetry: number;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  emailHost: string;
  emailPort: number;
  websocketEnabled: boolean;
  notificationRetentionDays: number;
}

export interface StorageSettings {
  maxFileSize: number;
  allowedFileTypes: string;
  storageEndpoints: string;
  storageBucket: string;
}

export interface AISettings {
  /** 聊天模型 Provider：qwen / siliconflow / deepseek / custom */
  chatProvider: string;
  /** 聊天/写作默认模型名 */
  aiModelName: string;
  /** Embedding Provider：qwen / siliconflow / custom */
  embeddingProvider: string;
  /** Embedding 模型名 */
  embeddingModel: string;
  /** 向量库：elasticsearch / qdrant / milvus */
  vectorStoreType: string;
  milvusHost: string;
  milvusPort: number;
  /** 高级：温度 */
  aiTemperature?: number;
  /** 高级：最大 Token */
  aiMaxTokens?: number;
  /** 高级：超时秒 */
  aiTimeoutSeconds?: number;
}

/** 文档导出 / PDF 水印设置 */
export interface ExportSettings {
  pdfWatermarkEnabled: boolean;
  /** user | custom | user_time */
  pdfWatermarkType: string;
  pdfWatermarkText: string;
  /** 0~1 */
  pdfWatermarkOpacity?: number;
}

/** 检索 / RAG 设置（落配置表；runtime 以 .env/Nacos 为准） */
export interface RagSettings {
  ragEnabled: boolean;
  ragDefaultTopK: number;
  ragHybridTopK: number;
  ragFinalTopK: number;
  ragHybridEnabled: boolean;
  ragRerankEnabled: boolean;
  /** elasticsearch | qdrant | milvus */
  ragVectorStoreType: string;
}

/** 知识图谱 / KAG 设置（落配置表；runtime 以 .env/Nacos 为准） */
export interface GraphSettings {
  kagEnabled: boolean;
  /** 文档发布后是否自动抽实体 */
  kagAutoExtract: boolean;
  kagExtractionModel: string;
  kagMaxEntitiesPerChunk?: number;
  kagMaxHops?: number;
  /** 全量重建前是否清空图 */
  kagClearBeforeBuild?: boolean;
}

/** Agent 设置（落配置表；runtime 以 agent.yml / Nacos 为准，Agent 侧可读配置键） */
export interface AgentSettings {
  /** 0 表示未指定默认工作流 */
  agentDefaultWorkflowId: number;
  agentDefaultModel: string;
  agentRunTimeoutSeconds: number;
  agentLlmTimeoutSeconds: number;
  agentToolTimeoutSeconds: number;
  agentToolHybridSearch: boolean;
  agentToolGraphSearch: boolean;
  agentToolGetDocument: boolean;
  agentRunRetentionDays?: number;
}

/** 审计与合规设置 */
export interface ComplianceSettings {
  /** 操作日志保留天数 */
  operationLogRetentionDays: number;
  /** PDF/批量导出前二次确认 */
  confirmSensitiveExport: boolean;
  /** 全量重建索引进二次确认 */
  confirmSensitiveReindex: boolean;
  /** 图谱重建/清理二次确认 */
  confirmSensitiveGraphOps: boolean;
  /** 删除类操作二次确认 */
  confirmSensitiveDelete: boolean;
}

export interface SystemStatus {
  version: string;
  runStatus: 'running' | 'stopped' | 'maintenance';
  dbStatus: 'connected' | 'disconnected';
  lastBackupTime: string;
  totalStorage: number;
  usedStorage: number;
  documentCount: number;
  userCount: number;
  startTime: string;
}

// 知识图谱相关类型
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeCount?: number;
  edgeCount?: number;
  timestamp?: string;
}

export interface GraphNode {
  id: string;
  name: string;
  type: 'document' | 'category' | 'tag' | 'user' | 'concept' | 'KnowledgeDocument' | 'KnowledgeEntity' | 'DocumentChunk';
  label?: string;
  labels?: string[];
  properties?: Record<string, any>;
  size?: number;
  color?: string;
  icon?: string;
  x?: number;
  y?: number;
  documentId?: string;
  userId?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  label?: string;
  weight?: number;
  properties?: Record<string, any>;
  color?: string;
  dashed?: boolean;
  createdAt?: string;
}

export interface GraphPathResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  pathLength: number;
  startNodeId: string;
  endNodeId: string;
}

// ==================== Foundation基础服务类型 ====================

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
