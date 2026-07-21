# kb-core — Core BC

> 合并 **kb-user-auth** + **kb-document** + **kb-foundation**（rh-cha Phase 2）

## 模块结构

```text
backend/kb-core/
├── kb-core-app/        # 启动模块，:8090，Nacos kb-core
├── kb-core-iam/        # P2-3 ← kb-user-auth
├── kb-core-document/   # P2-4 ← kb-document
└── kb-core-platform/   # P2-2 ← kb-foundation
```

## 编译

```bash
set JAVA_HOME=D:\Users\environments\Java21
cd backend
mvn compile -pl kb-core/kb-core-app -am
```

## 数据源

三 MySQL 库均使用 **Druid**（`type: com.alibaba.druid.pool.DruidDataSource`）：

| 数据源 | 库 | 池参数来源 |
|--------|-----|-----------|
| platform | kb_foundation | 原 kb-foundation |
| iam | kb_user | 原 kb-user-auth |
| document | kb_document | 原 kb-document（max-active=100） |

Druid 监控：`/druid/*`（admin/admin）

## 进度

| 步骤 | 状态 |
|------|------|
| P2-1 骨架 | ✅ |
| P2-2 platform | ✅ |
| P2-3 iam | ✅（59 类，双库 kb_foundation + kb_user） |
| P2-4 document | ✅（136 类 + 8 Mapper；三数据源 + DocumentUserLocalClient） |
| P2-5 file Feign | ✅（FileServiceFeignClient + multipart + fallback） |
| P2-6 网关切流 | ✅（历史脚本见 `kb-gateway/scripts/_archive/`） |
| P2-7 废弃旧服务 | ✅（`_archive/` + 移出 pom） |

Phase 2 已完成。

## 相关文档

- `docs/after/service-merge-plan.md` §3.2
- `docs/after/rh-cha-roadmap.md`
