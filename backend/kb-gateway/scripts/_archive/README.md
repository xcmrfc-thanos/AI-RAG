# 网关切流历史（本地归档，不入库）

P2 并行切流完成后，以下文件仅作历史参考，**勿用于新环境**：

| 文件 | 说明 |
|------|------|
| `switch-core-primary.ps1` | 旧 core 主/旁路路由切换 |
| `switch-intelligence-primary.ps1` | 旧 intelligence 主/旁路路由切换 |
| `GATEWAY_CORE_CUTOVER.md` | Core 切流完成记录 |
| `GATEWAY_INTELLIGENCE_CUTOVER.md` | Intelligence 切流完成记录 |

现行路由以 `kb-gateway` 的 Spring Cloud Gateway 配置为准。
