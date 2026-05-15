import { Vector3, Spherical } from "three";
import { CAMERA } from "@/config/constants";
import { damp } from "@/utils/easing";

/**
 * Pure camera math, decoupled from R3F. Holds critically-damped state for
 * yaw/pitch/distance and gives the renderer a position vector each frame.
 *
 * Modes:
 *   - idle:    slow auto-orbit
 *   - focus:   ease toward a target direction & distance, hold, revert
 *   - shot:    cinematic timeline driven by the capture director — keyframed
 *              dist/orbit/shake/fov, ignoring damping bands so we get film
 *              motion (push-ins, slow rolls, snap-outs) instead of springiness
 */
export interface CinematicShot {
  /** Anchor unit vector — the point the camera circles around. */
  anchor: Vector3;
  /** Total shot duration, ms. */
  durationMs: number;
  /** Distance keyframes (0..1 normalized along the shot). */
  distFrom: number;
  distTo: number;
  /** Lateral orbit (radians) added to the anchor's yaw across the shot. */
  orbitDelta: number;
  /** Vertical pitch offset (radians) added across the shot. */
  pitchDelta: number;
  /** FOV in degrees at start/end (creates the dolly-zoom feel when divergent). */
  fovFrom: number;
  fovTo: number;
  /** 0..1 — peak shake amplitude during the shot. */
  shake: number;
  /** Easing curve identifier; the director picks the right one. */
  curve: "easeInOut" | "easeOut" | "easeIn" | "linear";
}

export class CameraDirector {
  private yaw = 0;
  private pitch = 0.18;
  private dist: number = CAMERA.initialDistance;
  /** Live FOV the renderer reads each frame; idle/focus modes hold the base. */
  fov: number = CAMERA.baseFov;

  private targetYaw = 0;
  private targetPitch = 0.18;
  private targetDist: number = CAMERA.initialDistance;
  private targetFov: number = CAMERA.baseFov;

  /** Damping speed for idle/focus modes. */
  private lambda = 2.2;

  /** Active cinematic shot, if any. */
  private shot: CinematicShot | null = null;
  private shotStartT = 0;
  private shotAnchorYaw = 0;
  private shotAnchorPitch = 0.18;
  /** Lazy seed for the per-shot shake noise — set when a shot starts. */
  private shakeSeed = 0;

  setIdle(dt: number) {
    this.targetYaw += CAMERA.idleSpin * dt;
    this.targetPitch = 0.18 + Math.sin(this.targetYaw * 0.4) * 0.08;
    this.targetDist = CAMERA.initialDistance;
    this.targetFov = CAMERA.baseFov;
  }

  /** Pull yaw/pitch from a unit-sphere target vector. */
  setFocus(target: Vector3, distance: number) {
    const sph = new Spherical().setFromVector3(target);
    this.targetYaw = sph.theta;
    this.targetPitch = Math.PI / 2 - sph.phi;
    this.targetDist = distance;
    this.targetFov = CAMERA.baseFov;
  }

  /**
   * Begin a cinematic shot. While a shot is active step() bypasses damping
   * and runs the keyframed timeline; once the shot ends the director hands
   * back to whichever mode the camera store is currently in.
   */
  startShot(shot: CinematicShot) {
    const sph = new Spherical().setFromVector3(shot.anchor);
    this.shotAnchorYaw = sph.theta;
    this.shotAnchorPitch = Math.PI / 2 - sph.phi;
    this.shot = shot;
    this.shotStartT = performance.now();
    this.shakeSeed = Math.random() * 1000;
    // Warm starting state so the first frame is at distFrom, not the previous dist.
    this.yaw = this.shotAnchorYaw - shot.orbitDelta * 0.5;
    this.pitch = this.shotAnchorPitch + shot.pitchDelta * 0.5;
    this.dist = shot.distFrom;
    this.fov = shot.fovFrom;
  }

  endShot() {
    this.shot = null;
    this.targetYaw = this.yaw;
    this.targetPitch = this.pitch;
    this.targetDist = CAMERA.initialDistance;
    this.targetFov = CAMERA.baseFov;
  }

  hasActiveShot(): boolean {
    return this.shot !== null;
  }

  /** 0..1 progress through the active shot, or null if idle/focus. */
  shotProgress(): number | null {
    if (!this.shot) return null;
    return Math.min(1, (performance.now() - this.shotStartT) / this.shot.durationMs);
  }

  step(dt: number, out: Vector3) {
    if (this.shot) {
      const u = this.shotProgress() ?? 1;
      const e = ease(u, this.shot.curve);
      // Anchor + keyframed deltas. Orbit sweeps from −0.5 to +0.5 of delta
      // around the anchor for a balanced "swing" rather than a one-sided pan.
      this.yaw = this.shotAnchorYaw + this.shot.orbitDelta * (e - 0.5);
      this.pitch = this.shotAnchorPitch + this.shot.pitchDelta * (e - 0.5);
      this.dist = this.shot.distFrom + (this.shot.distTo - this.shot.distFrom) * e;
      this.fov = this.shot.fovFrom + (this.shot.fovTo - this.shot.fovFrom) * e;
      // Shake ramps up around the climax (centered ~0.65 of the shot) and
      // fades by the end so the closing frame is steady enough for a poster.
      const climax = 1 - Math.min(1, Math.abs(u - 0.65) / 0.35);
      const amp = this.shot.shake * climax * 0.04;
      const t = (performance.now() - this.shotStartT) * 0.03;
      const yawJ = Math.sin(t * 1.7 + this.shakeSeed) * amp;
      const pitchJ = Math.cos(t * 2.3 + this.shakeSeed * 0.7) * amp * 0.6;
      this.yaw += yawJ;
      this.pitch += pitchJ;

      if (u >= 1) this.endShot();
    } else {
      this.yaw = damp(this.yaw, this.targetYaw, this.lambda, dt);
      this.pitch = damp(this.pitch, this.targetPitch, this.lambda, dt);
      this.dist = damp(this.dist, this.targetDist, this.lambda, dt);
      this.fov = damp(this.fov, this.targetFov, this.lambda * 1.4, dt);
    }

    const cp = Math.cos(this.pitch);
    out.set(
      Math.sin(this.yaw) * cp * this.dist,
      Math.sin(this.pitch) * this.dist,
      Math.cos(this.yaw) * cp * this.dist,
    );
  }
}

function ease(t: number, curve: CinematicShot["curve"]): number {
  switch (curve) {
    case "linear": return t;
    case "easeOut": return 1 - Math.pow(1 - t, 3);
    case "easeIn": return t * t * t;
    case "easeInOut":
    default:
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
