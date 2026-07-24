/**
 * 前端工具模块：file-hash。
 */
import { createSHA256 } from 'hash-wasm';

/** 哈希分片读取大小（2MB），增量更新摘要，避免整文件进内存 */
const HASH_READ_CHUNK_SIZE = 2 * 1024 * 1024;

/**
 * 计算与后端一致的文件哈希（分片读 + 增量 SHA-256）。
 *
 * <p>使用 hash-wasm 流式 update，对齐 kb-file {@code calculateFileHash} /
 * check-hash（SHA-256 小写 hex）；禁止改用 MD5 / spark-md5。</p>
 *
 * @param file 待计算文件
 * @param onProgress 可选进度回调（0-100，按已读字节）
 * @returns SHA-256 小写 hex
 */
export async function computeFileHash(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  const hasher = await createSHA256();
  hasher.init();

  const total = file.size;
  let offset = 0;
  let lastReported = -1;

  while (offset < total) {
    const end = Math.min(offset + HASH_READ_CHUNK_SIZE, total);
    const chunk = new Uint8Array(await file.slice(offset, end).arrayBuffer());
    hasher.update(chunk);
    offset = end;

    if (onProgress && total > 0) {
      const percent = Math.min(99, Math.round((offset * 100) / total));
      if (percent !== lastReported) {
        lastReported = percent;
        onProgress(percent);
      }
    }
  }

  // 空文件：仍产出合法 SHA-256（e3b0c442...）
  const hex = hasher.digest('hex').toLowerCase();
  onProgress?.(100);
  return hex;
}
