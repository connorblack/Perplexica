import { loadGroqChatModels } from './groq';
import { loadOllamaChatModels, loadOllamaEmbeddingsModels } from './ollama';
import { loadOpenAIChatModels, loadOpenAIEmbeddingsModels } from './openai';
import { loadAnthropicChatModels } from './anthropic';
import { loadTransformersEmbeddingsModels } from './transformers';

type ChatProviderKey = 'openai' | 'groq' | 'ollama' | 'anthropic';
type EmbeddingProviderKey = 'openai' | 'local' | 'ollama';

const chatModelProviders: Record<ChatProviderKey, () => Promise<any>> = {
  openai: loadOpenAIChatModels,
  groq: loadGroqChatModels,
  ollama: loadOllamaChatModels,
  anthropic: loadAnthropicChatModels,
};

const embeddingModelProviders: Record<
  EmbeddingProviderKey,
  () => Promise<any>
> = {
  openai: loadOpenAIEmbeddingsModels,
  local: loadTransformersEmbeddingsModels,
  ollama: loadOllamaEmbeddingsModels,
};

export const getAvailableChatModelProviders = async () => {
  const models: Record<ChatProviderKey | 'custom_openai', any> = {
    openai: {},
    groq: {},
    ollama: {},
    anthropic: {},
    custom_openai: {},
  };

  for (const provider of Object.keys(chatModelProviders) as ChatProviderKey[]) {
    const providerModels = await chatModelProviders[provider]();
    if (Object.keys(providerModels).length > 0) {
      models[provider] = providerModels;
    }
  }

  models['custom_openai'] = {};

  return models;
};

export const getAvailableEmbeddingModelProviders = async () => {
  const models: Record<EmbeddingProviderKey, any> = {
    openai: {},
    ollama: {},
    local: {},
  };

  for (const provider of Object.keys(
    embeddingModelProviders,
  ) as EmbeddingProviderKey[]) {
    const providerModels = await embeddingModelProviders[provider]();
    if (Object.keys(providerModels).length > 0) {
      models[provider] = providerModels;
    }
  }

  return models;
};
