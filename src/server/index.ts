import { handlePipelineRequest, handleHealthCheck } from './routes/pipeline';
import { handleChatRequest, handleChatHistory } from './routes/chat';
import { handleWebSocket, type WebSocketData } from './ws/stream';

export interface ServerConfig {
  port?: number;
  hostname?: string;
}

function log(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

export function createServer(config: ServerConfig = {}) {
  const port = config.port ?? 3000;
  const hostname = config.hostname ?? 'localhost';

  log('Starting server...');

  const server = Bun.serve<WebSocketData>({
    port,
    hostname,

    fetch(req, server) {
      const url = new URL(req.url);
      log(`${req.method} ${url.pathname}`);

      // WebSocket upgrade
      if (url.pathname === '/api/pipeline/stream') {
        const upgraded = server.upgrade(req, { data: {} });
        if (!upgraded) {
          return new Response('WebSocket upgrade failed', { status: 400 });
        }
        return undefined;
      }

      // REST routes
      if (url.pathname === '/health' && req.method === 'GET') {
        return handleHealthCheck();
      }

      if (url.pathname === '/api/pipeline/run' && req.method === 'POST') {
        return handlePipelineRequest(req);
      }

      if (url.pathname === '/api/chat' && req.method === 'POST') {
        return handleChatRequest(req);
      }

      if (url.pathname === '/api/chat/history' && req.method === 'GET') {
        return handleChatHistory(req);
      }

      return new Response('Not Found', { status: 404 });
    },

    websocket: {
      open(ws) {
        handleWebSocket.open(ws);
      },
      message(ws, message) {
        handleWebSocket.message(ws, message);
      },
      close(ws) {
        handleWebSocket.close(ws);
      },
    },
  });

  log(`Server running at http://${hostname}:${port}`);
  return server;
}

// Run if executed directly
if (import.meta.main) {
  createServer();
}
