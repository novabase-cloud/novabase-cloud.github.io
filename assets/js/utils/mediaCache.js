import { fetchRaw } from './http.js';

const DB_NAME = 'novabase-media-cache';
const DB_VERSION = 1;
const STORE_NAME = 'media';
const META_STORE_NAME = 'meta';
const MAX_CACHE_SIZE = 200 * 1024 * 1024;
const SESSION_ID_KEY = 'novabase.cache.sessionId';

let dbPromise = null;
let currentSessionId = null;

function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function getSessionId() {
  if (currentSessionId) return currentSessionId;
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  currentSessionId = sessionId;
  return sessionId;
}

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'path' });
        store.createIndex('sessionId', 'sessionId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE_NAME)) {
        db.createObjectStore(META_STORE_NAME, { keyPath: 'key' });
      }
    };
  });

  return dbPromise;
}

async function clearOldSessions() {
  const sessionId = getSessionId();
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // We want to iterate through all entries and remove those that don't belong to the current session.
    // However, to be more efficient, we could skip this if we know it's already clean, 
    // but for now, we'll just check everything.
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        if (cursor.value.sessionId !== sessionId) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function getTotalCacheSize() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      let total = 0;
      for (const entry of request.result) {
        if (entry.blob) total += entry.blob.size || 0;
      }
      resolve(total);
    };
    request.onerror = () => reject(request.error);
  });
}

async function evictOldestIfNeeded(newItemSize) {
  const currentSize = await getTotalCacheSize();
  if (currentSize + newItemSize <= MAX_CACHE_SIZE) return;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');

    const request = index.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const currentSizeNow = currentSize - (cursor.value.blob?.size || 0);
        if (currentSizeNow + newItemSize <= MAX_CACHE_SIZE) {
          resolve();
          return;
        }
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export const mediaCache = {
  async get(path) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(path);
      request.onsuccess = () => {
        if (request.result?.blob) {
          resolve(request.result.blob);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },

  async set(path, blob) {
    const size = blob.size || 0;
    await evictOldestIfNeeded(size);

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const sessionId = getSessionId();
      const request = store.put({
        path,
        blob,
        size,
        timestamp: Date.now(),
        sessionId,
        type: blob.type
      });
      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.warn('[mediaCache] Failed to cache:', request.error);
        resolve(false);
      };
    });
  },

  async has(path) {
    const blob = await this.get(path);
    return !!blob;
  },

  async delete(path) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(path);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  async clear() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
};

export function createObjectURLFromCache(path) {
  return mediaCache.get(path).then(blob => {
    if (blob) return URL.createObjectURL(blob);
    return null;
  });
}

export async function fetchAndCache(url, path) {
  await clearOldSessions();

  const cached = await mediaCache.get(path);
  if (cached) return cached;

  const response = await fetchRaw(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

  const blob = await response.blob();
  await mediaCache.set(path, blob);
  return blob;
}