/**
 * Singleton handle to the live WebGL canvas. Set by RenderPipeline once R3F
 * mounts; consumed by the capture director when it needs a frame source.
 *
 * Kept tiny on purpose — exposing the canvas via the camera store would
 * couple cinematic concerns to the camera module; a freestanding module
 * makes the dependency direction explicit.
 */

let canvas: HTMLCanvasElement | null = null;

export function registerSourceCanvas(c: HTMLCanvasElement | null) {
  canvas = c;
}

export function getSourceCanvas(): HTMLCanvasElement | null {
  return canvas;
}
