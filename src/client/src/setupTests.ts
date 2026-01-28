import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './test/msw/server';

// -- Suppress noisy React/Mantine act(...) warnings in test output --
const SUPPRESSED = ['Warning: An update to', 'Warning: validateDOMNesting'];

const originalError = console.error;
console.error = (...args: any[]) => {
  const msg = args[0];
  if (typeof msg === 'string' && SUPPRESSED.some(w => msg.includes(w))) {
    return;
  }
  originalError(...args);
};

// Silence all other console output during tests
console.log = console.warn = console.info = () => {};

// -- Polyfills & Mocks --
// matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ResizeObserver
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

// scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// -- MSW Server Lifecycle Hooks --
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
