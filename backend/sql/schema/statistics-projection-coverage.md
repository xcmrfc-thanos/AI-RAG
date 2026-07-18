# 统计投影覆盖清单（任务 34）

> 对照 `statistics-sql-audit.md` 中 stat_* 查询数据源，确认 Core 域写路径已覆盖。

| 投影表 | 写入路径 | 触发场景 |
|--------|----------|----------|
| `stat_document` | `CoreStatisticsProjectionListener` + kb-core `syncDocumentProjection` | 创建/更新/发布/审核/删除文档 |
| `stat_user` | `CoreStatisticsProjectionListener` + `UserServiceImpl.syncUserProjection` | 注册/创建/更新用户；删除发 `USER_DELETE` |
| `stat_comment` | `CoreStatisticsProjectionListener` + `CommentServiceImpl` | 评论创建/删除 |
| `stat_category` | `CoreStatisticsProjectionListener` + `CategoryServiceImpl` | 分类创建/更新/软删 |
| `stat_role` | `CoreStatisticsProjectionListener` + `RoleServiceImpl` | 角色创建/更新/删除 |
| `stat_team` | `CoreStatisticsProjectionListener` + `TeamServiceImpl` | 团队创建/更新/删除 |
| `stat_operation_log` | `OperationLogStatisticsListener` | 操作日志 MQ |
| `stat_ai_*` | `AiStatisticsMQListener` | Intelligence AI 事件 |

## 任务 34 补全项（2026-07-11）

| 缺口 | 修复 |
|------|------|
| 用户更新未投影 | `UserServiceImpl.updateUser` 成功后 `syncUserProjection` |
| 用户删除未投影 | `UserServiceImpl.deleteUser` 成功后 `publishUserDelete` |
| 文档直接发布未投影 | `DocumentServiceImpl.directPublishDocument` 补投影 |
| 审核流状态变更未投影 | `DocumentReviewServiceImpl` 提交/通过/驳回/直接发布均 `syncDocumentProjection` |
| 评论 upsert 字段不全 | `CoreStatisticsProjectionListener.upsertComment` 更新 user_id/document_id |

## 任务 43 补全项（2026-07-11）

| 缺口 | 修复 |
|------|------|
| Admin 概览 `totalRoles`/`totalTeams` 恒为 0 | 新增 `stat_role`/`stat_team` 投影表与 MQ 事件 |
| IAM 写路径未发投影 | `RoleServiceImpl` / `TeamServiceImpl` 创建/更新/删除后 publish |
| 统计读路径未计数 | `StatisticsServiceImpl.countActiveRoles/Teams` 写入 `getAdminOverview` |

## 联调冒烟（任务 46）

| 资源 | 路径 |
|------|------|
| 冒烟脚本 | `deploy/scripts/verify-integration.ps1` |
| 一键串联 | `deploy/scripts/verify-all.ps1` |
