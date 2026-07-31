# Embed Chat 自嵌试点 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Checkbox tracking.

**Goal:** 本系统「嵌入实验室」菜单自嵌 iframe 对话，短期 embed Token + 同源 postMessage。

**Architecture:** Core IAM 签发 `type=embed` 短 JWT；宿主页 mint；iframe 页收 Token 后复用 `/api/ai/chat/stream`；开关默认关。

**Tech Stack:** Java JWT / React / postMessage

---

## 文件地图

| 路径 | 操作 |
|------|------|
| `docs/superpowers/specs/2026-07-31-embed-chat-self-lab-design.md` | Design |
| `backend/.../JwtTokenUtil.java` | 增加 embed 签发 |
| `backend/.../userauth/controller/EmbedTokenController.java` | Create |
| `frontend/src/features/embed/protocol.ts` + test | Create |
| `frontend/src/pages/EmbedLabPage.tsx` | Create 宿主 |
| `frontend/src/pages/EmbedChatPage.tsx` | Create iframe |
| `frontend/src/services/embed.service.ts` | Create |
| router / MainLayout / ai-entry / app.store / Settings | Modify |

---

## Tasks

### Task 1: protocol 纯函数 + 单测
### Task 2: JwtTokenUtil + EmbedTokenController
### Task 3: enableEmbedLab 开关
### Task 4: 前端宿主/iframe/路由/导航
### Task 5: 文档与 waitlist；自检提交
