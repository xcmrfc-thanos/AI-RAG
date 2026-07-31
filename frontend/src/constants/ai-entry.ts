/**
 * AI 入口产品文案与导航开关常量。
 * 与 docs/ai-entry-boundaries.md 保持一致，修改时请同步文档与任务 64 契约。
 */

/** 系统设置键：功能开关（后端配置名） */
export const AI_FEATURE_FLAGS = {
  /** AI 助手 */
  enableAI: 'enableAI',
  /** AI 写作 */
  enableAIWriting: 'enableAIWriting',
  /**
   * Agent 工作流（用户页 + 管理页共用）。
   * 默认生产关闭；任务 71 冒烟 + 56-Ops 完成前不得开启。
   */
  enableAgent: 'enableAgent',
  /** AI 助手结构化 @workflow 触发（默认关闭） */
  enableAiWorkflowTrigger: 'enableAiWorkflowTrigger',
  /** 嵌入实验室（自嵌试点，默认关闭） */
  enableEmbedLab: 'enableEmbedLab',
} as const;

/** 前端路由（任务 64 冻结） */
export const AI_ENTRY_ROUTES = {
  search: '/search',
  assistant: '/ai',
  writing: '/ai-writing',
  agent: '/agent',
  agentAdmin: '/admin/agents',
} as const;

/** MVP 权限码（与任务 70 / agent-security-boundary 一致） */
export const AGENT_PERMISSIONS = {
  workflowView: 'agent:workflow:view',
  run: 'agent:run',
  workflowEdit: 'agent:workflow:edit',
  workflowPublish: 'agent:workflow:publish',
} as const;

/**
 * 各入口标准文案
 */
export const AI_ENTRY_COPY = {
  search: {
    navLabel: '智能搜索',
    title: '智能搜索',
    subtitleHybrid: '在知识库中检索文档，语义 + 关键词混合匹配，适合自然语言问句',
    subtitleKeyword: '在知识库中检索文档，全文关键词快速定位标题与正文',
    oneLiner: '找文档、找段落——返回检索结果列表，不提供对话式回答',
  },
  assistant: {
    navLabel: 'AI 助手',
    title: 'AI 助手',
    subtitle: '基于知识库的对话问答，可开启知识库增强并引用来源文档',
    emptyTitle: '您好，我是 AI 助手',
    emptySubtitle: '输入问题即可开始；开启知识库增强后，回答将附带文档引用',
    oneLiner: '提问题、要总结——返回对话式回答与引用，不生成完整文稿',
    tagRag: '知识库增强',
    ragTooltip: '开启后 AI 将从知识库检索相关文档辅助回答',
    placeholder: '输入您的问题，Enter 发送，Shift+Enter 换行',
    workflowPickerLabel: '工作流',
    workflowPickerPlaceholder: '选择已发布工作流',
    workflowChipClear: '取消工作流',
    workflowRunning: '工作流运行中…',
    workflowFailed: '工作流运行失败',
    workflowOpenAgent: '在 Agent 页查看轨迹',
    disabledTitle: 'AI 助手功能已关闭',
    disabledDesc: '管理员已在系统设置中关闭了 AI 助手功能，如需使用请联系管理员。',
  },
  writing: {
    navLabel: 'AI 写作',
    title: 'AI 写作',
    subtitle: '智能生成、扩写、优化与续写文档内容',
    emptyTitle: '开始 AI 写作',
    emptySubtitle: '输入主题与写作要求，选择类型与风格，AI 将生成可直接使用的文档内容',
    oneLiner: '写方案、写周报——生成或改写文稿，可一键创建文档',
    disabledTitle: 'AI 写作功能已关闭',
    disabledDesc: '管理员已在系统设置中关闭了 AI 写作功能，如需使用请联系管理员。',
  },
  agent: {
    navLabel: 'Agent',
    title: 'Agent 工作流',
    subtitle: '选择已发布的工作流并运行，查看答案与执行轨迹',
    emptyTitle: '选择一个工作流开始',
    emptySubtitle: '仅可运行管理员已发布的版本；运行结果与工具调用轨迹会显示在本页',
    placeholder: '输入工作流所需问题或关键词',
    cancelHint: '取消请求已提交，将在当前节点结束后生效',
    oneLiner: '跑已发布流程——返回结构化结果与轨迹，不在此编排',
    disabledTitle: 'Agent 功能已关闭',
    disabledDesc: '管理员已关闭 Agent，或当前账号无运行权限。',
  },
  agentAdmin: {
    navLabel: 'Agent 编排',
    title: 'Agent 工作流管理',
    subtitle: '编排、校验、试跑并发布不可变工作流版本',
    oneLiner: '管理员编排与发布——用户只在 /agent 运行已发布版本',
  },
  dashboard: {
    sectionTitle: 'AI 助手',
    sectionSubtitle: '基于企业知识库的对话问答，帮您快速获取答案与文档引用',
    textareaPlaceholder:
      '向 AI 助手提问，例如：\n- 如何优化 Spring Boot 应用的性能？\n- 微服务架构有哪些最佳实践？\n- 请总结某份技术报告的核心观点',
  },
} as const;

export type AiEntryCopy = typeof AI_ENTRY_COPY;
export type AiFeatureFlags = typeof AI_FEATURE_FLAGS;
export type AgentPermissions = typeof AGENT_PERMISSIONS;
