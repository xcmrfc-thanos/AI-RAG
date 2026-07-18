/**
 * 从 RustFS 直链 URL 中提取文件哈希与扩展名。
 */
const extractHashFromRustFsUrl = (url: string): string | null => {
  const hashMatch = url.match(/\/([a-f0-9]{32,128})(\.[a-z0-9]+)?$/i);
  if (!hashMatch) {
    return null;
  }
  return `${hashMatch[1]}${hashMatch[2] ?? ''}`;
};

/**
 * 将 RustFS 私有桶直链改写为经网关代理的预览地址，避免浏览器 403。
 */
export const resolvePublicFileUrl = (src?: string | null): string | undefined => {
  if (!src || !src.trim()) {
    return undefined;
  }

  const trimmed = src.trim();
  if (trimmed.startsWith('/api/file/')) {
    return trimmed;
  }

  const isRustFsDirectUrl =
    trimmed.includes('/kb-files/') ||
    trimmed.includes(':20090/') ||
    trimmed.includes(':9091/');

  if (!isRustFsDirectUrl) {
    return trimmed;
  }

  const hashWithExt = extractHashFromRustFsUrl(trimmed);
  if (!hashWithExt) {
    return trimmed;
  }

  return `/api/file/files/hash-preview/${hashWithExt}`;
};
