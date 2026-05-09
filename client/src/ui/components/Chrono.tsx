import { useEffect, useState } from "react";

/**
 * UTC chrono readout. The "global observatory" feel — never local time.
 * Updates once per second; nothing more frequent is readable anyway.
 */
export function Chrono() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const iso = now.toISOString();
  const date = iso.slice(0, 10);
  const time = iso.slice(11, 19);

  return (
    <div className="flex flex-col items-end gap-0.5 font-mono">
      <div className="text-[12px] tracking-[0.36em] text-signal-cyan">
        {time}
        <span className="ml-1 text-[9px] opacity-50">UTC</span>
      </div>
      <div className="text-[9px] tracking-[0.36em] text-white/40">{date}</div>
    </div>
  );
}
