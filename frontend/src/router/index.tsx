/**
 * router 模块导出入口。
 */
import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouteObject } from 'react-router-dom';
import { MainLayout, AuthLayout, AdminLayout } from '@/components/layout';
import { Spin } from 'antd';
import { tokenStorage } from '@/utils/token-storage';
import type { User } from '@/types';
import { ADMIN_PERMISSION_CODES, PERMISSIONS, hasAdminAccess, hasAllPermissions, hasAnyPermission } from '@/utils/permission';
import { decideProtectedAccess, getAiFeatureGate } from '@/utils/route-guards';
import { useAppStore } from '@/stores';
import FeatureDisabledPanel from '@/components/common/FeatureDisabledPanel';

// 懒加载页面组件
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ActivateAccountPage = lazy(() => import('@/pages/ActivateAccountPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ShareViewerPage = lazy(() => import('@/pages/ShareViewerPage'));
const EmbedChatPage = lazy(() => import('@/pages/EmbedChatPage'));
const EmbedLabPage = lazy(() => import('@/pages/EmbedLabPage'));
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage'));
const DraftsPage = lazy(() => import('@/pages/DraftsPage'));
const CreateDocumentPage = lazy(() => import('@/pages/CreateDocumentPage'));
const DocumentDetailPage = lazy(() => import('@/pages/DocumentDetailPage'));
const DocumentReviewWorkspacePage = lazy(() => import('@/pages/DocumentReviewWorkspacePage'));
const EditDocumentPage = lazy(() => import('@/pages/EditDocumentPage'));
const DocumentVersionsPage = lazy(() => import('@/pages/DocumentVersionsPage'));
const AutoSaveHistoryPage = lazy(() => import('@/pages/AutoSaveHistoryPage'));
const ImportDocumentPage = lazy(() => import('@/pages/ImportDocumentPage'));
const ExportDataPage = lazy(() => import('@/pages/ExportDataPage'));
const FileManagementPage = lazy(() => import('@/pages/FileManagementPage'));
const KnowledgeGraphPage = lazy(() => import('@/pages/KnowledgeGraphPage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const AIAssistantPage = lazy(() => import('@/pages/AIAssistantPage'));
const AIWritingPage = lazy(() => import('@/pages/AIWritingPage'));
const AgentPage = lazy(() => import('@/pages/AgentPage'));
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage'));
const MyDocumentsPage = lazy(() => import('@/pages/MyDocumentsPage'));
const RecentAccessPage = lazy(() => import('@/pages/RecentAccessPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const NotificationCenterPage = lazy(() => import('@/pages/NotificationCenterPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// 管理页面
const AdminCenterPage = lazy(() => import('@/pages/admin/AdminCenterPage'));
const UsersManagementPage = lazy(() => import('@/pages/admin/UsersManagementPage'));
const PermissionsPage = lazy(() => import('@/pages/admin/PermissionsPage'));
const CategoriesPage = lazy(() => import('@/pages/admin/CategoriesPage'));
const TeamsPage = lazy(() => import('@/pages/admin/TeamsPage'));
const ReviewPage = lazy(() => import('@/pages/admin/ReviewPage'));
const StatisticsPage = lazy(() => import('@/pages/admin/StatisticsPage'));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));
const ModelsPage = lazy(() => import('@/pages/admin/ModelsPage'));

// 基础服务管理页面
const SystemConfigPage = lazy(() => import('@/pages/admin/SystemConfigPage'));
const DictionaryManagePage = lazy(() => import('@/pages/admin/DictionaryManagePage'));
const SensitiveWordsPage = lazy(() => import('@/pages/admin/SensitiveWordsPage'));
const OperationLogPage = lazy(() => import('@/pages/admin/OperationLogPage'));
const NotificationTemplatePage = lazy(() => import('@/pages/admin/NotificationTemplatePage'));
const RolesPage = lazy(() => import('@/pages/admin/RolesPage'));
const AgentAdminPage = lazy(() => import('@/pages/admin/AgentAdminPage'));

// 加载中组件
const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" />
  </div>
);

// 路由守卫组件
interface ProtectedRouteProps {
  children: React.ReactElement;
  requireAdmin?: boolean;
  requiredPermissions?: string[];
  requireAllPermissions?: boolean;
}

const getStoredUser = (): User | null => {
  const userInfo = tokenStorage.getUserInfo();
  if (!userInfo) {
    return null;
  }
  return {
    id: userInfo.userId,
    username: userInfo.username,
    nickname: userInfo.nickname,
    email: userInfo.email || '',
    phone: userInfo.phone || undefined,
    avatar: userInfo.avatar,
    role: userInfo.role,
    roles: userInfo.roles || (userInfo.role ? [userInfo.role] : []),
    permissions: userInfo.permissions || [],
    status: userInfo.status ?? 1,
  };
};

const ProtectedRoute = ({
  children,
  requireAdmin = false,
  requiredPermissions = [],
  requireAllPermissions = false,
}: ProtectedRouteProps) => {
  // 优先 Cookie Token，其次 LocalStorage
  const token = tokenStorage.getAccessToken() || localStorage.getItem('token');
  const user = getStoredUser();
  const hasRequired =
    requiredPermissions.length === 0 ||
    (requireAllPermissions
      ? hasAllPermissions(user, requiredPermissions)
      : hasAnyPermission(user, requiredPermissions));

  const decision = decideProtectedAccess({
    hasToken: Boolean(token),
    requireAdmin,
    hasAdminAccess: hasAdminAccess(user),
    requiredPermissions,
    hasRequiredPermissions: hasRequired,
  });

  if (decision.type === 'redirect') {
    return <Navigate to={decision.to} replace />;
  }

  return children;
};

/**
 * AI 助手路由门禁（系统开关关闭时展示关闭态）
 */
const AiAssistantGate: React.FC = () => {
  const enableAI = useAppStore((s) => s.enableAI);
  if (getAiFeatureGate(enableAI) === 'disabled') {
    return <FeatureDisabledPanel title="AI 助手已关闭" />;
  }
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AIAssistantPage />
    </Suspense>
  );
};

/**
 * AI 写作路由门禁（系统开关关闭时展示关闭态）
 */
const AiWritingGate: React.FC = () => {
  const enableAIWriting = useAppStore((s) => s.enableAIWriting);
  if (getAiFeatureGate(enableAIWriting) === 'disabled') {
    return <FeatureDisabledPanel title="AI 写作已关闭" />;
  }
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AIWritingPage />
    </Suspense>
  );
};

/**
 * 嵌入实验室门禁
 */
const EmbedLabGate: React.FC = () => {
  const enableEmbedLab = useAppStore((s) => s.enableEmbedLab);
  if (!enableEmbedLab) {
    return (
      <FeatureDisabledPanel
        title="嵌入实验室已关闭"
        subtitle="管理员可在系统设置中开启「嵌入实验室」后使用自嵌演示。"
      />
    );
  }
  return (
    <Suspense fallback={<LoadingFallback />}>
      <EmbedLabPage />
    </Suspense>
  );
};

// 配置路由（导出供单测检测重复 path）
export const appRoutes: RouteObject[] = [
  {
    path: '/share/:shareId',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <ShareViewerPage />
      </Suspense>
    ),
  },
  {
    path: '/embed/chat',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <EmbedChatPage />
      </Suspense>
    ),
  },
  {
    path: '/login',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <AuthLayout>
          <LoginPage />
        </AuthLayout>
      </Suspense>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <AuthLayout>
          <ForgotPasswordPage />
        </AuthLayout>
      </Suspense>
    ),
  },
  {
    path: '/activate',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <AuthLayout>
          <ActivateAccountPage />
        </AuthLayout>
      </Suspense>
    ),
  },
  {
    path: '/documents/:id',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<LoadingFallback />}>
          <DocumentDetailPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/agents',
    element: (
      <ProtectedRoute
        requiredPermissions={[
          PERMISSIONS.agentWorkflowEdit,
          PERMISSIONS.agentWorkflowPublish,
          PERMISSIONS.systemSettings,
        ]}
      >
        <Suspense fallback={<LoadingFallback />}>
          <AgentAdminPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/review/documents/:documentId',
    element: (
      <ProtectedRoute requireAdmin requiredPermissions={[PERMISSIONS.documentReview]}>
        <Suspense fallback={<LoadingFallback />}>
          <DocumentReviewWorkspacePage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'documents',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <DocumentsPage />
          </Suspense>
        ),
      },
      {
        path: 'drafts',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <DraftsPage />
          </Suspense>
        ),
      },
      {
        path: 'my-documents',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <MyDocumentsPage />
          </Suspense>
        ),
      },
      {
        path: 'documents/import',
        element: (
          <ProtectedRoute requiredPermissions={[PERMISSIONS.documentCreate]}>
            <Suspense fallback={<LoadingFallback />}>
              <ImportDocumentPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'documents/new',
        element: (
          <ProtectedRoute requiredPermissions={[PERMISSIONS.documentCreate]}>
            <Suspense fallback={<LoadingFallback />}>
              <CreateDocumentPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'documents/export',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ExportDataPage />
          </Suspense>
        ),
      },
      {
        path: 'files',
        element: (
          <ProtectedRoute requiredPermissions={[PERMISSIONS.documentList, PERMISSIONS.fileList]}>
            <Suspense fallback={<LoadingFallback />}>
              <FileManagementPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'documents/:id/edit',
        element: (
          <ProtectedRoute requiredPermissions={[PERMISSIONS.documentEdit]}>
            <Suspense fallback={<LoadingFallback />}>
              <EditDocumentPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'documents/:id/versions',
        element: (
          <ProtectedRoute requiredPermissions={[PERMISSIONS.documentVersion]}>
            <Suspense fallback={<LoadingFallback />}>
              <DocumentVersionsPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'documents/:id/autosave-history',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <AutoSaveHistoryPage />
          </Suspense>
        ),
      },
      {
        path: 'search',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <SearchPage />
          </Suspense>
        ),
      },
      {
        path: 'knowledge-graph',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <KnowledgeGraphPage />
          </Suspense>
        ),
      },
      {
        path: 'ai',
        element: <AiAssistantGate />,
      },
      {
        path: 'embed-lab',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <EmbedLabGate />
          </Suspense>
        ),
      },
      {
        path: 'ai-writing',
        element: <AiWritingGate />,
      },
      {
        path: 'agent',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <AgentPage />
          </Suspense>
        ),
      },
      {
        path: 'favorites',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <FavoritesPage />
          </Suspense>
        ),
      },
      {
        path: 'recent-access',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <RecentAccessPage />
          </Suspense>
        ),
      },
      {
        path: 'notifications',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <NotificationCenterPage />
          </Suspense>
        ),
      },
      {
        path: 'profile',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ProfilePage />
          </Suspense>
        ),
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute requireAdmin requiredPermissions={ADMIN_PERMISSION_CODES}>
            <Suspense fallback={<LoadingFallback />}>
              <AdminLayout />
            </Suspense>
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<LoadingFallback />}>
                <AdminCenterPage />
              </Suspense>
            ),
          },
          {
            path: 'users',
            element: (
              <ProtectedRoute requiredPermissions={[PERMISSIONS.systemUser]}>
                <Suspense fallback={<LoadingFallback />}>
                  <UsersManagementPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: 'permissions',
            element: (
              <ProtectedRoute requiredPermissions={[PERMISSIONS.systemPermission]}>
                <Suspense fallback={<LoadingFallback />}>
                  <PermissionsPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: 'categories',
            element: (
              <ProtectedRoute requiredPermissions={[PERMISSIONS.documentCategory, PERMISSIONS.documentCategoryQuery]}>
                <Suspense fallback={<LoadingFallback />}>
                  <CategoriesPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: 'teams',
            element: (
              <ProtectedRoute requiredPermissions={[PERMISSIONS.systemTeam]}>
                <Suspense fallback={<LoadingFallback />}>
                  <TeamsPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: 'review',
            element: (
              <ProtectedRoute requiredPermissions={[PERMISSIONS.documentReview]}>
                <Suspense fallback={<LoadingFallback />}>
                  <ReviewPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: 'statistics',
            element: (
              <ProtectedRoute requiredPermissions={[PERMISSIONS.systemStatistics]}>
                <Suspense fallback={<LoadingFallback />}>
                  <StatisticsPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: 'settings',
            element: (
              <ProtectedRoute requiredPermissions={[PERMISSIONS.systemSettings]}>
                <Suspense fallback={<LoadingFallback />}>
                  <SettingsPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: 'models',
            element: (
              <ProtectedRoute requiredPermissions={[PERMISSIONS.systemSettings]}>
                <Suspense fallback={<LoadingFallback />}>
                  <ModelsPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: 'system-config',
            element: (
              <ProtectedRoute requiredPermissions={[PERMISSIONS.systemSettings]}>
                <Suspense fallback={<LoadingFallback />}>
                  <SystemConfigPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: 'dictionary',
            element: (
              <ProtectedRoute requiredPermissions={[PERMISSIONS.systemSettings]}>
                <Suspense fallback={<LoadingFallback />}>
                  <DictionaryManagePage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: 'sensitive-words',
            element: (
              <ProtectedRoute
                requiredPermissions={[PERMISSIONS.systemSensitiveWord, PERMISSIONS.systemSettings]}
              >
                <Suspense fallback={<LoadingFallback />}>
                  <SensitiveWordsPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: 'operation-logs',
            element: (
              <ProtectedRoute requiredPermissions={[PERMISSIONS.systemSettings]}>
                <Suspense fallback={<LoadingFallback />}>
                  <OperationLogPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: 'notification-templates',
            element: (
              <ProtectedRoute requiredPermissions={[PERMISSIONS.systemSettings]}>
                <Suspense fallback={<LoadingFallback />}>
                  <NotificationTemplatePage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: 'roles',
            element: (
              <ProtectedRoute requiredPermissions={[PERMISSIONS.systemRole]}>
                <Suspense fallback={<LoadingFallback />}>
                  <RolesPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
];

/**
 * 浏览器环境下创建 Router；Node/vitest 导入路由表时跳过（避免 document 缺失）
 */
export const router =
  typeof document !== 'undefined' ? createBrowserRouter(appRoutes) : (undefined as never);

export default router;
