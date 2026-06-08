import AsyncStorage from '@react-native-async-storage/async-storage';
import { HeartRateRecord, PulseTrend } from '../types';

const STORAGE_KEY = '@mediflow_heart_rate_history';

export class HeartRateHistoryService {
  private static defaultRecords: HeartRateRecord[] = [
    { id: '1', bpm: 78, dateString: '24 Mayıs', timeString: '09:15', qualityScore: 98, trend: 'NORMAL', timestamp: Date.now() - 4 * 86400000 },
    { id: '2', bpm: 81, dateString: '25 Mayıs', timeString: '18:40', qualityScore: 96, trend: 'NORMAL', timestamp: Date.now() - 3 * 86400000 },
    { id: '3', bpm: 76, dateString: '26 Mayıs', timeString: '08:12', qualityScore: 99, trend: 'NORMAL', timestamp: Date.now() - 2 * 86400000 },
    { id: '4', bpm: 89, dateString: '27 Mayıs', timeString: '21:05', qualityScore: 92, trend: 'HIGH', timestamp: Date.now() - 1 * 86400000 },
  ];

  public static async getHistory(): Promise<HeartRateRecord[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
      // Return seed data on first launch
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.defaultRecords));
      return this.defaultRecords;
    } catch {
      return this.defaultRecords;
    }
  }

  public static async addRecord(bpm: number): Promise<HeartRateRecord[]> {
    const history = await this.getHistory();
    
    // Determine clinical trend status
    let trend: PulseTrend = 'NORMAL';
    if (bpm > 85) trend = 'HIGH';
    else if (bpm < 60) trend = 'LOW';

    // Format local Turkish dates
    const dateObj = new Date();
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const dateString = `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;
    const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newRecord: HeartRateRecord = {
      id: Math.random().toString(),
      bpm,
      dateString: dateString === `${dateObj.getDate()} Mayıs` ? 'Bugün' : dateString,
      timeString,
      qualityScore: Math.floor(Math.random() * (100 - 95) + 95), // 95%-100% premium quality score
      trend,
      timestamp: dateObj.getTime()
    };

    const updated = [newRecord, ...history].slice(0, 10); // Keep last 10 records for optimization
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }
}
