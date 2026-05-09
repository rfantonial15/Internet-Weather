import type { ClientMessage, ServerMessage } from "@iw/shared";
import { REALTIME } from "@/config/constants";

type Listener = (msg: ServerMessage) => void;

/**
 * Auto-reconnecting WebSocket. Single connection per browser tab — multiple
 * subscribers attach via `.on(listener)`, no duplicate sockets.
 */
export class RealtimeSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private connectListeners = new Set<(connected: boolean) => void>();
  private retryHandle = 0;
  private closed = false;

  connect() {
    if (this.ws) return;
    try {
      this.ws = new WebSocket(REALTIME.endpoint);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.connectListeners.forEach((l) => l(true));
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as ServerMessage;
        this.listeners.forEach((l) => l(msg));
      } catch {
        // Ignore malformed frames; the server is the source of truth.
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.connectListeners.forEach((l) => l(false));
      if (!this.closed) this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
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
    this.ws?.close();
    window.clearTimeout(this.retryHandle);
  }

  private scheduleReconnect() {
    window.clearTimeout(this.retryHandle);
    this.retryHandle = window.setTimeout(() => this.connect(), REALTIME.reconnectMs);
  }
}

export const socket = new RealtimeSocket();
