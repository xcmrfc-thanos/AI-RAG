# kb-ai 已废弃（P1-7）

> **替代服务**：`kb-intelligence`（端口 8091，Nacos 服务名 `kb-intelligence`）  
> **源码策略**：复制不移动，本模块保留供对照与回滚，**禁止新环境部署**。

## 能力迁移

| 原路径 | 新归属 |
|--------|--------|
| `/api/ai/**` | `kb-intelligence-app` → `kb-intelligence-llm` |
| RAG / 对话 / 向量索引 | `kb-intelligence-llm` |
| Document 生命周期消费 | `kb-intelligence-llm`（与 search/graph 合并后统一消费） |

## 下线检查清单

- [ ] Nacos 已注册 `kb-intelligence`
- [ ] 网关主路由 `kb-intelligence-*-main` order 改为 `-1`（见 `kb-gateway/GATEWAY_INTELLIGENCE_CUTOVER.md`）
- [ ] `/api/ai/**` 回归通过
- [ ] 停止 kb-ai 进程并从 Nacos 注销
- [ ] （可选）注释 `kb-gateway` 中 `kb-ai` 路由

## 相关文档

- `docs/after/rh-cha-roadmap.md` — Phase 1 进度
- `docs/after/p1-7-legacy-offline.md` — 三服务统一下线步骤
