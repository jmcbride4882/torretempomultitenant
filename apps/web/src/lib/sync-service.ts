import { offlineQueue } from './offline-queue';
import { api } from './api';

class SyncService {
  private syncInterval: number | null = null;
  private readonly SYNC_INTERVAL_MS = 30000; // 30 seconds
  private isSyncing = false;

  start(): void {
    if (this.syncInterval) return;

    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine) {
        this.processQueue();
      }
    }, this.SYNC_INTERVAL_MS);

    window.addEventListener('online', () => this.processQueue());

    if ('serviceWorker' in navigator && 'sync' in (navigator.serviceWorker as any)) {
      navigator.serviceWorker.ready.then((registration: any) => {
        return registration.sync.register('sync-offline-queue');
      });
    }
  }

  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async processQueue(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) return;

    this.isSyncing = true;

    try {
      const requests = await offlineQueue.getAll();

      for (const request of requests) {
        try {
          await api.post(request.endpoint, request.body);
          await offlineQueue.remove(request.id);
        } catch (error: any) {
          const shouldRetry = await offlineQueue.incrementRetry(
            request.id,
            error.message || 'Unknown error'
          );

          if (!shouldRetry) {
            // Max retries exceeded - request is removed from queue
          }
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async addToQueue(endpoint: string, method: string, body: any): Promise<string> {
    return offlineQueue.add({ endpoint, method, body });
  }

  async getQueueCount(): Promise<number> {
    return offlineQueue.count();
  }

  async getQueue() {
    return offlineQueue.getAll();
  }

  async clearQueue(): Promise<void> {
    return offlineQueue.clear();
  }
}

export const syncService = new SyncService();
