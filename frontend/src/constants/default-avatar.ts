/**
 * 默认用户头像
 * 当用户没有设置自定义头像时使用
 */
export const DEFAULT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="60" fill="url(#bg)"/>
  <circle cx="60" cy="45" r="20" fill="white" opacity="0.9"/>
  <ellipse cx="60" cy="90" rx="32" ry="22" fill="white" opacity="0.9"/>
</svg>`);
