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
  let recording = false;

  const down = (e: PointerEvent) => {
    e.preventDefault();
    if (recording) return;
    button.setPointerCapture(e.pointerId);
    void recorder
      .start()
      .then(() => {
        recording = true;
        button.classList.add("active");
        handlers.onStart?.();
      })
      .catch((err) => handlers.onError?.(err));
  };

  const up = () => {
    if (!recording) return;
    recording = false;
    button.classList.remove("active");
    void recorder
      .stop()
      .then(handlers.onResult)
      .catch((err) => handlers.onError?.(err));
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
