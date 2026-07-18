# 网关 Intelligence 切流说明（P1-6 / P1-7）

> **P2-7 更新**：旧 kb-ai / kb-search / kb-graph 已归档，网关仅保留 `kb-intelligence` 路由，无需切流脚本。

## 当前路由（P2-7 后）

| 路径 | 目标 |
|------|------|
| `/api/ai/**` | lb://kb-intelligence |
| `/api/search/**` | lb://kb-intelligence |
| `/api/graph/**` | lb://kb-intelligence |

## 历史：并行切流（已废弃）

P1-6 曾使用 `switch-intelligence-primary.ps1`；P2-7 删除旧路由后脚本仅作 SVN 历史参考。
