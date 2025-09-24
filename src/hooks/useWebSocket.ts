import { useEffect, useRef, useState, useCallback } from "react";
import { WebSocketMessage, EventLog } from "../types/camera";

export const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const messageHandlers = useRef<Map<string, (data: any) => void>>(new Map());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback(
    (type: EventLog["type"], message: string, camera_id?: number) => {
      const newLog: EventLog = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type,
        message,
        camera_id,
      };
      setEventLogs((prev) => [newLog, ...prev].slice(0, 100));
    },
    []
  );

  const startPing = useCallback(() => {
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
    }

    pingInterval.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        // Ping frame gönder
        try {
          ws.current.send(JSON.stringify({ command: "ping" }));
        } catch (error) {
          console.error("Ping failed:", error);
        }
      }
    }, 30000); // 30 saniyede bir ping
  }, []);

  const stopPing = useCallback(() => {
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    setIsConnecting(true);
    setConnectionError(null);

    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        addLog("success", "Connected to camera server");
        startPing(); // Ping başlat
      };

      ws.current.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log("WebSocket message received:", data);

          // Ping yanıtlarını işle
          if (data.type === "pong" || data.command === "pong") {
            return; // Ping yanıtları için log oluşturma
          }

          // Handle welcome message
          if (data.type === "welcome") {
            addLog("info", `Welcome: ${data.message}`);
          }

          // Handle broadcast events
          if (data.type === "camera_connected") {
            addLog(
              "success",
              `Camera connected: ${data.alias || data.model}`,
              data.camera_id
            );
          }

          if (data.type === "camera_disconnected") {
            addLog(
              "warning",
              `Camera disconnected: ${data.alias}`,
              data.camera_id
            );
          }

          if (data.type === "image_captured") {
            addLog(
              "success",
              `Image captured by ${data.alias}`,
              data.camera_id
            );
          }

          if (data.type === "camera_error" || data.type === "capture_error") {
            addLog("error", `${data.alias}: ${data.error}`, data.camera_id);
          }

          if (data.type === "settings_synchronized") {
            const settingsStr = Object.entries(data.synced_settings)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ");
            addLog("success", `Settings synchronized: ${settingsStr}`);
          }

          if (data.type === "setting_changed") {
            addLog(
              "info",
              `${data.alias}: ${data.setting_type} changed from ${data.old_value} to ${data.new_value}`,
              data.camera_id
            );
          }

          // Call registered handlers
          const handler = messageHandlers.current.get(data.type);
          if (handler) {
            handler(data);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
          addLog("error", "Failed to parse server message");
        }
      };

      ws.current.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        stopPing();

        // Normal kapatma değilse reconnect dene
        if (
          event.code !== 1000 &&
          reconnectAttempts.current < maxReconnectAttempts
        ) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000; // Exponential backoff
          addLog(
            "warning",
            `Connection lost (${
              event.reason || "Unknown reason"
            }). Reconnecting in ${delay / 1000}s...`
          );

          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          if (reconnectAttempts.current >= maxReconnectAttempts) {
            setConnectionError("Maximum reconnection attempts reached");
            addLog("error", "Connection failed after multiple attempts");
          } else {
            addLog("info", "Connection closed normally");
          }
        }
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionError("WebSocket connection error");
        addLog("error", "WebSocket connection error");
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setIsConnecting(false);
      setConnectionError("Failed to create WebSocket connection");
      addLog("error", "Failed to create WebSocket connection");
    }
  }, [url, addLog, startPing, stopPing]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    stopPing();

    if (ws.current) {
      ws.current.close(1000, "User disconnect"); // Normal closure
      ws.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    reconnectAttempts.current = 0;
    addLog("info", "Disconnected from camera server");
  }, [addLog, stopPing]);

  const sendMessage = useCallback((message: object): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket is not connected"));
        return;
      }

      try {
        const messageStr = JSON.stringify(message);
        console.log("Sending WebSocket message:", messageStr);
        ws.current.send(messageStr);

        // For commands that expect a response, set up a one-time handler
        if ("command" in message && message.command !== "ping") {
          const responseType = getResponseType(message.command as string);
          if (responseType) {
            const handler = (data: any) => {
              messageHandlers.current.delete(responseType);
              resolve(data);
            };
            messageHandlers.current.set(responseType, handler);

            // Set timeout for response
            setTimeout(() => {
              if (messageHandlers.current.has(responseType)) {
                messageHandlers.current.delete(responseType);
                reject(new Error("Request timeout"));
              }
            }, 10000); // 10 second timeout
          } else {
            // Komut yanıt gerektirmiyorsa hemen resolve et
            resolve({ success: true });
          }
        } else {
          resolve({ success: true });
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        reject(error);
      }
    });
  }, []);

  const subscribe = useCallback(
    (messageType: string, handler: (data: any) => void) => {
      messageHandlers.current.set(messageType, handler);

      return () => {
        messageHandlers.current.delete(messageType);
      };
    },
    []
  );

  /**
 * 
 *   useEffect(() => {
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      stopPing();
      if (ws.current) {
        ws.current.close(1000, "Component unmount");
      }
    };
  }, [stopPing]);
 */

  return {
    isConnected,
    isConnecting,
    connectionError,
    eventLogs,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    addLog,
  };
};

// Helper function to determine expected response type for commands
const getResponseType = (command: string): string | null => {
  const responseMap: Record<string, string> = {
    discover: "discovery_result",
    connect: "connect_result",
    disconnect: "disconnect_result",
    status: "status",
    start_continuous: "continuous_result",
    stop_continuous: "continuous_result",
    single_shot: "shot_result",
    set_transfer_path: "transfer_path_result",
    get_camera_settings: "camera_settings_result",
    set_camera_setting: "setting_result",
    sync_master_settings: "sync_result",
    enable_auto_sync: "auto_sync_result",
    get_available_settings: "available_settings_result",
  };

  return responseMap[command] || null;
};
