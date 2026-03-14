export interface StorageProvider {
  save(
    key: string,
    buffer: Buffer,
    metadata: { mimeType: string; nomeOriginal: string }
  ): Promise<{ url: string }>;
  getUrl(key: string): string | null;
  delete(key: string): Promise<void>;
}
