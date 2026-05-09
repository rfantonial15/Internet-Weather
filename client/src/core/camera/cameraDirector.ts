import { Vector3, Spherical } from "three";
import { CAMERA } from "@/config/constants";
import { damp } from "@/utils/easing";

/**
 * Pure camera math, decoupled from R3F. Holds critically-damped state for
 * yaw/pitch/distance and gives the renderer a position vector each frame.
 *
 * Idle behavior: slow auto-orbit. Focus behavior: ease toward a target
 * direction & distance, hold for focusUntil, then revert to idle.
 */
export class CameraDirector {
  private yaw = 0;
  private pitch = 0.18;
  private dist = CAMERA.initialDistance;

  private targetYaw = 0;
  private targetPitch = 0.18;
  private targetDist = CAMERA.initialDistance;

  /** Damping speed (higher = snappier). */
  private lambda = 2.2;

  setIdle(dt: number) {
    this.targetYaw += CAMERA.idleSpin * dt;
    this.targetPitch = 0.18 + Math.sin(this.targetYaw * 0.4) * 0.08;
    this.targetDist = CAMERA.initialDistance;
  }

  /** Pull yaw/pitch from a unit-sphere target vector. */
  setFocus(target: Vector3, distance: number) {
    const sph = new Spherical().setFromVector3(target);
    // Convert from "point on sphere" to "camera looking at point"
    this.targetYaw = sph.theta;
    this.targetPitch = Math.PI / 2 - sph.phi;
    this.targetDist = distance;
  }

  step(dt: number, out: Vector3) {
    this.yaw = damp(this.yaw, this.targetYaw, this.lambda, dt);
    this.pitch = damp(this.pitch, this.targetPitch, this.lambda, dt);
    this.dist = damp(this.dist, this.targetDist, this.lambda, dt);

    const cp = Math.cos(this.pitch);
    out.set(
      Math.sin(this.yaw) * cp * this.dist,
      Math.sin(this.pitch) * this.dist,
      Math.cos(this.yaw) * cp * this.dist,
    );
  }
}
