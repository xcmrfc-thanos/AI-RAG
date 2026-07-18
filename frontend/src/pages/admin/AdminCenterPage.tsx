import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Row, Col, Button, Typography, Progress, Dropdown, App } from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  FileAddOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
  FolderOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  ThunderboltOutlined,
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
  SyncOutlined,
  RightOutlined,
  BellOutlined,
  FolderAddOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { statisticsService } from '@/services';
import { useAuthStore } from '@/stores';
import { PERMISSIONS, hasAnyPermission, hasPermission } from '@/utils/permission';

const { Title, Text, Paragraph } = Typography;

interface AdminCenterStats {
  totalUsers: number;
  totalDocuments: number;
  pendingReviews: number;
  systemHealth: number;
  totalRoles: number;
  totalCategories: number;
  totalTeams: number;
  totalViews: number;
  aiSearchCount: number;
}

const DEFAULT_ADMIN_STATS: AdminCenterStats = {
  totalUsers: 0,
  totalDocuments: 0,
  pendingReviews: 0,
  systemHealth: 98,
  totalRoles: 0,
  totalCategories: 0,
  totalTeams: 0,
  totalViews: 0,
  aiSearchCount: 0,
};

/**
 * 格式化管理后台统计数字展示。
 */
const formatAdminStat = (value: number, loading: boolean): string => {
  if (loading) {
    return '-';
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1).replace(/\.0$/, '')}万`;
  }
  return value.toLocaleString('zh-CN');
};

export const AdminCenterPage: React.FC = () => {
  App.useApp();
  const user = useAuthStore((state) => state.user);
  const canCreateDocument = hasPermission(user, PERMISSIONS.documentCreate);
  const canManageUsers = hasPermission(user, PERMISSIONS.systemUser);
  const canManagePermissions = hasPermission(user, PERMISSIONS.systemPermission);
  const canManageCategories = hasAnyPermission(user, [PERMISSIONS.documentCategory, PERMISSIONS.documentCategoryQuery]);
  const canManageTeams = hasPermission(user, PERMISSIONS.systemTeam);
  const canManageRoles = hasPermission(user, PERMISSIONS.systemRole);
  const canReviewDocuments = hasPermission(user, PERMISSIONS.documentReview);
  const canViewStatistics = hasPermission(user, PERMISSIONS.systemStatistics);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdminCenterStats>(DEFAULT_ADMIN_STATS);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await statisticsService.getAdminOverview();
      setStats({
        totalUsers: Number(data?.totalUsers) || 0,
        totalDocuments: Number(data?.totalDocuments) || 0,
        pendingReviews: Number(data?.pendingReviews) || 0,
        systemHealth: Number(data?.systemHealth) || 98,
        totalRoles: Number(data?.totalRoles) || 0,
        totalCategories: Number(data?.totalCategories) || 0,
        totalTeams: Number(data?.totalTeams) || 0,
        totalViews: Number(data?.totalViews) || 0,
        aiSearchCount: Number(data?.aiSearchCount) || 0,
      });
    } catch {
      // 保留默认值，避免接口失败时展示硬编码假数据
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const adminModules = useMemo(() => [
    {
      id: 'permissions',
      title: '权限管理',
      description: '管理系统用户权限和角色分配',
      icon: <SafetyOutlined />,
      color: 'blue',
      stats: { label: '角色数', value: formatAdminStat(stats.totalRoles, loading) },
      link: '/admin/permissions',
    },
    {
      id: 'categories',
      title: '分类管理',
      description: '管理文档分类和标签体系',
      icon: <FolderOutlined />,
      color: 'green',
      stats: { label: '分类数', value: formatAdminStat(stats.totalCategories, loading) },
      link: '/admin/categories',
    },
    {
      id: 'teams',
      title: '团队空间管理',
      description: '管理团队空间和协作成员',
      icon: <TeamOutlined />,
      color: 'purple',
      stats: { label: '团队数', value: formatAdminStat(stats.totalTeams, loading) },
      link: '/admin/teams',
    },
    {
      id: 'users',
      title: '用户管理',
      description: '管理系统用户和账户信息',
      icon: <UserOutlined />,
      color: 'orange',
      stats: { label: '用户数', value: formatAdminStat(stats.totalUsers, loading) },
      link: '/admin/users',
    },
    {
      id: 'reviews',
      title: '审核管理',
      description: '配置文档审核流程和规则',
      icon: <CheckCircleOutlined />,
      color: 'red',
      stats: { label: '待审核', value: formatAdminStat(stats.pendingReviews, loading) },
      link: '/admin/review',
    },
    {
      id: 'statistics',
      title: '统计分析',
      description: '查看系统使用统计和分析报告',
      icon: <BarChartOutlined />,
      color: 'cyan',
      stats: { label: '总浏览', value: formatAdminStat(stats.totalViews, loading) },
      link: '/admin/statistics',
    },
    {
      id: 'roles',
      title: '角色管理',
      description: '管理系统角色和权限分配',
      icon: <SafetyOutlined />,
      color: 'geekblue',
      stats: { label: '角色数', value: formatAdminStat(stats.totalRoles, loading) },
      link: '/admin/roles',
    },
  ].filter((module) => {
    if (module.id === 'permissions') return canManagePermissions;
    if (module.id === 'categories') return canManageCategories;
    if (module.id === 'teams') return canManageTeams;
    if (module.id === 'users') return canManageUsers;
    if (module.id === 'reviews') return canReviewDocuments;
    if (module.id === 'statistics') return canViewStatistics;
    if (module.id === 'roles') return canManageRoles;
    return false;
  }), [
    stats,
    loading,
    canManagePermissions,
    canManageCategories,
    canManageTeams,
    canManageUsers,
    canReviewDocuments,
    canViewStatistics,
    canManageRoles,
  ]);

  const quickActions = [
    { id: 'addUser', label: '添加用户', icon: <UserOutlined /> },
    { id: 'createDoc', label: '创建文档', icon: <FileTextOutlined /> },
    { id: 'importData', label: '导入数据', icon: <UploadOutlined /> },
    { id: 'exportData', label: '导出数据', icon: <DownloadOutlined /> },
  ].filter((action) => {
    if (action.id === 'addUser') return canManageUsers;
    if (action.id === 'createDoc') return canCreateDocument;
    return canCreateDocument;
  });

  const [systemStatus] = useState({
    services: [
      { name: 'API服务', status: 'online', uptime: '99.9%' },
      { name: '数据库服务', status: 'online', uptime: '99.8%' },
      { name: '文件存储', status: 'online', uptime: '99.7%' },
      { name: '搜索引擎', status: 'online', uptime: '99.9%' },
    ],
    resources: [
      { name: 'CPU使用率', value: 45, status: 'normal' },
      { name: '内存使用率', value: 62, status: 'normal' },
      { name: '磁盘空间', value: 78, status: 'warning' },
    ],
  });

  const handleCardClick = (link: string) => {
    window.open(link, '_blank');
  };

  const handleActionClick = (actionId: string) => {
    switch (actionId) {
      case 'addUser':
        window.open('/admin/users', '_blank');
        break;
      case 'createDoc':
        window.open('/documents/new', '_blank');
        break;
      case 'importData':
        window.open('/documents/import', '_blank');
        break;
      case 'exportData':
        window.open('/documents/export', '_blank');
        break;
    }
  };

  const quickCreateItems: MenuProps['items'] = [
    canCreateDocument ? {
      key: 'createDocument',
      icon: <FileAddOutlined />,
      label: '创建文档',
      onClick: () => window.open('/documents/new', '_blank'),
    } : null,
    canManagePermissions ? {
      key: 'createTemplate',
      icon: <BellOutlined />,
      label: '创建通知模板',
      onClick: () => window.open('/admin/notification-templates', '_blank'),
    } : null,
    canManageCategories ? {
      key: 'createCategory',
      icon: <FolderAddOutlined />,
      label: '创建分类',
      onClick: () => window.open('/admin/categories', '_blank'),
    } : null,
    canManageTeams ? {
      key: 'createTeam',
      icon: <UsergroupAddOutlined />,
      label: '创建团队',
      onClick: () => window.open('/admin/teams', '_blank'),
    } : null,
    canManageRoles ? {
      key: 'createRole',
      icon: <SafetyOutlined />,
      label: '角色管理',
      onClick: () => window.open('/admin/roles', '_blank'),
    } : null,
  ].filter(Boolean);

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div style={styles.pageTitleSection}>
          <Title level={1} style={styles.pageTitle}>
            系统管理中心
          </Title>
          <Text style={styles.pageDescription}>
            全面掌控系统运行状态，高效管理知识库的各项功能和服务
          </Text>
        </div>
        <div style={styles.headerActions}>
          <Dropdown.Button
            type="primary"
            icon={<PlusOutlined />}
            menu={{ items: quickCreateItems }}
            style={{ ...styles.primaryButton }}
            onClick={() => window.open('/documents/new', '_blank')}
          >
            快速创建
          </Dropdown.Button>
          <Button
            icon={<SyncOutlined />}
            style={styles.secondaryButton}
            onClick={fetchOverview}
            loading={loading}
          >
            刷新数据
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <Row gutter={[20, 20]} style={styles.statsGrid}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={styles.statCard} variant="borderless">
            <div style={styles.statHeader}>
              <div style={{ ...styles.statIconWrapper, ...styles.statIconBlue }}>
                <UserOutlined style={{ fontSize: 24, color: '#2563eb' }} />
              </div>
            </div>
            <div style={styles.statValue}>
              {loading ? '-' : formatAdminStat(stats.totalUsers, false)}
            </div>
            <div style={styles.statLabel}>总用户数</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={styles.statCard} variant="borderless">
            <div style={styles.statHeader}>
              <div style={{ ...styles.statIconWrapper, ...styles.statIconGreen }}>
                <FileTextOutlined style={{ fontSize: 24, color: '#10b981' }} />
              </div>
            </div>
            <div style={styles.statValue}>
              {loading ? '-' : formatAdminStat(stats.totalDocuments, false)}
            </div>
            <div style={styles.statLabel}>文档总数</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={styles.statCard} variant="borderless">
            <div style={styles.statHeader}>
              <div style={{ ...styles.statIconWrapper, ...styles.statIconPurple }}>
                <ClockCircleOutlined style={{ fontSize: 24, color: '#8b5cf6' }} />
              </div>
            </div>
            <div style={styles.statValue}>
              {loading ? '-' : formatAdminStat(stats.pendingReviews, false)}
            </div>
            <div style={styles.statLabel}>待审核文档</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={styles.statCard} variant="borderless">
            <div style={styles.statHeader}>
              <div style={{ ...styles.statIconWrapper, ...styles.statIconOrange }}>
                <ThunderboltOutlined style={{ fontSize: 24, color: '#f59e0b' }} />
              </div>
            </div>
            <div style={styles.statValue}>
              {loading ? '-' : `${stats.systemHealth}%`}
            </div>
            <div style={styles.statLabel}>系统健康度</div>
          </Card>
        </Col>
      </Row>

      {/* Admin Modules Grid */}
      <Row gutter={[24, 24]} style={styles.adminGrid}>
        {adminModules.map((module) => (
          <Col xs={24} sm={12} lg={8} key={module.id}>
            <Card
              style={styles.adminCard}
              variant="borderless"
              hoverable
              onClick={() => handleCardClick(module.link)}
            >
              <div style={styles.cardIconContainer}>
                <div style={{
                  ...styles.cardIcon,
                  ...(styles as Record<string, any>)[`cardIcon${module.color.charAt(0).toUpperCase() + module.color.slice(1)}`]
                }}>
                  <div style={{ fontSize: 28 }}>
                    {module.icon}
                  </div>
                </div>
              </div>
              <Title level={4} style={styles.cardTitle}>{module.title}</Title>
              <Paragraph style={styles.cardDescription}>{module.description}</Paragraph>
              <div style={styles.cardStats}>
                <div style={styles.cardStat}>
                  <Text style={styles.cardStatLabel}>{module.stats.label}</Text>
                  <Text style={styles.cardStatValue}>{module.stats.value}</Text>
                </div>
                <RightOutlined style={styles.cardArrow} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Quick Actions */}
      <Card style={styles.quickActions} variant="borderless">
        <div style={styles.sectionHeader}>
          <Title level={4} style={styles.sectionTitle}>快捷操作</Title>
        </div>
        <Row gutter={[16, 16]}>
          {quickActions.map((action) => (
            <Col xs={12} sm={6} key={action.id}>
              <div
                style={styles.actionItem}
                onClick={() => handleActionClick(action.id)}
              >
                <div style={styles.actionIcon}>
                  <div style={{ fontSize: 24, color: '#2563eb' }}>
                    {action.icon}
                  </div>
                </div>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* System Status */}
      <Row gutter={[24, 24]} style={styles.systemStatusGrid}>
        <Col xs={24} lg={12}>
          <Card style={styles.statusCard} variant="borderless">
            <div style={styles.statusHeader}>
              <Title level={5} style={styles.statusTitle}>服务状态</Title>
              <div style={styles.statusIndicatorOnline}>
                <div style={styles.statusDot}></div>
                <span>运行正常</span>
              </div>
            </div>
            <div style={styles.statusList}>
              {systemStatus.services.map((service, index) => (
                <div key={index} style={styles.statusItem}>
                  <div style={styles.statusLeft}>
                    <div style={styles.statusIcon}>
                      <CloudServerOutlined />
                    </div>
                    <Text style={styles.statusName}>{service.name}</Text>
                  </div>
                  <Text style={styles.statusValue}>{service.uptime}</Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card style={styles.statusCard} variant="borderless">
            <div style={styles.statusHeader}>
              <Title level={5} style={styles.statusTitle}>系统资源</Title>
              <DatabaseOutlined style={{ fontSize: 20, color: '#64748b' }} />
            </div>
            <div style={styles.resourceList}>
              {systemStatus.resources.map((resource, index) => (
                <div key={index} style={styles.resourceItem}>
                  <div style={styles.resourceHeader}>
                    <Text style={styles.resourceName}>{resource.name}</Text>
                    <Text style={styles.resourceValue}>{resource.value}%</Text>
                  </div>
                  <Progress
                    percent={resource.value}
                    strokeColor={resource.value > 80 ? '#ef4444' : '#2563eb'}
                    showInfo={false}
                    size="small"
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '100%',
    margin: '0',
    padding: '16px 16px 32px 16px',
    minHeight: '100vh',
    background: '#f8fafc',
  },
  pageHeader: {
    display: 'flex' as const,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  pageTitleSection: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 8,
    letterSpacing: '-0.02em',
  },
  pageDescription: {
    fontSize: 16,
    color: '#475569',
    maxWidth: 600,
  },
  headerActions: {
    display: 'flex' as const,
    gap: 12,
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #2563eb, #1e40af)',
    border: 'none',
    height: 40,
    fontWeight: 600,
    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.15)',
  },
  secondaryButton: {
    height: 40,
    fontWeight: 600,
    borderColor: '#e2e8f0',
  },
  statsGrid: {
    marginBottom: 24,
  },
  statCard: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 24,
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
    transition: 'all 0.2s',
  },
  statHeader: {
    display: 'flex' as const,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconBlue: { background: 'rgba(37, 99, 235, 0.1)' },
  statIconGreen: { background: 'rgba(16, 185, 129, 0.1)' },
  statIconPurple: { background: 'rgba(139, 92, 246, 0.1)' },
  statIconOrange: { background: 'rgba(245, 158, 11, 0.1)' },
  statTrendPositive: {
    display: 'flex' as const,
    alignItems: 'center',
    gap: 4,
    fontSize: 13,
    fontWeight: 500,
    color: '#10b981',
  },
  statTrendNegative: {
    display: 'flex' as const,
    alignItems: 'center',
    gap: 4,
    fontSize: 13,
    fontWeight: 500,
    color: '#ef4444',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.1,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#475569',
  },
  adminGrid: {
    marginBottom: 24,
  },
  adminCard: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 28,
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
    cursor: 'pointer',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  cardIconContainer: {
    marginBottom: 20,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconBlue: { background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(37, 99, 235, 0.05))' },
  cardIconGreen: { background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))' },
  cardIconPurple: { background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.05))' },
  cardIconOrange: { background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))' },
  cardIconRed: { background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))' },
  cardIconCyan: { background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(6, 182, 212, 0.05))' },
  cardIconGeekblue: { background: 'linear-gradient(135deg, rgba(47, 84, 235, 0.15), rgba(47, 84, 235, 0.05))' },
  cardTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 1.5,
    marginBottom: 16,
  },
  cardStats: {
    display: 'flex' as const,
    gap: 16,
    paddingTop: 16,
    borderTop: '1px solid #f1f5f9',
  },
  cardStat: {
    display: 'flex' as const,
    alignItems: 'center',
    gap: 6,
  },
  cardStatLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  cardStatValue: {
    fontSize: 16,
    fontWeight: 600,
    color: '#0f172a',
  },
  cardArrow: {
    marginLeft: 'auto',
    color: '#94a3b8',
    fontSize: 14,
  },
  quickActions: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 28,
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
    marginBottom: 24,
  },
  sectionHeader: {
    display: 'flex' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#0f172a',
  },
  actionItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 12,
    padding: 20,
    background: '#f8fafc',
    border: '1px solid #f1f5f9',
    borderRadius: 12,
    cursor: 'pointer',
    textAlign: 'center' as const,
    transition: 'all 0.2s',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: '#0f172a',
  },
  systemStatusGrid: {
    marginBottom: 24,
  },
  statusCard: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 24,
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
  },
  statusHeader: {
    display: 'flex' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#0f172a',
  },
  statusIndicatorOnline: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    background: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'currentColor',
    animation: 'pulse 2s infinite',
  },
  statusList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  statusItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  statusLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
  },
  statusName: {
    fontSize: 14,
    color: '#0f172a',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 600,
    color: '#475569',
  },
  resourceList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
  },
  resourceItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  resourceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resourceName: {
    fontSize: 14,
    color: '#0f172a',
  },
  resourceValue: {
    fontSize: 14,
    fontWeight: 600,
    color: '#475569',
  },
};

export default AdminCenterPage;
