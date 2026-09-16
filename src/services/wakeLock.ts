export class WakeLockService {
  private sentinel: any = null;
  private activeStreams: number = 0;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.activeStreams > 0 && !this.sentinel) {
          this.requestLock();
        }
      });
    }
  }

  public async acquire(): Promise<void> {
    this.activeStreams++;
    if (this.activeStreams === 1) {
      await this.requestLock();
    }
  }

  public release(): void {
    if (this.activeStreams > 0) {
      this.activeStreams--;
    }
    if (this.activeStreams === 0 && this.sentinel) {
      try {
        this.sentinel.release();
      } catch (err) {
        return;
      }
      this.sentinel = null;
    }
  }

  private async requestLock(): Promise<void> {
    if ('wakeLock' in navigator) {
      try {
        this.sentinel = await (navigator as any).wakeLock.request('screen');
        this.sentinel.addEventListener('release', () => {
          this.sentinel = null;
        });
      } catch (err) {
        this.sentinel = null;
      }
    }
  }
}

export const wakeLockService = new WakeLockService();
