import React from 'react';
import { Breadcrumb, Button, Space, Typography } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: Array<{ title: string; path?: string }>;
  extra?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumb,
  extra,
  showBack = false,
  onBack,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      {breadcrumb && (
        <Breadcrumb style={{ marginBottom: 16 }}>
          <Breadcrumb.Item onClick={() => navigate('/')}>
            <HomeOutlined />
          </Breadcrumb.Item>
          {breadcrumb.map((item, index) => (
            <Breadcrumb.Item
              key={index}
              onClick={item.path ? () => navigate(item.path!) : undefined}
            >
              {item.title}
            </Breadcrumb.Item>
          ))}
        </Breadcrumb>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Space direction="vertical" size={4}>
            <Title level={3} style={{ margin: 0 }}>
              {title}
            </Title>
            {subtitle && (
              <Typography.Text type="secondary">{subtitle}</Typography.Text>
            )}
          </Space>
        </div>

        <Space>
          {showBack && (
            <Button onClick={handleBack}>返回</Button>
          )}
          {extra}
        </Space>
      </div>
    </div>
  );
};

export default PageHeader;
