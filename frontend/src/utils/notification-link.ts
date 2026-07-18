export interface NotificationTarget {
  url?: string;
  openInNewTab: boolean;
}

export const buildReviewPageLink = (documentId: string | number) => `/review/documents/${documentId}`;

export const isReviewPageLink = (link?: string) => Boolean(link && /^\/review\/documents\/[^/]+/.test(link));

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
