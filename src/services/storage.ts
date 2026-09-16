export class StorageService {
  private dbName = 'aerodrop_cache';
  private dbVersion = 1;
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.dbVersion);

      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('chunks')) {
          const store = db.createObjectStore('chunks', { keyPath: ['transferId', 'chunkIndex'] });
          store.createIndex('transferId', 'transferId', { unique: false });
        }
      };

      req.onsuccess = () => {
        resolve(req.result);
      };

      req.onerror = () => {
        reject(req.error);
      };
    });

    return this.dbPromise;
  }

  public async saveChunk(transferId: string, chunkIndex: number, data: Uint8Array | string): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('chunks', 'readwrite');
        const store = tx.objectStore('chunks');
        const record = { transferId, chunkIndex, data };
        const req = store.put(record);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      return;
    }
  }

  public async getAllChunks(transferId: string): Promise<Array<Uint8Array | string>> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('chunks', 'readonly');
        const store = tx.objectStore('chunks');
        const index = store.index('transferId');
        const req = index.getAll(IDBKeyRange.only(transferId));

        req.onsuccess = () => {
          const records = req.result as Array<{ chunkIndex: number; data: Uint8Array | string }>;
          records.sort((a, b) => a.chunkIndex - b.chunkIndex);
          resolve(records.map((r) => r.data));
        };

        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      return [];
    }
  }

  public async clearTransfer(transferId: string): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('chunks', 'readwrite');
        const store = tx.objectStore('chunks');
        const index = store.index('transferId');
        const req = index.openCursor(IDBKeyRange.only(transferId));

        req.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };

        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      return;
    }
  }
}

export const storageService = new StorageService();
