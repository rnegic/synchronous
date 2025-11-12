/**
 * WebSocket Client for real-time updates
 * Handles connection, reconnection, and event subscription
 */

type WebSocketEvent = 'session_updated' | 'participant_joined' | 'participant_left' | 'participant_ready' | 'session_started' | 'message_received' | 'task_updated';

interface WebSocketMessage {
  event: WebSocketEvent;
  data: unknown;
}

type EventCallback = (data: unknown) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private listeners: Map<WebSocketEvent, Set<EventCallback>> = new Map();
  private isConnecting = false;
  private shouldReconnect = true;
  private pingInterval: number | null = null;

  constructor(url: string) {
    // Convert HTTP URL to WebSocket URL
    this.url = url
      .replace(/^http:/, 'ws:')
      .replace(/^https:/, 'wss:');
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.log('[WebSocket] Already connected or connecting');
      return;
    }

    this.isConnecting = true;
    console.log('[WebSocket] 🔌 Connecting to:', this.url);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WebSocket] ✅ Connected successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('[WebSocket] 📨 Received:', message.event, message.data);
          this.emit(message.event, message.data);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] ❌ Error:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = (event) => {
        console.log('[WebSocket] 🔌 Disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.stopPing();

        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnect();
        }
      };
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      this.isConnecting = false;
      this.reconnect();
    }
  }

  /**
   * Reconnect with exponential backoff
   */
  private reconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`[WebSocket] 🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start ping/pong to keep connection alive
   */
  private startPing(): void {
    this.pingInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('ping', {});
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Send message to server
   */
  send(event: string, data: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send message - not connected');
      return;
    }

    const message = JSON.stringify({ event, data });
    this.ws.send(message);
  }

  /**
   * Subscribe to WebSocket event
   */
  on(event: WebSocketEvent, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Unsubscribe from WebSocket event
   */
  off(event: WebSocketEvent, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Emit event to all subscribers
   */
  private emit(event: WebSocketEvent, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error('[WebSocket] Error in callback:', error);
        }
      });
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    console.log('[WebSocket] 🔌 Disconnecting...');
    this.shouldReconnect = false;
    this.stopPing();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.listeners.clear();
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
