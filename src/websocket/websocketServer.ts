import { WebSocketServer } from 'ws';
import { handleConnection } from './connectionManager';
import http from 'http';
import { getPort } from '../config';
import logger from '../utils/logger';

export const initServer = (
  server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>,
) => {
  const port = getPort();
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    logger.info(`New WebSocket connection from ${req.socket.remoteAddress}`);
    handleConnection(ws, req);
  });

  wss.on('error', (error) => {
    logger.error('WebSocket server error:', error);
  });

  wss.on('close', () => {
    logger.info('WebSocket server is shutting down');
  });

  // Log server stats periodically
  setInterval(() => {
    logger.debug(`WebSocket connections: ${wss.clients.size}`);
  }, 60000);

  logger.info(`WebSocket server started on port ${port}`);
};
