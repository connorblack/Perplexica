import express, { Router } from 'express';
import logger from '../utils/logger';
import {
  getAvailableChatModelProviders,
  getAvailableEmbeddingModelProviders,
} from '../lib/providers';

const router: Router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [chatModelProviders, embeddingModelProviders] = await Promise.all([
      getAvailableChatModelProviders(),
      getAvailableEmbeddingModelProviders(),
    ]);

    Object.keys(chatModelProviders).forEach((provider) => {
      const providerKey = provider as keyof typeof chatModelProviders;
      Object.keys(chatModelProviders[providerKey]).forEach((model) => {
        const modelKey = model as keyof typeof chatModelProviders[typeof providerKey];
        delete chatModelProviders[providerKey][modelKey].model;
      });
    });

    Object.keys(embeddingModelProviders).forEach((provider) => {
      const providerKey = provider as keyof typeof embeddingModelProviders;
      Object.keys(embeddingModelProviders[providerKey]).forEach((model) => {
        const modelKey = model as keyof typeof embeddingModelProviders[typeof providerKey];
        delete embeddingModelProviders[providerKey][modelKey].model;
      });
    });

    res.status(200).json({ chatModelProviders, embeddingModelProviders });
  } catch (err: any) {
    res.status(500).json({ message: 'An error has occurred.' });
    logger.error(err.message);
  }
});

export default router;
