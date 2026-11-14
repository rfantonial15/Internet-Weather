import type { EventKind, WeatherEvent } from "./types.js";
import { CITIES, type City } from "./cities.js";

/**
 * Live Wikipedia edits as weather.
 *
 * Input is one record from Wikimedia's public "recentchange" stream. Output
 * is a WeatherEvent, or null for changes we don't draw. Pure and stateful
 * only in memory (recent edits per page), so it can be tested without the
 * network; the server's wikimedia source feeds it.
 *
 *   new article                     build      someone made something
 *   regular article edit            build      (half sampled, lowest priority)
 *   a revert                        controversy
 *   2+ reverts on one page / 15 min rage       an edit war
 *   a page blanked                  rage       classic vandalism
 *   an editor blocked               rage
 *   3 / 6 / 10 edits on a page      trend / viral / news
 *   a page protected                news       usually after a rush of edits
 *   a "thanks" between editors      wholesome
 *   a new editor signs up           wholesome
 *
 * Placement: the wiki's language picks a set of metros where it is spoken
 * (de -> Berlin, Munich, Vienna...); a hash of the page title picks one, so
 * a hot page keeps raining on the same city. Usernames and page titles are
 * never put in the event: anyone can type a title, so it isn't shown.
 */

/** Recentchange record fields this module reads. */
export interface RecentChange {
  type?: string;
  namespace?: number;
  wiki?: string;
  server_name?: string;
  bot?: boolean;
  title?: string;
  comment?: string;
  length?: { old?: number | null; new?: number | null };
  log_type?: string | null;
}

export interface WikiSignal {
  kind: EventKind;
  intensity: number;
  at: { lat: number; lon: number };
  label: string;
  /** Regular edits are filler: the rate limiter drops these first. */
  filler: boolean;
}

/** Wikipedia language -> metros where it is widely read and edited. */
const LANG_CITIES: Record<string, string[]> = {
  en: ["New York", "London", "Los Angeles", "Chicago", "Toronto", "Sydney", "Houston", "San Francisco", "Seattle", "Boston", "Atlanta", "Melbourne", "Manchester", "Dublin", "Auckland", "Vancouver", "Delhi", "Mumbai", "Bangalore", "Manila", "Singapore", "Lagos", "Nairobi", "Johannesburg", "Karachi"],
  de: ["Berlin", "Munich", "Rhine-Ruhr", "Vienna"],
  fr: ["Paris", "Montreal", "Brussels", "Kinshasa", "Abidjan", "Dakar", "Casablanca", "Algiers", "Tunis"],
  es: ["Madrid", "Barcelona", "Mexico City", "Buenos Aires", "Bogota", "Lima", "Santiago", "Caracas", "Guadalajara", "Monterrey", "Medellin", "Quito", "Havana", "Guatemala City", "Montevideo", "La Paz", "Asuncion", "Guayaquil", "Cordoba"],
  pt: ["Sao Paulo", "Rio de Janeiro", "Lisbon", "Belo Horizonte", "Brasilia", "Recife", "Fortaleza", "Salvador", "Porto Alegre", "Curitiba", "Manaus", "Belem", "Luanda"],
  ru: ["Moscow", "Saint Petersburg", "Novosibirsk", "Yekaterinburg", "Omsk", "Krasnoyarsk", "Irkutsk", "Vladivostok", "Almaty", "Tashkent"],
  uk: ["Kyiv"],
  pl: ["Warsaw"],
  it: ["Rome", "Milan"],
  nl: ["Amsterdam", "Brussels"],
  sv: ["Stockholm"],
  no: ["Oslo"],
  nn: ["Oslo"],
  da: ["Copenhagen"],
  fi: ["Helsinki"],
  is: ["Reykjavik"],
  cs: ["Vienna"],
  sk: ["Vienna"],
  hu: ["Budapest"],
  ro: ["Bucharest"],
  el: ["Athens"],
  tr: ["Istanbul", "Ankara"],
  ar: ["Cairo", "Riyadh", "Jeddah", "Baghdad", "Casablanca", "Algiers", "Khartoum", "Dubai", "Tunis"],
  arz: ["Cairo"],
  fa: ["Tehran", "Kabul"],
  he: ["Tel Aviv"],
  ur: ["Karachi", "Lahore"],
  hi: ["Delhi", "Mumbai"],
  bn: ["Dhaka", "Kolkata"],
  ta: ["Chennai", "Colombo"],
  te: ["Hyderabad"],
  mr: ["Pune", "Mumbai"],
  gu: ["Ahmedabad"],
  kn: ["Bangalore"],
  zh: ["Beijing", "Shanghai", "Guangzhou", "Shenzhen", "Chongqing", "Chengdu", "Taipei", "Hong Kong", "Wuhan", "Hangzhou", "Nanjing", "Xi'an", "Tianjin", "Singapore"],
  ja: ["Tokyo", "Osaka", "Nagoya"],
  ko: ["Seoul", "Busan"],
  id: ["Jakarta", "Surabaya"],
  ms: ["Kuala Lumpur"],
  vi: ["Hanoi", "Ho Chi Minh City"],
  th: ["Bangkok"],
  tl: ["Manila", "Cebu"],
  ceb: ["Cebu", "Davao", "Cagayan de Oro"],
  my: ["Yangon"],
  shn: ["Yangon"],
  km: ["Phnom Penh"],
  ne: ["Kathmandu"],
  si: ["Colombo"],
  mn: ["Ulaanbaatar"],
  sw: ["Nairobi", "Dar es Salaam", "Kampala"],
  am: ["Addis Ababa"],
  ha: ["Kano", "Abuja"],
  yo: ["Lagos"],
  so: ["Mogadishu"],
  mg: ["Antananarivo"],
  af: ["Cape Town", "Johannesburg"],
  zu: ["Johannesburg"],
  uz: ["Tashkent"],
  kk: ["Almaty"],
  ca: ["Barcelona"],
  eu: ["Madrid"],
  gl: ["Madrid"],
  ga: ["Dublin"],
  cy: ["Manchester"],
};

const BY_NAME = new Map(CITIES.map((c) => [c.name, c]));
const LANG_TABLE = new Map<string, City[]>(
  Object.entries(LANG_CITIES).map(([lang, names]) => [
    lang,
    names.map((n) => BY_NAME.get(n)).filter((c): c is City => !!c),
  ]),
);

/** Edit summaries that undo someone else's edit, in the bigger languages. */
const REVERT_RE =
  /\b(revert(ed|ing)?|undid|undo|rvv?)\b|rückgängig|révoqu|annulation|revertid|reversão|откат|отмен|скасу|取り消|取消|回退|되돌|annullat|ongedaan|cofnię|geri al/i;

/** Share of regular edits drawn; the rest would bury the rarer signals. */
const FILLER_SHARE = 0.5;

/** Log entries we draw, by log type. */
const LOG_SIGNALS: Record<string, { kind: EventKind; intensity: number; label: string }> = {
  thanks: { kind: "wholesome", intensity: 0.5, label: "thanks sent" },
  newusers: { kind: "wholesome", intensity: 0.4, label: "new editor joined" },
  block: { kind: "rage", intensity: 0.55, label: "editor blocked" },
  protect: { kind: "news", intensity: 0.7, label: "page protected" },
};

const HOT_WINDOW_MS = 10 * 60_000;
const REVERT_WINDOW_MS = 15 * 60_000;
const MAX_PAGES = 5000;

/** Stable 32-bit hash (FNV-1a) of a string. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Language code of a Wikipedia host ("de.wikipedia.org" -> "de"), else null. */
export function wikipediaLang(serverName: string | undefined): string | null {
  const m = /^([a-z-]+)\.wikipedia\.org$/.exec(serverName ?? "");
  return m ? m[1] : null;
}

/** Population-weighted metro for a language, chosen by a hash. */
export function cityForLang(lang: string, key: string): City | null {
  const list = LANG_TABLE.get(lang);
  if (!list || list.length === 0) return null;
  const weights = list.map((c) => Math.pow(c.pop, 0.6));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = (hash(key) / 0x100000000) * total;
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

function jitter(c: City, rand: () => number): { lat: number; lon: number } {
  const j = () => (rand() + rand() - 1) * 1.2;
  const lat = Math.max(-85, Math.min(85, c.lat + j()));
  let lon = c.lon + j() / Math.max(0.25, Math.cos((c.lat * Math.PI) / 180));
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;
  return { lat, lon };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export class WikiClassifier {
  /** page key -> recent edit times */
  private edits = new Map<string, number[]>();
  /** page key -> recent revert times */
  private reverts = new Map<string, number[]>();

  constructor(private rand: () => number = Math.random) {}

  classify(rc: RecentChange, now: number): WikiSignal | null {
    if (rc.bot) return null;
    const lang = wikipediaLang(rc.server_name);
    if (!lang) return null;

    if (rc.type === "log") {
      const sig = LOG_SIGNALS[rc.log_type ?? ""];
      if (!sig) return null;
      const city = cityForLang(lang, `${rc.title ?? ""}${now}`);
      if (!city) return null;
      return { kind: sig.kind, intensity: sig.intensity, at: jitter(city, this.rand), label: `${sig.label} · ${lang}`, filler: false };
    }

    if (rc.namespace !== 0 || (rc.type !== "edit" && rc.type !== "new")) return null;
    const page = `${lang}:${rc.title ?? ""}`;
    const city = cityForLang(lang, page);
    if (!city) return null;
    const at = jitter(city, this.rand);
    const oldLen = rc.length?.old ?? 0;
    const newLen = rc.length?.new ?? 0;
    const delta = Math.abs(newLen - oldLen);

    if (rc.type === "new") {
      const intensity = clamp01(0.3 + Math.log10(newLen + 1) / 10);
      return { kind: "build", intensity, at, label: `new article · ${lang}`, filler: false };
    }

    const hot = this.bump(this.edits, page, now, HOT_WINDOW_MS);

    if (REVERT_RE.test(rc.comment ?? "")) {
      const n = this.bump(this.reverts, page, now, REVERT_WINDOW_MS);
      if (n >= 2) {
        return { kind: "rage", intensity: clamp01(0.6 + 0.1 * Math.min(3, n - 2)), at, label: `edit war · ${lang}`, filler: false };
      }
      return { kind: "controversy", intensity: 0.5, at, label: `revert · ${lang}`, filler: false };
    }

    // Most of a sizable page removed in one edit: vandalism.
    if (oldLen > 2000 && newLen < oldLen * 0.2) {
      return { kind: "rage", intensity: 0.6, at, label: `page blanked · ${lang}`, filler: false };
    }

    // A page being edited again and again: attention is gathering there.
    if (hot === 3) return { kind: "trend", intensity: 0.45, at, label: `page heating up · ${lang}`, filler: false };
    if (hot === 6) return { kind: "viral", intensity: 0.65, at, label: `edit rush · ${lang}`, filler: false };
    if (hot >= 10 && (hot - 10) % 5 === 0) {
      return { kind: "news", intensity: clamp01(0.8 + (hot - 10) / 100), at, label: `breaking edits · ${lang}`, filler: false };
    }

    if (this.rand() >= FILLER_SHARE) return null;
    const intensity = clamp01(0.2 + Math.log10(delta + 1) / 10);
    return { kind: "build", intensity, at, label: delta >= 3000 ? `big edit · ${lang}` : `edit · ${lang}`, filler: true };
  }

  /** Record one hit for `key`, drop hits older than `windowMs`, return the count. */
  private bump(map: Map<string, number[]>, key: string, now: number, windowMs: number): number {
    const list = (map.get(key) ?? []).filter((t) => now - t < windowMs);
    list.push(now);
    map.delete(key); // re-insert so the Map's order tracks recency
    map.set(key, list);
    if (map.size > MAX_PAGES) {
      const oldest = map.keys().next().value;
      if (oldest !== undefined) map.delete(oldest);
    }
    return list.length;
  }
}

/**
 * Token bucket: at most `perSec` events a second on average, bursts up to
 * `burst`. Filler (regular edits) only passes while the bucket is more than
 * half full, so the rarer signals always have room.
 */
export class RateGate {
  private tokens: number;
  private last: number;
  constructor(
    private perSec: number,
    private burst: number,
    now: number,
  ) {
    this.tokens = burst;
    this.last = now;
  }

  allow(filler: boolean, now: number): boolean {
    this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 1000) * this.perSec);
    this.last = now;
    const floor = filler ? this.burst / 2 : 0;
    if (this.tokens - 1 < floor) return false;
    this.tokens -= 1;
    return true;
  }
}

/** Turn a classified change into a wire event. */
export function toWeatherEvent(sig: WikiSignal, seq: number, now: number): WeatherEvent {
  return {
    id: `wp_${now.toString(36)}_${seq}`,
    kind: sig.kind,
    intensity: sig.intensity,
    t: now,
    at: sig.at,
    label: sig.label,
    source: "wikipedia",
  };
}
