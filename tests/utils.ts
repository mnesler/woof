/**
 * Test utilities for reducing boilerplate in tests
 */

/** Wait for a specified duration (default 50ms) */
export const wait = (ms: number = 50): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Common keyboard escape codes for terminal input simulation */
export const keyboard = {
  down: '\x1B[B',
  up: '\x1B[A',
  enter: '\r',
  escape: '\x1B',
} as const;

/** Stdin interface for typing */
type Stdin = { write: (s: string) => void };

/** Press a key and wait for UI to update */
export const pressKey = async (stdin: Stdin, key: string): Promise<void> => {
  await wait();
  stdin.write(key);
  await wait();
};

/** Type text into stdin and press enter */
export const typeAndSubmit = async (stdin: Stdin, text: string): Promise<void> => {
  await wait();
  stdin.write(text);
  await wait();
  stdin.write(keyboard.enter);
  await wait();
};

/** Navigate menu down N times */
export const navigateDown = async (stdin: Stdin, times: number = 1): Promise<void> => {
  for (let i = 0; i < times; i++) {
    await pressKey(stdin, keyboard.down);
  }
};

/** Navigate menu up N times */
export const navigateUp = async (stdin: Stdin, times: number = 1): Promise<void> => {
  for (let i = 0; i < times; i++) {
    await pressKey(stdin, keyboard.up);
  }
};

/** Navigate and select a menu item */
export const selectMenuItem = async (
  stdin: Stdin,
  downPresses: number = 0
): Promise<void> => {
  await navigateDown(stdin, downPresses);
  await pressKey(stdin, keyboard.enter);
};
