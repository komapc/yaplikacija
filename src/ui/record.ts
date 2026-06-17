// Wire a hold-to-record button: press and hold to record, release to analyse.
// Pointer capture keeps the gesture if the finger drifts off the button.
// Returns a teardown that removes the listeners.

import type { Recorder } from "../audio/recorder";

export interface RecordResult {
  samples: Float32Array;
  sampleRate: number;
  blob: Blob;
}

export function holdToRecord(
  button: HTMLElement,
  recorder: Recorder,
  handlers: {
    onStart?: () => void;
    onResult: (r: RecordResult) => void;
    onError?: (e: unknown) => void;
  },
): () => void {
  // "starting" = waiting for the mic to open. A release during this window must
  // be remembered (releasedEarly) so we don't leave the recorder — and the mic —
  // stuck on after start() finally resolves.
  let state: "idle" | "starting" | "recording" = "idle";
  let releasedEarly = false;

  const finish = () => {
    if (state !== "recording") return;
    state = "idle";
    button.classList.remove("active");
    void recorder
      .stop()
      .then(handlers.onResult)
      .catch((err) => handlers.onError?.(err));
  };

  const down = (e: PointerEvent) => {
    e.preventDefault();
    if (state !== "idle") return;
    state = "starting";
    releasedEarly = false;
    button.setPointerCapture(e.pointerId);
    void recorder
      .start()
      .then(() => {
        if (releasedEarly) {
          // Tapped and let go before the mic opened: release it, no result.
          state = "idle";
          void recorder.stop().catch(() => {});
          return;
        }
        state = "recording";
        button.classList.add("active");
        handlers.onStart?.();
      })
      .catch((err) => {
        state = "idle";
        button.classList.remove("active");
        handlers.onError?.(err);
      });
  };

  const up = () => {
    if (state === "starting") {
      releasedEarly = true; // defer the stop until start() resolves
      return;
    }
    finish();
  };

  button.addEventListener("pointerdown", down);
  button.addEventListener("pointerup", up);
  button.addEventListener("pointercancel", up);

  return () => {
    button.removeEventListener("pointerdown", down);
    button.removeEventListener("pointerup", up);
    button.removeEventListener("pointercancel", up);
  };
}
