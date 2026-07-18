import { DOCUMENT_STATUS, DOCUMENT_STATUS_CODE } from '@/constants';

export type DocumentStatusCode = typeof DOCUMENT_STATUS_CODE[keyof typeof DOCUMENT_STATUS_CODE];
export type DocumentStatusKey = typeof DOCUMENT_STATUS[keyof typeof DOCUMENT_STATUS];

/**
 * 将后端数值状态码映射为前端文档状态键。
 */
export function mapDocumentStatusFromCode(
  status: number | string | null | undefined,
): DocumentStatusKey {
  const code = typeof status === 'string' ? Number(status) : status;
  switch (code) {
    case DOCUMENT_STATUS_CODE.PUBLISHED:
      return DOCUMENT_STATUS.PUBLISHED;
    case DOCUMENT_STATUS_CODE.ARCHIVED:
      return DOCUMENT_STATUS.ARCHIVED;
    case DOCUMENT_STATUS_CODE.PENDING_REVIEW:
      return DOCUMENT_STATUS.PENDING_REVIEW;
    case DOCUMENT_STATUS_CODE.DRAFT:
    default:
      return DOCUMENT_STATUS.DRAFT;
  }
}

/**
 * 将前端状态键或数值统一解析为数值状态码。
 */
export function resolveDocumentStatusCode(
  status: number | string | null | undefined,
): DocumentStatusCode {
  if (typeof status === 'number') {
    return status as DocumentStatusCode;
  }
  if (status === DOCUMENT_STATUS.PUBLISHED || status === 'published') {
    return DOCUMENT_STATUS_CODE.PUBLISHED;
  }
  if (status === DOCUMENT_STATUS.ARCHIVED || status === 'archived') {
    return DOCUMENT_STATUS_CODE.ARCHIVED;
  }
  if (status === DOCUMENT_STATUS.PENDING_REVIEW || status === 'pending_review') {
    return DOCUMENT_STATUS_CODE.PENDING_REVIEW;
  }
  return DOCUMENT_STATUS_CODE.DRAFT;
}
