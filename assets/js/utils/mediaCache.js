const CACHE_PREFIX = 'novabase.media.';
const MAX_CACHE_SIZE = 50 * 1024 * 1024;

function getCacheKey(path) {
  return `${CACHE_PREFIX}${path}`;
}

function getCacheMetaKey(path) {
  return `${CACHE_PREFIX}meta.${path}`;
}

function estimateSize(blob) {
  return blob.size || 0;
}

async function getTotalCacheSize() {
  let total = 0;
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX) && !key.startsWith(`${CACHE_PREFIX}meta.`)) {
      const val = sessionStorage.getItem(key);
      if (val) total += val.length;
    }
  }
  return total;
}

async function evictOldestIfNeeded(newItemSize) {
  const currentSize = await getTotalCacheSize();
  if (currentSize + newItemSize <= MAX_CACHE_SIZE) return;

  const entries = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX) && !key.startsWith(`${CACHE_PREFIX}meta.`)) {
      const metaKey = getCacheMetaKey(key.replace(CACHE_PREFIX, ''));
      const meta = sessionStorage.getItem(metaKey);
      if (meta) {
        try {
          const parsed = JSON.parse(meta);
          entries.push({ key, timestamp: parsed.timestamp || 0 });
        } catch {
          entries.push({ key, timestamp: 0 });
        }
      }
    }
  }

  entries.sort((a, b) => a.timestamp - b.timestamp);

  for (const entry of entries) {
    const currentSizeNow = await getTotalCacheSize();
    if (currentSizeNow + newItemSize <= MAX_CACHE_SIZE) break;
    sessionStorage.removeItem(entry.key);
    sessionStorage.removeItem(getCacheMetaKey(entry.key.replace(CACHE_PREFIX, '')));
  }
}

export const mediaCache = {
  async get(path) {
    const key = getCacheKey(path);
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;

    try {
      const binary = atob(cached);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Blob([bytes.buffer]);
    } catch {
      sessionStorage.removeItem(key);
      sessionStorage.removeItem(getCacheMetaKey(path));
      return null;
    }
  },

  async set(path, blob) {
    const key = getCacheKey(path);
    const size = estimateSize(blob);
    await evictOldestIfNeeded(size);

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const base64 = btoa(
            new Uint8Array(reader.result).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          sessionStorage.setItem(key, base64);
          sessionStorage.setItem(getCacheMetaKey(path), JSON.stringify({
            timestamp: Date.now(),
            size,
            type: blob.type
          }));
          resolve(true);
        } catch (err) {
          console.warn('[mediaCache] Failed to cache:', err);
          resolve(false);
        }
      };
      reader.readAsArrayBuffer(blob);
    });
  },

  async has(path) {
    return !!sessionStorage.getItem(getCacheKey(path));
  },

  async delete(path) {
    sessionStorage.removeItem(getCacheKey(path));
    sessionStorage.removeItem(getCacheMetaKey(path));
  },

  async clear() {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  }
};

export function createObjectURLFromCache(path) {
  return mediaCache.get(path).then(blob => {
    if (blob) return URL.createObjectURL(blob);
    return null;
  });
}

export async function fetchAndCache(url, path) {
  const cached = await mediaCache.get(path);
  if (cached) return cached;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

  const blob = await response.blob();
  await mediaCache.set(path, blob);
  return blob;
}