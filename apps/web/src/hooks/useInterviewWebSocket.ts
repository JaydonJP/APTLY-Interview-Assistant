"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WebSocketEnvelope } from "@/types/realtime";

export type WebSocketStatus = "connecting" | "connected" | "disconnected" | "error";

interface UseInterviewWebSocketOptions {
  interviewId: string;
  enabled?: boolean;
  onEvent?: (envelope: WebSocketEnvelope) => void;
}

export function useInterviewWebSocket({
  interviewId,
  enabled = true,
  onEvent,
}: UseInterviewWebSocketOptions) {
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const [lastEvent, setLastEvent] = useState<WebSocketEnvelope | null>(null);
  const [sequenceNumber, setSequenceNumber] = useState<number>(0);

  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyClosedRef = useRef<boolean>(false);
  const connectRef = useRef<() => void>(() => {});

  const getWsUrl = useCallback(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const wsProto = apiUrl.startsWith("https") ? "wss" : "ws";
    const host = apiUrl.replace(/^https?:\/\//, "");
    return `${wsProto}://${host}/api/v1/interviews/${interviewId}/realtime`;
  }, [interviewId]);

  const sendEvent = useCallback(
    (type: string, payload: Record<string, unknown> = {}) => {
      const socket = socketRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        const envelope: WebSocketEnvelope = {
          type,
          protocol_version: "1.0",
          event_id: crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}`,
          session_id: interviewId,
          sequence_number: sequenceNumber + 1,
          timestamp: new Date().toISOString(),
          payload,
        };
        socket.send(JSON.stringify(envelope));
        setSequenceNumber((prev) => prev + 1);
      }
    },
    [interviewId, sequenceNumber],
  );

  const connect = useCallback(() => {
    if (!enabled || !interviewId) return;

    try {
      const url = getWsUrl();
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus("connected");
        // Start heartbeat ping every 15s
        heartbeatTimerRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                type: "heartbeat.ping",
                timestamp: new Date().toISOString(),
              }),
            );
          }
        }, 15000);
      };

      socket.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data) as WebSocketEnvelope;
          if (envelope.sequence_number) {
            setSequenceNumber(envelope.sequence_number);
          }
          setLastEvent(envelope);
          if (onEvent) {
            onEvent(envelope);
          }
        } catch {
          // Non-JSON or malformed packet
        }
      };

      socket.onclose = () => {
        setStatus("disconnected");
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }

        // Automatic reconnect if not manually closed
        if (!isManuallyClosedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectRef.current();
          }, 3000);
        }
      };

      socket.onerror = () => {
        setStatus("error");
      };
    } catch {
      setStatus("error");
    }
  }, [enabled, interviewId, getWsUrl, onEvent]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    isManuallyClosedRef.current = false;
    const timeout = setTimeout(() => {
      connect();
    }, 0);

    return () => {
      clearTimeout(timeout);
      isManuallyClosedRef.current = true;
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  return {
    status,
    lastEvent,
    sequenceNumber,
    sendEvent,
  };
}
