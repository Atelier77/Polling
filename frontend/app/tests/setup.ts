// frontend/app/tests/setup.ts

import '@testing-library/jest-dom';
import { server } from './mocks/server';

// 🔹 Запуск MSW перед тестами
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// 🔹 Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// ✅ Используйте window (не global!):
Object.defineProperty(window, 'localStorage', { 
  value: localStorageMock,
  writable: true  // ← Важно для перезаписи
});

// 🔹 Mock ResizeObserver
// ✅ Замените global на window или глобальное присваивание:
window.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// 🔹 Опционально: другие моки для стабильности тестов
window.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn()
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});