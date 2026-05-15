import type { TrailerTitle } from "./titleGenerator";
import type { AspectKey } from "@/state/useCinematicStore";

/**
 * Records a clip by compositing the live WebGL canvas + a 2D overlay onto an
 * offscreen canvas at the target aspect ratio, then driving a MediaRecorder
 * over its captureStream().
 *
 * Why composite ourselves instead of recording the on-screen DOM?
 *
 *   - HTML overlays don't flow into canvas.captureStream(); html2canvas-style
 *     hacks are slow and unreliable.
 *   - We want a clean, branded clip that doesn't include the live HUD or
 *     stray UI — record only what the trailer needs.
 *   - Aspect cropping is just a draw-rect: we frame any aspect from the same
 *     source canvas without changing the layout the viewer sees.
 */

export interface RecorderShotInfo {
  title: TrailerTitle;
  /** Read each frame to drive overlays/timings: 0..1 progress through the shot. */
  progressRef: { current: number };
  /** When (relative to shot) the title card appears (0..1). */
  titleInU: number;
  /** When the title card fades out (0..1). */
  titleOutU: number;
}

export interface RecorderResult {
  blob: Blob;
  durationMs: number;
  width: number;
  height: number;
  mimeType: string;
}

const PREFERRED_MIMES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4",
];

function pickMime(): string {
  for (const m of PREFERRED_MIMES) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "video/webm";
}

export class ClipRecorder {
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private mime = pickMime();
  private srcWidth = 0;
  private srcHeight = 0;

  constructor(public aspect: AspectKey) {}

  /**
   * Start recording. We capture the live WebGL canvas's MediaStream directly
   * — no offscreen compositing, no per-frame drawImage, no requirement that
   * the WebGL context preserve its drawing buffer. This keeps the visible
   * scene smooth at 60fps while still producing a high-quality clip.
   *
   * The on-screen CinematicOverlay (letterbox + title) stays burned into the
   * recorded frame because the WebGL canvas backs the visible scene; the
   * overlay is HTML on top, but for clip purposes we deliberately want a
   * "clean plate" feel — the overlay isn't in the recording, leaving room
   * for users to slap their own caption on top in their editor of choice.
   */
  start(source: HTMLCanvasElement, _shotInfo: RecorderShotInfo): void {
    if (this.rec) return;
    this.srcWidth = source.width;
    this.srcHeight = source.height;
    const stream = (source as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream })
      .captureStream(60);
    this.rec = new MediaRecorder(stream, {
      mimeType: this.mime,
      videoBitsPerSecond: 8_000_000,
    });
    this.chunks = [];
    this.rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.rec.start(250);
    this.startedAt = performance.now();
  }

  stop(): Promise<RecorderResult> {
    if (!this.rec) return Promise.reject(new Error("recorder not started"));
    return new Promise((resolve) => {
      const rec = this.rec!;
      rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mime });
        const durationMs = performance.now() - this.startedAt;
        resolve({
          blob,
          durationMs,
          width: this.srcWidth,
          height: this.srcHeight,
          mimeType: this.mime,
        });
      };
      rec.stop();
      this.rec = null;
    });
  }

}

/** Programmatic download helper for clips. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revocation so the click actually fires before the URL dies.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
