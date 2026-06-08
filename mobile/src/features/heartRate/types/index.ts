export type PulseTrend = 'NORMAL' | 'HIGH' | 'LOW';

export interface HeartRateRecord {
  id: string;
  bpm: number;
  dateString: string; // e.g. "27 Mayıs"
  timeString: string; // e.g. "14:35"
  qualityScore: number; // e.g. 98 (percent)
  trend: PulseTrend;
  timestamp: number;
}
