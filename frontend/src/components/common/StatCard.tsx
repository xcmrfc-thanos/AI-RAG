import React from 'react';
import { Card, Statistic, Typography } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  FileTextOutlined,
  UserOutlined,
  EyeOutlined,
  LikeOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface StatCardProps {
  title: string;
  value: number;
  prefix?: React.ReactNode;
  suffix?: string;
  trend?: number;
  loading?: boolean;
  color?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  documents: <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
  users: <UserOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
  views: <EyeOutlined style={{ fontSize: 24, color: '#722ed1' }} />,
  likes: <LikeOutlined style={{ fontSize: 24, color: '#eb2f96' }} />,
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  prefix,
  suffix,
  trend,
  loading = false,
  color,
}) => {
  const icon = prefix || iconMap[title.toLowerCase()] || null;

  return (
    <Card
      loading={loading}
      variant="borderless"
      style={{
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        transition: 'all 0.3s',
      }}
      styles={{ body: { padding: 24 } }}
      hoverable
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Text type="secondary" style={{ fontSize: 14, fontWeight: 500 }}>
            {title}
          </Text>
          <div style={{ marginTop: 12 }}>
            <Statistic
              value={value}
              prefix={icon}
              suffix={suffix}
              valueStyle={{
                fontSize: 30,
                fontWeight: 700,
                color: color || '#262626',
              }}
            />
          </div>
          {trend !== undefined && (
            <div style={{ marginTop: 12 }}>
              {trend >= 0 ? (
                <Text type="success">
                  <ArrowUpOutlined /> {trend}%
                </Text>
              ) : (
                <Text type="danger">
                  <ArrowDownOutlined /> {Math.abs(trend)}%
                </Text>
              )}
              <Text type="secondary" style={{ marginLeft: 8 }}>
                较上月
              </Text>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default StatCard;
