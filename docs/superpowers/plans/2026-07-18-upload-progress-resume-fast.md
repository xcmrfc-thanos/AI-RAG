# 真进度 + 分片/续传/秒传 最小实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让「文件管理」与「导入文档」具备真实上传进度；大文件走客户端 hash 秒传 + 分片断点续传；小文件保持单次 multipart。

**Architecture:** 复用 `kb-file` 已有 `FileService.initResumableUpload/uploadChunk/getUploadedChunks/mergeChunks` 与 S3/RustFS multipart；先暴露 HTTP + 修会话元数据，再做前端统一上传器。秒传在**上传前**用客户端 hash 查询，避免整文件先打到服务器。真进度用 axios `onUploadProgress`（已有 `file.service.ts` 范例）。

**Tech Stack:** Java 21 / Spring Boot 3、kb-file + Gateway `/api/file/**`、React + axios、可选 `spark-md5`（或 Web Crypto SHA-256，需与后端 hash 算法对齐）

**非目标（YAGNI）：** 多实例会话共享（Redis）、并行多分片、导入页解析与分片合并的深度耦合（导入页第二批再接）、完整跨浏览器持久化断点 UI。

**已知现状：**
- 导入/文件管理进度为 `setInterval` 假进度；`postForm` 无进度回调
- `frontend/src/services/file.service.ts` 已对 `/file/files/upload` 接了真进度，但业务页未用
- `kb-file` 服务层有分片/秒传逻辑，**Controller 未暴露分片 API**；秒传是**服务端收完再 hash**，不是客户端先查
- 分片会话存在 **JVM 内存**（`S3FileStorage.uploadSessions`），进程重启会丢；MVP 接受并写清
- `mergeChunks` 当前用 `sessionId.substring(0,8)` 伪 hash、文件名也不可靠，**必须先修**

**阈值约定（MVP）：**
| 项 | 值 |
|----|-----|
| 分片门槛 | `≥ 20MB`（可配置 `file.upload.chunk.threshold`） |
| 分片大小 | `5MB`（S3 multipart 非末片最小约 5MB） |
| 整文件上限 | 维持现有 `file.upload.max.size`（默认约 20MB～100MB） |
| 分片路径上限 | 新增 `file.upload.resumable.max.size`（建议默认 `524288000` = 500MB） |

---

## 文件与职责

| 路径 | 职责 |
|------|------|
| `backend/kb-file/.../FileController.java` | 暴露 check-hash / init / chunk / status / merge |
| `backend/kb-file/.../FileServiceImpl.java` | 修 merge 元数据；checkByHash；会话保存 fileName/hash/size |
| `backend/kb-file/.../S3FileStorage.java` | UploadSession 增加 fileHash/fileName/mimeType |
| `backend/kb-file/.../dto/*` | Init/Merge/CheckHash DTO |
| `frontend/src/services/request.ts` | `postForm` 支持 `onUploadProgress` |
| `frontend/src/services/resumable-upload.ts` | 统一：hash → 秒传 / 整传 / 分片 |
| `frontend/src/services/file-management.service.ts` | 改走统一上传器 |
| `frontend/src/pages/FileManagementPage.tsx` | 去掉假进度，接真进度 |
| `frontend/src/pages/ImportDocumentPage.tsx` | 先接真进度；大文件分片后第二任务再接 parse |
| `docs/eval` 或 `deploy/scripts` | 可选冒烟：小文件进度、秒传、分片合并 |

---

### Task 1: 扩展 `postForm` 支持真实进度

**Files:**
- Modify: `frontend/src/services/request.ts`
- Modify: `frontend/src/services/file-management.service.ts`
- Modify: `frontend/src/pages/FileManagementPage.tsx`
- Modify: `frontend/src/pages/ImportDocumentPage.tsx`

- [ ] **Step 1: 扩展 postForm 签名**

```typescript
postForm: <T = DefaultResponseData>(
  url: string,
  data: FormData,
  config?: CustomAxiosRequestConfig
): Promise<T> => {
  return request.post(url, data, {
    ...config,
    headers: {
      'Content-Type': undefined,
      ...(config?.headers || {}),
    },
  });
},
```

- [ ] **Step 2: 文件管理上传传入 onUploadProgress**

在 `file-management.service.ts`：

```typescript
uploadFile: async (
  file: File,
  isPublic = false,
  onProgress?: (percent: number) => void
) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('isPublic', String(isPublic));
  return (http as any).postForm('/document/file-management/upload', formData, {
    onUploadProgress: (e: ProgressEvent) => {
      if (!onProgress || !e.total) return;
      onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
},
```

- [ ] **Step 3: FileManagementPage 去掉 setInterval，改用回调**

删除「模拟上传进度」的 `setInterval`；调用 `uploadFile(file, false, setUploadProgress)`；失败时 `setUploadProgress(0)`。

- [ ] **Step 4: ImportDocumentPage 同样去掉假进度**

`documentService.uploadAndParseDocument` 增加可选 `onProgress`，经 `postForm` 透传；列表项 `progress` 用回调更新。

- [ ] **Step 5: 手工验证**

上传 5～15MB 文件：进度应随网络爬升，而非每 200ms +10%。

- [ ] **Step 6: Commit**

```bash
cd frontend
git add src/services/request.ts src/services/file-management.service.ts src/services/document.service.ts src/pages/FileManagementPage.tsx src/pages/ImportDocumentPage.tsx
git commit -m "feat(upload): 文件管理/导入使用真实 onUploadProgress"
```

---

### Task 2: 暴露秒传查询 API（客户端先 hash）

**Files:**
- Create: `backend/kb-file/.../dto/FileHashCheckDTO.java`（可选，也可用 query）
- Modify: `backend/kb-file/.../FileController.java`
- Modify: `backend/kb-file/.../FileService.java` + `FileServiceImpl.java`
- Test: `backend/kb-file/src/test/java/.../FileHashCheckTest.java`（可用 Mockito）

- [ ] **Step 1: Service 增加按 hash 查询**

```java
/**
 * 按文件哈希查询可秒传文件（status=1）
 */
Optional<FileInfoVO> findByHash(String fileHash);
```

实现：`fileMapper.selectOne(eq FileHash + status=1)` → `convertToVO`。

- [ ] **Step 2: Controller**

```java
@GetMapping("/upload/check-hash")
@Operation(summary = "秒传预检")
public Result<FileInfoVO> checkHash(@RequestParam("fileHash") String fileHash) {
    return fileService.findByHash(fileHash)
            .map(Result::success)
            .orElseGet(() -> Result.success(null)); // 或专用 { exists:false }
}
```

网关已有 `/api/file/**` → 前端路径：`GET /file/files/upload/check-hash?fileHash=...`

- [ ] **Step 3: 确认 hash 算法与前端一致**

读取 `FileServiceImpl.calculateFileHash`：若为 MD5，前端用 spark-md5；若为 SHA-256，前端用 `crypto.subtle.digest`。**计划锁定：与现网实现一致，禁止混用。**

- [ ] **Step 4: 单测**

给定已存在 hash → 返回 VO；不存在 → data null。

- [ ] **Step 5: Commit**

```bash
cd backend
git add kb-file
git commit -m "feat(file): 暴露 check-hash 秒传预检接口"
```

---

### Task 3: 修分片会话元数据 + 暴露分片 API

**Files:**
- Modify: `backend/kb-file/.../storage/S3FileStorage.java`（UploadSession 字段）
- Modify: `backend/kb-file/.../FileServiceImpl.java`（init/merge）
- Modify: `backend/kb-file/.../FileController.java`
- Create: `backend/kb-file/.../dto/ResumableInitDTO.java`、`ResumableMergeDTO.java`

- [ ] **Step 1: UploadSession 增加字段**

```java
private String fileHash;
private String fileName;
private String contentType;
```

`initResumableUpload` 签名扩展为传入并写入 session（或新增 overload，避免破坏存储接口时在 FileServiceImpl 旁路 Map 存 meta——**优先扩展 session**）。

- [ ] **Step 2: 修正 mergeChunks**

禁止 `sessionId.substring(0,8)`。从 session 读取 `fileHash/fileName/relativePath/totalSize`，再 `buildFileInfoForResumable` + insert。

- [ ] **Step 3: Controller 四端点**

```http
POST /files/upload/resumable/init
Body: { fileHash, fileName, totalSize, chunkCount, contentType? }
→ { sessionId }

PUT  /files/upload/resumable/{sessionId}/chunks/{chunkIndex}
multipart: chunk

GET  /files/upload/resumable/{sessionId}/chunks
→ { uploaded: int[] }

POST /files/upload/resumable/{sessionId}/merge
Body: FileUploadDTO 扩展字段（fileName/fileHash 可冗余校验）
→ FileInfoVO
```

- [ ] **Step 4: 分片路径大小校验**

`init` 时用 `file.upload.resumable.max.size`；单 chunk 校验约等于配置分片大小 ± 容差。

- [ ] **Step 5: 文档注释**

Controller 与 README 注明：**会话存内存，重启/多实例不可续传**（后续可 Redis）。

- [ ] **Step 6: Commit**

```bash
cd backend
git add kb-file
git commit -m "feat(file): 暴露分片续传 API 并修复 merge 元数据"
```

---

### Task 4: 前端统一上传器（秒传 + 整传 + 分片）

**Files:**
- Create: `frontend/src/services/resumable-upload.ts`
- Create: `frontend/src/utils/file-hash.ts`
- Modify: `frontend/src/services/file-management.service.ts`
- Modify: `frontend/src/pages/FileManagementPage.tsx`
- Optional dep: `spark-md5`（仅当后端为 MD5）

- [ ] **Step 1: file-hash 工具**

```typescript
/** 计算与后端一致的文件哈希（分片读，避免大文件撑爆内存） */
export async function computeFileHash(file: File): Promise<string>;
```

- [ ] **Step 2: resumable-upload 核心流程**

```typescript
export type UploadProgress = { phase: 'hash'|'check'|'upload'|'merge'; percent: number };

export async function uploadWithResume(file: File, opts: {
  thresholdBytes?: number; // default 20MB
  chunkSize?: number;      // default 5MB
  onProgress?: (p: UploadProgress) => void;
  isPublic?: boolean;
}): Promise<FileUploadResponse> {
  // 1) hash
  // 2) GET check-hash → 命中则 return（秒传，percent=100）
  // 3) size < threshold → 整文件 upload + onUploadProgress
  // 4) else init → 对缺失 chunk 循环 PUT（每片可带片级进度）→ merge
}
```

续传：`getUploadedChunks` 后跳过已有 index。

- [ ] **Step 3: 文件管理页接入**

`FileManagementPage` 调用 `uploadWithResume`；Progress 显示 `phase` 文案（计算指纹 / 秒传命中 / 上传中 / 合并中）。

- [ ] **Step 4: 手工用例**

| 用例 | 期望 |
|------|------|
| 同一文件传两次 | 第二次秒传（无长时上传） |
| >20MB 文件 | 走分片；刷新后同 session 仅当进程未重启可续 |
| <20MB | 真进度整传 |
| 上传中杀 kb-file | 会话丢失，需重新 init（可接受） |

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/services/resumable-upload.ts src/utils/file-hash.ts src/services/file-management.service.ts src/pages/FileManagementPage.tsx package.json package-lock.json
git commit -m "feat(upload): 文件管理支持秒传与分片断点续传"
```

---

### Task 5: 导入文档页接入（最小）

**Files:**
- Modify: `frontend/src/pages/ImportDocumentPage.tsx`
- Modify: `frontend/src/services/document.service.ts`
- Modify: `backend/kb-core/.../DocumentController.java`（若需「已有 fileId 再解析」）

- [ ] **Step 1: 判定是否已有「按 fileId 创建草稿」API**

若无：MVP **导入页仅启用 Task1 真进度**；大文件提示「请先到文件管理上传，或缩小文件」。  
若有 / 可补最小接口：`POST /documents/from-file/{fileId}` → 解析并建草稿。

- [ ] **Step 2: 推荐最小补接口（可选但建议）**

Core：`uploadAndCreateDocument` 旁路增加 `createFromStoredFile(Long fileId)`：Feign 拉文件流或元数据+下载 → 现有解析逻辑。

- [ ] **Step 3: 导入页**

`< threshold`：真进度 + parse；`≥ threshold`：`uploadWithResume` → `createFromStoredFile`。

- [ ] **Step 4: Commit**

```bash
# backend + frontend 分别提交
git commit -m "feat(upload): 导入文档支持大文件分片后再解析"
```

---

### Task 6: 配置、网关与文档收口

**Files:**
- Modify: `backend/nacos/kb-file-dev.yaml.template`
- Modify: `backend/sql` 或系统配置种子（threshold / resumable max）
- Modify: `readme_plan.md`、`docs/README.md`（一行索引）
- Optional: `deploy/scripts/verify-upload-resume.ps1`

- [ ] **Step 1: Nacos 模板增加**

```yaml
file:
  storage:
    upload:
      enable-fast-upload: true
      enable-resumable-upload: true
      chunk-threshold: 20971520
      resumable-max-size: 524288000
      chunk-size: 5242880
```

- [ ] **Step 2: 冒烟脚本（可选）**

登录 → check-hash 空 → 上传小文件 → check-hash 命中 →（可选）分片 init/chunk/merge。

- [ ] **Step 3: readme_plan 记一条**

【本次功能】真进度；秒传预检；分片 API；文件管理接入。  
【差距】会话内存；导入大文件依赖 Task5；无多实例续传。

- [ ] **Step 4: Commit + 根仓同步子模块指针**

---

## 实施顺序与验收

```
Task1 真进度（立刻可感）
  → Task2 秒传预检
  → Task3 分片 API + 修 merge
  → Task4 文件管理统一上传器
  → Task5 导入页（可拆 PR）
  → Task6 配置/文档
```

**验收清单：**
- [ ] 假 `setInterval` 进度从文件管理/导入主路径消失
- [ ] 同文件二次上传秒传（网络无明显整文件 PUT）
- [ ] ≥20MB 走分片；缺片可续（同进程）
- [ ] merge 后文件管理列表可见且可下载
- [ ] 超 resumable-max 明确报错

---

## 风险与对策

| 风险 | 对策 |
|------|------|
| 内存会话丢 | MVP 文档声明；后续 Redis |
| hash 算法不一致 | Task2 先对齐再写前端 |
| merge 元数据错误 | Task3 阻塞项 |
| 导入解析吃大文件内存 | Task5 流式/临时文件；或限制解析格式 |
| Core 与 File 双上限不一致 | 统一读配置；分片走更高上限 |

---

## Spec 覆盖自检

| 需求 | 任务 |
|------|------|
| 真进度 | Task1 |
| 秒传（客户端先查） | Task2 + Task4 |
| 分片上传 | Task3 + Task4 |
| 断点续传 | Task3 status + Task4 skip uploaded |
| 大文件门槛 | Task4 threshold + Task6 配置 |
| 导入文档 | Task5（可延后） |
