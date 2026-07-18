# 网关 Core 切流说明（P2-6 / P2-7）

> **P2-7 更新**：旧 kb-user-auth / kb-document / kb-foundation 已归档，网关仅保留 `kb-core` 路由，无需切流脚本。

## 当前路由（P2-7 后）

| 路径 | 目标 |
|------|------|
| `/api/auth/**` | lb://kb-core |
| `/api/document/**` | lb://kb-core |
| `/api/notifications/**` 等 | lb://kb-core |
| `/ws/**` | lb:ws://kb-core |

## 历史：并行切流（已废弃）

P2-6 曾使用 `switch-core-primary.ps1` 在旧路由与 `kb-core-*-main` 间切换；P2-7 删除旧路由后脚本仅作 SVN 历史参考。

