import type { EventSource } from "./source.js";
import { RateGate, toWeatherEvent, WikiClassifier, type RecentChange } from "../../../shared/wikimedia.js";

/**
 * Live Wikipedia edits from Wikimedia's public EventStreams feed (server-sent
 * events, no key). Each change goes through the shared classifier
 * (shared/wikimedia.ts) and a rate gate, so the globe gets a few signals a
 * second however busy the wikis are.
 *
 * Wikimedia asks automated clients to send a descriptive User-Agent; set
 * IW_USER_AGENT to one with your contact details when you deploy.
 */
const STREAM_URL = "https://stream.wikimedia.org/v2/stream/recentchange";
const USER_AGENT = process.env.IW_USER_AGENT ?? "event-globe/0.3 (open-source internet weather visualization)";
/** No bytes for this long means a stuck connection: reconnect. */
const IDLE_MS = 45_000;
const MIN_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 60_000;

let abort: AbortController | null = null;
let running = false;

export const wikimediaSource: EventSource = {
  key: "wikipedia",
  start(emit) {
    if (running) return;
    running = true;
    const classifier = new WikiClassifier();
    const gate = new RateGate(3, 8, Date.now());
    let seq = 0;
    let backoff = MIN_BACKOFF_MS;

    const handle = (data: string) => {
      let rc: RecentChange;
      try {
        rc = JSON.parse(data) as RecentChange;
      } catch {
        return;
      }
      const now = Date.now();
      const sig = classifier.classify(rc, now);
      if (!sig || !gate.allow(sig.filler, now)) return;
      emit(toWeatherEvent(sig, seq++, now));
    };

    const loop = async () => {
      while (running) {
        abort = new AbortController();
        const ctl = abort;
        let idle: ReturnType<typeof setTimeout> | null = null;
        const kick = () => {
          if (idle) clearTimeout(idle);
          idle = setTimeout(() => ctl.abort(), IDLE_MS);
        };
        try {
          const res = await fetch(STREAM_URL, {
            headers: { Accept: "text/event-stream", "User-Agent": USER_AGENT },
            signal: ctl.signal,
          });
          if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
          console.log("[wikipedia] connected to the recent-changes stream");
          backoff = MIN_BACKOFF_MS;
          kick();

          // Minimal SSE reader: "data:" lines accumulate until a blank line.
          const decoder = new TextDecoder();
          let buf = "";
          let data = "";
          for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
            kick();
            buf += decoder.decode(chunk, { stream: true });
            let nl: number;
            while ((nl = buf.indexOf("\n")) >= 0) {
              const line = buf.slice(0, nl).replace(/\r$/, "");
              buf = buf.slice(nl + 1);
              if (line === "") {
                if (data) handle(data);
                data = "";
              } else if (line.startsWith("data:")) {
                data += line.slice(5).trimStart();
              }
            }
            if (buf.length > 1_000_000) buf = ""; // a runaway line: drop it
          }
          throw new Error("stream ended");
        } catch (err) {
          if (!running) break;
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[wikipedia] ${msg}; retrying in ${Math.round(backoff / 1000)}s`);
          await new Promise((r) => setTimeout(r, backoff));
          backoff = Math.min(MAX_BACKOFF_MS, backoff * 2);
        } finally {
          if (idle) clearTimeout(idle);
        }
      }
    };
    void loop();
  },
  stop() {
    running = false;
    abort?.abort();
    abort = null;
  },
};
