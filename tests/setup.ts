import { beforeAll, afterAll } from 'bun:test';

/**
 * Test setup file - runs before all tests
 * Loaded via bunfig.toml preload configuration
 */

beforeAll(() => {
  // Mock environment variables for tests
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Cleanup after all tests
});

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: () => {},
  warn: () => {},
  error: () => {},
};
