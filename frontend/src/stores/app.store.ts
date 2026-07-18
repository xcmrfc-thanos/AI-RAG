import { create } from 'zustand';
import { foundationService } from '@/services';

interface AppState {
  systemName: string;
  systemDescription: string;
  requireApproval: boolean;
  enableComments: boolean;
  enableAI: boolean;
  enableAIWriting: boolean;
  /** Agent 工作流开关；默认开启 */
  enableAgent: boolean;
  enableFullTextSearch: boolean;
  enableEmail: boolean;
  enableWebSocket: boolean;
  maxFileSize: number;
  allowedFileTypes: string;
  loaded: boolean;

  fetchAppConfig: () => Promise<void>;
}

/** 系统配置 → store 字段映射 */
const CONFIG_MAP: Record<string, [keyof AppState, string]> = {
  'system.name':        ['systemName', '企业知识库'],
  'system.description': ['systemDescription', '智能企业知识管理平台'],
};

/** 布尔类型配置映射：configKey → [storeKey, defaultValue] */
const BOOLEAN_CONFIG_MAP: Record<string, [keyof AppState, boolean]> = {
  'system.requireApproval':    ['requireApproval', true],
  'system.enableComments':      ['enableComments', true],
  'system.enableAI':            ['enableAI', true],
  'system.enableAIWriting':     ['enableAIWriting', true],
  'system.enableAgent':         ['enableAgent', true],
  'system.enableFullTextSearch': ['enableFullTextSearch', true],
  'email.enabled':                ['enableEmail', true],
  'websocket.enabled':            ['enableWebSocket', true],
};

export const useAppStore = create<AppState>((set, get) => ({
  systemName: '企业知识库',
  systemDescription: '智能企业知识管理平台',
  requireApproval: true,
  enableComments: true,
  enableAI: true,
  enableAIWriting: true,
  enableAgent: true,
  enableFullTextSearch: true,
  enableEmail: true,
  enableWebSocket: true,
  maxFileSize: 104857600, // 100MB
  allowedFileTypes: 'pdf,doc,docx,xls,xlsx,ppt,pptx,txt,md,jpg,jpeg,png,gif,bmp,webp,svg,ico,mp4,avi,mov,wmv,flv,mkv,webm,mp3,wav,flac,aac,ogg,m4a,wma',
  loaded: false,

  fetchAppConfig: async () => {
    if (get().loaded) return;
    try {
      const configs: Record<string, string> = await foundationService.config.getPublic();
      const updates: Partial<Pick<AppState, 'systemName' | 'systemDescription'>> = {};

      for (const [configKey, [storeKey, fallback]] of Object.entries(CONFIG_MAP)) {
        const raw = configs[configKey];
        (updates as Record<string, string>)[storeKey] = raw && raw.trim() ? raw : fallback;
      }

      // 读取布尔类型配置
      const booleanUpdates: Record<string, boolean> = {};
      for (const [configKey, [storeKey, defaultVal]] of Object.entries(BOOLEAN_CONFIG_MAP)) {
        const raw = configs[configKey];
        booleanUpdates[storeKey] = raw !== undefined ? raw === 'true' : defaultVal;
      }

      // 读取文件上传配置
      const maxFileSizeRaw = configs['file.upload.max.size'];
      const allowedFileTypesRaw = configs['file.upload.allowed.types'];

      // 保证 pdf 始终在允许列表中（数据库配置可能存在遗漏）
      const normalizedTypes = allowedFileTypesRaw || 'pdf,doc,docx,xls,xlsx,ppt,pptx,txt,md,jpg,jpeg,png,gif,bmp,webp,svg,ico,mp4,avi,mov,wmv,flv,mkv,webm,mp3,wav,flac,aac,ogg,m4a,wma';
      const typeSet = new Set(normalizedTypes.split(',').map((t: string) => t.trim().toLowerCase()));
      typeSet.add('pdf'); // 硬保证 PDF 始终可上传

      set({
        ...updates,
        ...booleanUpdates,
        maxFileSize: maxFileSizeRaw ? parseInt(maxFileSizeRaw, 10) || 104857600 : 104857600,
        allowedFileTypes: Array.from(typeSet).join(','),
        loaded: true,
      });

      // 同步更新浏览器标题
      document.title = (updates.systemName || get().systemName) + ' | Enterprise Knowledge Base';
    } catch {
      // 获取失败使用默认值，标记已加载避免无限重试
      set({ loaded: true });
      document.title = get().systemName + ' | Enterprise Knowledge Base';
    }
  },
}));
