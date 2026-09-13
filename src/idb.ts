// Minimaler IndexedDB-Wrapper. IndexedDB statt localStorage, weil pro Karte
// ein Bild (Base64) möglich ist und localStorage dafür zu klein/fragil wäre.
// Bewusst ohne Fremd-Abhängigkeit — zwei Object-Stores mit keyPath "id".

const DB_NAME = "ich-lerne";
// v2: der alte "gruppen"-Store entfällt (Sets sind flache Kartenpools).
const DB_VERSION = 2;

export type StoreName = "sets" | "karten";
export const ALLE_STORES: StoreName[] = ["sets", "karten"];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of ALLE_STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      }
      if (db.objectStoreNames.contains("gruppen")) {
        db.deleteObjectStore("gruppen");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB konnte nicht geöffnet werden"));
  });
  return dbPromise;
}

function alsPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB-Anfrage fehlgeschlagen"));
  });
}

function txFertig(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB-Transaktion fehlgeschlagen"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB-Transaktion abgebrochen"));
  });
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDb();
  return alsPromise(db.transaction(store, "readonly").objectStore(store).getAll() as IDBRequest<T[]>);
}

export async function idbPut<T>(store: StoreName, wert: T): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).put(wert);
  await txFertig(tx);
}

export async function idbPutViele<T>(store: StoreName, werte: T[]): Promise<void> {
  if (werte.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  const os = tx.objectStore(store);
  for (const w of werte) os.put(w);
  await txFertig(tx);
}

export async function idbDelete(store: StoreName, id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).delete(id);
  await txFertig(tx);
}

export async function idbDeleteViele(store: StoreName, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  const os = tx.objectStore(store);
  for (const id of ids) os.delete(id);
  await txFertig(tx);
}

export async function idbClear(store: StoreName): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).clear();
  await txFertig(tx);
}
