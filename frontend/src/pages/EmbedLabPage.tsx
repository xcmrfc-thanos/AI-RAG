/**
 * 嵌入实验室宿主页：模拟 OA/门户，自嵌 /embed/chat。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Input, Space, Typography } from 'antd';
import { mintEmbedToken } from '@/services/embed.service';
import { EMBED_MSG } from '@/features/embed/protocol';

const { Title, Paragraph, Text } = Typography;

/**
 * EmbedLabPage：宿主演示。
 */
const EmbedLabPage: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scope, setScope] = useState('ticket-space');
  const [status, setStatus] = useState('等待 iframe READY…');
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const origin = window.location.origin;
  const chatSrc = `${origin}/embed/chat`;

  const sendInit = useCallback(async () => {
    setError(null);
    try {
      const minted = await mintEmbedToken({
        knowledgeScope: scope.trim() || undefined,
        allowedOrigin: origin,
        ttlSeconds: 300,
      });
      tokenRef.current = minted.token;
      const win = iframeRef.current?.contentWindow;
      if (!win) {
        setStatus('iframe 未就绪');
        return;
      }
      win.postMessage(
        {
          type: EMBED_MSG.INIT,
          token: minted.token,
          knowledgeScope: minted.knowledgeScope,
          allowedOrigin: origin,
        },
        origin,
      );
      setStatus(`已下发短期 Token（${minted.expiresIn}s），scope=${minted.knowledgeScope || '-'}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [origin, scope]);

  useEffect(() => {
    /**
     * 处理 iframe READY。
     */
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      const data = event.data;
      if (data && typeof data === 'object' && data.type === EMBED_MSG.READY) {
        setStatus('收到 EMBED_READY，正在 mint…');
        void sendInit();
      }
      if (data && typeof data === 'object' && data.type === EMBED_MSG.ERROR) {
        setError(String(data.message || 'iframe error'));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [origin, sendInit]);

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <Title level={3}>嵌入实验室</Title>
      <Paragraph type="secondary">
        模拟 OA/门户工单页：本页为宿主，下方 iframe 为嵌入对话。短期 Token 经 postMessage 下发，不进 URL。
      </Paragraph>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Text>知识范围声明</Text>
          <Input
            style={{ width: 220 }}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="ticket-space"
          />
          <Button type="primary" onClick={() => void sendInit()}>
            重新签发并注入
          </Button>
        </Space>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">{status}</Text>
        </div>
        {error ? <Alert style={{ marginTop: 8 }} type="error" message={error} showIcon /> : null}
      </Card>
      <iframe
        ref={iframeRef}
        title="embed-chat"
        src={chatSrc}
        style={{ width: '100%', height: 520, border: '1px solid #e5e7eb', borderRadius: 8 }}
      />
    </div>
  );
};

export default EmbedLabPage;
