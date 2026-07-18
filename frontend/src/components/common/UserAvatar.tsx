import React, { useEffect, useState } from 'react';
import { DEFAULT_AVATAR } from '@/constants/default-avatar';
import { resolvePublicFileUrl } from '@/utils/file-url';

interface UserAvatarProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
}

const resolveAvatarSrc = (src?: string | null): string => {
  if (!src || !src.trim()) {
    return DEFAULT_AVATAR;
  }
  return resolvePublicFileUrl(src) ?? DEFAULT_AVATAR;
};

/**
 * 用户头像组件。
 *
 * <p>同时处理空头像和头像地址失效场景，统一回退到默认头像。</p>
 */
const UserAvatar: React.FC<UserAvatarProps> = ({ src, onError, alt, ...restProps }) => {
  const [currentSrc, setCurrentSrc] = useState(resolveAvatarSrc(src));

  useEffect(() => {
    setCurrentSrc(resolveAvatarSrc(src));
  }, [src]);

  return (
    <img
      {...restProps}
      src={currentSrc}
      alt={alt || '用户头像'}
      onError={(event) => {
        if (currentSrc !== DEFAULT_AVATAR) {
          setCurrentSrc(DEFAULT_AVATAR);
        }
        onError?.(event);
      }}
    />
  );
};

export default UserAvatar;
