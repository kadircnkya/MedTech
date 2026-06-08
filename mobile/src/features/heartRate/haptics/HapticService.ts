import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticIntensity = 'OFF' | 'LIGHT' | 'NORMAL' | 'STRONG';

class HapticService {
  private intensity: HapticIntensity = 'NORMAL';
  private lastTriggered: number = 0;
  private cooldownMs: number = 80; // Cooldown to prevent haptic vibration spam and save battery

  public setIntensity(intensity: HapticIntensity) {
    this.intensity = intensity;
  }

  public getIntensity(): HapticIntensity {
    return this.intensity;
  }

  private canTrigger(): boolean {
    if (this.intensity === 'OFF') return false;
    const now = Date.now();
    if (now - this.lastTriggered < this.cooldownMs) return false;
    this.lastTriggered = now;
    return true;
  }

  public triggerHeartbeat() {
    if (!this.canTrigger()) return;

    if (this.intensity === 'LIGHT') {
      Haptics.selectionAsync();
    } else if (this.intensity === 'NORMAL') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }

  public triggerSuccess() {
    if (this.intensity === 'OFF') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  public triggerWarning() {
    if (this.intensity === 'OFF') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  public triggerError() {
    if (this.intensity === 'OFF') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  public triggerDoubleWarning() {
    if (this.intensity === 'OFF') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 150);
  }
}

export const hapticService = new HapticService();
