import type { TrailerTitle } from "./titleGenerator";
import { ASPECT_PRESETS, type AspectKey } from "@/state/useCinematicStore";
import { viewFrame } from "@/state/useCameraStore";

/**
 * Records a clip by compositing the live WebGL canvas onto an offscreen 2D
 * canvas at the requested aspect, burning in the title card, and driving a
 * MediaRecorder over that canvas's captureStream().
 *
 *   - Frames are copied inside the render loop (CaptureFrameTap, useFrame
 *     priority 2, right after the composer renders), so the WebGL context
 *     never needs preserveDrawingBuffer.
 *   - The crop is "cover" around the globe centre (slightly above mid-screen,
 *     see viewFrame in useCameraStore), where the camera keeps the story epicentre. Output is the crop's native pixel size, capped at
 *     the preset (1080 x 1920 etc.); we never upscale a soft image.
 *   - HTML overlays can't flow into captureStream, so the title card,
 *     letterbox and wordmark are drawn here in canvas 2D.
 */

export interface RecorderShotInfo {
  title: TrailerTitle;
  /** 0..1 progress through the shot, read every frame. */
  progressRef: { current: number };
  /** Shot progress where the title card appears. */
  titleInU: number;
  /** Shot progress where the title card has faded out. */
  titleOutU: number;
}

export interface RecorderResult {
  blob: Blob;
  durationMs: number;
  width: number;
  height: number;
  mimeType: string;
}

/** MP4/H.264 first: it uploads cleanly to TikTok, X and Shorts. */
const PREFERRED_MIMES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

export function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of PREFERRED_MIMES) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return null;
}

export function extensionFor(mime: string): string {
  return mime.startsWith("video/mp4") ? "mp4" : "webm";
}

const FPS = 30;
const PAPER = "rgba(232, 240, 252, 0.96)";
const PAPER_MUTE = "rgba(214, 226, 244, 0.72)";
const PAPER_FAINT = "rgba(196, 212, 234, 0.46)";

/** The recorder currently fed by CaptureFrameTap, if any. */
let active: ClipRecorder | null = null;

export function activeRecorder(): ClipRecorder | null {
  return active;
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

export class ClipRecorder {
  private rec: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private readonly mime: string;
  private source: HTMLCanvasElement | null = null;
  private info: RecorderShotInfo | null = null;
  private out: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private stopping: Promise<RecorderResult> | null = null;

  constructor(public readonly aspect: AspectKey) {
    const mime = pickMime();
    if (!mime) throw new Error("MediaRecorder is not available in this browser");
    this.mime = mime;
  }

  get width() {
    return this.out?.width ?? 0;
  }

  get height() {
    return this.out?.height ?? 0;
  }

  start(source: HTMLCanvasElement, info: RecorderShotInfo): void {
    if (this.rec) return;
    const preset = ASPECT_PRESETS[this.aspect];
    const aspect = preset.w / preset.h;

    // Crop rect from the current source size, then cap at the preset size.
    const sw = source.width;
    const sh = source.height;
    const cropW = sw / sh > aspect ? sh * aspect : sw;
    const cropH = cropW / aspect;
    const scale = Math.min(1, preset.w / cropW);

    const out = document.createElement("canvas");
    out.width = even(cropW * scale);
    out.height = even(cropH * scale);
    const ctx = out.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D canvas unavailable");
    ctx.fillStyle = "#04060c";
    ctx.fillRect(0, 0, out.width, out.height);

    const stream = out.captureStream(FPS);
    const bitrate = Math.round(
      Math.min(10_000_000, Math.max(2_500_000, out.width * out.height * FPS * 0.12)),
    );
    const rec = new MediaRecorder(stream, { mimeType: this.mime, videoBitsPerSecond: bitrate });
    this.chunks = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };

    this.source = source;
    this.info = info;
    this.out = out;
    this.ctx = ctx;
    this.stream = stream;
    this.rec = rec;

    rec.start(500);
    this.startedAt = performance.now();
    active = this;
  }

  /** Copy the frame that was just rendered and draw the overlay on top. */
  drawFrame(): void {
    const { source, ctx, out, info } = this;
    if (!source || !ctx || !out || !info) return;

    // Recompute the crop every frame so a window resize mid-shot stays framed.
    const aspect = out.width / out.height;
    const sw = source.width;
    const sh = source.height;
    const cropW = sw / sh > aspect ? sh * aspect : sw;
    const cropH = cropW / aspect;
    const sx = (sw - cropW) / 2;
    // The globe centre sits viewFrame.shift above mid-screen; crop around it.
    const cy = sh * (0.5 - viewFrame.shift);
    const sy = Math.max(0, Math.min(sh - cropH, cy - cropH / 2));
    ctx.drawImage(source, sx, sy, cropW, cropH, 0, 0, out.width, out.height);

    drawOverlay(ctx, out.width, out.height, info);
  }

  stop(): Promise<RecorderResult> {
    if (this.stopping) return this.stopping;
    const rec = this.rec;
    if (!rec) return Promise.reject(new Error("recorder not started"));
    if (active === this) active = null;

    this.stopping = new Promise<RecorderResult>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        this.stream?.getTracks().forEach((t) => t.stop());
        resolve({
          blob: new Blob(this.chunks, { type: this.mime.split(";")[0] }),
          durationMs: performance.now() - this.startedAt,
          width: this.width,
          height: this.height,
          mimeType: this.mime,
        });
        this.chunks = [];
        this.source = null;
        this.info = null;
        this.ctx = null;
      };
      rec.onstop = finish;
      rec.onerror = finish;
      // Some browsers never fire onstop if the stream died; don't hang.
      window.setTimeout(finish, 3000);
      try {
        if (rec.state !== "inactive") rec.stop();
        else finish();
      } catch {
        finish();
      }
    });
    this.rec = null;
    return this.stopping;
  }
}

// ---------------------------------------------------------------------------
// Overlay (canvas 2D mirror of CinematicOverlay)

function cardAlpha(u: number, inU: number, outU: number): number {
  if (u < inU - 0.04 || u > outU + 0.1) return 0;
  if (u < inU) return (u - (inU - 0.04)) / 0.04;
  if (u < outU) return 1;
  return Math.max(0, 1 - (u - outU) / 0.1);
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing is Chrome 99+/Safari 17+; older engines just skip it.
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const test = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(test).width > maxW) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  // Overflow folds into the last allowed line rather than dropping words.
  return [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(" ")];
}

function drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, info: RecorderShotInfo) {
  const u = info.progressRef.current;
  const unit = Math.min(w, h);

  // Letterbox: soft bars that ease in over the first 5% and out over the last 5%.
  const lb = Math.min(1, u / 0.05, (1 - u) / 0.05);
  if (lb > 0) {
    const barH = h * 0.06 * Math.max(0, lb);
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, w, barH);
    ctx.fillRect(0, h - barH, w, barH);
  }

  // Wordmark + UTC stamp, bottom corners inside the letterbox.
  const small = Math.max(10, Math.round(unit * 0.018));
  ctx.textBaseline = "middle";
  ctx.font = `400 ${small}px "JetBrains Mono", ui-monospace, monospace`;
  setSpacing(ctx, small * 0.28);
  ctx.fillStyle = PAPER_MUTE;
  ctx.textAlign = "left";
  ctx.fillText("INTERNET WEATHER", unit * 0.05, h - h * 0.03);
  ctx.textAlign = "right";
  ctx.fillStyle = PAPER_FAINT;
  ctx.fillText(`${new Date().toISOString().slice(11, 19)} UTC`, w - unit * 0.05, h - h * 0.03);

  // Title card.
  const a = cardAlpha(u, info.titleInU, info.titleOutU);
  if (a <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = "center";
  const cx = w / 2;
  let y = h * 0.62;

  const rule = (yy: number) => {
    ctx.fillStyle = PAPER_FAINT;
    ctx.fillRect(cx - unit * 0.04, Math.round(yy), unit * 0.08, Math.max(1, Math.round(unit / 900)));
  };

  rule(y);
  y += small * 2;
  ctx.font = `400 ${small}px "JetBrains Mono", ui-monospace, monospace`;
  setSpacing(ctx, small * 0.32);
  ctx.fillStyle = PAPER_MUTE;
  ctx.fillText(info.title.eyebrow, cx, y);

  const titlePx = Math.round(Math.min(w * 0.075, h * 0.05));
  ctx.font = `300 ${titlePx}px "Space Grotesk", Inter, system-ui, sans-serif`;
  setSpacing(ctx, titlePx * 0.08);
  ctx.fillStyle = PAPER;
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = titlePx * 0.4;
  y += small * 1.4 + titlePx * 0.7;
  for (const line of wrapLines(ctx, info.title.title, w * 0.84, 3)) {
    ctx.fillText(line, cx, y);
    y += titlePx * 1.08;
  }
  ctx.shadowBlur = 0;

  const subPx = Math.max(11, Math.round(titlePx * 0.36));
  ctx.font = `italic 300 ${subPx}px "Space Grotesk", Inter, system-ui, sans-serif`;
  setSpacing(ctx, 0);
  ctx.fillStyle = PAPER_MUTE;
  y += subPx * 0.2;
  ctx.fillText(info.title.subtitle, cx, y);
  rule(y + subPx * 1.2);
  ctx.restore();
}

/** Programmatic download helper for clips. */
export function downloadBlobUrl(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
