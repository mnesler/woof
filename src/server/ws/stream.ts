import type { ServerWebSocket } from 'bun';
import { pipelineStore } from '../store';

export interface WebSocketData {
  subscribedTo?: string;
}

export const handleWebSocket = {
  open(ws: ServerWebSocket<WebSocketData>) {
    ws.send(JSON.stringify({ type: 'connected', message: 'Connected to pipeline stream' }));
  },

  message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
    try {
      const data = JSON.parse(message.toString());

      if (data.action === 'subscribe' && data.pipelineId) {
        // Unsubscribe from previous if any
        if (ws.data?.subscribedTo) {
          pipelineStore.unsubscribe(ws.data.subscribedTo, ws);
        }

        // Subscribe to new pipeline
        ws.data = { subscribedTo: data.pipelineId };
        pipelineStore.subscribe(data.pipelineId, ws);

        ws.send(JSON.stringify({
          type: 'subscribed',
          pipelineId: data.pipelineId,
        }));
      }

      if (data.action === 'unsubscribe') {
        if (ws.data?.subscribedTo) {
          pipelineStore.unsubscribe(ws.data.subscribedTo, ws);
          ws.data = {};
        }
        ws.send(JSON.stringify({ type: 'unsubscribed' }));
      }
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  },

  close(ws: ServerWebSocket<WebSocketData>) {
    pipelineStore.unsubscribeAll(ws);
  },
};
