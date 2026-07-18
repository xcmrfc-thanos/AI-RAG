import React from 'react';
import './AdminPageHeader.css';

export interface AdminPageHeaderProps {
  /** 页面标题 */
  title: string;
  /** 副标题/说明文案 */
  description?: string;
  /** 右侧操作区（按钮等） */
  extra?: React.ReactNode;
  className?: string;
}

/**
 * 管理后台页面统一标题区：标题、描述与右侧操作按钮布局（任务 45）。
 */
export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  description,
  extra,
  className,
}) => {
  const rootClass = ['admin-page-header', className].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      <div className="admin-page-header__main">
        <h2 className="admin-page-header__title">{title}</h2>
        {description ? <p className="admin-page-header__description">{description}</p> : null}
      </div>
      {extra ? <div className="admin-page-header__extra">{extra}</div> : null}
    </div>
  );
};

export default AdminPageHeader;
