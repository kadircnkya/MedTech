import { useMemo } from 'react';
import { DoseRecord } from '../types';

export type DayStatus = 'ALL_TAKEN' | 'PARTIAL' | 'MISSED' | 'PLANNED' | 'EMPTY';

export interface DayData {
  date: string;          // YYYY-MM-DD
  status: DayStatus;
  doses: DoseRecord[];
  takenCount: number;
  totalCount: number;
}

export interface MonthlyStats {
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  complianceRate: number;          // 0-100
  avgDelayMinutes: number;
  streakDays: number;              // consecutive taken days
  worstTimeSlot: string | null;   // e.g. "20:00"
}

function dateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

function delayMinutes(scheduled: string, takenAt: string): number {
  const [sh, sm] = scheduled.split(':').map(Number);
  const taken = new Date(takenAt);
  return Math.max(0, taken.getHours() * 60 + taken.getMinutes() - (sh * 60 + sm));
}

export function useDoseAnalytics(doseRecords: DoseRecord[]) {
  // ── Calendar data: last 30 days ──
  const calendarDays = useMemo<DayData[]>(() => {
    const today = new Date();
    const days: DayData[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = dateKey(d);
      const doses = doseRecords.filter(r => r.date === key);

      if (doses.length === 0) {
        days.push({ date: key, status: 'EMPTY', doses: [], takenCount: 0, totalCount: 0 });
        continue;
      }

      const taken = doses.filter(r => r.status === 'TAKEN').length;
      const missed = doses.filter(r => r.status === 'MISSED').length;
      const pending = doses.filter(r => r.status === 'PENDING').length;
      const total = doses.length;
      let status: DayStatus;

      if (pending > 0 && i === 0) status = 'PLANNED';
      else if (taken === total || (taken > 0 && missed === 0)) status = 'ALL_TAKEN';
      else if (taken > 0 && missed > 0) status = 'PARTIAL';
      else status = 'MISSED';

      days.push({ date: key, status, doses, takenCount: taken, totalCount: total });
    }
    return days;
  }, [doseRecords]);

  // ── Monthly statistics (current month) ──
  const monthlyStats = useMemo<MonthlyStats>(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthRecords = doseRecords.filter(r => r.date.startsWith(monthPrefix) && r.status !== 'PENDING');

    const taken = monthRecords.filter(r => r.status === 'TAKEN');
    const missed = monthRecords.filter(r => r.status === 'MISSED');
    const total = monthRecords.length;

    // Average delay
    const delays = taken
      .filter(r => r.takenAt)
      .map(r => delayMinutes(r.scheduledTime, r.takenAt!));
    const avgDelay = delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0;

    // Streak: consecutive days all taken
    let streak = 0;
    const today = dateKey(new Date());
    for (let i = calendarDays.length - 1; i >= 0; i--) {
      const day = calendarDays[i];
      if (day.date > today) continue;
      if (day.status === 'ALL_TAKEN' || day.status === 'PLANNED') streak++;
      else break;
    }

    // Worst time slot (most missed)
    const slotMissed: Record<string, number> = {};
    missed.forEach(r => {
      slotMissed[r.scheduledTime] = (slotMissed[r.scheduledTime] ?? 0) + 1;
    });
    const worstSlot = Object.entries(slotMissed).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      totalDoses: total,
      takenDoses: taken.length,
      missedDoses: missed.length,
      complianceRate: total > 0 ? Math.round((taken.length / total) * 100) : 0,
      avgDelayMinutes: avgDelay,
      streakDays: streak,
      worstTimeSlot: worstSlot,
    };
  }, [doseRecords, calendarDays]);

  // ── AI insights ──
  const aiInsights = useMemo<string[]>(() => {
    const insights: string[] = [];
    const { complianceRate, avgDelayMinutes, worstTimeSlot, streakDays, missedDoses } = monthlyStats;

    if (complianceRate >= 95) insights.push('Bu ay ilaçlarınızı çok düzenli kullandınız. Harika bir uyum oranı!');
    else if (complianceRate >= 80) insights.push(`Bu ay ilaç kullanım uyum oranınız %${complianceRate}. İyi bir performans.`);
    else insights.push(`Bu ay ilaç kullanım uyum oranınız %${complianceRate}. Daha düzenli olmanız önerilir.`);

    if (worstTimeSlot) insights.push(`${worstTimeSlot} saatindeki dozlarda gecikme eğilimi görülüyor.`);
    if (avgDelayMinutes > 0) insights.push(`İlaçlarınızı ortalama ${avgDelayMinutes} dakika gecikmeli alıyorsunuz.`);
    if (streakDays >= 7) insights.push(`${streakDays} gün boyunca tüm dozlarınızı eksiksiz aldınız.`);
    if (missedDoses === 0) insights.push('Bu ay hiç doz kaçırmadınız. Mükemmel!');

    insights.push('Bu analiz yalnızca kullanım verilerinizi yansıtmaktadır. Tedavinizle ilgili kararlar için doktorunuza danışınız.');
    return insights;
  }, [monthlyStats]);

  return { calendarDays, monthlyStats, aiInsights };
}
