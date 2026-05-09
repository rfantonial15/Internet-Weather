import { WebSocketServer } from "ws";
import type { ServerMessage } from "@iw/shared";
import { Broadcaster } from "./ws/broadcaster.js";
import { runEventPipeline } from "./pipeline/eventPipeline.js";
import { createNarrationSystem } from "./narration/index.js";

const PORT = Number(process.env.PORT ?? 8787);

const wss = new WebSocketServer({ port: PORT, path: "/ws" });
const broadcaster = new Broadcaster();

wss.on("connection", (ws) => {
  broadcaster.attach(ws);
  const hello: ServerMessage = { type: "hello", serverTime: Date.now(), tickRate: 4 };
  ws.send(JSON.stringify(hello));
});

const narration = createNarrationSystem();
narration.onNarration((n) => {
  const msg: ServerMessage = { type: "narration", narration: n };
  broadcaster.broadcast(msg);
});

// Track a simple tension signal locally so the narrator can read it.
// (The client computes its own from sim modules — server's view is coarser
// but doesn't need to be exact; tone selection is robust to noise.)
let tensionEMA = 0;

runEventPipeline((event) => {
  narration.observe(event);

  // Update tension: rage + controversy contribute strongly, news moderately.
  const contribution =
    event.kind === "rage" || event.kind === "controversy" ? event.intensity * 0.04 :
    event.kind === "news" ? event.intensity * 0.025 :
    -0.005;
  tensionEMA = Math.max(0, Math.min(1, tensionEMA + contribution));
  narration.engine.tension = tensionEMA;

  const msg: ServerMessage = { type: "event", event };
  broadcaster.broadcast(msg);
});

setInterval(() => {
  // Slow tension decay so spikes fade between events.
  tensionEMA = Math.max(0, tensionEMA - 0.01);
  narration.engine.tension = tensionEMA;

  const msg: ServerMessage = { type: "pulse", t: Date.now() };
  broadcaster.broadcast(msg);
}, 1000);

console.log(`[internet-weather] ws server listening on :${PORT}/ws`);
