# 专项 Implementation Plan 模板

> 复制本文件到 `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md` 后填写。
> 对应 design 放在 `docs/superpowers/specs/YYYY-MM-DD-<feature-name>-design.md`。
> 准源路线图：[plans/2026-07-31-absorb-lingclaw-strengths.md](../plans/2026-07-31-absorb-lingclaw-strengths.md)
> P0 基线：[specs/2026-07-31-lingclaw-absorb-p0-baseline.md](../specs/2026-07-31-lingclaw-absorb-p0-baseline.md)

---

# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [一句话说明交付什么]

**Architecture:** [2–3 句：边界、复用现有 API、不改哪些冻结契约]

**Tech Stack:** [关键技术]

**前置条件：**

- [ ] 已满足 P0 基线中对本能力的获准结论
- [ ] 已存在对应 design/spec，且安全边界已评审
- [ ] 未静默修改 Workflow v1 / 入口边界 / Gateway 信任模型

**参考快照（若对照 lingclaw）：**

| 项 | 值 |
|----|-----|
| 上游 URL | |
| commit / tag | |
| 本地路径 | `docs/lingclaw/...` |
| 许可 | GPL-2.0（仅参考，禁止拷贝源码） |

---

## 文件地图

| 路径 | 职责 | 操作 |
|------|------|------|
| `exact/path` | … | Create / Modify / Test |

---

## 统一交付 Gate（完成前全部勾选）

- [ ] 需求证据：使用方、负责人、用例、可量化验收指标
- [ ] 契约证据：spec + 本 plan 已落盘；冻结契约未静默变更
- [ ] 安全证据：401/403、ACL 越权、凭证泄露、重放/重复触发、默认关闭均有负向验证
- [ ] 功能证据：专项单测/集成通过；至少一次受控 E2E 冒烟
- [ ] 回归证据：`deploy/scripts/verify-all.ps1` 与受影响模块测试无新增失败
- [ ] 运维证据：指标、审计、开关、回滚、故障降级已验证
- [ ] 文档证据：`docs/README.md`、安全/接口说明与本地 `readme_plan.md` 已同步

---

## Task 1: [名称]

**Files:**

- Create: `exact/path`
- Modify: `exact/path:line-range`
- Test: `exact/path`

- [ ] **Step 1: Write the failing test**

```text
（贴出最小失败用例代码或断言要点）
```

- [ ] **Step 2: Run test to verify it fails**

Run: `（精确命令）`
Expected: `（精确失败信号）`

- [ ] **Step 3: Write minimal implementation**

```text
（实现要点或代码骨架）
```

- [ ] **Step 4: Run test to verify it passes**

Run: `（精确命令）`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add <paths>
git commit -m "<why-focused message>"
```

---

## Task N: 负向安全用例

- [ ] 401 / 非法 Token
- [ ] 403 / 无 `agent:run` 或 Search ACL FAIL
- [ ] 越权文档不可见
- [ ] 重复触发 / 幂等键
- [ ] 默认关闭开关生效
- [ ] （能力特有）凭证不进浏览器日志 / Origin 伪造 等

---

## 验证与回滚

### 验证命令

| 命令 | 预期 |
|------|------|
| | |

### 回滚步骤

1. 关闭特性开关（写出配置键）
2. 回退提交 / 还原配置模板
3. 确认审计与残留数据清理方式

### 提交边界

- 本专项只改文件地图内路径
- 不携带无关工作区变更（如其他模块未完成改动）
- `readme_plan.md`、`docs/lingclaw/**`、密钥与 `target/` 不入库

---

## 停损条件（来自路线图，按能力勾选）

- [ ] 触发停损时立即停止编码，回写 P0 基线与路线图状态
