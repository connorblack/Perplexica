import express, { Router } from 'express';
import logger from '../utils/logger';
import { BaseChatModel } from 'langchain/chat_models/base';
import { Embeddings } from 'langchain/embeddings/base';
import { ChatOpenAI } from '@langchain/openai';
import {
  getAvailableChatModelProviders,
  getAvailableEmbeddingModelProviders,
} from '../lib/providers';
import { searchHandlers } from '../websocket/messageHandler';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';

const router: Router = express.Router();

interface chatModel {
  provider: string;
  model: string;
  customOpenAIBaseURL?: string;
  customOpenAIKey?: string;
}

interface embeddingModel {
  provider: string;
  model: string;
}

interface ChatRequestBody {
  optimizationMode: 'speed' | 'balanced';
  focusMode: string;
  chatModel?: chatModel;
  embeddingModel?: embeddingModel;
  query: string;
  history: Array<[string, string]>;
}

router.post('/', async (req, res) => {
  try {
    logger.debug('Received search request');
    const body: ChatRequestBody = req.body;
    logger.debug('Request body:', body);

    if (!body.focusMode || !body.query) {
      return res.status(400).json({ message: 'Missing focus mode or query' });
    }

    body.history = body.history || [];
    body.optimizationMode = body.optimizationMode || 'balanced';

    logger.debug('Processing chat history');
    const history: BaseMessage[] = body.history
      .map((msg) => {
        if (msg[0] === 'human') {
          return new HumanMessage({
            content: msg[1],
          });
        } else if (msg[0] === 'assistant') {
          return new AIMessage({
            content: msg[1],
          });
        } else {
          return undefined;
        }
      })
      .filter((msg): msg is BaseMessage => msg !== undefined);
    logger.debug(`Processed ${history.length} history messages`);

    logger.debug('Loading model providers');
    const [chatModelProviders, embeddingModelProviders] = await Promise.all([
      getAvailableChatModelProviders(),
      getAvailableEmbeddingModelProviders(),
    ]);
    logger.debug('Available chat providers:', Object.keys(chatModelProviders));
    logger.debug(
      'Available embedding providers:',
      Object.keys(embeddingModelProviders),
    );

    const chatModelProvider =
      (body.chatModel?.provider as keyof typeof chatModelProviders) ||
      (Object.keys(chatModelProviders)[0] as keyof typeof chatModelProviders);
    const chatModel =
      body.chatModel?.model ||
      Object.keys(chatModelProviders[chatModelProvider])[0];

    logger.debug(`Chat model selected: ${chatModelProvider}/${chatModel}`);

    const embeddingModelProvider =
      (body.embeddingModel?.provider as keyof typeof embeddingModelProviders) ||
      (Object.keys(
        embeddingModelProviders,
      )[0] as keyof typeof embeddingModelProviders);
    const embeddingModel =
      body.embeddingModel?.model ||
      Object.keys(embeddingModelProviders[embeddingModelProvider])[0];

    logger.debug(
      `Embedding model selected: ${embeddingModelProvider}/${embeddingModel}`,
    );

    let llm: BaseChatModel | undefined;
    let embeddings: Embeddings | undefined;

    logger.debug('Initializing models');
    if (body.chatModel?.provider === 'custom_openai') {
      if (
        !body.chatModel?.customOpenAIBaseURL ||
        !body.chatModel?.customOpenAIKey
      ) {
        return res
          .status(400)
          .json({ message: 'Missing custom OpenAI base URL or key' });
      }

      logger.debug('Creating custom OpenAI chat model');
      llm = new ChatOpenAI({
        modelName: body.chatModel.model,
        openAIApiKey: body.chatModel.customOpenAIKey,
        temperature: 0.3,
        configuration: {
          baseURL: body.chatModel.customOpenAIBaseURL,
        },
      });
    } else if (
      chatModelProviders[chatModelProvider] &&
      chatModelProviders[chatModelProvider][chatModel]
    ) {
      logger.debug('Using provider chat model');
      llm = chatModelProviders[chatModelProvider][chatModel].model;
    }

    if (
      embeddingModelProviders[embeddingModelProvider] &&
      embeddingModelProviders[embeddingModelProvider][embeddingModel]
    ) {
      logger.debug('Setting up embedding model');
      embeddings = embeddingModelProviders[embeddingModelProvider][
        embeddingModel
      ].model as Embeddings | undefined;
    }

    if (!llm || !embeddings) {
      logger.error('Model initialization failed', {
        llm: !!llm,
        embeddings: !!embeddings,
      });
      return res.status(400).json({ message: 'Invalid model selected' });
    }

    logger.debug('Getting search handler for focus mode:', body.focusMode);
    const searchHandler =
      searchHandlers[body.focusMode as keyof typeof searchHandlers];

    if (!searchHandler) {
      return res.status(400).json({ message: 'Invalid focus mode' });
    }

    logger.debug('Creating search emitter');
    const emitter = searchHandler(
      body.query,
      history,
      // @ts-ignore
      llm,
      embeddings,
      body.optimizationMode,
    );

    let message = '';
    let sources: any[] = [];

    emitter.on('data', (data: string) => {
      logger.debug('Received emitter data');
      const parsedData = JSON.parse(data);
      if (parsedData.type === 'response') {
        message += parsedData.data;
      } else if (parsedData.type === 'sources') {
        sources = parsedData.data;
      }
      logger.debug('Processed emitter data:', { type: parsedData.type });
    });

    emitter.on('end', () => {
      logger.debug('Search completed successfully');
      res.status(200).json({ message, sources });
    });

    emitter.on('error', (data: string) => {
      logger.error('Search emitter error:', data);
      const parsedData = JSON.parse(data);
      res.status(500).json({ message: parsedData.data });
    });
  } catch (err: any) {
    logger.error(`Error in getting search results:`, {
      error: err,
      stack: err.stack,
      message: err.message,
    });
    res.status(500).json({ message: 'An error has occurred.' });
  }
});

export default router;
