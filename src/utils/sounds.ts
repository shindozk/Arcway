let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

function playNoise(duration: number, volume: number) {
  try {
    const ctx = getAudioContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    source.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.value = 4000;

    gainNode.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(ctx.currentTime);
  } catch {
    // Audio not available
  }
}

function playChord(freqs: number[], duration: number, volume: number, type: OscillatorType = 'sine') {
  freqs.forEach((f, i) => {
    setTimeout(() => playTone(f, duration, volume, type), i * 30);
  });
}

export const sounds = {
  tap() {
    playTone(800, 0.06, 0.1, 'sine');
    playNoise(0.03, 0.08);
  },

  click() {
    playTone(1200, 0.05, 0.08, 'sine');
    playTone(600, 0.03, 0.05, 'sine');
  },

  toggle(on: boolean) {
    if (on) {
      playTone(500, 0.06, 0.08, 'sine');
      setTimeout(() => playTone(800, 0.08, 0.08, 'sine'), 40);
    } else {
      playTone(800, 0.06, 0.08, 'sine');
      setTimeout(() => playTone(500, 0.08, 0.08, 'sine'), 40);
    }
  },

  navigate() {
    playTone(600, 0.04, 0.06, 'sine');
    setTimeout(() => playTone(900, 0.06, 0.08, 'sine'), 25);
  },

  install() {
    playChord([523, 659, 784], 0.15, 0.08, 'sine');
  },

  uninstall() {
    playTone(800, 0.08, 0.08, 'sine');
    setTimeout(() => playTone(500, 0.1, 0.06, 'sine'), 50);
  },

  success() {
    playTone(523, 0.1, 0.07, 'sine');
    setTimeout(() => playTone(659, 0.1, 0.07, 'sine'), 80);
    setTimeout(() => playTone(784, 0.1, 0.07, 'sine'), 160);
    setTimeout(() => playTone(1047, 0.18, 0.09, 'sine'), 240);
  },

  error() {
    playTone(440, 0.08, 0.08, 'triangle');
    setTimeout(() => playTone(330, 0.1, 0.06, 'triangle'), 80);
  },

  search() {
    playTone(1000, 0.04, 0.05, 'sine');
  },

  back() {
    playTone(700, 0.04, 0.06, 'sine');
    setTimeout(() => playTone(500, 0.05, 0.06, 'sine'), 25);
  },

  hover() {
    playTone(1400, 0.025, 0.03, 'sine');
  },

  pop() {
    playTone(1100, 0.04, 0.06, 'sine');
    playNoise(0.02, 0.06);
  },

  slide() {
    playTone(400, 0.05, 0.04, 'sine');
    setTimeout(() => playTone(600, 0.04, 0.04, 'sine'), 25);
  },

  refresh() {
    playTone(600, 0.04, 0.05, 'sine');
    setTimeout(() => playTone(800, 0.04, 0.05, 'sine'), 40);
    setTimeout(() => playTone(1000, 0.06, 0.05, 'sine'), 80);
  },

  delete() {
    playTone(400, 0.06, 0.08, 'triangle');
    setTimeout(() => playTone(250, 0.1, 0.06, 'triangle'), 50);
  },

  // New sounds
  open() {
    playTone(400, 0.05, 0.06, 'sine');
    setTimeout(() => playTone(700, 0.06, 0.08, 'sine'), 30);
  },

  close() {
    playTone(700, 0.05, 0.06, 'sine');
    setTimeout(() => playTone(400, 0.06, 0.06, 'sine'), 30);
  },

  select() {
    playTone(660, 0.04, 0.06, 'sine');
    setTimeout(() => playTone(880, 0.06, 0.08, 'sine'), 25);
  },

  copy() {
    playTone(800, 0.03, 0.06, 'sine');
    setTimeout(() => playTone(1000, 0.04, 0.06, 'sine'), 20);
  },

  paste() {
    playTone(1000, 0.03, 0.06, 'sine');
    setTimeout(() => playTone(800, 0.04, 0.06, 'sine'), 20);
  },

  focus() {
    playTone(900, 0.03, 0.04, 'sine');
  },

  blur() {
    playTone(600, 0.03, 0.03, 'sine');
  },

  notification() {
    playChord([800, 1000, 1200], 0.08, 0.06, 'sine');
  },

  typing() {
    playTone(1200 + Math.random() * 200, 0.02, 0.02, 'sine');
  },

  swipe() {
    playTone(500, 0.06, 0.04, 'sine');
    setTimeout(() => playTone(700, 0.04, 0.03, 'sine'), 30);
  },
};

let soundEnabled = true;

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function playSound(sound: keyof typeof sounds, ...args: unknown[]) {
  if (soundEnabled) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sounds[sound] as any)(...args);
  }
}
