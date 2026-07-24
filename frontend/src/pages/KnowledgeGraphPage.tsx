/**
 * 业务页面：KnowledgeGraphPage。
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Input, Button, message, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined,
  SearchOutlined,
  AimOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ECharts, GraphicComponentOption } from 'echarts';
import { KnowledgeGraphData, KnowledgeGraphNode, GraphData } from '@/types';
import { graphService, settingsService } from '@/services';
import { PageLoading, EmptyState } from '@/components/common';
import './KnowledgeGraphPage.css';

const { Search } = Input;

// ── Category config ──────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { color: string; glow: string; label: string; size: number }> = {
  KnowledgeDocument: {
    color: '#818cf8',
    glow: 'rgba(129, 140, 248, 0.6)',
    label: '文档',
    size: 55,
  },
  KnowledgeEntity: {
    color: '#22d3ee',
    glow: 'rgba(34, 211, 238, 0.6)',
    label: '实体',
    size: 28,
  },
  DocumentChunk: {
    color: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.6)',
    label: '文档块',
    size: 22,
  },
};

type NodeTypeKey = 'KnowledgeDocument' | 'KnowledgeEntity' | 'DocumentChunk';

// ── 属性字段中英文映射及隐藏字段 ──────────────────────────────
const PROPERTY_LABEL_MAP: Record<string, string> = {
  title: '标题',
  summary: '摘要',
  content: '内容',
  heading: '章节',
  description: '描述',
  name: '名称',
  type: '实体类型',
  status: '状态',
  docId: '文档ID',
  chunkId: '片段ID',
  chunkIndex: '片段序号',
  totalChunks: '总片段数',
  authorId: '作者ID',
  authorName: '作者',
  categoryId: '分类ID',
  createdAt: '创建时间',
  updatedAt: '更新时间',
  publishTime: '发布时间',
  documentType: '文档类型',
  tags: '标签',
  aliases: '别名',
  confidence: '置信度',
  weight: '权重',
};

// 节点详情面板中不展示的技术字段
const HIDDEN_PROPERTY_KEYS = new Set([
  'docId', 'chunkId', 'chunkIndex', 'totalChunks',
  'authorId', 'categoryId', 'status', 'createdAt', 'updatedAt',
]);

/**
 * formatPropertyValue。
 */
const formatPropertyValue = (key: string, value: any): string => {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  const str = String(value);
  // 时间字段格式化
  if (/^(createdAt|updatedAt|publishTime)$/.test(key) && str.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:/)) {
    const d = dayjs(str);
    return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : str;
  }
  // 文档状态
  if (key === 'status') {
    return { '0': '草稿', '1': '已发布', '2': '已归档' }[str] || str;
  }
  return str;
};
type EChartsModule = typeof import('@/utils/graph-echarts');

const ECHARTS_LOAD_FAIL_MESSAGE = '图谱渲染组件加载失败，已切换为默认知识图谱视图。';
const VALID_NODE_TYPES: NodeTypeKey[] = ['KnowledgeDocument', 'KnowledgeEntity', 'DocumentChunk'];

const DEFAULT_GRAPH_DATA: KnowledgeGraphData = {
  nodes: [
    {
      id: 'default-doc-onboarding',
      label: '新员工入职指南',
      type: 'KnowledgeDocument',
      description: '帮助新成员快速了解企业制度、流程与协作方式。',
      value: 10,
      properties: {
        category: '人力资源',
        status: '已发布',
      },
    },
    {
      id: 'default-doc-review',
      label: '文档审核规范',
      type: 'KnowledgeDocument',
      description: '规范文档提交流程、审核标准与结果通知方式。',
      value: 9,
      properties: {
        category: '知识库规范',
        status: '已发布',
      },
    },
    {
      id: 'default-entity-training',
      label: '培训体系',
      type: 'KnowledgeEntity',
      description: '员工培训计划、课程安排与能力成长路径。',
      value: 8,
      properties: {
        tag: '组织发展',
      },
    },
    {
      id: 'default-entity-process',
      label: '审批流程',
      type: 'KnowledgeEntity',
      description: '覆盖文档、流程、权限等场景的标准审批节点。',
      value: 8,
      properties: {
        tag: '流程治理',
      },
    },
    {
      id: 'default-chunk-1',
      label: '入职准备事项',
      type: 'DocumentChunk',
      description: '账号开通、设备领取、制度学习等准备内容。',
      value: 6,
      properties: {
        source: '新员工入职指南',
      },
    },
    {
      id: 'default-chunk-2',
      label: '审核结论通知',
      type: 'DocumentChunk',
      description: '通过站内消息与 WebSocket 实时推送审核结果。',
      value: 6,
      properties: {
        source: '文档审核规范',
      },
    },
  ],
  links: [
    {
      source: 'default-doc-onboarding',
      target: 'default-entity-training',
      relation: '关联主题',
    },
    {
      source: 'default-doc-onboarding',
      target: 'default-chunk-1',
      relation: '包含片段',
    },
    {
      source: 'default-doc-review',
      target: 'default-entity-process',
      relation: '关联流程',
    },
    {
      source: 'default-doc-review',
      target: 'default-chunk-2',
      relation: '包含片段',
    },
    {
      source: 'default-entity-training',
      target: 'default-entity-process',
      relation: '协同关联',
    },
  ],
};

/**
 * buildStats。
 */
const buildStats = (data: KnowledgeGraphData) => {
  const initialStats = {
    totalNodes: data.nodes.length,
    totalEdges: data.links.length,
    docCount: 0,
    entityCount: 0,
    chunkCount: 0,
  };

  return data.nodes.reduce((stats, node) => {
    if (node.type === 'KnowledgeDocument') {
      stats.docCount += 1;
    } else if (node.type === 'KnowledgeEntity') {
      stats.entityCount += 1;
    } else if (node.type === 'DocumentChunk') {
      stats.chunkCount += 1;
    }
    return stats;
  }, initialStats);
};

const normalizeGraphData = (data?: GraphData | null): KnowledgeGraphData => {
  const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
  const edges = Array.isArray(data?.edges) ? data.edges : [];

  return {
    nodes: nodes
      .filter((node) => {
        const type = Array.isArray(node?.type) ? node.type[0] : node?.type;
        return Boolean(node?.id) && node.id !== 'unknown' && VALID_NODE_TYPES.includes(type as NodeTypeKey);
      })
      .map((node) => ({
        id: String(node.id),
        label: String(node.name || node.label || 'Unknown'),
        type: (Array.isArray(node.type) ? node.type[0] : node.type) as NodeTypeKey,
        value: typeof node.properties?.value === 'number' ? node.properties.value : undefined,
        description: node.properties?.description || (Array.isArray(node.labels) ? node.labels.join(', ') : ''),
        properties: node.properties || {},
        documentId: (node as any).documentId || String(node.properties?.docId || '') || undefined,
      })),
    links: edges
      .filter((edge) => edge?.source && edge?.target && edge.source !== 'unknown' && edge.target !== 'unknown')
      .map((edge) => ({
        source: String(edge.source),
        target: String(edge.target),
        relation: String((edge as any).relation || edge.relationship || 'related'),
      })),
  };
};

// ── Generate background dot grid for canvas ───────────────────
function generateDotGrid(width: number, height: number): GraphicComponentOption[] {
  const graphics: GraphicComponentOption[] = [];
  const spacing = 60;
  for (let x = spacing; x < width; x += spacing) {
    for (let y = spacing; y < height; y += spacing) {
      graphics.push({
        type: 'circle',
        shape: { cx: x, cy: y, r: 1 },
        style: { fill: 'rgba(255,255,255,0.04)' },
        z: 0,
      });
    }
  }
  return graphics;
}

// ── Component ─────────────────────────────────────────────────

/**
 * 渲染知识图谱画布空态（无数据或筛选无结果）。
 */
const renderGraphEmptyState = (
  searchTerm: string,
  onBrowseDocuments: () => void,
) => (
  <EmptyState
    className="kg-empty-state"
    type={searchTerm ? 'search' : 'generic'}
    image={false}
    descriptionNode={(
      <>
        <div className="kg-empty-icon">
          {searchTerm ? (
            <SearchOutlined style={{ color: '#6366f1', fontSize: 28 }} />
          ) : (
            <ThunderboltOutlined style={{ color: '#6366f1', fontSize: 28 }} />
          )}
        </div>
        <div className="kg-empty-title">
          {searchTerm ? '未找到匹配节点' : '暂无知识图谱数据'}
        </div>
        <div className="kg-empty-desc">
          {searchTerm
            ? '当前筛选条件下未找到匹配节点，请尝试调整关键词或筛选条件。'
            : '导入文档后系统将自动构建知识图谱，展示文档、实体和文档块之间的关联关系。'}
        </div>
      </>
    )}
    actionText={searchTerm ? undefined : '去浏览文档'}
    onAction={searchTerm ? undefined : onBrowseDocuments}
  />
);

export const KnowledgeGraphPage: React.FC = () => {
  const navigate = useNavigate();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ECharts | null>(null);
  const echartsModuleRef = useRef<EChartsModule | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState<KnowledgeGraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null);
  const [zoom, setZoom] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalNodes: 0,
    totalEdges: 0,
    docCount: 0,
    entityCount: 0,
    chunkCount: 0,
  });

  const [nodeTypes, setNodeTypes] = useState<Record<NodeTypeKey, boolean>>({
    KnowledgeDocument: true,
    KnowledgeEntity: true,
    DocumentChunk: true,
  });
  const [chartUnavailable, setChartUnavailable] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);

  // Keep a ref of filtered node IDs for search
  const filteredNodeListRef = useRef<string[]>([]);
  useEffect(() => {
    filteredNodeListRef.current = graphData.nodes
      .filter((n) => nodeTypes[n.type as NodeTypeKey])
      .map((n) => String(n.id));
  }, [graphData, nodeTypes]);

  // ── Fetch data ──────────────────────────────────────────────
  useEffect(() => {
    fetchGraphData();
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  // ── Init chart ──────────────────────────────────────────────
  useEffect(() => {
    if (chartRef.current && graphData.nodes.length > 0 && !loading && !chartUnavailable) {
      const timer = window.setTimeout(() => {
        void initChart();
      }, 50);
      return () => clearTimeout(timer);
    }
    // 图表初始化严格由图数据与筛选条件驱动，函数重建不应触发重复实例化。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData, nodeTypes, searchTerm, loading, chartUnavailable]);

  // ── Resize ──────────────────────────────────────────────────
  useEffect(() => {
    /**
     * handleResize。
     */
    const handleResize = () => {
      if (chartInstance.current) chartInstance.current.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * fetchGraphData。
   */
  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const data: GraphData = await graphService.getGraphData();
      const knowledgeGraphData = normalizeGraphData(data);
      const hasRenderableData = knowledgeGraphData.nodes.length > 0 && knowledgeGraphData.links.length > 0;

      if (hasRenderableData) {
        setGraphData(knowledgeGraphData);
        setStats(buildStats(knowledgeGraphData));
      } else {
        setGraphData(DEFAULT_GRAPH_DATA);
        setStats(buildStats(DEFAULT_GRAPH_DATA));
      }
    } catch (error) {
      console.error('Failed to fetch graph data:', error);
      setGraphData(DEFAULT_GRAPH_DATA);
      setStats(buildStats(DEFAULT_GRAPH_DATA));
    } finally {
      setLoading(false);
    }
  };

  /**
   * getVisibleGraphData。
   */
  const getVisibleGraphData = useCallback(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const visibleNodes = graphData.nodes.filter((node) => {
      if (!nodeTypes[node.type]) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const label = String(node.label || '').toLowerCase();
      const description = String(node.description || '').toLowerCase();
      return label.includes(keyword) || description.includes(keyword);
    });

    const nodeIds = new Set(visibleNodes.map((node) => String(node.id)));
    const visibleLinks = graphData.links.filter(
      (link) => nodeIds.has(String(link.source)) && nodeIds.has(String(link.target)),
    );

    return { visibleNodes, visibleLinks };
  }, [graphData, nodeTypes, searchTerm]);

  /**
   * loadECharts。
   */
  const loadECharts = useCallback(async (): Promise<EChartsModule | null> => {
    if (echartsModuleRef.current) {
      return echartsModuleRef.current;
    }

    try {
      const echartsModule = await import('@/utils/graph-echarts');
      echartsModuleRef.current = echartsModule;
      setChartUnavailable(false);
      return echartsModule;
    } catch (error) {
      console.error('Failed to load echarts:', error);
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
      setChartUnavailable(true);
      message.error(ECHARTS_LOAD_FAIL_MESSAGE);
      return null;
    }
  }, []);

  // ── Init ECharts ────────────────────────────────────────────
  const initChart = async () => {
    if (!chartRef.current) return;
    const echartsModule = await loadECharts();
    if (!echartsModule) return;

    const el = chartRef.current;
    const width = el.clientWidth || 800;
    const height = el.clientHeight || 600;

    if (chartInstance.current) chartInstance.current.dispose();

    const chart = echartsModule.init(el, undefined, { devicePixelRatio: window.devicePixelRatio });
    chartInstance.current = chart;

    const { visibleNodes, visibleLinks } = getVisibleGraphData();

    const option = {
      backgroundColor: 'transparent',
      graphic: generateDotGrid(width, height),

      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15,17,25,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderRadius: 12,
        padding: 0,
        textStyle: { color: '#f1f5f9', fontSize: 14 },
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const d = params.data;
            const cfg = CATEGORY_CONFIG[d.category || ''] || CATEGORY_CONFIG.KnowledgeEntity;
            const desc = d.description ? String(d.description) : '';
            return `
              <div style="padding:20px 22px;min-width:360px;max-width:480px;">
                <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.06);">
                  <div style="width:14px;height:14px;border-radius:50%;background:${cfg.color};box-shadow:0 0 12px ${cfg.glow};flex-shrink:0;margin-top:4px;"></div>
                  <span style="font-weight:700;font-size:17px;color:#ffffff;word-break:break-all;line-height:1.4;">${String(d.name || 'Unknown')}</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:10px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="color:#94a3b8;font-size:13px;font-weight:500;">类型</span>
                    <span style="background:${cfg.color}22;color:${cfg.color};padding:3px 12px;border-radius:10px;font-size:13px;font-weight:600;">${cfg.label}</span>
                  </div>
                  ${desc ? `<div style="display:flex;flex-direction:column;gap:4px;"><span style="color:#94a3b8;font-size:13px;font-weight:500;">描述</span><span style="color:#f1f5f9;font-size:14px;word-break:break-all;line-height:1.6;">${desc}</span></div>` : ''}
                  ${d.value ? `<div style="display:flex;justify-content:space-between;align-items:center;"><span style="color:#94a3b8;font-size:13px;font-weight:500;">权重</span><span style="color:#f1f5f9;font-size:14px;font-weight:700;">${d.value}</span></div>` : ''}
                  ${d.documentId ? `<div style="margin-top:8px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;"><span style="background:#6366f122;color:#818cf8;padding:4px 14px;border-radius:10px;font-size:13px;font-weight:600;">单击节点可跳转至文档</span></div>` : ''}
                </div>
              </div>
            `;
          }
          if (params.dataType === 'edge') {
            const srcName = String(params.data.source || '');
            const tgtName = String(params.data.target || '');
            const rel = String(params.data.value || params.data.relation || '关联');
            return `
              <div style="padding:16px 18px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                  <span style="display:inline-block;width:8px;height:2px;border-radius:1px;background:#818cf8;"></span>
                  <span style="font-weight:700;font-size:14px;color:#ffffff;">${rel}</span>
                </div>
                <div style="color:#94a3b8;font-size:13px;line-height:1.4;">${srcName} → ${tgtName}</div>
              </div>
            `;
          }
          return '';
        },
      },

      animationDuration: 800,
      animationEasingUpdate: 'cubicInOut',

      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          scaleLimit: { min: 0.2, max: 3 },
          zoom: 1,
          cursor: 'grab',

          data: visibleNodes.map((node) => {
            const cfg = CATEGORY_CONFIG[node.type] || CATEGORY_CONFIG.KnowledgeEntity;
            return {
              id: node.id,
              name: node.label,
              category: node.type,
              value: node.value || 1,
              description: node.description,
              documentId: node.documentId || '',
              symbolSize: cfg.size,
              itemStyle: {
                color: cfg.color,
                borderColor: 'rgba(255,255,255,0.15)',
                borderWidth: 1.5,
                shadowBlur: 0,
                shadowColor: 'transparent',
                opacity: 0.9,
              },
              label: {
                show: true,
                position: 'right',
                distance: 10,
                color: '#94a3b8',
                fontSize: 11,
                fontWeight: 500,
                formatter: (p: any) => {
                  const name = String(p.data.name || '');
                  return name.length > 14 ? name.substring(0, 13) + '…' : name;
                },
              },
              emphasis: {
                scale: 1.4,
                focus: 'adjacency',
                itemStyle: {
                  shadowBlur: 24,
                  shadowColor: cfg.glow,
                  borderColor: 'rgba(255,255,255,0.4)',
                  borderWidth: 2,
                },
                label: { color: '#e2e8f0', fontWeight: 600 },
              },
              select: {
                itemStyle: {
                  shadowBlur: 20,
                  shadowColor: cfg.glow,
                  borderColor: '#ffffff',
                  borderWidth: 2.5,
                },
              },
            };
          }),

          links: visibleLinks.map((link) => ({
            source: link.source,
            target: link.target,
            value: link.relation,
            label: {
              show: false,
            },
            lineStyle: {
              color: 'rgba(148,163,184,0.35)',
              width: 1.2,
              curveness: 0.25,
              opacity: 1,
            },
            emphasis: {
              lineStyle: {
                color: 'rgba(99,102,241,0.6)',
                width: 2.5,
                opacity: 1,
              },
            },
          })),

          categories: [
            { name: 'KnowledgeDocument' },
            { name: 'KnowledgeEntity' },
            { name: 'DocumentChunk' },
          ],

          force: {
            initIterations: 200,
            repulsion: 200,
            edgeLength: [80, 160],
            gravity: 0.15,
            layoutAnimation: true,
          },

          emphasis: {
            focus: 'adjacency',
            blurScope: 'coordinateSystem',
            lineStyle: { width: 2.5 },
          },

          blur: {
            itemStyle: { opacity: 0.15 },
            label: { opacity: 0 },
            lineStyle: { opacity: 0.05 },
          },

          edgeSymbol: ['none', 'none'],
          edgeLabel: { show: false },
        },
      ],
    };

    chart.setOption(option as any);

    // ── Events ────────────────────────────────────────────────
    chart.off('click');
    chart.on('click', (params: any) => {
      if (params.dataType === 'node') {
        const nodeId = String(params.data.id || '');
        const node = graphData.nodes.find((n) => String(n.id) === nodeId);
        if (node) {
          // Ensure documentId is preserved from ECharts data if state lookup is missing it
          const echartsDocId = params.data.documentId;
          if (echartsDocId && !node.documentId) {
            node.documentId = echartsDocId;
          }
          setSelectedNode({ ...node });
        }
      } else {
        setSelectedNode(null);
      }
    });

    // Track zoom level
    const updateZoom = () => {
      const op = chart.getOption() as any;
      if (op?.series?.[0]?.zoom != null) {
        setZoom(Math.round(op.series[0].zoom * 100));
      }
    };
    chart.off('graphRoam');
    chart.on('graphRoam', updateZoom);
  };

  // ── Helpers ─────────────────────────────────────────────────
  const getCategoryConfig = useCallback(
    (type: string) => CATEGORY_CONFIG[type] || CATEGORY_CONFIG.KnowledgeEntity,
    [],
  );

  /**
   * handleZoomIn。
   */
  const handleZoomIn = () => {
    if (chartInstance.current) {
      const op = chartInstance.current.getOption() as any;
      const current = op?.series?.[0]?.zoom ?? 1;
      const next = Math.min(current * 1.3, 3);
      chartInstance.current.setOption({ series: [{ zoom: next }] });
      setZoom(Math.round(next * 100));
    }
  };

  /**
   * handleZoomOut。
   */
  const handleZoomOut = () => {
    if (chartInstance.current) {
      const op = chartInstance.current.getOption() as any;
      const current = op?.series?.[0]?.zoom ?? 1;
      const next = Math.max(current * 0.7, 0.2);
      chartInstance.current.setOption({ series: [{ zoom: next }] });
      setZoom(Math.round(next * 100));
    }
  };

  /**
   * handleReset。
   */
  const handleReset = () => {
    if (chartInstance.current) {
      chartInstance.current.dispatchAction({ type: 'restore' });
      setZoom(100);
      setSelectedNode(null);
    }
  };

  /**
   * handleFit。
   */
  const handleFit = () => {
    if (chartInstance.current) {
      chartInstance.current.dispatchAction({ type: 'restore' });
      setZoom(100);
    }
  };

  /**
   * handleSearch。
   */
  const handleSearch = (value: string) => {
    setSearchTerm(value.trim());
    setSelectedNode(null);
  };

  /**
   * handleRebuild。
   */
  const handleRebuild = async () => {
    if (rebuilding) return;

    /**
     * 执行重建请求。
     */
    const doRebuild = async () => {
      setRebuilding(true);
      try {
        await graphService.rebuildGraph();
        message.success('知识图谱重建任务已提交，构建完成后请刷新页面查看');
      } catch (err: any) {
        message.error(err?.message || '重建失败，请重试');
      } finally {
        setRebuilding(false);
      }
    };

    let needConfirm = true;
    try {
      const settings = await settingsService.getSettings();
      needConfirm = settings?.compliance?.confirmSensitiveGraphOps !== false;
    } catch {
      needConfirm = true;
    }

    if (!needConfirm) {
      await doRebuild();
      return;
    }

    Modal.confirm({
      title: '确认全量重建知识图谱？',
      content: '可能耗时较长，并按系统配置决定是否先清空图数据。',
      okText: '确认重建',
      cancelText: '取消',
      onOk: doRebuild,
    });
  };

  const toggleNodeType = (type: NodeTypeKey) => {
    setNodeTypes((prev) => ({ ...prev, [type]: !prev[type] }));
    setSelectedNode(null);
  };

  // ── Loading skeleton ────────────────────────────────────────
  if (loading) {
    return (
      <div className="knowledge-graph-page">
        <div className="skeleton-bar">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
        <div className="graph-container" style={{ flex: 1 }}>
          <div className="skeleton-sidebar">
            <div className="skeleton-block h-36 w-100" />
            <div className="skeleton-block h-40 w-100" />
            <div className="skeleton-block h-40 w-100" />
            <div className="skeleton-block h-40 w-100" />
          </div>
          <div className="graph-main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <PageLoading />
          </div>
        </div>
      </div>
    );
  }

  const { visibleNodes, visibleLinks } = getVisibleGraphData();
  const hasData = visibleNodes.length > 0;
  const visibleNodeMap = new Map(visibleNodes.map((node) => [String(node.id), node]));
  const showFallbackGraphView = hasData && chartUnavailable;

  return (
    <div className="knowledge-graph-page">
      {/* ── Stats Bar ─────────────────────────────────── */}
      <div className="graph-stats-bar">
        <div className="graph-stat-card">
          <span className="graph-stat-card-value">{stats.totalNodes}</span>
          <span className="graph-stat-card-label">节点总数</span>
        </div>
        <div className="graph-stat-card">
          <span className="graph-stat-card-value">{stats.totalEdges}</span>
          <span className="graph-stat-card-label">关系总数</span>
        </div>
        <div className="graph-stat-card">
          <span className="graph-stat-card-value">{stats.docCount}</span>
          <span className="graph-stat-card-label">文档节点</span>
        </div>
        <div className="graph-stat-card">
          <span className="graph-stat-card-value">{stats.entityCount}</span>
          <span className="graph-stat-card-label">实体节点</span>
        </div>
      </div>

      <div className="graph-container">
        {/* ── Sidebar ──────────────────────────────────── */}
        <div className="graph-sidebar">
          {/* Rebuild Button */}
          <div className="graph-sidebar-section">
            <Button
              type="primary"
              icon={<ThunderboltOutlined spin={rebuilding} />}
              loading={rebuilding}
              onClick={handleRebuild}
              block
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                fontWeight: 600,
              }}
            >
              {rebuilding ? '图谱构建中...' : '生成知识图谱'}
            </Button>
          </div>

          {/* Search */}
          <div className="graph-sidebar-section">
            <div className="graph-section-title">搜索节点</div>
            <Search
              placeholder="输入关键词搜索..."
              value={searchTerm}
              onChange={(e) => {
                const v = e.target.value;
                setSearchTerm(v);
                if (!v.trim()) {
                  setSelectedNode(null);
                }
              }}
              onSearch={handleSearch}
              onClear={() => {
                setSearchTerm('');
                setSelectedNode(null);
              }}
              className="search-box"
              prefix={<SearchOutlined />}
              allowClear
            />
          </div>

          {/* Type Filters */}
          <div className="graph-sidebar-section">
            <div className="graph-section-title">节点筛选</div>
            <div className="graph-type-filters">
              {(
                [
                  ['KnowledgeDocument', 'doc'],
                  ['KnowledgeEntity', 'entity'],
                  ['DocumentChunk', 'chunk'],
                ] as [NodeTypeKey, string][]
              ).map(([type, cls]) => {
                const cfg = CATEGORY_CONFIG[type];
                const active = nodeTypes[type];
                const count =
                  type === 'KnowledgeDocument'
                    ? stats.docCount
                    : type === 'KnowledgeEntity'
                      ? stats.entityCount
                      : stats.chunkCount;
                return (
                  <button
                    key={type}
                    className={`graph-type-filter ${cls} ${active ? `active type-${cls}` : ''}`}
                    onClick={() => toggleNodeType(type)}
                  >
                    <span className={`graph-type-dot graph-type-dot-${cls}`} style={{ opacity: active ? 1 : 0.4 }} />
                    <div className="graph-type-info">
                      <span className="graph-type-name">{cfg.label}</span>
                      <span className="graph-type-count">{count}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Node Detail */}
          {selectedNode && (
            <div className="graph-sidebar-section">
              <div className="graph-section-title">节点详情</div>
              <div className="node-detail-panel">
                <div className="node-detail-header">
                  <div
                    className="node-detail-icon"
                    style={{
                      background: `${getCategoryConfig(selectedNode.type).color}22`,
                      color: getCategoryConfig(selectedNode.type).color,
                    }}
                  >
                    {getCategoryConfig(selectedNode.type).label.charAt(0)}
                  </div>
                  <span className="node-detail-name">{selectedNode.label}</span>
                </div>
                <div className="node-detail-body">
                  <div className="node-detail-row">
                    <span className="node-detail-label">类型</span>
                    <span
                      className="node-detail-tag"
                      style={{
                        background: `${getCategoryConfig(selectedNode.type).color}18`,
                        color: getCategoryConfig(selectedNode.type).color,
                      }}
                    >
                      {getCategoryConfig(selectedNode.type).label}
                    </span>
                  </div>
                  {/* 查看文档按钮 - 放在顶部显眼位置 */}
                  {selectedNode.documentId ? (
                    <div style={{ marginTop: 12, marginBottom: 4 }}>
                      <Button
                        type="primary"
                        block
                        onClick={() => window.open(`/documents/${selectedNode.documentId}`, '_blank')}
                        style={{
                          height: 40,
                          borderRadius: 10,
                          fontWeight: 600,
                          fontSize: 14,
                        }}
                      >
                        查看文档
                      </Button>
                    </div>
                  ) : (
                    <div style={{
                      marginTop: 12, marginBottom: 4,
                      color: 'rgba(148, 163, 184, 0.6)',
                      fontSize: 11, textAlign: 'center',
                    }}>
                      {selectedNode.type === 'KnowledgeEntity'
                        ? '概念实体不关联特定文档，请点击「文档」或「文档块」节点'
                        : '此节点未关联文档'}
                    </div>
                  )}
                  {selectedNode.description && (
                    <div className="node-detail-row">
                      <span className="node-detail-label">描述</span>
                      <span className="node-detail-value">{selectedNode.description}</span>
                    </div>
                  )}
                  {selectedNode.value != null && (
                    <div className="node-detail-row">
                      <span className="node-detail-label">权重</span>
                      <span className="node-detail-value" style={{ fontWeight: 600 }}>
                        {selectedNode.value}
                      </span>
                    </div>
                  )}
                  {selectedNode.properties?.publishTime != null && (
                    <div className="node-detail-row">
                      <span className="node-detail-label">发布时间</span>
                      <span className="node-detail-value">
                        {formatPropertyValue('publishTime', selectedNode.properties.publishTime)}
                      </span>
                    </div>
                  )}
                  {selectedNode.properties &&
                    Object.entries(selectedNode.properties)
                      .filter(([k, v]) => v != null && String(v).length > 0 && !HIDDEN_PROPERTY_KEYS.has(k) && k !== 'publishTime')
                      .slice(0, 6)
                      .map(([k, v]) => (
                        <div className="node-detail-row" key={k}>
                          <span className="node-detail-label">{PROPERTY_LABEL_MAP[k] || k}</span>
                          <span className="node-detail-value">
                            {formatPropertyValue(k, v)}
                          </span>
                        </div>
                      ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Graph Canvas ────────────────────────────── */}
        <div className="graph-main" ref={containerRef}>
          <div className="graph-canvas-wrapper">
            {hasData && !chartUnavailable ? (
              <div ref={chartRef} className="graph-canvas" />
            ) : showFallbackGraphView ? (
              <div
                style={{
                  height: '100%',
                  overflow: 'auto',
                  padding: '24px 24px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                }}
              >
                <div
                  style={{
                    padding: '16px 18px',
                    borderRadius: 16,
                    background: 'rgba(15, 23, 42, 0.72)',
                    border: '1px solid rgba(148, 163, 184, 0.15)',
                    color: '#cbd5e1',
                  }}
                >
                  当前图谱渲染组件不可用，已切换为默认知识图谱视图，节点和关系数据仍可正常查看。
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 16,
                  }}
                >
                  {visibleNodes.map((node) => {
                    const config = getCategoryConfig(node.type);
                    return (
                      <div
                        key={node.id}
                        style={{
                          padding: 18,
                          borderRadius: 16,
                          background: 'rgba(15, 23, 42, 0.78)',
                          border: `1px solid ${config.color}33`,
                          boxShadow: `0 10px 30px ${config.glow}22`,
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: `${config.color}1a`,
                            color: config.color,
                            fontSize: 12,
                            fontWeight: 600,
                            marginBottom: 12,
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: config.color,
                            }}
                          />
                          {config.label}
                        </div>
                        <div style={{ color: '#f8fafc', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                          {node.label}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7 }}>
                          {node.description || '暂无节点说明'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div
                  style={{
                    padding: '20px 22px',
                    borderRadius: 16,
                    background: 'rgba(15, 23, 42, 0.78)',
                    border: '1px solid rgba(148, 163, 184, 0.15)',
                  }}
                >
                  <div style={{ color: '#f8fafc', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>关系概览</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {visibleLinks.map((link, index) => (
                      <div
                        key={`${link.source}-${link.target}-${index}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '12px 14px',
                          borderRadius: 12,
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(148, 163, 184, 0.08)',
                        }}
                      >
                        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                          {visibleNodeMap.get(String(link.source))?.label || link.source}
                        </span>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: 999,
                            background: 'rgba(99, 102, 241, 0.14)',
                            color: '#c7d2fe',
                            fontSize: 12,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {link.relation}
                        </span>
                        <span style={{ color: '#e2e8f0', fontWeight: 600, textAlign: 'right' }}>
                          {visibleNodeMap.get(String(link.target))?.label || link.target}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              renderGraphEmptyState(searchTerm, () => navigate('/documents'))
            )}

            {/* Floating Controls */}
            <div className="graph-floating-controls">
              {hasData && !chartUnavailable && (
                <>
                  <button className="graph-btn" onClick={handleZoomOut} title="缩小">
                    <ZoomOutOutlined />
                  </button>
                  <span className="zoom-level-display">{zoom}%</span>
                  <button className="graph-btn" onClick={handleZoomIn} title="放大">
                    <ZoomInOutlined />
                  </button>
                  <span className="zoom-divider" />
                  <button className="graph-btn" onClick={handleFit} title="适应画布">
                    <AimOutlined />
                  </button>
                  <button className="graph-btn" onClick={handleReset} title="重置视图">
                    <ReloadOutlined />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraphPage;
