/**
 * React Hook for WebSocket connection
 * Provides easy integration with components
 */

import { useEffect, useRef, useCallback } from 'react';
import { WebSocketClient } from '@/shared/lib/websocket';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Convert HTTP URL to WebSocket URL
const WS_URL = API_BASE_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:') + '/api/v1/ws';

// Global WebSocket client instance (singleton)
let wsClient: WebSocketClient | null = null;

/**
 * Get or create WebSocket client instance
 */
function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient(WS_URL);
  }
  return wsClient;
}

/**
 * Hook to use WebSocket connection
 * Automatically connects on mount and disconnects on unmount
 */
export const useWebSocket = () => {
  const clientRef = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    clientRef.current = getWebSocketClient();
    clientRef.current.connect();

    return () => {
      // Don't disconnect on unmount - keep connection alive for other components
      // Only disconnect when all components using WebSocket are unmounted
    };
  }, []);

  const send = useCallback((event: string, data: unknown) => {
    clientRef.current?.send(event, data);
  }, []);

  const isConnected = useCallback(() => {
    return clientRef.current?.isConnected() || false;
  }, []);

  return {
    client: clientRef.current,
    send,
    isConnected,
  };
};

/**
 * Hook to subscribe to WebSocket events
 * Automatically unsubscribes on unmount
 */
export const useWebSocketEvent = <T = unknown>(
  event: string,
  callback: (data: T) => void
) => {
  const { client } = useWebSocket();

  useEffect(() => {
    if (!client) return;

    const unsubscribe = client.on(event as any, callback as any);
    return unsubscribe;
  }, [client, event, callback]);
};
