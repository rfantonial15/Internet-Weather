import { motion } from "framer-motion";

/**
 * Centered radar reticle.
 *
 * Composed of four concentric rings plus a slow rotating sweep:
 *   - outer ring at ~155px      (faint, w/ major + minor ticks)
 *   - cardinals (N/E/S/W) at 178px, kept upright via counter-rotation
 *   - mid ring at ~110px       (faint guide)
 *   - inner ring at ~58px      (subtle guide)
 *   - cyan crosshair + center dot
 *
 * Two rotations layered:
 *   - SWEEP: a 22s clockwise sweep arc (the "radar pulse"), the only fast-
 *     moving element in the entire UI. Reads as the planet being scanned.
 *   - MARKERS: a 70s counter-clockwise rotation of small target boxes at
 *     the cardinals — slow enough to register as ambient drift, not motion.
 */
export function Reticle() {
  const SIZE = 320;
  const HALF = SIZE / 2;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      <motion.div
        className="relative"
        style={{ width: SIZE, height: SIZE }}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 0.55, scale: 1 }}
        transition={{ duration: 1.6, delay: 3, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Outer ring */}
        <Ring radius={HALF - 5} opacity={0.18} />

        {/* Major ticks every 30°, minor every 6° */}
        {Array.from({ length: 60 }).map((_, i) => {
          const major = i % 5 === 0;
          return (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 origin-bottom"
              style={{
                width: 1,
                height: major ? 8 : 3,
                background: `rgba(120, 200, 255, ${major ? 0.55 : 0.18})`,
                transform: `translate(-50%, -100%) rotate(${i * 6}deg) translateY(-${HALF - 6}px)`,
              }}
            />
          );
        })}

        {/* Cardinal labels */}
        {[
          { txt: "N", deg: 0 },
          { txt: "E", deg: 90 },
          { txt: "S", deg: 180 },
          { txt: "W", deg: 270 },
        ].map(({ txt, deg }) => (
          <div
            key={txt}
            className="absolute left-1/2 top-1/2 font-mono text-[10px] tracking-[0.32em] text-signal-cyan/65"
            style={{
              transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-${HALF + 14}px) rotate(${-deg}deg)`,
            }}
          >
            {txt}
          </div>
        ))}

        {/* Mid + inner rings */}
        <Ring radius={HALF - 50} opacity={0.10} />
        <Ring radius={HALF - 100} opacity={0.07} />

        {/* Slow radar sweep — the only fast-moving UI element in the frame */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="absolute left-1/2 top-1/2 origin-left"
            style={{
              width: HALF - 6,
              height: 1,
              background:
                "linear-gradient(to right, transparent 0%, rgba(92,243,255,0.05) 30%, rgba(92,243,255,0.5) 100%)",
              boxShadow: "0 0 8px rgba(92,243,255,0.35)",
              transform: "translate(0, -50%)",
            }}
          />
        </motion.div>

        {/* Counter-rotating markers at cardinals */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: -360 }}
          transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
        >
          {[0, 90, 180, 270].map((deg) => (
            <div
              key={deg}
              className="absolute left-1/2 top-1/2 h-2 w-2 border border-signal-cyan/45"
              style={{
                transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-${HALF + 4}px)`,
              }}
            />
          ))}
        </motion.div>

        {/* Crosshair */}
        <div className="absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 bg-signal-cyan/75" />
        <div className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-signal-cyan/75" />
        <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal-cyan shadow-[0_0_6px_rgba(92,243,255,0.85)]" />

        {/* Subtle pulse under the crosshair */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ width: 8, height: 8, border: "1px solid rgba(92,243,255,0.6)" }}
          animate={{ scale: [1, 3, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}

function Ring({ radius, opacity }: { radius: number; opacity: number }) {
  return (
    <div
      className="absolute left-1/2 top-1/2 rounded-full border"
      style={{
        width: radius * 2,
        height: radius * 2,
        transform: "translate(-50%, -50%)",
        borderColor: `rgba(120, 200, 255, ${opacity})`,
      }}
    />
  );
}
