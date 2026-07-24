/**
 * 前端工具模块：notification-link。
 */
export interface NotificationTarget {
  url?: string;
  openInNewTab: boolean;
}

/**
 * 构建ReviewPageLink。
 */
export const buildReviewPageLink = (documentId: string | number) => `/review/documents/${documentId}`;

/**
 * 判断是否ReviewPageLink。
 */
export const isReviewPageLink = (link?: string) => Boolean(link && /^\/review\/documents\/[^/]+/.test(link));

/**
 * 提取DocumentIdFromLink。
 */
export const extractDocumentIdFromLink = (link?: string) => {
  if (!link) {
    return undefined;
  }
  const matched = link.match(/\/documents\/([^/?#]+)/);
  return matched?.[1];
};

export const resolveNotificationTarget = (notification: {
  type?: string;
  link?: string;
  documentId?: string | number;
}): NotificationTarget => {
  if (isReviewPageLink(notification.link)) {
    return {
      url: notification.link,
      openInNewTab: true,
    };
  }

  const reviewDocumentId = notification.documentId ?? (
    notification.type === 'review' ? extractDocumentIdFromLink(notification.link) : undefined
  );

  if (reviewDocumentId) {
    return {
      url: buildReviewPageLink(reviewDocumentId),
      openInNewTab: true,
    };
  }

  return {
    url: notification.link,
    openInNewTab: false,
  };
};
