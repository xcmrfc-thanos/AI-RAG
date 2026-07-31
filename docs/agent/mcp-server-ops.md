# 只读 MCP Server 运维与接入（P1）

> 安全边界准源：[mcp-server-boundary-v1.md](./mcp-server-boundary-v1.md)  
> 冒烟：`deploy/scripts/verify-mcp-readonly.ps1`

---

## 1. 开关与端口

| 项 | 值 |
|----|-----|
| 服务 | `kb-mcp`（独立 JVM） |
| 默认端口 | `8095` |
| 总开关 | `mcp.server.enabled`（**默认 false**） |
| Gateway | `POST/GET http://<gw>:18080/api/mcp...`（须 JWT，不进白名单） |

启用步骤：

1. 导入 Nacos：`kb-gateway-dev.yaml` 中 `kb-mcp` 路由（模板见 `backend/nacos/kb-gateway-dev.yaml.template`）
2. 配置 `mcp.server.enabled=true`（Nacos `kb-mcp-dev` 或本地 yml）
3. 启动 `kb-mcp`，确认 Gateway 能发现 `lb://kb-mcp`
4. 静态/联调：`.\deploy\scripts\verify-mcp-readonly.ps1`；联调加 `-Live`，启用后可加 `-EnableProbe`

回滚：将 `mcp.server.enabled` 设回 `false`（或停掉 `kb-mcp`）；路由可保留。

---

## 2. 协议入口

- `POST /api/mcp`：JSON-RPC 2.0 子集（`initialize` / `tools/list` / `tools/call` / `ping`）
- `GET /api/mcp/status`：开关与限流摘要（需登录）
- 响应**不**包成统一 `Result`（Gateway `UnifiedResponseFilter` 已跳过 `/api/mcp`）

工具白名单：`hybrid_search`、`get_document`（经 Gateway 出站，终端用户 Bearer，禁 HMAC 旁路）。

---

## 3. Cursor 接入示例

在 Cursor MCP 配置中使用 **URL + Header**（勿把 JWT 写入长期本地明文配置仓库；用环境变量注入）：

```json
{
  "mcpServers": {
    "ai-rag-kb": {
      "url": "http://127.0.0.1:18080/api/mcp",
      "headers": {
        "Authorization": "Bearer ${env:KB_USER_JWT}"
      }
    }
  }
}
```

说明：

- 须先登录本系统取得**终端用户** JWT（可见范围 = 该用户 ACL）
- 首期为 HTTP JSON-RPC 子集；若 Cursor 仅支持 SSE/stdio，需额外适配层（不在本 P1 范围）
- 峰值约 5 QPS/用户；超限返回 429 / `RATE_LIMITED`

---

## 4. 可选后续（P1.1）

- `check_sensitive` 只读工具：需产品确认后再开专项，不默认实现
