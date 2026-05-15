import type { EventKind } from "@iw/shared";

/**
 * One unicode glyph per event kind. Kept to a single character so a row of
 * them visually reads as a column — events as a column of glyphs feels
 * more elegant than coloured dots, and the shapes themselves carry meaning
 * (▲ aggression, ◯ calm, ◆ shock).
 */
const GLYPHS: Record<EventKind, string> = {
  rage: "▲",
  controversy: "✦",
  viral: "◉",
  trend: "△",
  news: "◆",
  build: "▣",
  meme: "◌",
  wholesome: "◯",
};

export function Glyph({ kind, color }: { kind: EventKind; color?: string }) {
  // No textShadow: the chrome is hairline + flat. The glyph carries shape;
  // colour alone is enough to identify the kind. Glow read as hacker neon.
  return (
    <span
      className="inline-block w-3 text-center font-mono text-[12px] leading-none"
      style={color ? { color } : undefined}
    >
      {GLYPHS[kind]}
    </span>
  );
}
