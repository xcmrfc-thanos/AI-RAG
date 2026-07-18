import React from 'react';
import { Card, Skeleton } from 'antd';

interface LoadingCardProps {
  count?: number;
  avatar?: boolean;
  paragraph?: boolean;
  title?: boolean;
  active?: boolean;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({
  count = 1,
  avatar = true,
  paragraph = true,
  title = true,
  active = true,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} style={{ marginBottom: 16 }}>
          <Skeleton
            avatar={avatar}
            paragraph={paragraph}
            title={title}
            active={active}
          />
        </Card>
      ))}
    </>
  );
};

export default LoadingCard;
