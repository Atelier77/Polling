// tests/mocks/handlers.ts

import { rest } from 'msw';

const API_BASE_URL = 'http://localhost:8000';

export const handlers = [
  // =============================================================================
  // 🔹 AUTH
  // =============================================================================
  
  rest.post(`${API_BASE_URL}/api/auth/register`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          token_type: 'bearer',
          expires_in: 1800,
          user: {
            id: 1,
            student_id: 'TEST_USER',
            name: 'Test User',
            faculty: 'Test Faculty',
            role: 'user'
          }
        }
      })
    );
  }),

  rest.post(`${API_BASE_URL}/api/auth/login`, (req, res, ctx) => {
    const { student_id, password } = req.body as { student_id: string; password: string };
    
    // ✅ Имитация ошибки при неверных данных
    if (student_id === 'INVALID' || password === 'wrong') {
      return res(
        ctx.status(401),
        ctx.json({
          success: false,
          error: 'Неверные учётные данные'
        })
      );
    }
    
    // ✅ Успешный логин
    return res(
      ctx.json({
        success: true,
        data: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          token_type: 'bearer',
          expires_in: 1800,
          user: {
            id: 1,
            student_id,
            name: 'Test User',
            faculty: 'Test Faculty',
            role: 'user'
          }
        }
      })
    );
  }),

  rest.post(`${API_BASE_URL}/api/auth/refresh`, (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          access_token: 'new_mock_access_token',
          refresh_token: 'new_mock_refresh_token',
          token_type: 'bearer',
          expires_in: 1800
        }
      })
    );
  }),

  rest.post(`${API_BASE_URL}/api/auth/logout`, (req, res, ctx) => {
    return res(
      ctx.json({ success: true, message: 'Logged out' })
    );
  }),

  // =============================================================================
  // 🔹 POLLS
  // =============================================================================
  
  rest.get(`${API_BASE_URL}/api/polls`, (req, res, ctx) => {
    // ✅ Поддержка пагинации и параметров
    const page = req.url.searchParams.get('page') || '1';
    const limit = req.url.searchParams.get('limit') || '10';
    
    return res(
      ctx.json({
        success: true,
        data: {
          items: [
            {
              id: 1,
              title: 'Test Poll 1',
              description: 'Test description',
              total_votes: 10,
              end_date: '2027-12-31T23:59:59Z',
              created_at: '2026-01-01T00:00:00Z',
              options: [
                { id: 1, text: 'Option A', votes: 6 },
                { id: 2, text: 'Option B', votes: 4 }
              ]
            },
            {
              id: 2,
              title: 'Test Poll 2',
              description: 'Another test',
              total_votes: 5,
              end_date: '2027-12-31T23:59:59Z',
              created_at: '2026-01-01T00:00:00Z',
              options: []
            }
          ],
          total: 2,
          page: Number(page),
          limit: Number(limit),
          pages: 1
        }
      })
    );
  }),

  rest.get(`${API_BASE_URL}/api/polls/:pollId`, (req, res, ctx) => {
    const { pollId } = req.params;
    
    if (pollId === '999') {
      return res(
        ctx.status(404),
        ctx.json({ success: false, error: 'Опрос не найден' })
      );
    }
    
    return res(
      ctx.json({
        success: true,
        data: {
          id: Number(pollId),
          title: `Test Poll ${pollId}`,
          description: 'Test description',
          total_votes: 10,
          end_date: '2027-12-31T23:59:59Z',
          created_at: '2026-01-01T00:00:00Z',
          options: [
            { id: 1, text: 'Option 1', votes: 6 },
            { id: 2, text: 'Option 2', votes: 4 }
          ]
        }
      })
    );
  }),

  rest.get(`${API_BASE_URL}/api/polls/:pollId/results`, (req, res, ctx) => {
    const { pollId } = req.params;
    
    return res(
      ctx.json({
        success: true,
        data: {
          poll_id: Number(pollId),
          title: `Test Poll ${pollId}`,
          description: 'Test',
          total_votes: 10,
          has_ended: false,
          end_date: '2027-12-31T23:59:59Z',
          created_at: '2026-01-01T00:00:00Z',
          options: [
            { id: 1, text: 'Option 1', votes: 6, percentage: 60.0 },
            { id: 2, text: 'Option 2', votes: 4, percentage: 40.0 }
          ]
        }
      })
    );
  }),

  rest.post(`${API_BASE_URL}/api/polls`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          id: 100,
          title: 'New Poll',
          description: 'Test',
          total_votes: 0,
          end_date: '2027-12-31T23:59:59Z',
          created_at: new Date().toISOString(),
          options: [
            { id: 1, text: 'Option 1', votes: 0 },
            { id: 2, text: 'Option 2', votes: 0 }
          ]
        }
      })
    );
  }),

  rest.delete(`${API_BASE_URL}/api/polls/:pollId`, (req, res, ctx) => {
    return res(ctx.status(204));
  }),

  // =============================================================================
  // 🔹 VOTES
  // =============================================================================
  
  rest.post(`${API_BASE_URL}/api/votes`, (req, res, ctx) => {
    const { poll_id, option_id } = req.body as { poll_id: number; option_id: number };
    
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          id: Date.now(),
          poll_id,
          option_id,
          created_at: new Date().toISOString()
        }
      })
    );
  }),

  rest.get(`${API_BASE_URL}/api/votes/check/:pollId`, (req, res, ctx) => {
    const { pollId } = req.params;
    
    return res(
      ctx.json({
        has_voted: false,
        poll_id: Number(pollId)
      })
    );
  }),

  // =============================================================================
  // 🔹 WEATHER
  // =============================================================================
  
  rest.get(`${API_BASE_URL}/api/weather/current`, (req, res, ctx) => {
    const city = req.url.searchParams.get('city') || 'Moscow';
    
    return res(
      ctx.json({
        success: true,
        data: {
          city,
          temperature: 15.5,
          feels_like: 13.2,
          description: 'Ясно',
          icon: '01d',
          humidity: 60,
          wind_speed: 3.5,
          is_fallback: false
        }
      })
    );
  }),

  // =============================================================================
  // 🔹 FILES
  // =============================================================================
  
  rest.put(`${API_BASE_URL}/api/polls/:pollId/banner`, (req, res, ctx) => {
    const { pollId } = req.params;
    
    return res(
      ctx.json({
        success: true,
        message: 'Banner updated',
        poll_id: Number(pollId),
        banner_file_id: 1
      })
    );
  }),

  rest.get(`${API_BASE_URL}/api/files/config`, (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          use_local_storage: false,
          max_file_size_mb: 10,
          allowed_types: ['image/jpeg', 'image/png', 'application/pdf'],
          s3_endpoint: 'http://localhost:9000'
        }
      })
    );
  })
];
console.log('🔧 MSW: handlers.ts loaded, count:', handlers.length);