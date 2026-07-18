# kb-foundation 已废弃（P2-7）

> **替代服务**：`kb-core`（端口 8090，Nacos 服务名 `kb-core`，子模块 `kb-core-platform`）  
> **源码策略**：已迁入 kb-core；本目录归档于 `backend/_archive/kb-foundation`，**禁止新环境部署**。

## 能力迁移

| 原路径 | 新归属 |
|--------|--------|
| `/api/notifications/**` | `kb-core-app` → `kb-core-platform` |
| `/api/config/**` | `kb-core-platform` |
| `/api/logs/**` | `kb-core-platform` |
| `/api/dicts/**` | `kb-core-platform` |
| `/ws/**` WebSocket | `kb-core-app` |

## 下线检查清单（环境就绪后）

- [ ] Nacos 已注册 `kb-core`
- [ ] 网关 foundation 路径与 `/ws/**` 指向 `kb-core`
- [ ] 通知 / 配置 / WebSocket 回归通过

## 相关文档

- `docs/after/rh-cha-roadmap.md` — Phase 2 进度
- `docs/after/p2-7-legacy-offline.md` — Core 三服务统一下线步骤
