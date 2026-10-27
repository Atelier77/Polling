import { AuthService } from './AuthService';
import {FileInfo} from '../types/file';
import {FileStorageConfig, DEFAULT_FILE_CONFIG} from '../types/fileConfig';

const API_BASE_URL = 'http://localhost:8000'; 

const STORAGE_KEYS = {
  POLLS_CACHE: 'polls_cache',
  SYNC_QUEUE: 'sync_queue',
  AUTH_TOKEN: 'auth_token',
  USER: 'user_data'
} as const;

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

interface Poll {
  id: number;
  title: string;
  description: string;
  end_date: string;
  total_votes: number;
  created_at: string;
  options?: Array<{ id: number; text: string; votes: number }>;
}

interface ResultsData {
  poll: Poll;
  options: Array<{
    id: number;
    text: string;
    votes: number;
    percentage?: number;
  }>;
  total_votes?: number;
  total_voters?: number;
  end_date?: string;
  created_at?: string;
  has_ended?: boolean;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface LoginResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: {
    id: number;
    student_id: string;
    name: string;
    faculty: string;
    role: 'guest' | 'user' | 'admin';
    is_local?: boolean;
    created_at?: string;
  };
  error?: string;
}

interface VoteResponse {
  success: boolean;
  data?: {
    id: number;
    poll_id: number;
    option_id: number;
    created_at?: string;
  };
  synced?: boolean;
  error?: string;
}

export const DataService = {
  
  async request(endpoint: string, options: RequestOptions = {}): Promise<any> {
    const maxRetries = 1;
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        const url = `${API_BASE_URL}${endpoint}`;
        console.log(`API Request: ${url}`); 
        
        const defaultOptions: RequestOptions = {
          headers: {
            'Content-Type': 'application/json',
          }
        };

        const token = AuthService.getAccessToken();
        if (token) {
          defaultOptions.headers = {
            ...defaultOptions.headers,
            'Authorization': `Bearer ${token}`
          };
        }

        const response = await fetch(url, { ...defaultOptions, ...options });
        console.log(`Response status: ${response.status}`);
        
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}));
          
          if (errorData.detail?.includes('истёк') || errorData.detail?.includes('expired')) {
            console.log('Token expired, attempting refresh...');
            
            const refreshed = await AuthService.refreshAccessToken();
            
            if (refreshed) {
              console.log('Token refreshed, retrying request...');
              retryCount++;
              continue;
            }
          }
          
          AuthService.logout();
          throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
        }
        
        if (response.status === 403) {
          throw new Error('Недостаточно прав для выполнения этого действия');
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error response: ${errorText}`);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
        
      } catch (error) {
        if (retryCount < maxRetries && (error as Error).message?.includes('истёк')) {
          retryCount++;
          continue;
        }
        
        console.error('API request failed:', error);
        throw error;
      }
    }
    
    throw new Error('Превышено количество попыток обновления токена');
  },

  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    try {
      const response = await this.request('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (response.access_token) {
        return { 
          success: true,
          access_token: response.access_token,
          refresh_token: response.refresh_token,
          expires_in: response.expires_in
        };
      }
      
      return { 
        success: false, 
        error: response.detail || 'Failed to refresh token' 
      };
      
    } catch (error) {
      console.error('Refresh token error:', error);
      return { 
        success: false, 
        error: (error as Error).message || 'Ошибка обновления токена' 
      };
    }
  },

  async logout(accessToken: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
    } catch (error) {
      console.warn('Logout API call failed:', error);
    }
  },

  async login(studentId: string): Promise<LoginResponse> {
    try {
      console.log('=== LOGIN ATTEMPT ===');
      console.log('Student ID:', studentId);
      
      const response = await this.request('/api/auth/login', { 
        method: 'POST',
        body: JSON.stringify({ 
          student_id: studentId,
          name: `Студент ${studentId}`,
          faculty: 'Факультет информатики'
        })
      });

      console.log('Login response:', response);
      
      if (response.access_token) {
        return { 
          success: true,
          access_token: response.access_token,
          refresh_token: response.refresh_token,
          expires_in: response.expires_in,
          user: response.user
        };
      }
      
      return { 
        success: false, 
        error: response.detail || response.error || 'Неизвестная ошибка' 
      };
      
    } catch (error) {
      console.error('DataService.login error:', error);
      
      if ((error as Error).message?.includes('422')) {
        return { 
          success: false, 
          error: 'Неверный формат данных для авторизации' 
        };
      }
      
      return { 
        success: false, 
        error: (error as Error).message || 'Ошибка авторизации' 
      };
    }
  },

async getPolls(queryString: string = ''): Promise<any> {
  console.log('DataService.getPolls called');
  
  const token = localStorage.getItem('access_token');
  console.log('DataService: token exists:', !!token);
  
  try {
    const response = await fetch(`http://localhost:8000/api/polls/${queryString ? '?' + queryString : ''}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    
    console.log('DataService: Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('DataService: Error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('DataService: Response data:', data);
    
    return data;
    
  } catch (error) {
    console.error('DataService.getPolls failed:', error);
    throw error;
  }
},

  async getPollById(pollId: number): Promise<Poll | null> {
    try {
      return await this.request(`/api/polls/${pollId}`); 
    } catch (error) {
      console.warn('Backend недоступен, ищем в кэше:', error);
      const cachedPolls = this.getCachedPolls();
      return cachedPolls.find(poll => poll.id === pollId) || null;
    }
  },

  // frontend/src/services/DataService.ts

async getPollResults(pollId: number): Promise<any> {  // ← Временно any для отладки
  try {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/api/polls/${pollId}/results`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🔍 DataService: Response status', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('🔍 DataService: Raw response', data);  // ← Ключевой лог!
    
    // 🔹 Проверка структуры ответа:
    // Если бэкенд возвращает {"poll_id": ..., "options": [...]} напрямую:
    if (data.poll_id && Array.isArray(data.options)) {
      console.log('✅ DataService: Returning data directly');
      return data;
    }
    
    // Если бэкенд возвращает {"success": true, "data": {...}}:
    if (data.success && data.data) {
      console.log('✅ DataService: Returning data.data');
      return data.data;
    }
    
    // fallback
    console.warn('⚠️ DataService: Unknown response format', data);
    return data;
    
  } catch (error) {
    console.error('❌ DataService: getPollResults error', error);
    throw error;
  }
},

  async createPoll(pollData: {
    title: string;
    description: string;
    end_date: string;
    options: Array<{ text: string }>;
  }): Promise<any> {
    try {
      return await this.request('/api/polls', { 
        method: 'POST',
        body: JSON.stringify(pollData)
      });
    } catch (error) {
      console.error('Create poll error:', error);
      throw error;
    }
  },

  async vote(pollId: number, optionId: number): Promise<VoteResponse> {
    const studentId = this.getCurrentUser()?.student_id;
    if (!studentId) {
      throw new Error('Пользователь не авторизован');
    }

    const voteData = {
      poll_id: pollId,
      option_id: optionId,
      student_id: studentId
    };

    try {
      const result = await this.request('/api/votes', { 
        method: 'POST',
        body: JSON.stringify(voteData)
      });
      
      this.saveVoteLocally(pollId, optionId);
      this.removeFromSyncQueue(pollId, studentId);
      
      return result;
    } catch (error) {
      console.warn('Backend недоступен, сохраняем локально:', error);
      this.saveVoteLocally(pollId, optionId);
      this.addToSyncQueue(voteData);
      return { success: true, synced: false };
    }
  },

  async checkVote(pollId: number): Promise<{ has_voted: boolean; poll_id: number }> {
    try {
      return await this.request(`/api/votes/check/${pollId}`); 
    } catch (error) {
      console.warn('Backend недоступен, проверяем локально:', error);
      return { 
        has_voted: this.hasVotedLocally(pollId), 
        poll_id: pollId 
      };
    }
  },

  cachePolls(polls: Poll[] | PaginatedResponse<Poll>): void {
    const pollsArray = Array.isArray(polls) ? polls : polls.items;
    const cacheData = {
      polls: pollsArray,
      created_at: Date.now()
    };
    localStorage.setItem(STORAGE_KEYS.POLLS_CACHE, JSON.stringify(cacheData));
  },

  getCachedPolls(): Poll[] {
    const cached = localStorage.getItem(STORAGE_KEYS.POLLS_CACHE);
    if (!cached) return [];
    
    try {
      const cacheData = JSON.parse(cached);
      const isExpired = Date.now() - cacheData.created_at > (5 * 60 * 1000); 
      
      return isExpired ? [] : cacheData.polls;
    } catch (error) {
      console.error('Error parsing cached polls:', error);
      return [];
    }
  },

  saveVoteLocally(pollId: number, optionId: number): void {
    const studentId = this.getCurrentUser()?.student_id;
    if (!studentId) return;
    
    const voteKey = `vote_${pollId}_${studentId}`;
    localStorage.setItem(voteKey, optionId.toString());
    localStorage.setItem(`${voteKey}_time`, new Date().toISOString());
  },

  hasVotedLocally(pollId: number): boolean {
    const studentId = this.getCurrentUser()?.student_id;
    if (!studentId) return false;
    
    const voteKey = `vote_${pollId}_${studentId}`;
    return localStorage.getItem(voteKey) !== null;
  },

  addToSyncQueue(voteData: { poll_id: number; option_id: number; student_id: string }): void {
    const queue = this.getSyncQueue();
    
    const filteredQueue = queue.filter(vote => 
      !(vote.poll_id === voteData.poll_id && vote.student_id === voteData.student_id)
    );
    
    filteredQueue.push({
      ...voteData,
      created_at: new Date().toISOString()
    });
    
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(filteredQueue));
  },

  removeFromSyncQueue(pollId: number, studentId: string): void {
    const queue = this.getSyncQueue();
    const newQueue = queue.filter(vote => 
      !(vote.poll_id === pollId && vote.student_id === studentId)
    );
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(newQueue));
  },

  getSyncQueue(): Array<{ poll_id: number; option_id: number; student_id: string; created_at: string }> {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE) || '[]');
  },

  async syncPendingVotes(): Promise<number> {
    const queue = this.getSyncQueue();
    const successfulSyncs = [];
    
    for (const vote of queue) {
      try {
        await this.request('/api/votes', { 
          method: 'POST',
          body: JSON.stringify(vote)
        });
        successfulSyncs.push(vote);
      } catch (error) {
        console.warn('Не удалось синхронизировать голос:', vote, error);
      }
    }
    
    successfulSyncs.forEach(vote => {
      this.removeFromSyncQueue(vote.poll_id, vote.student_id);
    });
    
    return successfulSyncs.length;
  },

  getAuthToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  getCurrentUser(): { student_id: string; [key: string]: any } | null {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    return userStr ? JSON.parse(userStr) : null;
  },

  handleUnauthorized(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem('auth_status');
    window.location.href = '/login';
  },

async uploadFile(
  formData: FormData,
  onProgress?: (event: ProgressEvent) => void
): Promise<{ success: boolean; file?: FileInfo; error?: string }> {
  try {
    const token = localStorage.getItem('access_token');
    
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve) => {
      xhr.upload.addEventListener('progress', (event: ProgressEvent) => {
        if (onProgress && event.lengthComputable) {
          onProgress(event);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({ success: true, file: response as FileInfo });
          } catch (parseError) {
            console.error('Failed to parse upload response:', parseError);
            resolve({ success: true });
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            const errorMessage = errorData.detail || errorData.message || 'Ошибка загрузки';
            resolve({ success: false, error: errorMessage });
          } catch {
            resolve({ 
              success: false, 
              error: `Ошибка ${xhr.status}: ${xhr.statusText}` 
            });
          }
        }
      });
      
      xhr.addEventListener('error', () => {
        resolve({ success: false, error: 'Ошибка сети. Проверьте подключение к серверу.' });
      });
      
      xhr.addEventListener('timeout', () => {
        resolve({ success: false, error: 'Таймаут загрузки. Файл слишком большой или медленное соединение.' });
      });
      
      xhr.open('POST', `${API_BASE_URL}/api/files/upload`);
      xhr.timeout = 300000;
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
    
  } catch (error: any) {
    console.error('Upload exception:', error);
    return { 
      success: false, 
      error: error.message || 'Непредвиденная ошибка при загрузке' 
    };
  }
},

async getFileDownloadUrl(fileId: number): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const response = await this.request(`/api/files/${fileId}/download`);
    return { success: true, url: response.url };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Ошибка получения ссылки' 
    };
  }
},

async linkFileToPoll(fileId: number, pollId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await this.request(`/api/polls/${pollId}/banner`, {
      method: 'PUT',
      body: JSON.stringify({ banner_file_id: fileId })
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
},


async deleteFile(fileId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await this.request(`/api/files/${fileId}`, { method: 'DELETE' });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
},

async getFileStorageConfig(): Promise<FileStorageConfig | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/files/config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },

    });
    
    if (response.ok) {
      const config = await response.json();
      return config as FileStorageConfig;
    }
    
    console.warn('Failed to fetch file config, using defaults');
    return null;
    
  } catch (error) {
    console.error('Error fetching file storage config:', error);
    return null;
  }
},

async getFileStorageConfigWithFallback(): Promise<FileStorageConfig> {
  const config = await this.getFileStorageConfig();
  return config ?? DEFAULT_FILE_CONFIG;
}
};