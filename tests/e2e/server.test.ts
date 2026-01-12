import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createServer } from '../../src/server';

describe('Backend API', () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  beforeAll(() => {
    server = createServer({ port: 0 });
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server.stop();
  });

  test('health check returns ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const data = (await res.json()) as { status: string; timestamp: string };

    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
  });

  test('POST /api/pipeline/run starts a pipeline', async () => {
    const res = await fetch(`${baseUrl}/api/pipeline/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issue: {
          number: 1,
          title: 'Add login feature',
          body: '- User can login\n- User can logout',
          labels: ['feature'],
        },
      }),
    });

    const data = (await res.json()) as { pipelineId: string; status: string };

    expect(res.status).toBe(202);
    expect(data.pipelineId).toBeDefined();
    expect(data.status).toBe('started');
  });

  test('POST /api/pipeline/run validates input', async () => {
    const res = await fetch(`${baseUrl}/api/pipeline/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issue: {
          // Missing required fields
          title: 'Test',
        },
      }),
    });

    const data = (await res.json()) as { error: string };

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid issue format');
  });

  test('404 for unknown routes', async () => {
    const res = await fetch(`${baseUrl}/unknown`);
    expect(res.status).toBe(404);
  });
});

describe('WebSocket Stream', () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;
  let wsUrl: string;

  beforeAll(() => {
    server = createServer({ port: 0 });
    baseUrl = `http://localhost:${server.port}`;
    wsUrl = `ws://localhost:${server.port}/api/pipeline/stream`;
  });

  afterAll(() => {
    server.stop();
  });

  test('connects and receives welcome message', async () => {
    const ws = new WebSocket(wsUrl);

    const message = await new Promise<string>((resolve) => {
      ws.onmessage = (event) => {
        resolve(event.data as string);
        ws.close();
      };
    });

    const data = JSON.parse(message) as { type: string };
    expect(data.type).toBe('connected');
  });

  test('can subscribe to pipeline', async () => {
    // First start a pipeline
    const pipelineRes = await fetch(`${baseUrl}/api/pipeline/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issue: {
          number: 2,
          title: 'Test feature',
          body: '- Test criterion',
          labels: [],
        },
      }),
    });
    const pipelineData = (await pipelineRes.json()) as { pipelineId: string };

    // Connect WebSocket
    const ws = new WebSocket(wsUrl);

    const messages: unknown[] = [];

    await new Promise<void>((resolve) => {
      ws.onopen = () => {
        // Skip welcome message, subscribe to pipeline
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data as string) as { type: string };
          messages.push(data);

          if (data.type === 'connected') {
            ws.send(JSON.stringify({ action: 'subscribe', pipelineId: pipelineData.pipelineId }));
          }

          if (data.type === 'subscribed' || messages.length >= 3) {
            ws.close();
            resolve();
          }
        };
      };
    });

    expect(messages.some((m: unknown) => (m as { type: string }).type === 'subscribed')).toBe(true);
  });
});
