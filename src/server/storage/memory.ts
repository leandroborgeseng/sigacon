import type { StorageProvider } from "./types";

const store = new Map<string, { buffer: Buffer; mimeType: string }>();

export const memoryStorage: StorageProvider = {
  async save(key, buffer, { mimeType }) {
    store.set(key, { buffer, mimeType });
    return { url: `/api/anexos/download/${key}` };
  },
  getUrl(key) {
    return store.has(key) ? `/api/anexos/download/${key}` : null;
  },
  async get(key) {
    const entry = store.get(key);
    return entry ? { buffer: entry.buffer, mimeType: entry.mimeType } : null;
  },
  async delete(key) {
    store.delete(key);
  },
};
