import express, { Router } from 'express';
import {
  getAvailableChatModelProviders,
  getAvailableEmbeddingModelProviders,
} from '../lib/providers';
import {
  getGroqApiKey,
  getOllamaApiEndpoint,
  getAnthropicApiKey,
  getOpenaiApiKey,
  updateConfig,
} from '../config';
import logger from '../utils/logger';
import type { Config } from '@/types';

const router: Router = express.Router();

router.get('/', async (_, res) => {
  try {
    const config: Config = {} as Config;

    const [chatModelProviders, embeddingModelProviders] = await Promise.all([
      getAvailableChatModelProviders(),
      getAvailableEmbeddingModelProviders(),
    ]);

    logger.debug('Config fetched', chatModelProviders, embeddingModelProviders);
    config['chatModelProviders'] = {};
    config['embeddingModelProviders'] = {};

    for (const provider in chatModelProviders) {
      const typedProvider = provider as keyof typeof chatModelProviders;
      config['chatModelProviders'][typedProvider] = Object.keys(
        chatModelProviders[typedProvider],
      ).map((model) => {
        return {
          name: model,
          displayName: chatModelProviders[typedProvider][model].displayName,
        };
      });
    }

    for (const provider in embeddingModelProviders) {
      const typedProvider = provider as keyof typeof embeddingModelProviders;
      config['embeddingModelProviders'][typedProvider] = Object.keys(
        embeddingModelProviders[typedProvider],
      ).map((model) => {
        return {
          name: model,
          displayName:
            embeddingModelProviders[typedProvider][model].displayName,
        };
      });
    }

    config['openaiApiKey'] = getOpenaiApiKey();
    config['ollamaApiUrl'] = getOllamaApiEndpoint();
    config['anthropicApiKey'] = getAnthropicApiKey();
    config['groqApiKey'] = getGroqApiKey();

    res.status(200).json(config);
  } catch (err: any) {
    res.status(500).json({ message: 'An error has occurred.' });
    logger.error(`Error getting config: ${err.message}`);
  }
});

router.post('/', async (req, res) => {
  const config = req.body;

  const updatedConfig = {
    API_KEYS: {
      OPENAI: config.openaiApiKey,
      GROQ: config.groqApiKey,
      ANTHROPIC: config.anthropicApiKey,
    },
    API_ENDPOINTS: {
      OLLAMA: config.ollamaApiUrl,
    },
  };

  updateConfig(updatedConfig);

  res.status(200).json({ message: 'Config updated' });
});

export default router;
