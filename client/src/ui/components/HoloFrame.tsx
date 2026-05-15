import { ReactNode } from "react";

/**
 * Frame primitive — four corner marks plus optional hairline edges.
 *
 * The previous implementation included a glowing dot at each corner. That
 * read as cyberpunk neon. The film-grade version is flat: hairline marks,
 * no shadow, no fill dot. The frame should disappear and let the content
 * speak.
 */
interface Props {
  children: ReactNode;
  className?: string;
  color?: string;
  /** Render edge rules between the corner marks. Off by default. */
  edges?: boolean;
}

export function HoloFrame({
  children,
  className = "",
  color = "rgba(232, 240, 252, 0.32)",
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
    <span
      aria-hidden
      className={`pointer-events-none absolute h-2.5 w-2.5 ${placement[pos]}`}
      style={{ transform: transform[pos] }}
    >
      <span className="absolute left-0 top-0 h-px w-2.5" style={{ background: color }} />
      <span className="absolute left-0 top-0 h-2.5 w-px" style={{ background: color }} />
    </span>
  );
}

function Edges({ color }: { color: string }) {
  const grad = (dir: string) =>
    `linear-gradient(${dir}, transparent 0%, ${color} 28%, ${color} 72%, transparent 100%)`;
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute left-3 right-3 top-0 h-px" style={{ background: grad("to right") }} />
      <span aria-hidden className="pointer-events-none absolute left-3 right-3 bottom-0 h-px" style={{ background: grad("to right") }} />
      <span aria-hidden className="pointer-events-none absolute left-0 top-3 bottom-3 w-px" style={{ background: grad("to bottom") }} />
      <span aria-hidden className="pointer-events-none absolute right-0 top-3 bottom-3 w-px" style={{ background: grad("to bottom") }} />
    </>
  );
}
