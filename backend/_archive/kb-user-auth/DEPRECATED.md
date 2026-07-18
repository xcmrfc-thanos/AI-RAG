# kb-user-auth 已废弃（P2-7）

> **替代服务**：`kb-core`（端口 8090，Nacos 服务名 `kb-core`，子模块 `kb-core-iam`）  
> **源码策略**：已迁入 kb-core；本目录归档于 `backend/_archive/kb-user-auth`，**禁止新环境部署**。

## 能力迁移

| 原路径 | 新归属 |
|--------|--------|
| `/api/auth/**` | `kb-core-app` → `kb-core-iam` |
| 登录 / JWT / 用户 / 团队 / 角色 | `kb-core-iam` |

## 下线检查清单（环境就绪后）

- [ ] Nacos 已注册 `kb-core`
- [ ] 网关 `/api/auth/**` 指向 `kb-core`
- [ ] 登录与权限回归通过

## 相关文档

- `docs/after/rh-cha-roadmap.md` — Phase 2 进度
- `docs/after/p2-7-legacy-offline.md` — Core 三服务统一下线步骤
