import type { StorageProvider } from "./types";
import { memoryStorage } from "./memory";

export type { StorageProvider } from "./types";

export function getStorage(): StorageProvider {
  return memoryStorage;
}
