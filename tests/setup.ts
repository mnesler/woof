import { beforeAll, afterAll, afterEach } from 'bun:test';

/**
 * Test setup file - runs before all tests
 * Loaded via bunfig.toml preload configuration
 */

// Store original console.error for CI logging
const originalError = console.error;

// Captured errors for test assertions
export const capturedErrors: unknown[][] = [];

// Helper to clear captured errors between tests
export const clearCapturedErrors = () => {
  capturedErrors.length = 0;
};

beforeAll(() => {
  // Mock environment variables for tests
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Cleanup after all tests
});

afterEach(() => {
  // Clear captured errors between tests
  clearCapturedErrors();
});

// Mock console methods to reduce noise in test output
// Keep error capturing for debugging and assertions
global.console = {
  ...console,
  log: () => {},
  warn: () => {},
  error: (...args: unknown[]) => {
    capturedErrors.push(args);
    // Still log errors in CI for visibility
    if (process.env.CI) {
      originalError(...args);
    }
  },
};
