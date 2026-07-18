# kb-search 已废弃（P1-7）

> **替代服务**：`kb-intelligence`（端口 8091，Nacos 服务名 `kb-intelligence`）  
> **源码策略**：复制不移动，本模块保留供对照与回滚，**禁止新环境部署**。

## 能力迁移

| 原路径 | 新归属 |
|--------|--------|
| `/api/search/**` | `kb-intelligence-app` → `kb-intelligence-retrieval` |
| ES 文档/块索引 | `kb-intelligence-retrieval` + `intelligence.indexing.*` 配置 |
| Document 生命周期消费 | 合并至 `kb-intelligence` |

## 下线检查清单

- [ ] Nacos 已注册 `kb-intelligence`
- [ ] 网关主路由 order 切流完成
- [ ] `/api/search/**` 回归通过
- [ ] 停止 kb-search 并从 Nacos 注销

## 相关文档

- `backend/kb-gateway/GATEWAY_INTELLIGENCE_CUTOVER.md`
- `docs/after/p1-7-legacy-offline.md`
