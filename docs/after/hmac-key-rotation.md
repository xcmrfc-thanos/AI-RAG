# 内部 HMAC 密钥轮换手册（任务 56-Ops）

适用密钥：`KB_INTERNAL_HMAC_SECRET`（Core 校验 + Intelligence 签发）。  
轮换窗口：Core 同时接受 `secret` 与 `previous-secret`（`KB_INTERNAL_HMAC_SECRET_PREVIOUS`）。

## 1. 前置

- UTF-8 长度 ≥ 32 字节
- Core / Intelligence（及任何签发方）最终密钥一致
- 已备份当前密钥到安全凭据库（勿写入 Git）
- 准备好冒烟：`deploy/scripts/verify-auth-ai.ps1`

## 2. 步骤（新旧短暂并行）

### Step A — 生成新密钥

```powershell
# 示例：32+ 字符随机串
-join ((48..57 + 65..90 + 97..122) | Get-Random -Count 40 | ForEach-Object { [char]$_ })
```

记为 `NEW_SECRET`。当前生产密钥记为 `OLD_SECRET`。

### Step B — Core 进入并行窗口

1. 设置环境变量（或 Nacos）：
   - `KB_INTERNAL_HMAC_SECRET=NEW_SECRET`（Core 主密钥先切到新）
   - `KB_INTERNAL_HMAC_SECRET_PREVIOUS=OLD_SECRET`
2. **先滚动重启 kb-core**（仍接受旧签名，因 previous 保留）
3. 此时 Intelligence 若仍用 `OLD_SECRET` 签发 → 校验通过（previous）

### Step C — 签发方切换到新密钥

1. Intelligence（及 Nacos `kb-intelligence-dev` / 环境）将 `KB_INTERNAL_HMAC_SECRET=NEW_SECRET`
2. 滚动重启 kb-intelligence
3. 执行：

```powershell
cd deploy\scripts
.\verify-auth-ai.ps1
```

确认：`core good-hmac` PASS；`core bad-hmac` 仍 FAIL。

### Step D — 撤销旧密钥

1. 清空 `KB_INTERNAL_HMAC_SECRET_PREVIOUS`（空字符串）
2. 重启 kb-core
3. 用旧密钥手工签名请求应 **401**
4. 再次跑 `verify-auth-ai.ps1`

## 3. 回滚

若 Step C 后出现大面积内部 401：

1. 签发方暂时改回 `OLD_SECRET` 并重启 Intelligence  
2. 或将 Core `secret` 设回 `OLD_SECRET`，`previous-secret` 设为 `NEW_SECRET`  
3. 排查时钟偏差 / 路径是否含 query / Nacos 是否未刷新

## 4. 记录模板

| 字段 | 填写 |
|------|------|
| 日期 | |
| 操作人 | |
| 环境 | dev / staging / prod |
| 并行窗口起止 | |
| verify-auth-ai 结果 | |
| previous 已清空 | 是 / 否 |
