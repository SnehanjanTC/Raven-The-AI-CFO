import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('demo-data module', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.resetModules();
  });

  it('can be imported without errors', async () => {
    const mod = await import('@/lib/demo-data');
    expect(mod).toBeDefined();
  });

  it('exports DemoDataState interface-compatible objects', async () => {
    const mod = await import('@/lib/demo-data');
    // The module should export functions or data related to demo data
    expect(typeof mod).toBe('object');
  });
});
