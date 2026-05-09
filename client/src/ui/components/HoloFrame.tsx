import { ReactNode } from "react";

/**
 * Holographic frame primitive.
 *
 * Wraps any block in a 4-corner mark + thin rule treatment. Used in place of
 * background panels — we never want a panel filling space; the rules just
 * delineate. Color is configurable so we can subtly tint frames around
 * tone-sensitive content.
 */
interface Props {
  children: ReactNode;
  className?: string;
  color?: string;
  /** Show edge rules between the corner marks. Off by default — corners alone read cleaner. */
  edges?: boolean;
}

export function HoloFrame({
  children,
  className = "",
  color = "rgba(120, 200, 255, 0.45)",
  edges = false,
}: Props) {
  return (
    <div className={`relative ${className}`}>
      <Corner pos="tl" color={color} />
      <Corner pos="tr" color={color} />
      <Corner pos="bl" color={color} />
      <Corner pos="br" color={color} />
      {edges && <Edges color={color} />}
      {children}
    </div>
  );
}

type Pos = "tl" | "tr" | "bl" | "br";

function Corner({ pos, color }: { pos: Pos; color: string }) {
  const transform: Record<Pos, string> = {
    tl: "",
    tr: "scaleX(-1)",
    bl: "scaleY(-1)",
    br: "scale(-1, -1)",
  };
  const placement: Record<Pos, string> = {
    tl: "left-0 top-0",
    tr: "right-0 top-0",
    bl: "left-0 bottom-0",
    br: "right-0 bottom-0",
  };
  return (
    <span aria-hidden className={`pointer-events-none absolute h-2.5 w-2.5 ${placement[pos]}`}
      style={{ transform: transform[pos] }}>
      <span className="absolute left-0 top-0 h-px w-2.5" style={{ background: color }} />
      <span className="absolute left-0 top-0 h-2.5 w-px" style={{ background: color }} />
      <span
        className="absolute left-[-1.5px] top-[-1.5px] h-1 w-1 rounded-full"
        style={{ background: color, boxShadow: `0 0 5px ${color}` }}
      />
    </span>
  );
}

function Edges({ color }: { color: string }) {
  const grad = (dir: string) =>
    `linear-gradient(${dir}, transparent 0%, ${color} 25%, ${color} 75%, transparent 100%)`;
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute left-3 right-3 top-0 h-px" style={{ background: grad("to right") }} />
      <span aria-hidden className="pointer-events-none absolute left-3 right-3 bottom-0 h-px" style={{ background: grad("to right") }} />
      <span aria-hidden className="pointer-events-none absolute left-0 top-3 bottom-3 w-px" style={{ background: grad("to bottom") }} />
      <span aria-hidden className="pointer-events-none absolute right-0 top-3 bottom-3 w-px" style={{ background: grad("to bottom") }} />
    </>
  );
}
