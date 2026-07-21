# 知识库系统后端

基于 Spring Boot 3.x + MyBatis Plus 的企业级知识库管理系统后端。

> **运行时架构（准源）**：**4 BC + Gateway + Agent**（`kb-core` / `kb-intelligence` / `kb-file` / `kb-statistics` + `kb-gateway` + `kb-agent`）。  
> **不再部署**独立进程 `kb-ai` / `kb-search` / `kb-graph`（已并入 `kb-intelligence`，源码在 `_archive/`）。  
> **包名历史遗留**：Intelligence 子模块内仍可见 `com.knowledge.base.ai` / `search` / `graph` 包路径，**不等于**三服务部署；新代码优先 `com.knowledge.base.intelligence.*`，旧包冻结不挪。  
> **配置准源**：Nacos DataId（`backend/nacos/*-dev.yaml.template`）；各模块 `application.yml` 仅为同值/启动兜底。

## 项目简介

本项目采用 Maven 多模块架构，提供用户权限、文档管理、检索/RAG、统计与 Agent 工作流能力。

### 技术栈

- **框架**: Spring Boot 3.2.0
- **数据库**: MySQL 8.0+
- **ORM**: MyBatis Plus 3.5.5
- **缓存**: Redis 7.2（可选）
- **API文档**: Knife4j 4.3.0
- **工具库**: Hutool 5.8.24
- **JDK**: Java 21

### 模块说明（4 BC 架构，P2/P3）

| 模块 | 端口 | 说明 |
|-----|------|------|
| kb-gateway | 18080 | API 网关（4 条领域路由） |
| kb-core | 8090 | Core BC：auth + document + foundation |
| kb-intelligence | 8091 | Intelligence BC：ai + search + graph |
| kb-file | 8084 | 文件存储（S3/MinIO） |
| kb-statistics | 8085 | 统计投影（MQ 宽表，无跨库 VIEW） |
| kb-agent | 8092 | Agent 工作流（独立进程，任务 65+） |
| kb-common | - | 公共模块 |
| `_archive/` | - | 已下线旧六服务（不参与构建） |

部署与 Nacos 配置见 [docs/after/p3-2-deployment.md](../docs/after/p3-2-deployment.md)、[nacos/README.md](./nacos/README.md)。

## 快速开始

### 环境要求

- JDK 21+
- Maven 3.8+
- MySQL 8.0+
- Redis 7.2+（可选）

### 数据库初始化

1. 创建数据库并执行初始化脚本：

```bash
# 详见 sql/README.md
cd backend/sql
install_all.bat              # 建库建表
install_dev_data.bat         # 可选：样例数据
```

2. 默认管理员账号：
   - 用户名: admin
   - 密码: admin123

### 修改配置

1. **准源**：编辑并导入 `backend/nacos/*-dev.yaml.template`（`deploy/scripts/import-nacos.ps1`）
2. **兜底**：模块内 `application.yml` 仅在 Nacos 未刷新时提供同值默认（含 `ai.default-model=qwen`）
3. **密钥**：`KB_INTERNAL_HMAC_SECRET` 等环境变量覆盖模板占位，见 `deploy/env.example`

### 启动服务

#### 方式一：IDE 启动（推荐顺序）

1. kb-file (8084)
2. CoreApplication / kb-core-app (8090)
3. IntelligenceApplication / kb-intelligence-app (8091)
4. kb-statistics (8085)
5. GatewayApplication (18080)

#### 方式二：命令行编译

```bash
set JAVA_HOME=D:\Users\environments\Java21
cd backend
mvn compile -pl kb-gateway,kb-core/kb-core-app,kb-intelligence/kb-intelligence-app,kb-file,kb-statistics -am
```

### 访问 API 文档

- **网关入口**: http://localhost:18080
- **Core**: http://localhost:8090/doc.html（若启用 Knife4j）

## 项目结构

```
backend/
├── kb-common/              # 公共模块
├── kb-gateway/             # API 网关 :18080
├── kb-core/                # Core BC :8090
│   ├── kb-core-app/
│   ├── kb-core-iam/
│   ├── kb-core-document/
│   └── kb-core-platform/
├── kb-intelligence/        # Intelligence BC :8091
│   ├── kb-intelligence-app/
│   ├── kb-intelligence-llm/
│   ├── kb-intelligence-retrieval/
│   └── kb-intelligence-graph/
├── kb-file/                # 文件服务 :8084
├── kb-statistics/          # 统计服务 :8085
├── nacos/                  # Nacos 配置模板（P3-2 准源）
├── sql/                    # 数据库脚本
└── _archive/               # 已归档旧服务
```

## 代码规范

本项目严格遵循阿里巴巴Java开发手册规范：

1. **命名规范**
   - 类名使用大驼峰命名法
   - 方法和变量使用小驼峰命名法
   - 常量使用全大写+下划线命名法

2. **注释规范**
   - 所有类必须添加JavaDoc注释
   - 所有公共方法必须添加JavaDoc注释
   - 复杂业务逻辑必须添加行内注释

3. **异常处理**
   - 使用统一的异常处理机制
   - 自定义业务异常
   - 禁止捕获Throwable类

4. **日志规范**
   - 使用Slf4j进行日志记录
   - 合理设置日志级别
   - 生产环境关闭DEBUG日志

## 核心功能

### 用户权限服务

- 用户登录/退出
- 用户管理（CRUD）
- 角色管理
- 权限管理
- Token管理（JWT）

### 文档服务

- 文档管理（CRUD）
- 文档分类
- 文件上传/下载
- 文档搜索
- 文档浏览/点赞/收藏
- 富文本编辑器支持

## 开发指南

### 添加新接口

1. 在DTO中定义请求参数
2. 在VO中定义响应数据
3. 在Service接口中定义业务方法
4. 在ServiceImpl中实现业务逻辑
5. 在Controller中暴露REST接口

### ID生成

所有ID使用雪花算法生成：

```java
Long id = SnowflakeIdGenerator.getInstance().nextId();
```

### 统一响应

所有接口返回统一格式的响应：

```java
return Result.success(data);
return Result.error(ResultCode.PARAM_ERROR);
```

### 异常处理

使用自定义异常：

```java
throw new BusinessException(ResultCode.USER_NOT_EXIST);
throw new UnauthorizedException("Token无效");
```

## 部署说明

### Docker部署

```bash
# 构建镜像
docker build -t knowledge-base-backend:1.0.0 .

# 启动容器
docker-compose up -d
```

### 生产环境配置

生产环境需要修改以下配置：

1. 修改数据库连接信息
2. 配置Redis连接
3. 修改JWT密钥
4. 关闭Swagger文档
5. 配置日志输出路径

## License

Apache License 2.0

## 联系方式

- 项目地址: https://github.com/knowledge-base/backend
- 问题反馈: https://github.com/knowledge-base/backend/issues
- 邮箱: support@knowledge-base.com
