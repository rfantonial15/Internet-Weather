import { CITIES, type City } from "@iw/shared/cities";

/**
 * "Your city" without asking for location permission: the `?city=` link
 * parameter wins, then the viewer's own pick, then a guess from the
 * browser's time zone (Asia/Manila -> Manila). Nothing leaves the browser.
 */

const STORAGE_KEY = "iw.city";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

const BY_NAME = new Map(CITIES.map((c) => [norm(c.name), c]));

/** Zone names that differ from the list name, or name a nearby metro. */
const ZONE_ALIAS: Record<string, string> = {
  calcutta: "Kolkata",
  saigon: "Ho Chi Minh City",
  hochiminh: "Ho Chi Minh City",
  kiev: "Kyiv",
  rangoon: "Yangon",
  katmandu: "Kathmandu",
  jerusalem: "Tel Aviv",
  ulanbator: "Ulaanbaatar",
  guatemala: "Guatemala City",
  bahia: "Salvador",
  makassar: "Surabaya",
  hobart: "Melbourne",
  canberra: "Sydney",
  zurich: "Milan",
  prague: "Vienna",
  bratislava: "Vienna",
  belgrade: "Budapest",
  sofia: "Bucharest",
  riga: "Stockholm",
  tallinn: "Helsinki",
  vilnius: "Warsaw",
  minsk: "Warsaw",
  karachi: "Karachi",
  muscat: "Dubai",
  qatar: "Dubai",
  kuwait: "Riyadh",
  bahrain: "Riyadh",
  amman: "Tel Aviv",
  beirut: "Tel Aviv",
  damascus: "Tel Aviv",
  tbilisi: "Ankara",
  yerevan: "Ankara",
  baku: "Tehran",
  halifax: "Montreal",
  stjohns: "Montreal",
  regina: "Winnipeg",
  indianapolis: "Chicago",
  louisville: "Chicago",
  boise: "Denver",
  puertorico: "Miami",
  panama: "Bogota",
  costarica: "Guatemala City",
  elsalvador: "Guatemala City",
  managua: "Guatemala City",
  tegucigalpa: "Guatemala City",
  santodomingo: "Havana",
  jamaica: "Havana",
  kualalumpur: "Kuala Lumpur",
};

/** Rough continent boxes for the time-zone fallback. */
const AREA: Record<string, (c: City) => boolean> = {
  Europe: (c) => c.lat > 34 && c.lon > -25 && c.lon < 50,
  Africa: (c) => c.lat < 38 && c.lon > -20 && c.lon < 55,
  Asia: (c) => c.lon > 25 && c.lat > -12,
  America: (c) => c.lon < -30,
  Australia: (c) => c.lat < -10 && c.lon > 110,
  Pacific: () => true,
  Atlantic: () => true,
  Indian: () => true,
};

/** City for an IANA zone; `janOffsetMin` is the zone's UTC offset in January. */
export function cityForZone(zone: string, janOffsetMin: number): City {
  const parts = zone.split("/");
  const last = norm(parts[parts.length - 1] ?? "");
  const direct = BY_NAME.get(last) ?? BY_NAME.get(norm(ZONE_ALIAS[last] ?? ""));
  if (direct) return direct;

  // Fallback: the biggest metro near the zone's meridian, inside its area.
  const lon = (janOffsetMin / 60) * 15;
  const inArea = AREA[parts[0]] ?? (() => true);
  let best: City | null = null;
  for (const c of CITIES) {
    const dLon = Math.abs(((c.lon - lon + 540) % 360) - 180);
    if (dLon > 12 || !inArea(c)) continue;
    if (!best || c.pop > best.pop) best = c;
  }
  return best ?? CITIES[0];
}

export function cityByName(name: string | null | undefined): City | null {
  if (!name) return null;
  return BY_NAME.get(norm(name)) ?? null;
}

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeCity(name: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, name);
  } catch {
    /* private mode or blocked storage: the pick lasts this visit only */
  }
}

/** The `?city=` parameter, if it names a known city. */
export function linkedCity(): City | null {
  if (typeof window === "undefined") return null;
  return cityByName(new URLSearchParams(window.location.search).get("city"));
}

export function guessHomeCity(): City {
  const linked = linkedCity();
  if (linked) return linked;
  const stored = cityByName(readStored());
  if (stored) return stored;
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    const jan = -new Date(new Date().getFullYear(), 0, 1).getTimezoneOffset();
    return cityForZone(zone, jan);
  } catch {
    return CITIES[0];
  }
}

/** Shareable link that opens the globe on a city. */
export function cityLink(c: City): string {
  const u = new URL(window.location.href);
  u.search = "";
  u.hash = "";
  u.searchParams.set("city", c.name);
  return u.toString();
}

/** Cities sorted by name, for the picker. */
export const CITIES_BY_NAME: readonly City[] = [...CITIES].sort((a, b) => a.name.localeCompare(b.name));
