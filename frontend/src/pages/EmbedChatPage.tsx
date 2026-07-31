/**
 * Embed iframe 对话页（无 MainLayout；Token 仅来自 postMessage）。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Space, Typography } from 'antd';
import { askStreamWithEmbedToken } from '@/services/embed.service';
import { EMBED_MSG, buildEmbedReady, parseEmbedInit } from '@/features/embed/protocol';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * EmbedChatPage。
 */
const EmbedChatPage: React.FC = () => {
  const expectedOrigin = window.location.origin;
  const [token, setToken] = useState<string | null>(null);
  const [scope, setScope] = useState<string | undefined>();
  const [question, setQuestion] = useState('嵌入对话试点：请用一句话介绍知识库能力');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    /**
     * 通知宿主并接收 INIT。
     */
    const onMessage = (event: MessageEvent) => {
      const init = parseEmbedInit(event.data, expectedOrigin, event.origin);
      if (!init) return;
      setToken(init.token);
      setScope(init.knowledgeScope);
      setError(null);
    };
    window.addEventListener('message', onMessage);
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(buildEmbedReady(), expectedOrigin);
    }
    return () => window.removeEventListener('message', onMessage);
  }, [expectedOrigin]);

  const hasTokenInUrl = useMemo(
    () => /access_token|token=/.test(window.location.search),
    [],
  );

  /**
   * 发送问题。
   */
  const handleSend = async () => {
    if (!token || !question.trim()) return;
    setLoading(true);
    setAnswer('');
    setError(null);
    try {
      await askStreamWithEmbedToken(
        token,
        question,
        (chunk) => setAnswer((prev) => prev + chunk),
        () => setLoading(false),
        (err) => {
          setError(err);
          setLoading(false);
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <Paragraph strong style={{ marginBottom: 4 }}>
        嵌入对话（试点）
      </Paragraph>
      <Text type="secondary" style={{ fontSize: 12 }}>
        scope={scope || '-'} · token={token ? '已注入' : '等待宿主 INIT'}
      </Text>
      {hasTokenInUrl ? (
        <Alert
          style={{ marginTop: 8 }}
          type="error"
          message="检测到 URL 含 token，试点禁止此用法"
          showIcon
        />
      ) : null}
      {error ? <Alert style={{ marginTop: 8 }} type="error" message={error} showIcon /> : null}
      <TextArea
        style={{ marginTop: 12 }}
        rows={3}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        disabled={!token || loading}
      />
      <Space style={{ marginTop: 8 }}>
        <Button type="primary" loading={loading} disabled={!token} onClick={() => void handleSend()}>
          发送
        </Button>
      </Space>
      <div
        style={{
          marginTop: 12,
          minHeight: 120,
          padding: 12,
          background: '#f8fafc',
          borderRadius: 8,
          whiteSpace: 'pre-wrap',
        }}
      >
        {answer || <Text type="secondary">回答将显示在这里</Text>}
      </div>
    </div>
  );
};

export default EmbedChatPage;
