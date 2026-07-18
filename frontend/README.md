# 企业知识库前端

基于 **Vite 8 + React 19 + TypeScript + Ant Design 6** 的企业知识库管理系统。

## 技术栈

| 类别 | 选型 |
|------|------|
| 构建 | Vite 8 |
| 框架 | React 19 |
| UI | Ant Design 6 |
| 路由 | React Router 7 |
| 状态 | Zustand 5 |
| HTTP | Axios |

## 开发

```bash
npm install
npm run dev      # http://127.0.0.1:3002
npm run build
npm run lint
```

网关代理：`/api` → `http://127.0.0.1:8080`（见 [docs/archive/PROXY-EXPLANATION.md](docs/archive/PROXY-EXPLANATION.md)）。

## 文档

| 文档 | 说明 |
|------|------|
| [docs/README.md](docs/README.md) | 前端文档索引 |
| [docs/API路径映射说明.md](docs/API路径映射说明.md) | API 路径映射 |
| [docs/archive/](docs/archive/) | 历史开发笔记（归档） |

## 主要模块

```
src/
├── pages/          # 业务页面（文档、搜索、RAG、图谱、Admin）
├── components/     # 通用与布局组件
├── services/       # API 封装
├── stores/         # Zustand 状态
├── router/         # 路由
└── utils/          # 工具（含 file-url 网关代理）
```

## 环境变量

```env
VITE_API_BASE_URL=http://127.0.0.1:8080/api
```

