import { test, expect, describe, spyOn } from 'bun:test';
import main from '../src/index';

describe('CLI Output', () => {
  test('displays hello world with world emoji', () => {
    const consoleSpy = spyOn(console, 'log');
    
    main();
    
    expect(consoleSpy).toHaveBeenCalledWith('Hello World 🌍');
    
    consoleSpy.mockRestore();
  });
});
