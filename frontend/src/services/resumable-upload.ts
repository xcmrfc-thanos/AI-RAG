import type { AxiosProgressEvent } from 'axios';
import { http } from './request';
import { computeFileHash } from '@/utils/file-hash';

/** 默认分片门槛：≥ 20MB 走断点续传 */
export const DEFAULT_UPLOAD_THRESHOLD_BYTES = 20 * 1024 * 1024;

/** 默认分片大小：5MB（对齐 S3 multipart 非末片下限） */
export const DEFAULT_CHUNK_SIZE_BYTES = 5 * 1024 * 1024;

/** 分片路径建议上限：500MB（与计划 resumable-max-size 对齐） */
export const DEFAULT_RESUMABLE_MAX_BYTES = 500 * 1024 * 1024;

/** 本地缓存续传 sessionId 的前缀（按 fileHash） */
const RESUMABLE_SESSION_KEY_PREFIX = 'kb-resumable-session:';

/**
 * 统一上传进度（含阶段，供 UI 展示文案）
 */
export type UploadProgress = {
  phase: 'hash' | 'check' | 'upload' | 'merge';
  percent: number;
};

/**
 * 统一上传返回（兼容 kb-file FileInfoVO 与文件管理 FileMetadata 字段）
 */
export interface FileUploadResponse {
  id: number | string;
  originalName?: string;
  fileName?: string;
  originalFileName?: string;
  fileSize?: number;
  fileSizeReadable?: string;
  fileType?: string;
  mimeType?: string;
  contentType?: string;
  fileUrl?: string;
  accessUrl?: string;
  previewUrl?: string;
  uploaderId?: number | string;
  uploaderName?: string;
  downloadCount?: number;
  createdAt?: string;
  duration?: number;
  resolution?: string;
  bitrate?: number;
  transcodeStatus?: string;
  playUrl?: string;
  thumbnailUrl?: string;
  fileExtension?: string;
  fileCategory?: string;
  isPublic?: boolean;
  updatedAt?: string;
  lastAccessTime?: string;
  width?: number;
  height?: number;
}

/**
 * uploadWithResume 选项
 */
export interface UploadWithResumeOptions {
  /** 分片门槛（字节），默认 20MB */
  thresholdBytes?: number;
  /** 分片大小（字节），默认 5MB */
  chunkSize?: number;
  /** 进度回调 */
  onProgress?: (p: UploadProgress) => void;
  /** 是否公开（整文件走文件管理上传时透传） */
  isPublic?: boolean;
  /**
   * 小于门槛时的整文件上传实现。
   * 默认走 `/document/file-management/upload`，便于文件管理列表落库。
   */
  wholeFileUpload?: (
    file: File,
    onUploadProgress?: (percent: number) => void
  ) => Promise<FileUploadResponse>;
}

/**
 * 上传阶段中文文案（供 Progress 展示）。
 *
 * @param phase 阶段
 * @returns 中文说明
 */
export function getUploadPhaseLabel(phase: UploadProgress['phase']): string {
  switch (phase) {
    case 'hash':
      return '计算指纹';
    case 'check':
      return '秒传命中';
    case 'upload':
      return '上传中';
    case 'merge':
      return '合并中';
    default:
      return '处理中';
  }
}

/**
 * 将上传/登记结果规范为统一响应（补齐文件管理页常用字段）。
 *
 * <p>秒传/分片 merge 后会调用 register-stored，返回的 id 应为 kb-document
 * FileMetadata；小文件整传本身已走 file-management。</p>
 *
 * @param vo kb-file 或文件管理返回
 * @param fallbackName 回退文件名
 * @param isPublic 是否公开
 * @returns 规范化响应
 */
export function normalizeUploadResponse(
  vo: FileUploadResponse,
  fallbackName?: string,
  isPublic: boolean = false
): FileUploadResponse {
  const name = vo.originalName || vo.originalFileName || vo.fileName || fallbackName || 'file';
  const ext = name.includes('.')
    ? name.split('.').pop()?.toLowerCase() || ''
    : (vo.fileExtension || '');
  const accessUrl = vo.accessUrl || vo.fileUrl || '';

  return {
    ...vo,
    fileName: vo.fileName || name,
    originalFileName: vo.originalFileName || name,
    originalName: vo.originalName || name,
    fileExtension: vo.fileExtension || ext,
    fileSize: vo.fileSize ?? 0,
    fileSizeReadable: vo.fileSizeReadable || formatBytes(vo.fileSize ?? 0),
    contentType: vo.contentType || vo.mimeType || 'application/octet-stream',
    accessUrl,
    fileUrl: vo.fileUrl || accessUrl,
    fileCategory: vo.fileCategory || vo.fileType || guessCategory(ext),
    uploaderId: vo.uploaderId ?? 0,
    uploaderName: vo.uploaderName || '',
    isPublic: vo.isPublic ?? isPublic,
    downloadCount: vo.downloadCount ?? 0,
    createdAt: vo.createdAt || new Date().toISOString(),
    updatedAt: vo.updatedAt || vo.createdAt || new Date().toISOString(),
    lastAccessTime: vo.lastAccessTime || vo.createdAt || new Date().toISOString(),
  };
}

/**
 * 默认整文件上传：走文件管理接口（落 kb-document 元数据 + Feign 调 kb-file）。
 *
 * @param file 文件
 * @param isPublic 是否公开
 * @param onUploadProgress 上传进度 0-100
 * @returns 文件元数据
 */
async function defaultWholeFileUpload(
  file: File,
  isPublic: boolean,
  onUploadProgress?: (percent: number) => void
): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('isPublic', String(isPublic));

  return http.postForm<FileUploadResponse>('/document/file-management/upload', formData, {
    onUploadProgress: (e: AxiosProgressEvent) => {
      if (!onUploadProgress || !e.total) return;
      onUploadProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
}

/**
 * 按内容哈希登记文件管理 FileMetadata（服务端经 check-hash 解析 URL）。
 *
 * <p>不传 fileUrl：存储绑定以服务端 kb-file 为准，避免客户端伪造外链。</p>
 *
 * @param payload 登记参数
 * @returns FileMetadata 响应
 */
async function registerStored(payload: {
  originalFileName: string;
  fileSize: number;
  contentType?: string;
  fileSha256: string;
  isPublic?: boolean;
}): Promise<FileUploadResponse> {
  return http.post<FileUploadResponse>('/document/file-management/register-stored', payload);
}

/**
 * 秒传/分片后：仅凭 hash + 本地元数据登记 FileMetadata。
 *
 * @param file 本地文件
 * @param fileHash SHA-256
 * @param isPublic 是否公开
 * @returns FileMetadata 规范化响应
 */
async function registerStoredAfterKbFile(
  file: File,
  fileHash: string,
  isPublic: boolean
): Promise<FileUploadResponse> {
  const registered = await registerStored({
    originalFileName: file.name,
    fileSize: file.size,
    contentType: file.type || undefined,
    fileSha256: fileHash,
    isPublic,
  });
  return normalizeUploadResponse(registered, file.name, isPublic);
}

/**
 * 秒传预检：按 SHA-256 查询 kb-file 是否已有文件。
 *
 * @param fileHash SHA-256 小写 hex
 * @returns 已存在则返回文件信息，否则 null
 */
async function checkHash(fileHash: string): Promise<FileUploadResponse | null> {
  const data = await http.get<FileUploadResponse | null>('/file/files/upload/check-hash', {
    params: { fileHash },
  });
  // 后端 miss 时 data 为 null / undefined / 省略
  if (data == null) {
    return null;
  }
  if (typeof data === 'object' && !('id' in data)) {
    return null;
  }
  return data;
}

/**
 * 初始化断点续传会话。
 *
 * @param payload 初始化参数
 * @returns sessionId
 */
async function initResumable(payload: {
  fileHash: string;
  fileName: string;
  totalSize: number;
  chunkCount: number;
  contentType?: string;
}): Promise<string> {
  const data = await http.post<{ sessionId: string }>('/file/files/upload/resumable/init', payload);
  if (!data?.sessionId) {
    throw new Error('初始化分片上传失败：未返回 sessionId');
  }
  return data.sessionId;
}

/**
 * 查询会话已上传分片索引。
 *
 * @param sessionId 会话 ID
 * @returns 已上传 index 列表；会话无效时抛错
 */
async function getUploadedChunks(sessionId: string): Promise<number[]> {
  const data = await http.get<{ uploaded?: number[] }>(
    `/file/files/upload/resumable/${sessionId}/chunks`
  );
  return Array.isArray(data?.uploaded) ? data.uploaded : [];
}

/**
 * 上传单个分片（multipart 字段名 chunk）。
 *
 * @param sessionId 会话 ID
 * @param chunkIndex 分片索引
 * @param blob 分片数据
 * @param onChunkProgress 单片上传进度 0-100
 */
async function uploadChunk(
  sessionId: string,
  chunkIndex: number,
  blob: Blob,
  onChunkProgress?: (percent: number) => void
): Promise<void> {
  const formData = new FormData();
  formData.append('chunk', blob, `chunk-${chunkIndex}`);

  await http.put(`/file/files/upload/resumable/${sessionId}/chunks/${chunkIndex}`, formData, {
    headers: {
      'Content-Type': undefined,
    },
    onUploadProgress: (e: AxiosProgressEvent) => {
      if (!onChunkProgress || !e.total) return;
      onChunkProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
}

/**
 * 合并分片并落库。
 *
 * @param sessionId 会话 ID
 * @param fileName 文件名
 * @param fileHash 哈希
 * @param isPublic 是否公开（透传 FileUploadDTO.accessLevel 等，按后端可忽略）
 * @returns 文件信息
 */
async function mergeChunks(
  sessionId: string,
  fileName: string,
  fileHash: string,
  isPublic: boolean
): Promise<FileUploadResponse> {
  return http.post<FileUploadResponse>(`/file/files/upload/resumable/${sessionId}/merge`, {
    fileName,
    fileHash,
    accessLevel: isPublic ? 0 : 1,
  });
}

/**
 * 读取本地缓存的续传 sessionId。
 *
 * @param fileHash 文件哈希
 * @returns sessionId 或 null
 */
function loadCachedSessionId(fileHash: string): string | null {
  try {
    return sessionStorage.getItem(RESUMABLE_SESSION_KEY_PREFIX + fileHash);
  } catch {
    return null;
  }
}

/**
 * 缓存续传 sessionId（同页会话内断点续传）。
 *
 * @param fileHash 文件哈希
 * @param sessionId 会话 ID
 */
function saveCachedSessionId(fileHash: string, sessionId: string): void {
  try {
    sessionStorage.setItem(RESUMABLE_SESSION_KEY_PREFIX + fileHash, sessionId);
  } catch {
    // 忽略隐私模式等存储失败
  }
}

/**
 * 清除续传 session 缓存。
 *
 * @param fileHash 文件哈希
 */
function clearCachedSessionId(fileHash: string): void {
  try {
    sessionStorage.removeItem(RESUMABLE_SESSION_KEY_PREFIX + fileHash);
  } catch {
    // ignore
  }
}

/**
 * 统一上传器：秒传预检 → 小文件整传 / 大文件分片续传。
 *
 * <p>流程：1) SHA-256 指纹 2) check-hash 命中则 register-stored 3) &lt; threshold 整传
 * 4) 否则 init → PUT → merge → register-stored。</p>
 *
 * @param file 待上传文件
 * @param opts 选项（门槛/分片/进度/公开）
 * @returns 统一文件信息（均为文件管理 FileMetadata id）
 */
export async function uploadWithResume(
  file: File,
  opts: UploadWithResumeOptions = {}
): Promise<FileUploadResponse> {
  const thresholdBytes = opts.thresholdBytes ?? DEFAULT_UPLOAD_THRESHOLD_BYTES;
  const chunkSize = opts.chunkSize ?? DEFAULT_CHUNK_SIZE_BYTES;
  const isPublic = opts.isPublic ?? false;
  const onProgress = opts.onProgress;
  const wholeFileUpload =
    opts.wholeFileUpload ??
    ((f, prog) => defaultWholeFileUpload(f, isPublic, prog));

  // 1) hash
  onProgress?.({ phase: 'hash', percent: 0 });
  const fileHash = await computeFileHash(file, (percent) => {
    onProgress?.({ phase: 'hash', percent });
  });

  // 2) 秒传预检 → 登记 FileMetadata（服务端按 hash 解析 URL）
  onProgress?.({ phase: 'check', percent: 0 });
  const existing = await checkHash(fileHash);
  if (existing) {
    onProgress?.({ phase: 'check', percent: 100 });
    clearCachedSessionId(fileHash);
    return registerStoredAfterKbFile(file, fileHash, isPublic);
  }

  // 3) 小文件整传（已写 FileMetadata）
  if (file.size < thresholdBytes) {
    onProgress?.({ phase: 'upload', percent: 0 });
    const result = await wholeFileUpload(file, (percent) => {
      onProgress?.({ phase: 'upload', percent });
    });
    onProgress?.({ phase: 'upload', percent: 100 });
    return normalizeUploadResponse(result, file.name, isPublic);
  }

  // 4) 分片续传
  const chunkCount = Math.max(1, Math.ceil(file.size / chunkSize));
  let sessionId = loadCachedSessionId(fileHash);
  let uploadedSet = new Set<number>();

  if (sessionId) {
    try {
      uploadedSet = new Set(await getUploadedChunks(sessionId));
    } catch {
      // 会话失效（服务重启等）：清缓存并重新 init
      clearCachedSessionId(fileHash);
      sessionId = null;
      uploadedSet = new Set();
    }
  }

  if (!sessionId) {
    sessionId = await initResumable({
      fileHash,
      fileName: file.name,
      totalSize: file.size,
      chunkCount,
      contentType: file.type || undefined,
    });
    saveCachedSessionId(fileHash, sessionId);
    uploadedSet = new Set();
  }

  onProgress?.({ phase: 'upload', percent: Math.round((uploadedSet.size * 100) / chunkCount) });

  const uploadMissingChunks = async (sid: string, already: Set<number>): Promise<void> => {
    let done = already.size;
    for (let index = 0; index < chunkCount; index += 1) {
      if (already.has(index)) {
        continue;
      }
      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const blob = file.slice(start, end);

      await uploadChunk(sid, index, blob, (chunkPercent) => {
        const base = (done * 100) / chunkCount;
        const slice = chunkPercent / chunkCount;
        onProgress?.({
          phase: 'upload',
          percent: Math.min(99, Math.round(base + slice)),
        });
      });

      done += 1;
      already.add(index);
      onProgress?.({
        phase: 'upload',
        percent: Math.min(99, Math.round((done * 100) / chunkCount)),
      });
    }
  };

  await uploadMissingChunks(sessionId, uploadedSet);

  // merge → 登记 FileMetadata（服务端按 hash 解析 URL）
  onProgress?.({ phase: 'merge', percent: 0 });
  await mergeChunks(sessionId, file.name, fileHash, isPublic);
  clearCachedSessionId(fileHash);
  const registered = await registerStoredAfterKbFile(file, fileHash, isPublic);
  onProgress?.({ phase: 'merge', percent: 100 });

  return registered;
}

/**
 * 格式化字节为可读字符串。
 *
 * @param bytes 字节数
 * @returns 可读大小
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

/**
 * 按扩展名猜测文件分类。
 *
 * @param ext 扩展名（无点）
 * @returns 分类
 */
function guessCategory(ext: string): string {
  const e = ext.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(e)) return 'image';
  if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(e)) return 'video';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(e)) return 'audio';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(e)) return 'archive';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'markdown'].includes(e)) {
    return 'document';
  }
  return 'other';
}
