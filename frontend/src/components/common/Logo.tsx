import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'medium',
  showText = true,
  onClick,
  className = '',
}) => {
  const navigate = useNavigate();
  const systemName = useAppStore((s) => s.systemName);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
    } else {
      navigate('/');
    }
  };

  const sizes = {
    small: {
      iconSize: 20,
      iconWidth: 32,
      iconHeight: 32,
      fontSize: 16,
      textMargin: 8,
    },
    medium: {
      iconSize: 24,
      iconWidth: 36,
      iconHeight: 36,
      fontSize: 18,
      textMargin: 12,
    },
    large: {
      iconSize: 28,
      iconWidth: 42,
      iconHeight: 42,
      fontSize: 20,
      textMargin: 16,
    },
  };

  const currentSize = sizes[size];

  return (
    <div
      className={`logo ${className}`}
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: currentSize.textMargin,
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'all var(--transition-fast)',
      }}
    >
      <div
        className="logo-icon"
        style={{
          width: currentSize.iconWidth,
          height: currentSize.iconHeight,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width={currentSize.iconSize}
          height={currentSize.iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            filter: 'drop-shadow(0 2px 8px rgba(37, 99, 235, 0.2))',
          }}
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
      </div>
      {showText && (
        <span
          style={{
            fontSize: currentSize.fontSize,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {systemName}
        </span>
      )}
    </div>
  );
};

export default Logo;
