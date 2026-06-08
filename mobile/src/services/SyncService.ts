import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiClient } from './api';

const SYNC_QUEUE_KEY = '@medtech_sync_queue';

export interface SyncTask {
  id: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  payload?: any;
  timestamp: number;
}

export class SyncService {
  /** Enqueue a task to be synced later */
  static async enqueueTask(method: SyncTask['method'], url: string, payload?: any) {
    const isConnected = (await NetInfo.fetch()).isConnected;
    
    // If online, try to execute immediately
    if (isConnected) {
      try {
        await apiClient({ method, url, data: payload });
        return { success: true, fromQueue: false };
      } catch (err) {
        console.warn('[SyncService] Immediate execution failed, adding to queue', err);
        // Fallthrough to enqueue
      }
    }

    // Add to queue
    const task: SyncTask = {
      id: Math.random().toString(36).substring(7),
      method,
      url,
      payload,
      timestamp: Date.now(),
    };

    const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    const queue: SyncTask[] = queueStr ? JSON.parse(queueStr) : [];
    queue.push(task);
    
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    console.log(`[SyncService] Task queued: ${task.id} (${task.method} ${task.url})`);
    
    return { success: true, fromQueue: true };
  }

  /** Process the background queue */
  static async processQueue() {
    const isConnected = (await NetInfo.fetch()).isConnected;
    if (!isConnected) return;

    const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (!queueStr) return;

    let queue: SyncTask[] = JSON.parse(queueStr);
    if (queue.length === 0) return;

    console.log(`[SyncService] Processing ${queue.length} tasks from queue...`);
    
    const failedTasks: SyncTask[] = [];

    for (const task of queue) {
      try {
        await apiClient({ method: task.method, url: task.url, data: task.payload });
        console.log(`[SyncService] Task completed: ${task.id}`);
      } catch (err) {
        console.error(`[SyncService] Task failed: ${task.id}`, err);
        failedTasks.push(task); // Keep in queue to retry later
      }
    }

    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(failedTasks));
  }
}
