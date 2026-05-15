/**
 * Radial sweep meter — a 270° dial drawn from individual hairline tick marks.
 *
 * Discretised ticks read as instrumentation; a stroked arc reads as a progress
 * bar. We want the former. Lit ticks are paper white at the low end, gradient
 * up to a single warm accent at the high end (no magenta — magenta in chrome
 * read as cyberpunk). The dial sweeps -135° → +135°, leaving a gap at the top
 * that doubles as a label slot.
 */
interface Props {
  /** 0..1 */
  value: number;
  label: string;
  /** Center numeric readout (defaults to value*100). */
  display?: string;
  /** Use the warm-shift gradient toward the high end. Off = single accent. */
  hot?: boolean;
  size?: number;
}

const TICK_COUNT = 28;
const SWEEP_DEG = 270;
const START_DEG = -135;

// Cool → warm gradient that stays inside a film-grade tonal range.
//   low:  paper white at low alpha
//   high: muted ember (warning) at higher alpha
const COOL = { r: 232, g: 240, b: 252 };
const WARM = { r: 255, g: 178, b: 120 };

export function RadialMeter({ value, label, display, hot = false, size = 132 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 6;
  const rInner = rOuter - 8;
  const lit = Math.round(Math.max(0, Math.min(1, value)) * TICK_COUNT);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        {Array.from({ length: TICK_COUNT }).map((_, i) => {
          const t = i / (TICK_COUNT - 1);
          const ang = START_DEG + t * SWEEP_DEG;
          const rad = ((ang + 90) * Math.PI) / 180;
          const x1 = cx + Math.cos(rad) * rInner;
          const y1 = cy + Math.sin(rad) * rInner;
          const x2 = cx + Math.cos(rad) * rOuter;
          const y2 = cy + Math.sin(rad) * rOuter;

          const on = i < lit;
          const stroke = on
            ? hot
              ? `rgba(${interp(COOL.r, WARM.r, t)}, ${interp(COOL.g, WARM.g, t)}, ${interp(COOL.b, WARM.b, t)}, ${0.55 + t * 0.35})`
              : `rgba(232, 240, 252, ${0.45 + t * 0.4})`
            : "rgba(232, 240, 252, 0.08)";

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={stroke}
              strokeWidth={1.25}
              strokeLinecap="butt"
            />
          );
        })}

        {/* Inner faint ring — a single hairline guide. */}
        <circle
          cx={cx}
          cy={cy}
          r={rInner - 4}
          fill="none"
          stroke="rgba(232, 240, 252, 0.10)"
          strokeWidth="1"
        />
      </svg>

      {/* Centre readout — tabular nums, paper white, no text-shadow glow. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
        <span className="font-mono text-[24px] font-light leading-none tracking-tight tabular-nums text-paper">
          {display ?? Math.round(value * 100).toString().padStart(2, "0")}
        </span>
        <span className="hud-label hud-label--mute mt-2">{label}</span>
      </div>
    </div>
  );
}

function interp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}
