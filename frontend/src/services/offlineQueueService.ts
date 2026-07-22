export interface PendingScan {
  id: string;
  imageBlob: Blob;
  imageName: string;
  language: string;
  createdAt: number;
}

const DB_NAME = 'AgroAI_Offline_DB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_scans';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addPendingScan(file: File, language: string): Promise<PendingScan> {
  const db = await openDB();
  const scan: PendingScan = {
    id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    imageBlob: file,
    imageName: file.name || 'upload.jpg',
    language: language,
    createdAt: Date.now()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(scan);
    req.onsuccess = () => resolve(scan);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingScans(): Promise<PendingScan[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as PendingScan[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removePendingScan(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
