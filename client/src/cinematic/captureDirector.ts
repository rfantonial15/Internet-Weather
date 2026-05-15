import { useEventStore } from "@/state/useEventStore";
import {
  ASPECT_PRESETS,
  type AspectKey,
  type ClipRecord,
  useCinematicStore,
} from "@/state/useCinematicStore";
import {
  cinematicShotProgress,
  endCinematicShot,
  startCinematicShot,
} from "@/state/useCameraStore";
import { phaseForU, SHOT_SCHEDULE, shotForStory } from "./cameraChoreography";
import { ClipRecorder } from "./clipRecorder";
import { StoryDetector, type Story } from "./storyDetector";
import { titleForStory } from "./titleGenerator";

/**
 * The capture director is the single piece of mutable state that ties the
 * cinematic system together. It owns:
 *
 *   - the live StoryDetector (consumes events as they land)
 *   - the active ClipRecorder (one at a time)
 *   - the per-frame loop that advances shot progress and ends the shot
 *
 * Externally, it exposes start/stop/manualCapture so the UI can wire buttons,
 * and an init() that boots the subscriptions. Lifetime is the app lifetime —
 * it returns a teardown function for HMR / unmount safety.
 */

export interface DirectorHandle {
  /** Force-trigger a capture on the most recent event cluster. */
  manualCapture(opts?: { aspect?: AspectKey }): boolean;
  /** Abort any active capture immediately. */
  abort(): void;
  /** Tear down subscriptions and active recordings. */
  dispose(): void;
}

let handle: DirectorHandle | null = null;

interface ActiveCapture {
  story: Story;
  recorder: ClipRecorder;
  progressRef: { current: number };
  aspect: AspectKey;
  lastPhase: ReturnType<typeof phaseForU> | "outro";
  startedAt: number;
}

/**
 * Start the cinematic system. Must be called after the WebGL canvas exists
 * (i.e. inside or after the first frame of the React tree). The detector
 * subscribes to the event store and runs a 250ms scan loop; auto-capture
 * fires whenever a Story is emitted and no shot is currently active.
 */
export function initCaptureDirector(getSourceCanvas: () => HTMLCanvasElement | null): DirectorHandle {
  if (handle) return handle;

  const detector = new StoryDetector();
  let active: ActiveCapture | null = null;
  let scanTimer: number | null = null;

  // Replay the events already in the store so a story right after boot can
  // still see its own buildup. The detector's window will quietly prune.
  for (const e of useEventStore.getState().events) detector.ingest(e);

  // Subscribe to live event additions. We use the lastId pointer rather than
  // diffing the array, so we don't loop over old events on every change.
  let seenLastId = useEventStore.getState().lastId;
  const unsubEvents = useEventStore.subscribe((s) => {
    if (s.lastId === seenLastId) return;
    seenLastId = s.lastId;
    const last = s.events[s.events.length - 1];
    if (last) detector.ingest(last);
  });

  // While capturing we tick at 100ms so the on-screen overlay stays smooth;
  // when idle we slow to 400ms to avoid burning cycles for nothing. The
  // timer is rescheduled whenever capture state changes.
  const FAST_TICK = 100;
  const IDLE_TICK = 400;
  let currentTick = IDLE_TICK;

  function reschedule(ms: number) {
    if (currentTick === ms && scanTimer != null) return;
    if (scanTimer != null) window.clearInterval(scanTimer);
    currentTick = ms;
    scanTimer = window.setInterval(loop, ms);
  }

  function loop() {
    if (active) {
      // While capturing, advance progress + run phase transitions. Done here
      // instead of in the R3F frame so the camera director and capture
      // director stay decoupled (capture works even if R3F isn't rendering).
      if (currentTick !== FAST_TICK) reschedule(FAST_TICK);
      const u = cinematicShotProgress();
      if (u !== null) {
        active.progressRef.current = u;
        useCinematicStore.getState().setProgress(u);
        const phase = phaseForU(u);
        if (phase !== active.lastPhase) {
          active.lastPhase = phase;
          useCinematicStore.getState().setPhase(phase);
        }
        if (u >= 1) finalize().catch(console.error);
      } else {
        finalize().catch(console.error);
      }
      return;
    }

    if (currentTick !== IDLE_TICK) reschedule(IDLE_TICK);
    if (!useCinematicStore.getState().autoCapture) return;
    const story = detector.scan();
    if (story) tryStart(story);
  }

  reschedule(IDLE_TICK);

  function tryStart(story: Story, override?: { aspect?: AspectKey }): boolean {
    if (active) return false;
    const source = getSourceCanvas();
    if (!source) return false;
    const aspect = override?.aspect ?? useCinematicStore.getState().preferredAspect;
    const title = titleForStory(story);
    const shot = shotForStory(story);
    if (!startCinematicShot(shot)) return false;

    const progressRef = { current: 0 };
    let recorder: ClipRecorder;
    try {
      recorder = new ClipRecorder(aspect);
    } catch (err) {
      console.warn("[cinematic] recorder unavailable", err);
      endCinematicShot();
      return false;
    }
    try {
      recorder.start(source, {
        title,
        progressRef,
        titleInU: SHOT_SCHEDULE.titleInU,
        titleOutU: SHOT_SCHEDULE.titleOutU,
      });
    } catch (err) {
      // MediaRecorder can throw on unsupported codec / no-stream environments
      // (Safari, WebView). Bail gracefully — the shot still runs visually.
      console.warn("[cinematic] recorder.start failed", err);
      endCinematicShot();
      return false;
    }

    active = {
      story,
      recorder,
      progressRef,
      aspect,
      lastPhase: "reveal",
      startedAt: performance.now(),
    };
    useCinematicStore.getState().begin(story, title);
    return true;
  }

  async function finalize() {
    if (!active) return;
    const a = active;
    active = null;
    endCinematicShot();
    try {
      const result = await a.recorder.stop();
      const url = URL.createObjectURL(result.blob);
      const clip: ClipRecord = {
        id: `clip_${a.story.id}`,
        story: a.story,
        title: useCinematicStore.getState().title ?? titleForStory(a.story),
        url,
        aspect: a.aspect,
        durationMs: result.durationMs,
        t: Date.now(),
        width: result.width,
        height: result.height,
        size: result.blob.size,
      };
      useCinematicStore.getState().pushClip(clip);
    } catch (err) {
      console.warn("[cinematic] finalize failed", err);
    } finally {
      useCinematicStore.getState().end();
    }
  }

  handle = {
    manualCapture(opts) {
      // For manual fires we synthesize a story from the most recent event
      // cluster the detector has seen. If none is ready, we fabricate one
      // around the most recent event — useful for testing the rig.
      const story = detector.scan() ?? syntheticStoryFromRecent();
      if (!story) return false;
      return tryStart(story, opts);
    },
    abort() {
      if (!active) return;
      // Keep the partial blob? — no. Stop and discard; users expect "abort"
      // to leave the gallery untouched.
      const a = active;
      active = null;
      endCinematicShot();
      a.recorder.stop().catch(() => undefined);
      useCinematicStore.getState().end();
    },
    dispose() {
      if (scanTimer != null) {
        window.clearInterval(scanTimer);
        scanTimer = null;
      }
      unsubEvents();
      this.abort();
      handle = null;
    },
  };

  return handle;
}

export function getCaptureDirector(): DirectorHandle | null {
  return handle;
}

/**
 * Build a one-off Story from the most recent located event in the store, used
 * when the user hits "capture now" but the detector hasn't found a cluster.
 * Magnitude is intentionally medium so the choreography still has motion.
 */
function syntheticStoryFromRecent(): Story | null {
  const events = useEventStore.getState().events;
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.at) {
      return {
        id: `story_manual_${Date.now()}`,
        t: Date.now(),
        epicenter: e.at,
        kind: e.kind,
        source: e.source,
        magnitude: 0.65,
        spread: 0.1,
        refs: [e.id],
      };
    }
  }
  return null;
}

/** Convenience: derive an aspect-aware filename for a clip. */
export function clipFilename(clip: ClipRecord): string {
  const slug = clip.title.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "internet-weather";
  const aspect = ASPECT_PRESETS[clip.aspect];
  const ext = clip.url && clip.url.startsWith("blob:") ? "webm" : "webm";
  return `${slug}_${aspect.w}x${aspect.h}.${ext}`;
}
