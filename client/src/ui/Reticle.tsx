import { motion } from "framer-motion";

/**
 * Centered framing reticle.
 *
 * Tone: instrument crosshair, not radar dashboard. The previous version had
 * a fast (22s) glowing sweep + pulsing crosshair halo + box-shadow on the
 * centre dot — all of those read as "hacker UI". This version is still — a
 * slow (60s) hairline sweep, flat crosshair, no glow.
 *
 * Layers:
 *   - outer ring with hairline ticks (major every 30°, minor every 6°)
 *   - cardinals N/E/S/W as small mono labels
 *   - mid + inner guide rings, very faint
 *   - the sweep — a single thin gradient stroke, slow rotation
 *   - crosshair + centre dot
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
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 0.42, scale: 1 }}
        transition={{ duration: 1.6, delay: 3, ease: [0.22, 1, 0.36, 1] }}
      >
        <Ring radius={HALF - 5} opacity={0.16} />

        {Array.from({ length: 60 }).map((_, i) => {
          const major = i % 5 === 0;
          return (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 origin-bottom"
              style={{
                width: 1,
                height: major ? 7 : 3,
                background: `rgba(232, 240, 252, ${major ? 0.42 : 0.14})`,
                transform: `translate(-50%, -100%) rotate(${i * 6}deg) translateY(-${HALF - 6}px)`,
              }}
            />
          );
        })}

        {/* Cardinals — small, paper-mute, no accent colour. */}
        {[
          { txt: "N", deg: 0 },
          { txt: "E", deg: 90 },
          { txt: "S", deg: 180 },
          { txt: "W", deg: 270 },
        ].map(({ txt, deg }) => (
          <div
            key={txt}
            className="absolute left-1/2 top-1/2 font-mono text-[9px] tracking-[0.28em] text-paper-mute"
            style={{
              transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-${HALF + 14}px) rotate(${-deg}deg)`,
            }}
          >
            {txt}
          </div>
        ))}

        <Ring radius={HALF - 50} opacity={0.08} />
        <Ring radius={HALF - 100} opacity={0.06} />

        {/* Hairline sweep. 60s, slow enough that it reads as the only motion
            on the frame — never as fast-moving radar UI. No box-shadow. */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="absolute left-1/2 top-1/2 origin-left"
            style={{
              width: HALF - 6,
              height: 1,
              background:
                "linear-gradient(to right, transparent 0%, rgba(232,240,252,0.04) 40%, rgba(232,240,252,0.32) 100%)",
              transform: "translate(0, -50%)",
            }}
          />
        </motion.div>

        {/* Counter-drifting cardinal markers — kept very subtle. */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: -360 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        >
          {[0, 90, 180, 270].map((deg) => (
            <div
              key={deg}
              className="absolute left-1/2 top-1/2 h-2 w-2 border border-paper-faint"
              style={{
                transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-${HALF + 4}px)`,
              }}
            />
          ))}
        </motion.div>

        {/* Crosshair — flat, no glow. */}
        <div className="absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 bg-paper-mute" />
        <div className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-paper-mute" />
        <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper" />
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
        borderColor: `rgba(232, 240, 252, ${opacity})`,
      }}
    />
  );
}
