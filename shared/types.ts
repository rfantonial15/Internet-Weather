/**
 * Wire format shared between client and server.
 *
 * Events are intentionally semantic ("rage", "wholesome") rather than tied to
 * specific sources (Twitter, GitHub). Source plugins on the server normalize
 * raw signals into this shape; the client maps the kind onto a visual phenomenon.
 */

export type EventKind =
  | "rage"        // storms, purple lightning
  | "wholesome"   // auroras
  | "viral"       // spreading fire
  | "trend"       // heatwave
  | "news"        // earthquake / shockwave
  | "build"       // glowing city pulses (github / deploys)
  | "controversy" // forked lightning
  | "meme";       // biological bloom

export interface GeoPoint {
  /** -90..90 */
  lat: number;
  /** -180..180 */
  lon: number;
}

export interface WeatherEvent {
  id: string;
  kind: EventKind;
  /** 0..1 — drives size, brightness, persistence */
  intensity: number;
  /** Emit time, ms since epoch */
  t: number;
  /** Optional location; if omitted, the event is global atmosphere */
  at?: GeoPoint;
  /** Free-form label shown in the ticker */
  label?: string;
  /** Origin source key, e.g. "github", "news", "sim" */
  source: string;
}

/**
 * Tone driving the narrator's voice. Picked per-narration based on the
 * dominant phenomenon and global tension; the renderer uses it to colour
 * and pace the on-screen overlay.
 */
export type NarrationTone =
  | "contemplative"  // calm, reflective
  | "observational"  // neutral, documentary
  | "concerned"      // worried, cautious
  | "electric"       // high-energy, urgent
  | "awed"           // wondrous
  | "grave";         // heavy, weighty

/**
 * Higher-level pattern recognized from a window of WeatherEvents. The
 * narrator reads from this — never directly from raw events — so swapping
 * a template narrator for an LLM doesn't change the upstream pipeline.
 */
export type PhenomenonKind =
  | "controversy_front"
  | "rage_storm"
  | "viral_surge"
  | "meme_migration"
  | "build_wave"
  | "wholesome_bloom"
  | "news_shock"
  | "trend_rising"
  | "quiet";

export interface Narration {
  id: string;
  /** Emit time, ms since epoch */
  t: number;
  text: string;
  tone: NarrationTone;
  phenomenon: PhenomenonKind;
  /** 0..1 — drives overlay prominence + lifetime */
  intensity: number;
  /** Event ids referenced by this narration (for click-to-zoom UX) */
  refs?: string[];
  /** Human region label, if relevant (e.g., "the North Atlantic") */
  region?: string;
}

export type ServerMessage =
  | { type: "hello"; serverTime: number; tickRate: number }
  | { type: "event"; event: WeatherEvent }
  | { type: "pulse"; t: number }
  | { type: "narration"; narration: Narration };

export type ClientMessage =
  | { type: "subscribe"; kinds?: EventKind[] };
