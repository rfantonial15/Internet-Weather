/**
 * Radial sweep meter — a 270° dial built from individual stroked tick lines.
 *
 * Why ticks instead of a stroked arc? Discretization reads as instrumentation
 * (think aircraft attitude indicator) whereas a continuous arc reads as a
 * progress bar. We're aiming for the former.
 *
 * The dial sweeps from upper-left (-135°) clockwise through the bottom and
 * back up to upper-right (+135°), leaving a gap at the top that doubles as
 * a label slot. Lit ticks shift hue from cool cyan (low) to hot magenta
 * (high) when `hot` is true.
 */
interface Props {
  /** 0..1 */
  value: number;
  label: string;
  /** Center numeric readout (defaults to value*100). */
  display?: string;
  /** Use the cyan→magenta gradient. Off = cyan-only. */
  hot?: boolean;
  size?: number;
}

const TICK_COUNT = 32;
const SWEEP_DEG = 270;
const START_DEG = -135;

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
          const intensity = i / TICK_COUNT;
          const stroke = on
            ? hot
              ? `rgba(${interp(92, 255, intensity)}, ${interp(243, 77, intensity)}, ${interp(255, 210, intensity)}, ${0.4 + intensity * 0.55})`
              : `rgba(92, 243, 255, ${0.35 + intensity * 0.5})`
            : "rgba(150, 200, 255, 0.10)";

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={stroke}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          );
        })}

        {/* Inner faint ring */}
        <circle
          cx={cx}
          cy={cy}
          r={rInner - 4}
          fill="none"
          stroke="rgba(150, 200, 255, 0.12)"
          strokeWidth="1"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
        <span
          className="font-mono text-[26px] font-light leading-none tracking-tight text-white/90"
          style={{
            textShadow: hot && value > 0.55 ? "0 0 12px rgba(255,77,210,0.45)" : undefined,
          }}
        >
          {display ?? Math.round(value * 100).toString().padStart(2, "0")}
        </span>
        <span className="hud-label mt-2 opacity-70">{label}</span>
      </div>
    </div>
  );
}

function interp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}
