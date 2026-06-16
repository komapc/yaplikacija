// Microphone capture. Records to a Blob via MediaRecorder, then decodes and
// resamples to a fixed analysis rate using an OfflineAudioContext so the LPC
// order stays small and consistent regardless of the device's native rate.

export const ANALYSIS_RATE = 16000;

export class Recorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start();
  }

  /** Stops recording and returns mono PCM resampled to ANALYSIS_RATE. */
  async stop(): Promise<{ samples: Float32Array; sampleRate: number; blob: Blob }> {
    const recorder = this.mediaRecorder;
    if (!recorder) throw new Error("Recorder not started");

    const blob: Blob = await new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(this.chunks, { type: this.chunks[0]?.type }));
      recorder.stop();
    });

    this.cleanup();

    const arrayBuf = await blob.arrayBuffer();
    const decodeCtx = new AudioContext();
    const decoded = await decodeCtx.decodeAudioData(arrayBuf.slice(0));
    await decodeCtx.close();

    const offline = new OfflineAudioContext(1, Math.ceil((decoded.duration * ANALYSIS_RATE)), ANALYSIS_RATE);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const rendered = await offline.startRendering();

    return { samples: rendered.getChannelData(0).slice(), sampleRate: ANALYSIS_RATE, blob };
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.mediaRecorder = null;
  }
}
