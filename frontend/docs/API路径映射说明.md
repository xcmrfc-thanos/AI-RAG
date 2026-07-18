# API路径映射说明

## 概述

本文档说明前端API调用路径经过网关后的实际路径映射关系。

## 网关配置

```yaml
# kb-gateway application.yml
routes:
  - id: kb-document
    uri: lb://kb-document
    predicates:
      - Path=/api/document/**
    filters:
      - StripPrefix=2  # 去掉 /api 和 /document
```

## 路径映射规则

### 前端 → 网关 → 后端

| 前端调用 | 网关处理后 | 后端实际路径 | 后端Controller |
|---------|-----------|------------|--------------|
| `/api/document/categories/tree` | 去掉`/api/document` | `/categories/tree` | `@RequestMapping("/categories")` |
| `/api/document/categories` | 去掉`/api/document` | `/categories` | `@RequestMapping("/categories")` |
| `/api/document/categories/123` | 去掉`/api/document` | `/categories/123` | `@RequestMapping("/categories")` |
| `/api/document/documents` | 去掉`/api/document` | `/documents` | `@RequestMapping("/documents")` |
| `/api/document/documents/123` | 去掉`/api/document` | `/documents/123` | `@RequestMapping("/documents")` |
| `/api/document/documents/123/comments` | 去掉`/api/document` | `/documents/123/comments` | `@RequestMapping("/documents")` |

## 已修改的接口

### category.service.ts

所有分类相关接口已添加 `/document/` 前缀：

```typescript
// ✅ 修改后
getCategoryTree: () => http.get<CategoryTree[]>('/document/categories/tree')
getCategory: (id: string) => http.get<DocumentCategory>(`/document/categories/${id}`)
createCategory: (data) => http.post<DocumentCategory>('/document/categories', data)
updateCategory: (id, data) => http.put<DocumentCategory>(`/document/categories/${id}`, data)
deleteCategory: (id: string) => http.delete(`/document/categories/${id}`)
moveCategory: (params) => http.post('/document/categories/move', params)
batchDeleteCategories: (ids) => http.delete('/document/categories/batch', { data: { ids } })
getCategoryDocuments: (categoryId, params) => http.get(`/document/categories/${categoryId}/documents`, { params })
getCategoryStats: () => http.get<Array<{...}>>('/document/categories/stats')
searchCategories: (keyword) => http.get<DocumentCategory[]>('/document/categories/search', { params: { keyword } })
```

### document.service.ts

文档相关接口已经正确使用 `/document/` 前缀（无需修改）：

```typescript
// ✅ 已正确
getDocuments: (filter) => http.get<DocumentListResponse>('/document/documents', { params: filter })
getDocument: (id) => http.get<Document>(`/document/documents/${id}`)
createDocument: (data) => http.post<Document>('/document/documents', data)
updateDocument: (id, data) => http.put<Document>(`/document/documents/${id}`, data)
// ... 其他文档接口
```

## 网关路由说明

### 当前路由配置

```yaml
# 文档服务路由
- id: kb-document
  uri: lb://kb-document
  predicates:
    - Path=/api/document/**  # 匹配 /api/document 开头的所有请求
  filters:
    - StripPrefix=2  # 去掉前2段路径（/api 和 /document）
```

### 请求流程示例

```
1. 前端请求：GET /api/document/categories/tree

2. 网关接收：
   - 匹配规则：Path=/api/document/** ✅ 匹配成功
   - 提取路径：/api/document/categories/tree
   - StripPrefix=2：去掉 /api 和 /document
   - 转发路径：/categories/tree

3. 后端接收：GET /categories/tree
   - Controller: @RequestMapping("/categories")
   - Method: @GetMapping("/tree")
   - 最终匹配：@RequestMapping("/categories") + @GetMapping("/tree") = /categories/tree ✅
```

## 注意事项

1. **前端必须使用完整路径**：所有文档和分类相关的接口都必须以 `/api/document/` 开头
2. **网关必须配置正确**：确保网关配置了 `/api/document/**` 路由
3. **后端Controller路径**：后端的@RequestMapping是去掉前缀后的路径
4. **StripPrefix数量**：StripPrefix=2 表示去掉前2段路径段

## 测试验证

### 测试分类树接口

```bash
# 前端调用
GET /api/document/categories/tree

# 网关处理
匹配：Path=/api/document/** ✅
StripPrefix=2 → /categories/tree

# 后端接收
GET /categories/tree
Controller: CategoryController @RequestMapping("/categories")
Method: @GetMapping("/tree")
```

### 测试文档列表接口

```bash
# 前端调用
GET /api/document/documents

# 网关处理
匹配：Path=/api/document/** ✅
StripPrefix=2 → /documents

# 后端接收
GET /documents
Controller: DocumentController @RequestMapping("/documents")
Method: @GetMapping
```
