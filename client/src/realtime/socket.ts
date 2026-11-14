import type { ClientMessage, ServerMessage } from "@iw/shared";
import { REALTIME } from "@/config/constants";

type Listener = (msg: ServerMessage) => void;

/**
 * Auto-reconnecting WebSocket, one per tab; subscribers attach via `.on()`.
 *
 * Reconnects back off exponentially (1.5 s doubling to 30 s, with jitter)
 * and pause while the tab is hidden, so a deployment without a server
 * doesn't retry forever every 1.5 s. A successful open resets the backoff.
 */
export class RealtimeSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private connectListeners = new Set<(connected: boolean) => void>();
  private retryHandle = 0;
  private attempt = 0;
  private closed = false;
  private wasOpen = false;

  constructor() {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden && !this.ws && !this.closed) {
          window.clearTimeout(this.retryHandle);
          this.connect();
        }
      });
    }
  }

  connect() {
    if (this.ws || !REALTIME.endpoint) return;
    this.closed = false;
    let ws: WebSocket;
    try {
      ws = new WebSocket(REALTIME.endpoint);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    // Every handler ignores a socket that is no longer the current one. React
    // StrictMode (and fast reconnects) can close a socket while it is still
    // connecting; its late onclose must not clobber the replacement.
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.attempt = 0;
      this.wasOpen = true;
      this.connectListeners.forEach((l) => l(true));
    };

    ws.onmessage = (ev) => {
      if (this.ws !== ws) return;
      if (typeof ev.data !== "string" || ev.data.length > 64 * 1024) return;
      let msg: ServerMessage;
      try {
        msg = JSON.parse(ev.data) as ServerMessage;
      } catch {
        return; // malformed frame; the server is the source of truth
      }
      if (!msg || typeof msg !== "object" || typeof msg.type !== "string") return;
      this.listeners.forEach((l) => l(msg));
    };

    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.wasOpen) {
        this.wasOpen = false;
        this.connectListeners.forEach((l) => l(false));
      }
      if (!this.closed) this.scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  on(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onConnect(listener: (connected: boolean) => void) {
    this.connectListeners.add(listener);
    return () => this.connectListeners.delete(listener);
  }

  close() {
    this.closed = true;
    window.clearTimeout(this.retryHandle);
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      if (this.wasOpen) {
        this.wasOpen = false;
        this.connectListeners.forEach((l) => l(false));
      }
      ws.close();
    }
  }

  private scheduleReconnect() {
    window.clearTimeout(this.retryHandle);
    if (typeof document !== "undefined" && document.hidden) return; // resume on visibility
    const base = Math.min(REALTIME.maxReconnectMs, REALTIME.reconnectMs * 2 ** this.attempt);
    this.attempt++;
    const delay = base * (0.8 + Math.random() * 0.4);
    this.retryHandle = window.setTimeout(() => this.connect(), delay);
  }
}

export const socket = new RealtimeSocket();
