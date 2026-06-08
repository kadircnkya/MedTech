export class SignalProcessor {
  private buffer: number[] = [];
  private maxBufferSize = 30; // Smoothing window size
  private lastPeakTime: number = 0;
  private minInterval = 400; // 150 BPM limits
  private maxInterval = 1500; // 40 BPM limits

  // Low pass filter state
  private lastFilteredValue: number = 0;
  private alpha = 0.25; // Filter smoothing constant

  /**
   * Applies Exponential Moving Average (Low-Pass Filter) to remove camera noise
   */
  public filter(rawValue: number): number {
    const filtered = this.alpha * rawValue + (1 - this.alpha) * this.lastFilteredValue;
    this.lastFilteredValue = filtered;

    this.buffer.push(filtered);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
    return filtered;
  }

  /**
   * Detects cardiac pulse peaks (systolic peaks) in the PPG signal
   */
  public detectPeak(value: number): boolean {
    if (this.buffer.length < 5) return false;

    const len = this.buffer.length;
    // Check if the middle element is a local peak inside the sliding window
    const prev = this.buffer[len - 3];
    const curr = this.buffer[len - 2];
    const next = this.buffer[len - 1];

    if (curr > prev && curr > next) {
      const now = Date.now();
      const interval = now - this.lastPeakTime;

      // Validate interval is within human cardiac boundaries (40 - 150 BPM)
      if (interval >= this.minInterval && interval <= this.maxInterval) {
        this.lastPeakTime = now;
        return true;
      }
    }
    return false;
  }

  public getSignalStrength(): number {
    if (this.buffer.length < 2) return 0;
    const min = Math.min(...this.buffer);
    const max = Math.max(...this.buffer);
    return max - min;
  }

  public clear() {
    this.buffer = [];
    this.lastPeakTime = 0;
    this.lastFilteredValue = 0;
  }
}
