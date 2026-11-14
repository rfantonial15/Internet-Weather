import { useEffect, useState } from "react";
import { useEventStore } from "@/state/useEventStore";
import { useHomeStore } from "@/state/useHomeStore";
import { useCameraStore } from "@/state/useCameraStore";
import { eventColor } from "@/config/colors";
import { cityLink, CITIES_BY_NAME } from "@/utils/home";
import { LOCAL_RADIUS_KM, localReport, type LocalReport } from "@/utils/localWeather";
import { Glyph } from "./components/Glyph";

/** Recompute once a second; rows arrive several times a second. */
function useLocalReport(): LocalReport {
  const city = useHomeStore((s) => s.city);
  const compute = () => localReport(useEventStore.getState().events, city, Date.now());
  const [report, setReport] = useState(compute);
  useEffect(() => {
    setReport(compute());
    const id = window.setInterval(() => setReport(compute()), 1000);
    return () => window.clearInterval(id);
  }, [city]);
  return report;
}

function flyHome() {
  const c = useHomeStore.getState().city;
  useCameraStore.getState().focusOn({ lat: c.lat, lon: c.lon }, { distance: 2.8, durationMs: 9000 });
}

/**
 * Phones and tablets: a tappable two-line readout in the title column. Two
 * short lines, because one wide-tracked line ran into the status column on
 * the right at phone width.
 */
export function LocalWeatherLine() {
  const city = useHomeStore((s) => s.city);
  const r = useLocalReport();
  const tint = r.dominant ? eventColor[r.dominant] : undefined;
  return (
    <button
      type="button"
      onClick={flyHome}
      className="focus-ring pointer-events-auto -mx-1 flex max-w-[calc(100vw-14rem)] flex-col items-start gap-0.5 px-1 text-left sm:max-w-[260px] lg:hidden"
      aria-label={`Your weather in ${city.name}: ${r.headline}. Show on globe.`}
    >
      <span className="flex max-w-full items-center gap-2">
        {r.dominant ? (
          <Glyph kind={r.dominant} color={tint} />
        ) : (
          <span aria-hidden className="inline-block w-3 text-center font-mono text-[12px] leading-none text-paper-faint">○</span>
        )}
        <span className="hud-label hud-label--mute truncate">{city.name}</span>
      </span>
      <span
        className="max-w-full truncate pl-5 font-display text-[12.5px] leading-tight"
        style={{ color: tint ?? "rgba(232, 240, 252, 0.96)" }}
      >
        {r.headline}
      </span>
    </button>
  );
}

/**
 * "Your weather": what the internet is doing within 1,500 km of the
 * viewer's city in the last minute, as a card left of the globe (desktop).
 */
export function LocalWeatherCard() {
  const city = useHomeStore((s) => s.city);
  const setCity = useHomeStore((s) => s.setCity);
  const r = useLocalReport();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cityLink(city));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: nothing to undo */
    }
  };

  const tint = r.dominant ? eventColor[r.dominant] : undefined;

  return (
    <section
      aria-label="Your weather"
      className="pointer-events-auto absolute left-10 top-[var(--globe-y,45%)] hidden w-[230px] -translate-y-1/2 flex-col gap-2 border-l border-paper-ghost pl-4 lg:flex"
    >
      <span className="hud-label hud-label--mute">your weather</span>
      <label className="sr-only" htmlFor="iw-city">Your city</label>
      <select
        id="iw-city"
        value={city.name}
        onChange={(e) => setCity(e.target.value)}
        className="focus-ring -ml-1 w-fit max-w-full cursor-pointer appearance-none bg-transparent px-1 font-display text-[18px] leading-tight text-paper hover:text-white"
      >
        {CITIES_BY_NAME.map((c) => (
          <option key={c.name} value={c.name} className="bg-ink-800 text-[13px]">
            {c.name}
          </option>
        ))}
      </select>
      <span className="flex items-center gap-2 font-display text-[14px]" style={{ color: tint ?? "rgba(232, 240, 252, 0.96)" }}>
        {r.dominant && <Glyph kind={r.dominant} color={tint} />}
        {r.headline}
      </span>
      <span className="font-mono text-[10px] tracking-[0.18em] text-paper-faint">
        {r.total === 0
          ? `no signals within ${KM} km`
          : `${r.total} signal${r.total === 1 ? "" : "s"} within ${KM} km · ${r.trend}`}
      </span>
      <div className="mt-1 flex gap-3">
        <button type="button" onClick={flyHome} className="focus-ring hud-label hud-label--mute hover:text-paper">
          show me
        </button>
        <button type="button" onClick={copy} className="focus-ring hud-label hud-label--faint hover:text-paper">
          {copied ? "link copied" : "copy link"}
        </button>
      </div>
    </section>
  );
}

const KM = LOCAL_RADIUS_KM.toLocaleString("en-US");
