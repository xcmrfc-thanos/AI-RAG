# backend/_archive — 已废弃微服务源码归档

> rh-cha Phase 1 P1-7 + Phase 2 P2-7。**不参与 Maven 构建**，仅供对照与 SVN 历史查阅。

| 目录 | 替代服务 | 迁入模块 |
|------|----------|----------|
| kb-user-auth | kb-core (:8090) | kb-core-iam |
| kb-document | kb-core | kb-core-document |
| kb-foundation | kb-core | kb-core-platform |
| kb-ai | kb-intelligence (:8091) | kb-intelligence-llm |
| kb-search | kb-intelligence | kb-intelligence-retrieval |
| kb-graph | kb-intelligence | kb-intelligence-graph |

## 说明

- 各目录内有 `DEPRECATED.md` 与启动废弃警告
- 恢复构建：将目录移回 `backend/` 并在 `pom.xml` 加回 `<module>`
- 运行验收见 `docs/after/p2-7-legacy-offline.md`
