/**
 * Vitest Test Environment Setup (Phase 5)
 * Configures DOM matchers and global browser API stubs (EventSource, ResizeObserver).
 */

import '@testing-library/jest-dom/vitest';

// Global mock for EventSource in jsdom
if (typeof window !== 'undefined' && !window.EventSource) {
  class MockEventSource {
    url: string;
    readyState: number = 0;
    onopen: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    listeners: Record<string, ((event: MessageEvent) => void)[]> = {};

    constructor(url: string) {
      this.url = url;
      setTimeout(() => {
        this.readyState = 1;
        if (this.onopen) this.onopen(new Event('open'));
      }, 10);
    }

    addEventListener(type: string, listener: (event: MessageEvent) => void) {
      if (!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push(listener);
    }

    removeEventListener(type: string, listener: (event: MessageEvent) => void) {
      if (this.listeners[type]) {
        this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
      }
    }

    close() {
      this.readyState = 2;
    }
  }

  // @ts-expect-error Mock assignment
  window.EventSource = MockEventSource;
}

// Global mock for ResizeObserver
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
