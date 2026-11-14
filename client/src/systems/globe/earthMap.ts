import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  ClampToEdgeWrapping,
} from "three";
import { CITIES } from "@iw/shared/cities";
import { frameUniforms } from "@/core/frameUniforms";

/**
 * Bakes the static parts of the planet into one equirectangular texture,
 * once, at startup:
 *
 *   R  land mask           (Natural Earth 1:50m land polygons)
 *   G  coast falloff       (blurred land: shallow water + coastal shading)
 *   B  night-light density (population-weighted glow around real metros)
 *
 * Before this existed every planet shader re-derived fake continents from
 * ~40 simplex-noise calls per pixel per frame, and the continents had no
 * relation to real geography, so an event at New York landed in an ocean.
 * One texture fetch is far cheaper and puts events where they happened.
 *
 * Projection: u = (lon + 180) / 360, v = (lat + 90) / 180, matching
 * `latLonToVec3` and the `earthUv()` helper in shaders/shared/geo.glsl.
 */

const WIDTH = 2048;
const HEIGHT = 1024;
/** Low-res working grid for the blur pass and on-land tests. */
const GRID_W = 512;
const GRID_H = 256;

type Ring = [number, number][]; // [lon, lat]
type Polygon = Ring[];

interface TopoGeometry {
  type: string;
  arcs?: unknown;
  geometries?: TopoGeometry[];
}
interface Topology {
  transform?: { scale: [number, number]; translate: [number, number] };
  arcs: [number, number][][];
  objects: Record<string, TopoGeometry>;
}

let texture: CanvasTexture | null = null;
let started = false;

/**
 * Kick off the bake (idempotent). The shared `uEarthMap` uniform gets the
 * texture as soon as it exists; `uLandReady` is eased up by WorldClock.
 */
export function ensureEarthMap(): void {
  if (started) return;
  started = true;
  const url = `${import.meta.env.BASE_URL}data/land-50m.json`;
  fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`land data ${r.status}`);
      return r.json() as Promise<Topology>;
    })
    .then((topo) => {
      texture = bake(decodeLand(topo));
      frameUniforms.uEarthMap.value = texture;
    })
    .catch((err) => {
      // The planet still renders (ocean, atmosphere, events); it just has no
      // continents. Loud in the console, silent in the UI.
      console.warn("[earth] land map unavailable", err);
    });
}

export function earthMapReady(): boolean {
  return texture !== null;
}

// ---------------------------------------------------------------------------
// TopoJSON decoding (just the subset world-atlas uses: quantized arcs,
// Polygon / MultiPolygon / GeometryCollection).

function decodeLand(topo: Topology): Polygon[] {
  const sx = topo.transform?.scale[0] ?? 1;
  const sy = topo.transform?.scale[1] ?? 1;
  const tx = topo.transform?.translate[0] ?? 0;
  const ty = topo.transform?.translate[1] ?? 0;
  const quantized = !!topo.transform;

  const arcs: Ring[] = topo.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([a, b]) => {
      if (quantized) {
        x += a;
        y += b;
        return [x * sx + tx, y * sy + ty] as [number, number];
      }
      return [a, b] as [number, number];
    });
  });

  const ring = (indices: number[]): Ring => {
    const out: Ring = [];
    indices.forEach((idx, k) => {
      const src = idx < 0 ? arcs[~idx].slice().reverse() : arcs[idx];
      // Consecutive arcs share an endpoint; drop the duplicate.
      for (let i = k === 0 ? 0 : 1; i < src.length; i++) out.push(src[i]);
    });
    return out;
  };

  const polygons: Polygon[] = [];
  const visit = (g: TopoGeometry) => {
    if (g.type === "GeometryCollection") g.geometries?.forEach(visit);
    else if (g.type === "Polygon") polygons.push((g.arcs as number[][]).map(ring));
    else if (g.type === "MultiPolygon")
      for (const p of g.arcs as number[][][]) polygons.push(p.map(ring));
  };
  for (const obj of Object.values(topo.objects)) visit(obj);
  return polygons;
}

// ---------------------------------------------------------------------------
// Rasterization

/**
 * Unwrap a ring so consecutive longitudes never jump by more than 180
 * degrees. world-atlas stitches polygons across the antimeridian, so a ring
 * can run from 179 to -179; unwrapped, it continues to 181 and we draw the
 * path three times (offset -360, 0, +360) to cover the wrap. A ring that
 * winds all the way around (Antarctica) gets closed along its pole.
 */
function toPath(rings: Polygon, w: number, h: number): Path2D {
  const path = new Path2D();
  const px = (lon: number) => ((lon + 180) / 360) * w;
  const py = (lat: number) => ((90 - lat) / 180) * h;

  for (const r of rings) {
    if (r.length < 3) continue;
    const pts: [number, number][] = [];
    let prev = r[0][0];
    let acc = prev;
    let latSum = 0;
    for (let i = 0; i < r.length; i++) {
      const [lon, lat] = r[i];
      if (i > 0) {
        let d = lon - prev;
        if (d > 180) d -= 360;
        else if (d < -180) d += 360;
        acc += d;
        prev = lon;
      }
      pts.push([acc, lat]);
      latSum += lat;
    }
    const span = pts[pts.length - 1][0] - pts[0][0];
    if (Math.abs(span) > 180) {
      const pole = latSum / pts.length < 0 ? -90 : 90;
      pts.push([pts[pts.length - 1][0], pole], [pts[0][0], pole]);
    }
    path.moveTo(px(pts[0][0]), py(pts[0][1]));
    for (let i = 1; i < pts.length; i++) path.lineTo(px(pts[i][0]), py(pts[i][1]));
    path.closePath();
  }
  return path;
}

function fillWrapped(ctx: CanvasRenderingContext2D, paths: Path2D[], w: number) {
  for (const offset of [-w, 0, w]) {
    ctx.save();
    ctx.translate(offset, 0);
    for (const p of paths) ctx.fill(p, "evenodd");
    ctx.restore();
  }
}

/** Mulberry32: tiny deterministic PRNG so every load bakes the same map. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Separable box blur on a single-channel grid, wrapping in x. */
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += src[y * w + ((k + w) % w)];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / n;
      sum += src[y * w + ((x + r + 1) % w)] - src[y * w + ((x - r + w) % w)];
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += tmp[Math.min(h - 1, Math.max(0, y + k)) * w + x];
      out[y * w + x] = sum / n;
    }
  }
  return out;
}

function bake(polygons: Polygon[]): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // --- R: land -------------------------------------------------------------
  const fullPaths = polygons.map((p) => toPath(p, WIDTH, HEIGHT));
  ctx.fillStyle = "#ff0000";
  fillWrapped(ctx, fullPaths, WIDTH);

  // --- Low-res mask: on-land lookups + coast blur --------------------------
  const grid = document.createElement("canvas");
  grid.width = GRID_W;
  grid.height = GRID_H;
  const gctx = grid.getContext("2d", { willReadFrequently: true })!;
  gctx.fillStyle = "#000";
  gctx.fillRect(0, 0, GRID_W, GRID_H);
  gctx.fillStyle = "#fff";
  fillWrapped(gctx, polygons.map((p) => toPath(p, GRID_W, GRID_H)), GRID_W);
  const gridPx = gctx.getImageData(0, 0, GRID_W, GRID_H).data;
  const land = new Float32Array(GRID_W * GRID_H);
  for (let i = 0; i < land.length; i++) land[i] = gridPx[i * 4] / 255;

  const onLand = (lon: number, lat: number) => {
    const x = Math.floor((((lon + 180) / 360) * GRID_W + GRID_W) % GRID_W);
    const y = Math.min(GRID_H - 1, Math.max(0, Math.floor(((90 - lat) / 180) * GRID_H)));
    return land[y * GRID_W + x] > 0.5;
  };

  // --- G: coast falloff (three box passes ~ gaussian, ~5 degrees) ----------
  let blur = boxBlur(land, GRID_W, GRID_H, 3);
  blur = boxBlur(blur, GRID_W, GRID_H, 3);
  blur = boxBlur(blur, GRID_W, GRID_H, 3);
  const coast = gctx.createImageData(GRID_W, GRID_H);
  for (let i = 0; i < blur.length; i++) {
    coast.data[i * 4 + 1] = Math.round(blur[i] * 255);
    coast.data[i * 4 + 3] = 255;
  }
  gctx.putImageData(coast, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(grid, 0, 0, WIDTH, HEIGHT);
  ctx.restore();

  // --- B: night lights -----------------------------------------------------
  const rand = rng(0x1f2e3d);
  const degY = HEIGHT / 180;
  const px = (lon: number) => (((lon + 180) / 360) * WIDTH + WIDTH) % WIDTH;
  const py = (lat: number) => ((90 - lat) / 180) * HEIGHT;
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // Soft metro glow: an ellipse in map space (1/cos(lat) wider) so it reads
  // as a circle on the sphere.
  for (const c of CITIES) {
    const stretch = 1 / Math.max(0.2, Math.cos((c.lat * Math.PI) / 180));
    const rDeg = 0.15 + Math.sqrt(c.pop) * 0.08;
    const r = rDeg * degY;
    const x = px(c.lon);
    const y = py(c.lat);
    for (const off of [-WIDTH, 0, WIDTH]) {
      ctx.save();
      ctx.translate(x + off, y);
      ctx.scale(stretch, 1);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      // Bright pinpoint core with a quick falloff: the sprawl comes from
      // the specks below, not from a wide flat disc.
      const core = Math.min(0.85, 0.35 + c.pop / 50);
      g.addColorStop(0, `rgba(0,0,255,${core})`);
      g.addColorStop(0.15, `rgba(0,0,255,${core * 0.45})`);
      g.addColorStop(0.5, `rgba(0,0,255,${core * 0.12})`);
      g.addColorStop(1, "rgba(0,0,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.restore();
    }
  }

  // Suburbs and satellite towns: specks scattered around each metro. Kept
  // sparse and faint: with additive drawing, ~1,500 specks around a big
  // metro saturated into a flat disc that read as an orange blob up close.
  for (const c of CITIES) {
    const n = Math.round(30 + c.pop * 16);
    const sigma = 0.25 + Math.sqrt(c.pop) * 0.22;
    const stretch = 1 / Math.max(0.2, Math.cos((c.lat * Math.PI) / 180));
    for (let i = 0; i < n; i++) {
      const lat = c.lat + gauss() * sigma;
      const lon = c.lon + gauss() * sigma * stretch;
      if (!onLand(lon, lat)) continue;
      ctx.fillStyle = `rgba(0,0,255,${0.1 + rand() * 0.26})`;
      const s = 1 + rand() * 0.8;
      ctx.fillRect(px(lon), py(lat), s, s);
    }
  }

  // Countryside: faint specks wherever people plausibly live, density from
  // proximity to the metro list (so deserts and ice stay dark).
  const cityVec = CITIES.map((c) => ({ c, cosLat: Math.cos((c.lat * Math.PI) / 180) }));
  for (let i = 0; i < 40000; i++) {
    const lat = -56 + rand() * 128;
    const lon = -180 + rand() * 360;
    if (!onLand(lon, lat)) continue;
    let w = 0;
    for (const { c, cosLat } of cityVec) {
      const dLat = lat - c.lat;
      let dLon = Math.abs(lon - c.lon);
      if (dLon > 180) dLon = 360 - dLon;
      dLon *= cosLat;
      const d2 = dLat * dLat + dLon * dLon;
      w += c.pop / (1 + d2 / 30);
    }
    if (rand() > Math.min(1, w / 14)) continue;
    ctx.fillStyle = `rgba(0,0,255,${0.1 + rand() * 0.22})`;
    ctx.fillRect(px(lon), py(lat), 1, 1);
  }
  ctx.restore();

  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}
