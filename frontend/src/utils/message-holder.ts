import type { MessageInstance } from 'antd/es/message/interface';
import { message as antMessage } from 'antd';

/**
 * 全局 Message API 持有者
 *
 * 用于在非 React 组件（如 request.ts 拦截器）中使用 antd message 时，
 * 避免因静态调用而触发 "Static function can not consume context" 警告。
 *
 * 用法：
 * 1. App.tsx 中通过 App.useApp() 获取 message，调用 setMessageApi(message)
 * 2. 其他非组件文件通过 getMessageProxy() 获取代理对象
 * 3. 如果 messageApi 未初始化，自动回退到静态 message（作为兜底）
 */
let messageApi: MessageInstance | null = null;

export function setMessageApi(api: MessageInstance) {
  messageApi = api;
}

export function hasMessageApi(): boolean {
  return messageApi !== null;
}

/**
 * 获取 message 代理对象
 * 优先使用 hook 注入的 messageApi（可消费动态主题），
 * 未初始化时回退到静态 message（会产生 warning，但功能正常）。
 */
export const messageHolder = {
  success: (content: Parameters<MessageInstance['success']>[0]) =>
    messageApi ? messageApi.success(content) : antMessage.success(content),
  error: (content: Parameters<MessageInstance['error']>[0]) =>
    messageApi ? messageApi.error(content) : antMessage.error(content),
  warning: (content: Parameters<MessageInstance['warning']>[0]) =>
    messageApi ? messageApi.warning(content) : antMessage.warning(content),
  info: (content: Parameters<MessageInstance['info']>[0]) =>
    messageApi ? messageApi.info(content) : antMessage.info(content),
  loading: (content: Parameters<MessageInstance['loading']>[0]) =>
    messageApi ? messageApi.loading(content) : antMessage.loading(content),
  open: (config: Parameters<MessageInstance['open']>[0]) =>
    messageApi ? messageApi.open(config) : antMessage.open(config),
  destroy: (messageKey?: React.Key) =>
    messageApi ? messageApi.destroy(messageKey) : antMessage.destroy(messageKey),
};
