import { Client, IFrame, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WS_BASE_URL, WS_CONFIG } from '@/config';
import type { EntityId } from '@/types';

/**
 * WebSocket 推送数据类型
 */
export interface WsNotificationPayload {
  eventType?: string;
  notificationType: string;
  title: string;
  content: string;
  link?: string;
  documentId?: EntityId;
  documentTitle?: string;
  timestamp?: string;
}

type NotificationCallback = (payload: WsNotificationPayload) => void;

/**
 * WebSocket 连接服务
 *
 * 使用 STOMP over SockJS 连接到后端 /ws/notification 端点，
 * 支持自动重连、心跳保活，订阅个人通知频道和审核员广播频道。
 */
class WebSocketService {
  private client: Client | null = null;
  private notificationCallbacks: Set<NotificationCallback> = new Set();
  private reviewerCallbacks: Set<NotificationCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnect = WS_CONFIG.maxReconnectTimes;
  private connected = false;

  /**
   * 注册个人通知回调
   */
  onNotification(callback: NotificationCallback): () => void {
    this.notificationCallbacks.add(callback);
    return () => {
      this.notificationCallbacks.delete(callback);
    };
  }

  /**
   * 注册审核员广播回调（仅审核员角色使用）
   */
  onReviewerNotification(callback: NotificationCallback): () => void {
    this.reviewerCallbacks.add(callback);
    return () => {
      this.reviewerCallbacks.delete(callback);
    };
  }

  /**
   * 建立 WebSocket 连接
   *
   * @param authToken JWT Token（Bearer xxx 格式）
   * @param isReviewer 当前用户是否具有审核员角色
   */
  connect(authToken: string, isReviewer: boolean): void {
    if (this.client?.active) {
      return;
    }

    const socketUrl = `${WS_BASE_URL}/notification`;
    const tokenParam = authToken.replace(/^Bearer\s+/i, '');
    const sockJsUrl = `${socketUrl}?token=${encodeURIComponent(tokenParam)}`;

    this.client = new Client({
      webSocketFactory: () => new SockJS(sockJsUrl),
      connectHeaders: {
        Authorization: authToken,
      },
      heartbeatIncoming: WS_CONFIG.heartbeatInterval,
      heartbeatOutgoing: WS_CONFIG.heartbeatInterval,
      reconnectDelay: 0, // 由我们手动控制重连
      debug: (msg: string) => {
        if (import.meta.env.DEV) {
          console.debug('[WS]', msg);
        }
      },

      onConnect: (_frame: IFrame) => {
        this.connected = true;
        this.reconnectAttempts = 0;
        console.info('[WS] 已连接到通知服务');

        // 订阅个人通知频道
        this.client?.subscribe('/user/queue/notifications', (message: IMessage) => {
          try {
            const payload: WsNotificationPayload = JSON.parse(message.body);
            this.notificationCallbacks.forEach((cb) => {
              try {
                cb(payload);
              } catch (e) {
                console.error('[WS] 通知回调执行失败:', e);
              }
            });
          } catch (e) {
            console.error('[WS] 解析通知消息失败:', e);
          }
        });

        // 审核员订阅公共广播频道
        if (isReviewer) {
          this.client?.subscribe('/topic/reviewers', (message: IMessage) => {
            try {
              const payload: WsNotificationPayload = JSON.parse(message.body);
              this.reviewerCallbacks.forEach((cb) => {
                try {
                  cb(payload);
                } catch (e) {
                  console.error('[WS] 审核员回调执行失败:', e);
                }
              });
            } catch (e) {
              console.error('[WS] 解析审核消息失败:', e);
            }
          });
          console.info('[WS] 已订阅审核员广播频道');
        }
      },

      onDisconnect: () => {
        this.connected = false;
        console.warn('[WS] 连接已断开');
        this.attemptReconnect(authToken, isReviewer);
      },

      onStompError: (frame: IFrame) => {
        console.error('[WS] STOMP 错误:', frame.headers['message']);
        this.attemptReconnect(authToken, isReviewer);
      },

      onWebSocketError: (event: Event) => {
        console.error('[WS] WebSocket 错误:', event);
      },
    });

    this.client.activate();
  }

  /**
   * 断开 WebSocket 连接
   */
  disconnect(): void {
    this.maxReconnect = 0; // 阻止自动重连
    try {
      this.client?.deactivate();
    } catch {
      // ignore
    }
    this.connected = false;
    this.reconnectAttempts = 0;
    console.info('[WS] 已主动断开连接');
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 自动重连
   */
  private attemptReconnect(authToken: string, isReviewer: boolean): void {
    if (this.reconnectAttempts >= this.maxReconnect) {
      console.warn(`[WS] 已达最大重连次数 (${this.maxReconnect})，停止重连`);
      return;
    }

    this.reconnectAttempts++;
    const delay = WS_CONFIG.reconnectInterval;
    console.info(
      `[WS] 将在 ${delay / 1000}s 后尝试第 ${this.reconnectAttempts} 次重连...`
    );

    setTimeout(() => {
      if (!this.connected) {
        this.connect(authToken, isReviewer);
      }
    }, delay);
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;
