/**
 * 状态仓库：ai-writing.store。
 */
import { create } from 'zustand';
import { WritingRequest, WritingResult, WritingTemplate } from '@/types';
import { aiService } from '@/services';

interface AIWritingState {
  // 数据
  templates: WritingTemplate[];
  generatedContent: string;
  isGenerating: boolean;
  isStreaming: boolean;
  tokens: number;
  wordCount: number;
  lastResult: WritingResult | null;
  error: string | null;

  // 操作
  fetchTemplates: () => Promise<void>;
  generateContent: (data: WritingRequest) => Promise<WritingResult>;
  generateContentStream: (data: WritingRequest) => Promise<WritingResult>;
  expandContent: (data: WritingRequest) => Promise<WritingResult>;
  optimizeContent: (data: WritingRequest) => Promise<WritingResult>;
  continueWriting: (data: WritingRequest) => Promise<WritingResult>;
  setGeneratedContent: (content: string) => void;
  clearResult: () => void;
  reset: () => void;
}

export const useAIWritingStore = create<AIWritingState>((set) => ({
  templates: [],
  generatedContent: '',
  isGenerating: false,
  isStreaming: false,
  tokens: 0,
  wordCount: 0,
  lastResult: null,
  error: null,

  fetchTemplates: async () => {
    try {
      const response = await aiService.getWritingTemplates();
      const data = (response as any)?.data || response;
      set({ templates: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.error('获取写作模板失败:', err);
    }
  },

  generateContent: async (data: WritingRequest) => {
    set({ isGenerating: true, error: null, generatedContent: '' });
    try {
      const response = await aiService.generateWriting(data);
      const result = (response as any)?.data || response;
      set({
        generatedContent: result?.content || '',
        tokens: result?.tokens || 0,
        wordCount: result?.wordCount || 0,
        lastResult: result,
        isGenerating: false,
      });
      return result;
    } catch (err: any) {
      const msg = err?.message || '生成失败';
      set({ isGenerating: false, error: msg });
      throw err;
    }
  },

  generateContentStream: async (data: WritingRequest) => {
    set({ isGenerating: true, isStreaming: true, error: null, generatedContent: '' });
    let fullContent = '';
    try {
      await aiService.generateWritingStream(
        { ...data, actionType: 'generate' },
        (chunk: string) => {
          fullContent += chunk;
          set({ generatedContent: fullContent });
        },
        (result: WritingResult) => {
          set({
            generatedContent: result.content || fullContent,
            tokens: result.tokens || 0,
            wordCount: result.wordCount || 0,
            lastResult: result,
            isGenerating: false,
            isStreaming: false,
          });
        },
        (err: string) => {
          set({ isGenerating: false, isStreaming: false, error: err });
        },
      );
      return { content: fullContent, tokens: 0, wordCount: fullContent.length, model: '' };
    } catch (err: any) {
      const msg = err?.message || '流式生成失败';
      set({ isGenerating: false, isStreaming: false, error: msg });
      throw err;
    }
  },

  expandContent: async (data: WritingRequest) => {
    set({ isGenerating: true, error: null });
    try {
      const response = await aiService.expandWriting(data);
      const result = (response as any)?.data || response;
      set({
        generatedContent: result?.content || '',
        tokens: result?.tokens || 0,
        wordCount: result?.wordCount || 0,
        lastResult: result,
        isGenerating: false,
      });
      return result;
    } catch (err: any) {
      const msg = err?.message || '扩写失败';
      set({ isGenerating: false, error: msg });
      throw err;
    }
  },

  optimizeContent: async (data: WritingRequest) => {
    set({ isGenerating: true, error: null });
    try {
      const response = await aiService.optimizeWriting(data);
      const result = (response as any)?.data || response;
      set({
        generatedContent: result?.content || '',
        tokens: result?.tokens || 0,
        wordCount: result?.wordCount || 0,
        lastResult: result,
        isGenerating: false,
      });
      return result;
    } catch (err: any) {
      const msg = err?.message || '优化失败';
      set({ isGenerating: false, error: msg });
      throw err;
    }
  },

  continueWriting: async (data: WritingRequest) => {
    set({ isGenerating: true, error: null });
    try {
      const response = await aiService.continueWriting(data);
      const result = (response as any)?.data || response;
      set({
        generatedContent: result?.content || '',
        tokens: result?.tokens || 0,
        wordCount: result?.wordCount || 0,
        lastResult: result,
        isGenerating: false,
      });
      return result;
    } catch (err: any) {
      const msg = err?.message || '续写失败';
      set({ isGenerating: false, error: msg });
      throw err;
    }
  },

  setGeneratedContent: (content: string) => {
    set({ generatedContent: content });
  },

  clearResult: () => {
    set({
      generatedContent: '',
      tokens: 0,
      wordCount: 0,
      lastResult: null,
      error: null,
    });
  },

  reset: () => {
    set({
      templates: [],
      generatedContent: '',
      isGenerating: false,
      isStreaming: false,
      tokens: 0,
      wordCount: 0,
      lastResult: null,
      error: null,
    });
  },
}));
