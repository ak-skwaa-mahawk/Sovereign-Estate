import { useState, useEffect } from 'react';

export interface OraclePulseData {
  cycle: string;
  T: string;
  I: string;
  F: string;
  resonance: string;
  proofHash: string;
  timestamp: string;
}

export interface StreamStepData {
  step: number;
  fragments: Array<{ id: number; name: string; x: number; y: number; recombined: boolean }>;
  ledgers: Record<string, string>;
  mesh_reciprocity: number;
  trinity_stability: number;
}

export function useGlyphStream() {
  const [connected, setConnected] = useState(false);
  const [latestStep, setLatestStep] = useState<StreamStepData | null>(null);
  const [latestPulse, setLatestPulse] = useState<OraclePulseData | null>(null);
  const [pulseHistory, setPulseHistory] = useState<OraclePulseData[]>([]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/glyph-stream`;

    let ws: WebSocket | null = null;
    let timer: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[GlyphStream] Connected to WebSocket');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'step') {
            setLatestStep(message);
          } else if (message.type === 'oracle_pulse') {
            console.log('[GlyphStream] Received Oracle Pulse:', message.data);
            setLatestPulse(message.data);
            setPulseHistory((prev) => [message.data, ...prev.slice(0, 9)]);
          }
        } catch (err) {
          console.error('[GlyphStream] Message parsing error:', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        console.warn('[GlyphStream] Socket closed. Retrying in 2s...');
        timer = setTimeout(connect, 2000);
      };

      ws.onerror = (err) => {
        console.error('[GlyphStream] Socket error:', err);
        ws?.close();
      };
    };

    connect();

    return () => {
      clearTimeout(timer);
      ws?.close();
    };
  }, []);

  return { connected, latestStep, latestPulse, pulseHistory };
}
