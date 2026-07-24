/**
 * 前端 API 服务：graph.service。
 */
import { http } from './request';
import { GraphNode, GraphEdge, GraphData, GraphPathResult } from '@/types';

/**
 * 知识图谱Service
 */
export const graphService = {
  /**
   * 获取图谱数据
   */
  getGraphData: async (): Promise<GraphData> => {
    return http.get('/graph/data');
  },

  /**
   * 搜索节点
   */
  searchNodes: async (keyword: string): Promise<GraphNode[]> => {
    return http.get('/graph/search', { params: { keyword } });
  },

  /**
   * 获取节点详情
   */
  getNodeDetail: async (nodeId: string): Promise<GraphNode> => {
    return http.get(`/graph/node/${nodeId}`);
  },

  /**
   * 获取节点的邻居节点
   */
  getNodeNeighbors: async (nodeId: string, depth: number = 1): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> => {
    return http.get(`/graph/node/${nodeId}/neighbors`, { params: { depth } });
  },

  /**
   * 获取节点关系
   */
  getNodeRelationships: async (nodeId: string): Promise<GraphEdge[]> => {
    return http.get(`/graph/node/${nodeId}/relations`);
  },

  /**
   * 路径分析
   */
  findPath: async (startNodeId: string, endNodeId: string): Promise<GraphPathResult> => {
    return http.get('/graph/path', { params: { sourceId: startNodeId, targetId: endNodeId } });
  },

  /**
   * 获取社区检测结果
   */
  detectCommunities: async (): Promise<{ id: string; nodes: string[] }[]> => {
    return http.get('/graph/community');
  },

  /**
   * 重建知识图谱（触发 KAG 构建所有已发布文档的图谱）
   */
  rebuildGraph: async (): Promise<string> => {
    return http.post('/document/documents/graph/rebuild');
  },

  /**
   * 清理知识图谱脏节点
   */
  cleanupGraph: async (): Promise<string> => {
    return http.post('/document/documents/graph/cleanup');
  },
};
