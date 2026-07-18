import React from 'react';
import type { SystemNotification } from '@/types';

interface NotificationToastProps {
  notification: SystemNotification;
  onNavigate?: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onNavigate }) => {
  const { content } = notification;

  return (
    <div
      className="notif-toast-body"
      onClick={onNavigate}
      style={{ cursor: 'pointer', width: '100%' }}
    >
      <p style={{
        margin: '0 0 10px',
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 1.6,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {content}
      </p>

      {onNavigate && (
        <div style={{ textAlign: 'right' }}>
          <span
            onClick={(e) => {
              e.stopPropagation();
              onNavigate();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 500,
              color: '#2563eb',
              padding: '3px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'background 0.15s, transform 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(37, 99, 235, 0.06)';
              e.currentTarget.style.transform = 'translateX(2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'none';
            }}
          >
            查看详情
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        </div>
      )}
    </div>
  );
};

export default NotificationToast;
