// frontend/src/services/AuthService.ts

import { DataService } from './DataService';

const USE_FAKE_TOKENS = false;

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user_data',
  AUTH: 'auth_status',
  TOKEN_EXPIRY: 'token_expiry'
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export const USER_ROLES = {
  GUEST: 'guest',
  USER: 'user',
  ADMIN: 'admin'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [USER_ROLES.GUEST]: 0,
  [USER_ROLES.USER]: 1,
  [USER_ROLES.ADMIN]: 2
};

export interface UserData {
  id?: number;
  student_id: string;
  name: string;
  faculty: string;
  role?: UserRole;
  is_local?: boolean;
  created_at?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: UserData;
  role?: UserRole;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  isLocal?: boolean;
}

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// =============================================================================
// 🔹 ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Извлечение читаемого сообщения об ошибке
// =============================================================================

function extractErrorMessage(errorData: any): string {
  if (!errorData) return 'Произошла ошибка';
  
  // 🔹 Прямая строка
  if (typeof errorData === 'string') return errorData;
  
  // 🔹 Ошибки валидации FastAPI (422)
  if (errorData.detail) {
    if (Array.isArray(errorData.detail)) {
      // Массив ошибок валидации
      return errorData.detail
        .map((err: any) => err.msg || err.message || JSON.stringify(err))
        .join('; ');
    }
    if (typeof errorData.detail === 'string') {
      return errorData.detail;
    }
    if (errorData.detail.msg) {
      return errorData.detail.msg;
    }
    if (typeof errorData.detail === 'object') {
      return JSON.stringify(errorData.detail);
    }
  }
  
  // 🔹 Стандартное поле message
  if (errorData.message) return errorData.message;
  
  // 🔹Fallback: сериализуем объект
  return typeof errorData === 'object' 
    ? JSON.stringify(errorData) 
    : 'Произошла ошибка';
}

// =============================================================================
// 🔹 ОСНОВНОЙ СЕРВИС
// =============================================================================

export const AuthService = {
  
  // =============================================================================
  // 🔹 РЕГИСТРАЦИЯ
  // =============================================================================
  
  async register(
    studentId: string,
    password: string,
    name: string,
    faculty: string
  ): Promise<AuthResponse> {
    try {
      console.log('🔍 AuthService.register called:', {
        studentId,
        passwordLength: password?.length,
        name,
        faculty
      });
      
      const response = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          password: password,
          name: name,
          faculty: faculty
        })
      });

      console.log('🔍 Register response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Register success:', data);
        
        // 🔹 Сохраняем токены
        if (data.access_token && data.refresh_token) {
          AuthService._saveTokens({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in || 900
          });
        }
        
        // 🔹 Сохраняем пользователя
        if (data.user) {
          const backendRole = data.user.role?.toLowerCase();
          const userRole: UserRole = 
            backendRole === 'admin' ? USER_ROLES.ADMIN :
            backendRole === 'guest' ? USER_ROLES.GUEST :
            USER_ROLES.USER;
          
          const typedUser: UserData = {
            id: data.user.id,
            student_id: data.user.student_id,
            name: data.user.name,
            faculty: data.user.faculty,
            role: userRole,
            is_local: false,
            created_at: data.user.created_at
          };
          
          AuthService._saveUser(typedUser);
          localStorage.setItem(STORAGE_KEYS.AUTH, 'true');
          
          return { 
            success: true, 
            user: typedUser,
            role: userRole,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            isLocal: false
          };
        }
        
        return { success: true };
        
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn('🔍 Register failed:', errorData);
        
        return { 
          success: false, 
          error: extractErrorMessage(errorData)
        };
      }
      
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      return { 
        success: false, 
        error: error.message || 'Сервер недоступен' 
      };
    }
  },

  // =============================================================================
  // 🔹 ВХОД
  // =============================================================================
  
  async login(studentId: string, password: string): Promise<AuthResponse> {
    try {
      console.log('🔍 AuthService.login called:', {
        studentId,
        passwordLength: password?.length
      });
      
      const requestBody = {
        student_id: studentId,
        password: password
      };
      
      console.log('🔍 Request body:', {
        student_id: requestBody.student_id,
        password: requestBody.password ? '***' + requestBody.password.slice(-3) : 'MISSING'
      });
      
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('🔍 Login response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Login response ', {
          has_access_token: !!data.access_token,
          has_refresh_token: !!data.refresh_token,
          has_user: !!data.user,
          user_role: data.user?.role
        });
        
        // 🔹 Сохраняем токены
        if (data.access_token && data.refresh_token) {
          console.log('🔍 Saving tokens...');
          AuthService._saveTokens({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in || 900
          });
          console.log('🔍 Tokens saved. Verifying:');
          console.log('   access_token:', localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) ? '✓' : '✗');
        } else {
          console.warn('🔍 Tokens NOT saved: missing access_token or refresh_token');
        }
        
        // 🔹 Сохраняем пользователя
        if (data.user) {
          console.log('🔍 Saving user data...');
          const backendRole = data.user.role?.toLowerCase();
          const userRole: UserRole = 
            backendRole === 'admin' ? USER_ROLES.ADMIN :
            backendRole === 'guest' ? USER_ROLES.GUEST :
            USER_ROLES.USER;
          
          const typedUser: UserData = {
            id: data.user.id,
            student_id: data.user.student_id,
            name: data.user.name,
            faculty: data.user.faculty,
            role: userRole,
            is_local: false,
            created_at: data.user.created_at
          };
          
          AuthService._saveUser(typedUser);
          localStorage.setItem(STORAGE_KEYS.AUTH, 'true');
          console.log('🔍 User saved. Verifying:');
          console.log('   user_', localStorage.getItem(STORAGE_KEYS.USER) ? '✓' : '✗');
          console.log('   auth_status:', localStorage.getItem(STORAGE_KEYS.AUTH));
          
          return { 
            success: true, 
            user: typedUser,
            role: userRole,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            isLocal: false
          };
        } else {
          console.warn('🔍 User data NOT saved: data.user is missing');
        }
        
        return { success: true };
        
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn('🔍 Login failed:', errorData);
        
        return { 
          success: false, 
          error: extractErrorMessage(errorData)
        };
      }
      
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      return { 
        success: false, 
        error: error.message || 'Сервер недоступен' 
      };
    }
  },

  // =============================================================================
  // 🔹 ОБНОВЛЕНИЕ ТОКЕНА
  // =============================================================================
  
  async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      
      if (!refreshToken || refreshToken.startsWith('fake_token_')) {
        console.warn('Cannot refresh: no valid refresh token');
        return false;
      }
      
      const result = await DataService.refreshToken(refreshToken);
      
      if (result.success && result.access_token) {
        AuthService._saveTokens({
          accessToken: result.access_token,
          refreshToken: result.refresh_token!,
          expiresIn: result.expires_in!
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  },

  // =============================================================================
  // 🔹 ПРОВЕРКА АВТОРИЗАЦИИ
  // =============================================================================
  
  async checkAuth(): Promise<boolean> {
    console.log('🔍 checkAuth: STARTED');
    
    const isAuth = localStorage.getItem(STORAGE_KEYS.AUTH) === 'true';
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    console.log('🔍 checkAuth: isAuth=', isAuth, ', accessToken exists=', !!accessToken);
    
    if (!isAuth || !accessToken) {
      console.log('🔍 checkAuth: returning false (no auth/token)');
      return false;
    }
    
    if (accessToken.startsWith('fake_token_')) {
      console.warn('🔍 checkAuth: fake token detected');
      AuthService.logout();
      return false;
    }
    
    const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
    if (expiry && Date.now() >= parseInt(expiry, 10)) {
      console.log('🔍 checkAuth: token expired, attempting refresh...');
      
      const refreshed = await AuthService.refreshAccessToken();
      
      if (!refreshed) {
        console.log('🔍 checkAuth: refresh failed');
        AuthService.logout();
        return false;
      }
    }
    
    console.log('🔍 checkAuth: returning true');
    return true;
  },

  // =============================================================================
  // 🔹 ВЫХОД
  // =============================================================================
  
  async logout(): Promise<void> {
    console.log('🔍 AuthService.logout called');
    
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    if (accessToken && !accessToken.startsWith('fake_token_')) {
      try {
        await DataService.logout(accessToken);
      } catch (error) {
        console.warn('Logout API call failed, clearing local storage anyway');
      }
    }
    
    // 🔹 Очищаем все ключи
    (Object.keys(STORAGE_KEYS) as Array<keyof typeof STORAGE_KEYS>).forEach(key => {
      localStorage.removeItem(STORAGE_KEYS[key]);
    });
    localStorage.removeItem('user_role');
    
    console.log('🔍 AuthService.logout: localStorage cleared');
    
    // 🔹 Перенаправление
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  },

  // =============================================================================
  // 🔹 ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // =============================================================================
  
  getUserRole(): UserRole {
    const user = AuthService.getCurrentUser();
    const role = user?.role || localStorage.getItem('user_role');
    return (role as UserRole) || USER_ROLES.GUEST;
  },

  hasRole(allowedRoles: UserRole | UserRole[]): boolean {
    const currentRole = AuthService.getUserRole();
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return roles.includes(currentRole);
  },

  hasMinimumRole(minRole: UserRole): boolean {
    const currentRole = AuthService.getUserRole();
    const currentLevel = ROLE_HIERARCHY[currentRole] || 0;
    const minLevel = ROLE_HIERARCHY[minRole] || 0;
    return currentLevel >= minLevel;
  },

  getCurrentUser(): UserData | null {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    console.log('🔍 getCurrentUser: raw =', userStr ? 'EXISTS' : 'NULL');
    
    if (!userStr) return null;
    
    try {
      const user = JSON.parse(userStr) as UserData;
      console.log('🔍 getCurrentUser: parsed =', {
        name: user.name,
        student_id: user.student_id,
        role: user.role
      });
      return user;
    } catch (error) {
      console.error('❌ Error parsing user ', error);
      return null;
    }
  },

  getStudentId(): string | null {
    const user = AuthService.getCurrentUser();
    return user ? user.student_id : null;
  },

  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  isAdmin(): boolean {
    return AuthService.hasRole(USER_ROLES.ADMIN);
  },

  isUser(): boolean {
    return AuthService.hasRole([USER_ROLES.USER, USER_ROLES.ADMIN]);
  },

  // =============================================================================
  // 🔹 ПРИВАТНЫЕ МЕТОДЫ
  // =============================================================================
  
  _saveTokens({ accessToken, refreshToken, expiresIn }: TokenData): void {
    console.log('🔍 _saveTokens called:', { 
      accessToken: !!accessToken, 
      refreshToken: !!refreshToken,
      expiresIn 
    });
    
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    
    const expiryTime = Date.now() + (expiresIn * 1000) - 30000;
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
    
    console.log('🔍 _saveTokens done. Verifying:');
    console.log('   ACCESS_TOKEN:', localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) ? '✓' : '✗');
    console.log('   REFRESH_TOKEN:', localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) ? '✓' : '✗');
    console.log('   TOKEN_EXPIRY:', localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY));
  },

  _saveUser(user: UserData): void {
    console.log('🔍 _saveUser called:', { 
      student_id: user.student_id, 
      name: user.name,
      role: user.role 
    });
    
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    if (user.role) {
      localStorage.setItem('user_role', user.role);
    }
    
    console.log('🔍 _saveUser done. Verifying:');
    console.log('   USER:', localStorage.getItem(STORAGE_KEYS.USER) ? '✓' : '✗');
    console.log('   user_role:', localStorage.getItem('user_role'));
  }
};