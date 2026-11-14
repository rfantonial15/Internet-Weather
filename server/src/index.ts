import { WebSocketServer, type WebSocket } from "ws";
import type { ServerMessage } from "@iw/shared";
import { Broadcaster } from "./ws/broadcaster.js";
import { runEventPipeline } from "./pipeline/eventPipeline.js";
import { createNarrationSystem } from "./narration/index.js";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";
/** Drop clients that stop answering pings (dead mobile connections, sleeping laptops). */
const HEARTBEAT_MS = 30_000;

// Clients never need to send more than a tiny subscribe frame.
const wss = new WebSocketServer({ port: PORT, host: HOST, path: "/ws", maxPayload: 4 * 1024 });
const broadcaster = new Broadcaster();
const alive = new WeakMap<WebSocket, boolean>();

wss.on("connection", (ws) => {
  alive.set(ws, true);
  ws.on("pong", () => alive.set(ws, true));
  // Client messages are currently ignored; the stream is the same for all.
  ws.on("message", () => undefined);
  broadcaster.attach(ws);
  const hello: ServerMessage = { type: "hello", serverTime: Date.now(), tickRate: 4 };
  ws.send(JSON.stringify(hello));
});

wss.on("error", (err) => {
  console.error("[internet-weather] server error:", err.message);
  process.exitCode = 1;
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (alive.get(ws) === false) {
      ws.terminate();
      continue;
    }
    alive.set(ws, false);
    ws.ping();
  }
}, HEARTBEAT_MS);

const narration = createNarrationSystem();
narration.onNarration((n) => {
  broadcaster.broadcast({ type: "narration", narration: n });
});

// Coarse server-side tension so the narrator can pick a tone. The client
// computes its own richer value from the simulation; tone selection is
// robust to the difference.
let tension = 0;

const pipeline = runEventPipeline((event) => {
  narration.observe(event);
  const contribution =
    event.kind === "rage" || event.kind === "controversy"
      ? event.intensity * 0.04
      : event.kind === "news"
        ? event.intensity * 0.025
        : -0.005;
  tension = Math.max(0, Math.min(1, tension + contribution));
  narration.engine.tension = tension;
  broadcaster.broadcast({ type: "event", event });
});

const pulse = setInterval(() => {
  tension = Math.max(0, tension - 0.01);
  narration.engine.tension = tension;
  broadcaster.broadcast({ type: "pulse", t: Date.now() });
}, 1000);

function shutdown(signal: string) {
  console.log(`[internet-weather] ${signal}: shutting down`);
  clearInterval(heartbeat);
  clearInterval(pulse);
  pipeline.stop();
  narration.stop();
  for (const ws of wss.clients) ws.close(1001, "server shutting down");
  wss.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

wss.on("listening", () => {
  console.log(`[internet-weather] ws server listening on ${HOST}:${PORT}/ws`);
});
