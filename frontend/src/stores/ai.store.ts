import { create } from 'zustand';
import { AIConversation, AIMessage, AIModelOption } from '@/types';
import { aiService } from '@/services';

interface AIState {
  conversations: AIConversation[];
  currentConversation: AIConversation | null;
  isLoading: boolean;
  isStreaming: boolean;
  currentResponse: string;
  selectedModel: string;
  availableModels: AIModelOption[];
  ragEnabled: boolean;
  kagEnabled: boolean;

  // Actions
  fetchConversations: () => Promise<void>;
  createConversation: (title: string) => Promise<AIConversation>;
  deleteConversation: (id: string) => Promise<void>;
  setCurrentConversation: (conversation: AIConversation | null) => void;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  sendMessage: (message: string, _conversationId?: string) => Promise<void>;
  clearConversation: (id: string) => Promise<void>;
  fetchModels: () => Promise<void>;
  setSelectedModel: (model: string) => void;
  toggleRag: (enabled: boolean) => void;
  toggleKag: (enabled: boolean) => void;
  reset: () => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  isLoading: false,
  isStreaming: false,
  currentResponse: '',
  selectedModel: 'qwen',
  availableModels: [],
  ragEnabled: false,
  kagEnabled: false,

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const apiConversations = await aiService.getConversations();
      // 与内存中的对话合并：保留已有 messages 的对话数据，避免覆盖当前活跃对话
      const { currentConversation, conversations: existingConvs } = get();
      const existingMap = new Map(
        existingConvs.map((c) => [String(c.id), c])
      );
      if (currentConversation) {
        existingMap.set(String(currentConversation.id), currentConversation);
      }
      const merged = apiConversations.map((api) => {
        const existing = existingMap.get(String(api.id));
        return existing && existing.messages ? { ...api, messages: existing.messages } : api;
      });
      set({ conversations: merged, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createConversation: async (title: string) => {
    const conversation = await aiService.createConversation(title);
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      currentConversation: conversation,
    }));
    return conversation;
  },

  deleteConversation: async (id: string) => {
    await aiService.deleteConversation(id);
    set((state) => ({
      conversations: state.conversations.filter((c) => String(c.id) !== String(id)),
      currentConversation:
        String(state.currentConversation?.id) === String(id) ? null : state.currentConversation,
    }));
  },

  setCurrentConversation: (conversation: AIConversation | null) => {
    set({ currentConversation: conversation });
    // 如果会话没有加载过消息（从侧边栏点击），自动加载历史消息
    if (conversation && conversation.id && (!conversation.messages || conversation.messages.length === 0)) {
      get().loadConversationMessages(String(conversation.id));
    }
  },

  loadConversationMessages: async (conversationId: string) => {
    try {
      const conv = await aiService.getConversation(conversationId);
      // 后端返回的 messages 字段映射：id→Long/String, role→string, content→string, createdAt→timestamp
      const messages: AIMessage[] = ((conv as any).messages || []).map((m: any) => ({
        id: String(m.id),
        role: m.role,
        content: m.content,
        timestamp: m.createdAt || m.timestamp,
      }));
      set((state) => {
        const updatedConv = {
          ...state.currentConversation,
          id: String(conv.id),
          title: (conv as any).title || state.currentConversation?.title || '',
          messages,
          messageCount: (conv as any).messageCount,
          model: (conv as any).model,
        };
        return {
          currentConversation: updatedConv,
          isLoading: false,
          conversations: state.conversations.map((c) =>
            String(c.id) === String(conversationId)
              ? { ...c, messages, messageCount: (conv as any).messageCount }
              : c
          ),
        };
      });
    } catch (error) {
      console.error('加载对话消息失败:', error);
      set({ isLoading: false });
    }
  },

  sendMessage: async (message: string, _conversationId?: string) => {
    const { selectedModel, ragEnabled, kagEnabled } = get();
    set({ isLoading: true, isStreaming: true, currentResponse: '' });

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    // 更新当前对话或创建本地占位（不调 API——后端 chatStream 会自动创建）
    let currentConv = get().currentConversation;
    if (!currentConv) {
      // 创建本地占位对话，id 暂空，等后端 done 事件返回真实 ID
      currentConv = {
        id: '',
        title: message.slice(0, 30),
        messages: [userMessage],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set({ currentConversation: currentConv });
    } else {
      // 现有对话：追加用户消息（兼容从侧边栏选中的无 messages 的对话）
      const existingMessages = currentConv.messages || [];
      // 如果是空对话的第一个消息，用消息内容更新标题
      const title = existingMessages.length === 0
        ? message.slice(0, 30)
        : currentConv.title;
      currentConv = {
        ...currentConv,
        title,
        messages: [...existingMessages, userMessage],
        updatedAt: new Date().toISOString(),
      };
      set({ currentConversation: currentConv });
    }

    try {
      // 仅当已有后端真实 ID 时才传递，占位空串不传（让后端自行创建）
      const realId = currentConv.id && String(currentConv.id) !== '' ? String(currentConv.id) : undefined;

      // 用于在 done 回调中捕获后端返回的 conversationId
      let resolvedConversationId: string | undefined = realId;
      let resolvedMessageId: string | undefined;
      let resolvedGraphContext: any = undefined;
      let resolvedCitations: any = undefined;

      // 使用流式API，传递选中的模型
      await aiService.askStream(
        {
          question: message,
          conversationId: realId,
          model: selectedModel,
          context: {
            knowledgeBase: ragEnabled,
            enableKag: kagEnabled,
          },
        },
        // onMessage: 流式文本
        (chunk: string) => {
          set((state) => ({
            currentResponse: state.currentResponse + chunk,
          }));
        },
        // onDone: 流式完成，后端返回 ChatResponseVO
        (result) => {
          resolvedConversationId = String(result.conversationId);
          resolvedMessageId = String(result.messageId);
          resolvedGraphContext = (result as any).graphContext;
          resolvedCitations = (result as any).citations;
        },
        // onError: 流式错误
        (errorMsg: string) => {
          throw new Error(errorMsg);
        }
      );

      // 后端 done 事件返回的 conversationId 是权威 ID
      const finalConversationId = resolvedConversationId || (realId || '');
      const finalContent = get().currentResponse;

      const assistantMessage: AIMessage = {
        id: resolvedMessageId || (Date.now() + 1).toString(),
        role: 'assistant',
        content: finalContent,
        timestamp: new Date().toISOString(),
        citations: resolvedCitations,
        graphContext: resolvedGraphContext,
      };

      set((state) => {
        const conv = state.currentConversation;
        if (!conv) {
          return {
            isLoading: false,
            isStreaming: false,
            currentResponse: '',
          };
        }
        const updatedConv = {
          ...conv,
          id: finalConversationId,
          messages: [...conv.messages, assistantMessage],
          updatedAt: new Date().toISOString(),
        };
        // 如果是新对话（之前没有后端ID），同步加入侧边栏列表
        const isNewConversation = !realId && finalConversationId;
        const conversations = isNewConversation
          ? [updatedConv, ...state.conversations.filter((c) => String(c.id) !== finalConversationId)]
          : state.conversations.map((c) => (String(c.id) === finalConversationId ? updatedConv : c));
        return {
          currentConversation: updatedConv,
          conversations,
          isLoading: false,
          isStreaming: false,
          currentResponse: '',
        };
      });
    } catch (error) {
      set({
        isLoading: false,
        isStreaming: false,
        currentResponse: '',
      });
      throw error;
    }
  },

  clearConversation: async (id: string) => {
    await aiService.clearConversation(id);
    set((state) => ({
      currentConversation:
        state.currentConversation?.id === id
          ? { ...state.currentConversation, messages: [] }
          : state.currentConversation,
    }));
  },

  fetchModels: async () => {
    try {
      const models = await aiService.getModels();
      set({ availableModels: models });
      // 如果没有选中模型，使用默认模型
      const { selectedModel } = get();
      if (!selectedModel && models.length > 0) {
        const defaultModel = models.find((m) => m.isDefault);
        set({ selectedModel: defaultModel ? defaultModel.key : models[0].key });
      }
    } catch (error) {
      console.error('获取AI模型列表失败:', error);
      // 使用本地配置作为回退
      const { AI_CONFIG } = await import('@/constants');
      const fallbackModels: AIModelOption[] = Object.values(AI_CONFIG.MODELS).map((m) => ({
        key: m.key,
        displayName: m.displayName,
        description: m.description,
        isDefault: m.key === AI_CONFIG.DEFAULT_MODEL,
      }));
      set({ availableModels: fallbackModels });
    }
  },

  setSelectedModel: (model: string) => {
    set({ selectedModel: model });
  },

  toggleRag: (enabled: boolean) => {
    set({ ragEnabled: enabled });
  },

  toggleKag: (enabled: boolean) => {
    set({ kagEnabled: enabled });
  },

  reset: () => {
    set({
      conversations: [],
      currentConversation: null,
      currentResponse: '',
      availableModels: [],
    });
  },
}));
