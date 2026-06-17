// One reusable <audio> element (a fresh `new Audio()` can be GC'd mid-play on
// mobile). Revokes the previous object URL before swapping source.

export interface Player {
  play(src: string, isObjectUrl?: boolean): void;
  stop(): void;
}

export function createPlayer(): Player {
  let audio: HTMLAudioElement | null = null;
  let url: string | null = null;
  const revoke = () => {
    if (url) {
      URL.revokeObjectURL(url);
      url = null;
    }
  };
  return {
    play(src, isObjectUrl = false) {
      if (!audio) audio = new Audio();
      audio.pause();
      revoke();
      audio.src = src;
      if (isObjectUrl) url = src;
      void audio.play().catch((e) => console.error("playback failed", e));
    },
    stop() {
      audio?.pause();
      revoke();
    },
  };
}
