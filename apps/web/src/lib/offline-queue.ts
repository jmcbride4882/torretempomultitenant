import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineRequest {
  id: string;
  endpoint: string;
  method: string;
  body: any;
  timestamp: number;
  retries: number;
  lastError?: string;
}

interface OfflineQueueDB extends DBSchema {
  'offline-queue': {
    key: string;
    value: OfflineRequest;
    indexes: { 'by-timestamp': number };
  };
}

class OfflineQueueManager {
  private db: IDBPDatabase<OfflineQueueDB> | null = null;
  private readonly DB_NAME = 'torre-tempo-offline';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'offline-queue';
  private readonly MAX_RETRIES = 5;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<OfflineQueueDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('offline-queue')) {
          const store = db.createObjectStore('offline-queue', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }

  async add(request: Omit<OfflineRequest, 'id' | 'timestamp' | 'retries'>): Promise<string> {
    await this.init();
    
    const id = crypto.randomUUID();
    const offlineRequest: OfflineRequest = {
      ...request,
      id,
      timestamp: Date.now(),
      retries: 0,
    };

    await this.db!.add(this.STORE_NAME, offlineRequest);
    return id;
  }

  async getAll(): Promise<OfflineRequest[]> {
    await this.init();
    return this.db!.getAll(this.STORE_NAME);
  }

  async get(id: string): Promise<OfflineRequest | undefined> {
    await this.init();
    return this.db!.get(this.STORE_NAME, id);
  }

  async remove(id: string): Promise<void> {
    await this.init();
    await this.db!.delete(this.STORE_NAME, id);
  }

  async incrementRetry(id: string, error: string): Promise<boolean> {
    await this.init();
    
    const request = await this.get(id);
    if (!request) return false;

    request.retries += 1;
    request.lastError = error;

    if (request.retries >= this.MAX_RETRIES) {
      await this.remove(id);
      return false;
    }

    await this.db!.put(this.STORE_NAME, request);
    return true;
  }

  async clear(): Promise<void> {
    await this.init();
    await this.db!.clear(this.STORE_NAME);
  }

  async count(): Promise<number> {
    await this.init();
    return this.db!.count(this.STORE_NAME);
  }
}

export const offlineQueue = new OfflineQueueManager();
