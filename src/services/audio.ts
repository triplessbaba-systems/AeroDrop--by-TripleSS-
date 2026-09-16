export class AudioNotificationService {
  private audioCtx: AudioContext | null = null;
  private isSoundEnabled: boolean = true;
  private isNotificationEnabled: boolean = false;

  constructor() {
    const savedSound = localStorage.getItem('aerodrop_sound_enabled');
    if (savedSound !== null) {
      this.isSoundEnabled = savedSound === 'true';
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      this.isNotificationEnabled = true;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.isSoundEnabled = enabled;
    localStorage.setItem('aerodrop_sound_enabled', String(enabled));
  }

  public getSoundEnabled(): boolean {
    return this.isSoundEnabled;
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    try {
      const result = await Notification.requestPermission();
      this.isNotificationEnabled = result === 'granted';
      return this.isNotificationEnabled;
    } catch (err) {
      return false;
    }
  }

  public getNotificationEnabled(): boolean {
    return this.isNotificationEnabled;
  }

  public playChime(type: 'offer' | 'complete' | 'error'): void {
    if (!this.isSoundEnabled) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === 'offer') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        osc1.frequency.setValueAtTime(880.0, now + 0.12);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(587.33, now);
        osc2.frequency.setValueAtTime(880.0, now + 0.12);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.5);
        osc2.stop(now + 0.5);
      } else if (type === 'complete') {
        const freqs = [523.25, 659.25, 783.99];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.09);

          gain.gain.setValueAtTime(0.1, now + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.4);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.09);
          osc.stop(now + idx * 0.09 + 0.45);
        });
      } else if (type === 'error') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.linearRampToValueAtTime(180, now + 0.3);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (err) {
      return;
    }
  }

  public showNotification(title: string, body: string): void {
    if (!this.isNotificationEnabled || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico'
      });
    } catch (err) {
      return;
    }
  }
}

export const audioNotification = new AudioNotificationService();
