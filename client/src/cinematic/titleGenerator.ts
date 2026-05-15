import type { EventKind, GeoPoint } from "@iw/shared";
import type { Story } from "./storyDetector";

/**
 * Trailer-style titles. Output is intentionally a two-part card:
 *
 *   - eyebrow:  short tag stamped above the title ("LIVE · NORTH PACIFIC")
 *   - title:    the dramatic line ("THE REDDIT REVOLT")
 *   - subtitle: optional descender, set quieter ("a thread comes apart")
 *
 * The same story should always produce the same title (deterministic on
 * story.id) so a re-export of an old clip looks identical.
 */
export interface TrailerTitle {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Hex tint for the eyebrow rule + REC dot. */
  accent: string;
}

const REGION_BANDS: { label: string; lat: [number, number]; lon: [number, number] }[] = [
  { label: "the Pacific Northwest", lat: [40, 65], lon: [-150, -110] },
  { label: "the West Coast",        lat: [25, 45], lon: [-130, -110] },
  { label: "the East Coast",        lat: [25, 50], lon: [-90, -65] },
  { label: "the Heartland",         lat: [30, 50], lon: [-105, -85] },
  { label: "the Atlantic",          lat: [-10, 55], lon: [-65, -10] },
  { label: "Western Europe",        lat: [40, 60], lon: [-10, 20] },
  { label: "Northern Europe",       lat: [55, 75], lon: [0, 35] },
  { label: "Eastern Europe",        lat: [40, 60], lon: [20, 50] },
  { label: "the Middle East",       lat: [15, 40], lon: [30, 60] },
  { label: "South Asia",            lat: [5, 35], lon: [60, 95] },
  { label: "Southeast Asia",        lat: [-12, 25], lon: [95, 145] },
  { label: "East Asia",             lat: [20, 50], lon: [100, 145] },
  { label: "the South Pacific",     lat: [-50, 0], lon: [140, -120] },
  { label: "Oceania",               lat: [-45, -10], lon: [110, 180] },
  { label: "South America",         lat: [-55, 12], lon: [-82, -34] },
  { label: "Sub-Saharan Africa",    lat: [-35, 18], lon: [-20, 50] },
  { label: "the Arctic",            lat: [70, 90], lon: [-180, 180] },
  { label: "the Southern Ocean",    lat: [-90, -55], lon: [-180, 180] },
];

function regionLabel(p: GeoPoint): string {
  for (const r of REGION_BANDS) {
    const inLat = p.lat >= r.lat[0] && p.lat <= r.lat[1];
    const lonInRange = r.lon[0] <= r.lon[1]
      ? p.lon >= r.lon[0] && p.lon <= r.lon[1]
      : p.lon >= r.lon[0] || p.lon <= r.lon[1];
    if (inLat && lonInRange) return r.label;
  }
  return p.lat > 0 ? "the northern hemisphere" : "the southern hemisphere";
}

const SOURCE_PROPER: Record<string, string> = {
  reddit: "Reddit",
  twitter: "Twitter",
  x: "X",
  bluesky: "Bluesky",
  github: "GitHub",
  hn: "Hacker News",
  hackernews: "Hacker News",
  news: "the Newsroom",
  tiktok: "TikTok",
  youtube: "YouTube",
  mastodon: "Mastodon",
  threads: "Threads",
  discord: "Discord",
  sim: "the Network",
};

function sourceProper(s: string): string {
  return SOURCE_PROPER[s.toLowerCase()] ?? capitalize(s);
}

function capitalize(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

const TITLES: Record<EventKind, ((s: Story, region: string, src: string) => TrailerTitle)[]> = {
  rage: [
    (_s, _r, src) => t({ eyebrow: "rage front", title: `the ${src} revolt`, subtitle: "tempers run hot at scale" }),
    (_s, r) =>     t({ eyebrow: "anger surge", title: `flame war over ${r}`, subtitle: "the sky goes purple" }),
    (_s, _r, src) => t({ eyebrow: "outrage", title: `${src} burns`, subtitle: "a thread comes apart" }),
  ],
  controversy: [
    (_s, r) =>     t({ eyebrow: "split take", title: `the great ${r} divide`, subtitle: "two sides, no middle" }),
    (_s, _r, src) => t({ eyebrow: "ratio event", title: `${src} chooses sides`, subtitle: "the discourse forks" }),
    (_s, _r, _src) => t({ eyebrow: "dual front", title: "the line in the timeline", subtitle: "everybody picks" }),
  ],
  viral: [
    (_s, r) =>     t({ eyebrow: "viral surge", title: `something is loose over ${r}`, subtitle: "share counts climb" }),
    (_s, _r, src) => t({ eyebrow: "going viral", title: `${src} catches fire`, subtitle: "the curve bends up" }),
    (_s, _r, _src) => t({ eyebrow: "spread vector", title: "the thing everyone is sending", subtitle: "watch the lines move" }),
  ],
  meme: [
    (_s, _r, _src) => t({ eyebrow: "meme outbreak", title: "the great meme migration", subtitle: "a format finds its home" }),
    (_s, r) =>     t({ eyebrow: "format remix", title: `${r}, ironically`, subtitle: "iteration, then iteration of iteration" }),
    (_s, _r, src) => t({ eyebrow: "ironic surge", title: `${src} laughs in unison`, subtitle: "the joke writes itself" }),
  ],
  trend: [
    (_s, r) =>     t({ eyebrow: "trend rising", title: `${r} goes searching`, subtitle: "the heatmap tilts" }),
    (_s, _r, src) => t({ eyebrow: "topic surge", title: `${src} settles on a subject`, subtitle: "everything points one way" }),
    (_s, _r, _src) => t({ eyebrow: "hashtag wave", title: "a single thought, replicated", subtitle: "the index spikes" }),
  ],
  news: [
    (_s, r) =>     t({ eyebrow: "breaking", title: `shockwave: ${r}`, subtitle: "the wires go live" }),
    (_s, _r, _src) => t({ eyebrow: "live update", title: "the news reaches the network", subtitle: "everything else stops" }),
    (_s, _r, src) => t({ eyebrow: "press alert", title: `${src} gets the call`, subtitle: "the room falls quiet" }),
  ],
  build: [
    (_s, _r, src) => t({ eyebrow: "deploy wave", title: `${src} ships`, subtitle: "lights move across the grid" }),
    (_s, r) =>     t({ eyebrow: "build pulse", title: `the makers of ${r} push`, subtitle: "main goes green" }),
    (_s, _r, _src) => t({ eyebrow: "release cut", title: "a thousand merges to main", subtitle: "the city flickers awake" }),
  ],
  wholesome: [
    (_s, r) =>     t({ eyebrow: "wholesome bloom", title: `something good in ${r}`, subtitle: "the aurora holds" }),
    (_s, _r, _src) => t({ eyebrow: "kindness chain", title: "the network smiles", subtitle: "a small thing, repeated" }),
    (_s, _r, src) => t({ eyebrow: "happy news", title: `${src} catches its breath`, subtitle: "a pause from the noise" }),
  ],
};

const ACCENT: Record<EventKind, string> = {
  rage: "#ff4f6e",
  controversy: "#c98bff",
  viral: "#ff8a3d",
  meme: "#5cf3a9",
  trend: "#ffd05c",
  news: "#ff5c5c",
  build: "#5cf3ff",
  wholesome: "#a5b8ff",
};

function t(parts: { eyebrow: string; title: string; subtitle: string }): TrailerTitle {
  return {
    eyebrow: parts.eyebrow.toUpperCase(),
    title: parts.title.toUpperCase(),
    subtitle: parts.subtitle,
    accent: "#ffffff",
  };
}

/**
 * Pick a deterministic title for a story. Uses a hash of the id so the same
 * story always produces the same line — important for replay & re-export.
 */
export function titleForStory(story: Story): TrailerTitle {
  const region = regionLabel(story.epicenter);
  const src = sourceProper(story.source);
  const variants = TITLES[story.kind] ?? TITLES.viral;
  const idx = hash(story.id) % variants.length;
  const built = variants[idx](story, region, src);
  return { ...built, accent: ACCENT[story.kind] };
}

/**
 * Special-case "Top of the Hour"-style global event titles when a story is
 * unusually broad (high spread, many sources). The detector currently never
 * emits these — exposed for future global narrators.
 */
export function globalTitle(headline: string, accent = "#ff5c5c"): TrailerTitle {
  return {
    eyebrow: "GLOBAL",
    title: headline.toUpperCase(),
    subtitle: "the whole network feels it",
    accent,
  };
}

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
