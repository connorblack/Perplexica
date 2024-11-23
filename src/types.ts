export interface Config {
  chatModelProviders: Record<string, { name: string; displayName: string }[]>;
  embeddingModelProviders: Record<string, { name: string; displayName: string }[]>;
  openaiApiKey: string;
  ollamaApiUrl: string;
  anthropicApiKey: string;
  groqApiKey: string;
}
