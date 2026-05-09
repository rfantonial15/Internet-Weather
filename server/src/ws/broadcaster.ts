import type { WebSocket } from "ws";
import type { ServerMessage } from "@iw/shared";

/** Fan-out wrapper around a Set<WebSocket> with cleanup-on-close. */
export class Broadcaster {
  private clients = new Set<WebSocket>();

  attach(ws: WebSocket) {
    this.clients.add(ws);
    ws.on("close", () => this.clients.delete(ws));
    ws.on("error", () => this.clients.delete(ws));
  }

  broadcast(msg: ServerMessage) {
    const payload = JSON.stringify(msg);
    for (const ws of this.clients) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  }

  size() {
    return this.clients.size;
  }
}
