// Continuous microphone capture with simple voice-activity segmentation: opens
// the stream once and fires `onUtterance` with each spoken chunk (a burst of
// voiced energy bounded by silence). Used by the hands-free Bullseye game.
//
// Uses ScriptProcessorNode — deprecated but universally supported and far
// simpler than an AudioWorklet for this. The node outputs silence (we never
// write its output buffer), so connecting it to the destination doesn't echo.

const VOICE_RMS = 0.03; // a frame louder than this is "voiced"
const END_QUIET_MS = 260; // this much trailing silence ends an utterance
const MIN_MS = 150; // ignore utterances shorter than this
const MAX_MS = 2200; // force-finalize a held sound after this

export class LiveMic {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private node: ScriptProcessorNode | null = null;
  private src: MediaStreamAudioSourceNode | null = null;

  async start(onUtterance: (samples: Float32Array, sampleRate: number) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    this.ctx = new AudioContext();
    const rate = this.ctx.sampleRate;
    this.src = this.ctx.createMediaStreamSource(this.stream);
    this.node = this.ctx.createScriptProcessor(2048, 1, 1);

    const endQuiet = (END_QUIET_MS / 1000) * rate;
    const minLen = (MIN_MS / 1000) * rate;
    const maxLen = (MAX_MS / 1000) * rate;
    let seg: number[] = [];
    let collecting = false;
    let quiet = 0;

    const finalize = () => {
      if (seg.length >= minLen) onUtterance(Float32Array.from(seg), rate);
      seg = [];
      collecting = false;
      quiet = 0;
    };

    this.node.onaudioprocess = (e) => {
      const buf = e.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);

      if (rms >= VOICE_RMS) {
        collecting = true;
        quiet = 0;
        for (let i = 0; i < buf.length; i++) seg.push(buf[i]);
        if (seg.length >= maxLen) finalize();
      } else if (collecting) {
        for (let i = 0; i < buf.length; i++) seg.push(buf[i]);
        quiet += buf.length;
        if (quiet >= endQuiet) finalize();
      }
    };

    this.src.connect(this.node);
    this.node.connect(this.ctx.destination); // required for the node to run; outputs silence
  }

  stop(): void {
    this.node?.disconnect();
    this.src?.disconnect();
    if (this.node) this.node.onaudioprocess = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.node = null;
    this.src = null;
    this.stream = null;
    this.ctx = null;
  }
}
