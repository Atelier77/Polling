import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
console.log('🔧 MSW: server created with', handlers.length, 'handlers');