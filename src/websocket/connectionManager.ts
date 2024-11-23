import { WebSocket } from 'ws';
import { handleMessage } from './messageHandler';
import {
  getAvailableEmbeddingModelProviders,
  getAvailableChatModelProviders,
} from '../lib/providers';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import type { IncomingMessage } from 'http';
import logger from '../utils/logger';
import { ChatOpenAI } from '@langchain/openai';

type ModelProviders = Record<
  string,
  Record<string, { model: BaseChatModel | Embeddings }>
>;

export const handleConnection = async (
  ws: WebSocket,
  request: IncomingMessage,
) => {
  const clientIp = request.socket.remoteAddress;
  logger.info(`New WebSocket connection from ${clientIp}`);
  try {
    if (!request.url) {
      logger.error(`Connection from ${clientIp} failed: No URL provided`);
      throw new Error('No URL provided.');
    }

    const searchParams = new URL(request.url, `http://${request.headers.host}`)
      .searchParams;

    logger.debug('Fetching available model providers...');
    const chatModelProviders: ModelProviders =
      await getAvailableChatModelProviders();
    const embeddingModelProviders: ModelProviders =
      await getAvailableEmbeddingModelProviders();
    logger.debug('Model providers fetched successfully');

    const chatModelProvider =
      searchParams.get('chatModelProvider') ||
      Object.keys(chatModelProviders)[0];
    const chatModel =
      searchParams.get('chatModel') ||
      Object.keys(chatModelProviders[chatModelProvider])[0];

    const embeddingModelProvider =
      searchParams.get('embeddingModelProvider') ||
      Object.keys(embeddingModelProviders)[0];
    const embeddingModel =
      searchParams.get('embeddingModel') ||
      Object.keys(embeddingModelProviders[embeddingModelProvider])[0];

    logger.info(
      `Selected models - Chat: ${chatModelProvider}/${chatModel}, Embedding: ${embeddingModelProvider}/${embeddingModel}`,
    );

    let llm: BaseChatModel | undefined;
    let embeddings: Embeddings | undefined;

    logger.debug('Initializing chat model...');
    if (
      chatModelProviders[chatModelProvider] &&
      chatModelProviders[chatModelProvider][chatModel] &&
      chatModelProvider !== 'custom_openai'
    ) {
      llm = chatModelProviders[chatModelProvider][chatModel].model as
        | BaseChatModel
        | undefined;
      logger.debug(
        `Standard chat model initialized: ${chatModelProvider}/${chatModel}`,
      );
    } else if (chatModelProvider === 'custom_openai') {
      llm = new ChatOpenAI({
        modelName: chatModel,
        openAIApiKey: searchParams.get('openAIApiKey') || undefined,
        temperature: 0.7,
        configuration: {
          baseURL: searchParams.get('openAIBaseURL'),
        },
      }) as unknown as BaseChatModel;
      logger.debug('Custom OpenAI chat model initialized');
    }

    logger.debug('Initializing embedding model...');
    if (
      embeddingModelProviders[embeddingModelProvider] &&
      embeddingModelProviders[embeddingModelProvider][embeddingModel]
    ) {
      embeddings = embeddingModelProviders[embeddingModelProvider][
        embeddingModel
      ].model as Embeddings | undefined;
      logger.debug(
        `Embedding model initialized: ${embeddingModelProvider}/${embeddingModel}`,
      );
    }

    if (!llm || !embeddings) {
      const errorMsg = 'Invalid LLM or embeddings model selected';
      logger.error(`${errorMsg} for client ${clientIp}`);
      ws.send(
        JSON.stringify({
          type: 'error',
          data: 'Invalid LLM or embeddings model selected, please refresh the page and try again.',
          key: 'INVALID_MODEL_SELECTED',
        }),
      );
      ws.close();
      throw new Error(errorMsg);
    }

    logger.debug('Setting up connection heartbeat...');
    const interval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'signal',
            data: 'open',
          }),
        );
        clearInterval(interval);
        logger.debug('Connection heartbeat established');
      }
    }, 5);

    ws.on('message', async (message) => {
      if (llm && embeddings) {
        logger.debug(`Received message from ${clientIp}`);
        await handleMessage(message.toString(), ws, llm, embeddings);
      }
    });

    ws.on('close', () => {
      logger.debug(`Connection closed for client ${clientIp}`);
    });
  } catch (err) {
    logger.error(`Error handling connection from ${clientIp}:`, err);
    ws.send(
      JSON.stringify({
        type: 'error',
        data: 'Internal server error.',
        key: 'INTERNAL_SERVER_ERROR',
      }),
    );
    ws.close();
    logger.error(err);
  }
};
