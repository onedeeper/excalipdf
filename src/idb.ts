/**
 * IndexedDB storage for auto-save. No size limits unlike localStorage.
 * Stores scenes in .excalidraw format and PDF buffers for session restore.
 */

const DB_NAME = "excalipdf";
const DB_VERSION = 1;
const SCENE_STORE = "scenes";
const PDF_STORE = "pdfs";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SCENE_STORE))
        db.createObjectStore(SCENE_STORE);
      if (!db.objectStoreNames.contains(PDF_STORE))
        db.createObjectStore(PDF_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function put(store: string, key: string, value: unknown): Promise<void> {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function get<T>(store: string, key: string): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      }),
  );
}

function del(store: string, key: string): Promise<void> {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

// ── Public API ──

export const scenes = {
  save: (tabId: string, data: unknown) => put(SCENE_STORE, tabId, data),
  load: <T>(tabId: string) => get<T>(SCENE_STORE, tabId),
  remove: (tabId: string) => del(SCENE_STORE, tabId),
};

export const pdfs = {
  save: (tabId: string, buffer: ArrayBuffer) => put(PDF_STORE, tabId, buffer),
  load: (tabId: string) => get<ArrayBuffer>(PDF_STORE, tabId),
  remove: (tabId: string) => del(PDF_STORE, tabId),
};
