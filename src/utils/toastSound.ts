type ToastType = 'success' | 'error' | 'info' | 'warning';

// Sound settings (not persisted, defaults to enabled)
let soundEnabled = true;
let volume = 0.5;

// Audio context singleton
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContext();
  }
  return audioContext;
}

// Note frequencies (in Hz)
const NOTES = {
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
};

function playNote(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  gainValue: number
): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startTime);

  // Attack - decay envelope
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gainValue, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function playSuccessSound(ctx: AudioContext, startTime: number, gainValue: number): void {
  // Two-note ascending: C5 → E5
  playNote(ctx, NOTES.C5, startTime, 0.15, gainValue);
  playNote(ctx, NOTES.E5, startTime + 0.12, 0.2, gainValue);
}

function playErrorSound(ctx: AudioContext, startTime: number, gainValue: number): void {
  // Two-note descending: E5 → C5
  playNote(ctx, NOTES.E5, startTime, 0.15, gainValue);
  playNote(ctx, NOTES.C5, startTime + 0.12, 0.2, gainValue);
}

function playInfoSound(ctx: AudioContext, startTime: number, gainValue: number): void {
  // Single tone: C5
  playNote(ctx, NOTES.C5, startTime, 0.2, gainValue);
}

function playWarningSound(ctx: AudioContext, startTime: number, gainValue: number): void {
  // Three-note ascending: C5 → D5 → E5
  playNote(ctx, NOTES.C5, startTime, 0.1, gainValue);
  playNote(ctx, NOTES.D5, startTime + 0.08, 0.1, gainValue);
  playNote(ctx, NOTES.E5, startTime + 0.16, 0.15, gainValue);
}

export function playToastSound(type: ToastType): void {
  if (!soundEnabled) return;

  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const startTime = ctx.currentTime;
    const gainValue = volume * 0.3; // Cap at 30% to avoid being too loud

    switch (type) {
      case 'success':
        playSuccessSound(ctx, startTime, gainValue);
        break;
      case 'error':
        playErrorSound(ctx, startTime, gainValue);
        break;
      case 'info':
        playInfoSound(ctx, startTime, gainValue);
        break;
      case 'warning':
        playWarningSound(ctx, startTime, gainValue);
        break;
    }
  } catch (err) {
    // Silently fail - audio is not critical
    console.debug('Toast sound failed:', err);
  }
}

export function setToastSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function isToastSoundEnabled(): boolean {
  return soundEnabled;
}

export function setToastVolume(newVolume: number): void {
  volume = Math.max(0, Math.min(1, newVolume));
}

export function getToastVolume(): number {
  return volume;
}
