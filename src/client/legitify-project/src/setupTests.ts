import '@testing-library/jest-dom';

// Suppress noisy React/Mantine act(...) warnings in test output
const suppressedWarnings = [
  'Warning: An update to',
  'Warning: An update to ForwardRef',
  'Warning: An update to @mantine/core',
  'Warning: An update to @mantine/core/Popover',
  'Warning: An update to @mantine/core/ScrollAreaRoot',
  'Warning: An update to @mantine/core/ScrollArea',
  'Warning: An update to @mantine/core/Combobox',
  'Warning: An update to @mantine/core/Select',
  'Warning: An update to @mantine/core/Portal',
  'Warning: An update to @mantine/core/Transition',
  'Warning: An update to @mantine/core/FocusTrap',
  'Warning: An update to @mantine/core/Grid',
  // Add DOM nesting warning
  'Warning: validateDOMNesting',
];

// Save original console methods
const originalError = console.error;
const originalLog = console.log;
const originalWarn = console.warn;
const originalInfo = console.info;

// Override console.error to filter warnings
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    suppressedWarnings.some(warning => args[0].includes(warning))
  ) {
    return;
  }
  originalError(...args);
};

// Silence all console logs during tests
console.log = (...args: any[]) => {
  // Uncomment the next line if you want to see logs during debugging
  // originalLog(...args);
};

// Silence console.warn as well
console.warn = (...args: any[]) => {
  // Uncomment if needed for debugging
  // originalWarn(...args);
};

// Silence console.info as well
console.info = (...args: any[]) => {
  // Uncomment if needed for debugging
  // originalInfo(...args);
};

import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './test/msw/server';
// src/setupTests.ts (Global test setup for Vitest + JSDOM)

// Polyfill window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated, but included for completeness
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(), // used in modern browsers for matchMedia
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Polyfill ResizeObserver (optional, for components that might use it)
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

// Example: scrollIntoView (optional, if needed to silence warnings)
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Establish API mocking before all tests.
beforeAll(() => server.listen());
// Reset any request handlers that are declared as a part of our tests (i.e. for testing one-time error scenarios)
afterEach(() => server.resetHandlers());
// Clean up after the tests are finished.
afterAll(() => server.close());
