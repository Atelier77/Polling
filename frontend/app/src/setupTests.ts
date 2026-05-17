// src/setupTests.ts

// =============================================================================
// 🔹 ПОЛИФИЛЛЫ ДЛЯ MSW (обход конфликтов типов Node/DOM)
// =============================================================================

// ✅ Используем require + as any для обхода строгой типизации
// Это нужно только для рантайма, типы не важны здесь
const { TextEncoder, TextDecoder } = require('util') as any;

// ✅ Используем глобальное присваивание с any
if (typeof (global as any).TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoder;
}
if (typeof (global as any).TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoder;
}

// =============================================================================
// 🔹 ОСНОВНОЙ КОД
// =============================================================================

import '@testing-library/jest-dom';
import { server } from '../tests/mocks/server';

console.log('🔧 MSW: server imported, calling listen()');


beforeAll(() => {
    console.log('🔧 MSW: beforeAll - calling server.listen()');
    server.listen({ onUnhandledRequest: 'warn' })
  });
afterEach(() => {
  console.log('🔧 MSW: afterEach - calling resetHandlers()');
  server.resetHandlers();
  // Очищаем localStorage между тестами
  ((window as any).localStorage as any).store = {};
});
afterAll(() => {
    console.log('🔧 MSW: afterAll - calling server.close()');
  server.close()
});

// =============================================================================
// 🔹 МОК localStorage (с поддержкой JSON для кук MSW)
// =============================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get store() { return store; },
    set store(newStore: Record<string, string>) { store = newStore; }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// ✅ Инициализируем с правильными данными для MSW
beforeEach(() => {
  localStorageMock.store = {
    access_token: 'mock_token',
    MSW_COOKIE_STORE: JSON.stringify({})  // ✅ Пустой объект в JSON!
  };
});

// =============================================================================
// 🔹 ДРУГИЕ МОКИ
// =============================================================================

(window as any).ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

(window as any).IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn()
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
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