# kb-document 已废弃（P2-7）

> **替代服务**：`kb-core`（端口 8090，Nacos 服务名 `kb-core`，子模块 `kb-core-document`）  
> **源码策略**：已迁入 kb-core；本目录归档于 `backend/_archive/kb-document`，**禁止新环境部署**。

## 能力迁移

| 原路径 | 新归属 |
|--------|--------|
| `/api/document/**` | `kb-core-app` → `kb-core-document` |
| 文档 CRUD / MongoDB / 评论 / 审核 | `kb-core-document` |
| 索引触发 | MQ 事件（`document.indexing.event-enabled=true`） |
| 文件上传 | Feign → `kb-file`（保留） |

## 下线检查清单（环境就绪后）

- [ ] Nacos 已注册 `kb-core`
- [ ] 网关 `/api/document/**` 指向 `kb-core`
- [ ] 文档 CRUD + 上传回归通过

## 相关文档

- `docs/after/rh-cha-roadmap.md` — Phase 2 进度
- `docs/after/p2-7-legacy-offline.md` — Core 三服务统一下线步骤
