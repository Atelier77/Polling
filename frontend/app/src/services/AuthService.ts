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

export const AuthService = {
  
  async login(studentId: string): Promise<AuthResponse> {
  try {
    const result = await DataService.login(studentId);
    

if (result.success && result.access_token) {

  const backendRole = result.user?.role;
  const userRole: UserRole = 
    backendRole === USER_ROLES.ADMIN ? USER_ROLES.ADMIN :
    backendRole === USER_ROLES.GUEST ? USER_ROLES.GUEST :
    USER_ROLES.USER;
  
  this._saveTokens({
    accessToken: result.access_token,
    refreshToken: result.refresh_token!,
    expiresIn: result.expires_in!
  });
  
  const typedUser: UserData = {
    id: result.user?.id,
    student_id: result.user!.student_id,
    name: result.user!.name,
    faculty: result.user!.faculty,
    role: userRole,
    is_local: result.user?.is_local,
    created_at: result.user?.created_at
  };
  
  this._saveUser(typedUser);
  localStorage.setItem(STORAGE_KEYS.AUTH, 'true');
  
  return { 
    success: true, 
    user: typedUser,
    role: userRole,
    isLocal: false
  };
} else {
      return { 
        success: false, 
        error: result.error || 'Ошибка авторизации' 
      };
    }
  } catch (error) {
    console.error('Login failed:', error);
    
    return { 
      success: false, 
      error: 'Сервер недоступен. Убедитесь, что backend запущен на http://localhost:8000' 
    };
  }
},

  

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


  async checkAuth(): Promise<boolean> {
    const isAuth = localStorage.getItem(STORAGE_KEYS.AUTH) === 'true';
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    if (!isAuth || !accessToken) {
      return false;
    }
    
    if (accessToken.startsWith('fake_token_')) {
      console.warn('Fake token detected, requiring re-auth');
      AuthService.logout();
      return false;
    }
    
    const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
    if (expiry && Date.now() >= parseInt(expiry, 10)) {
      console.log('Access token expired, attempting refresh...');
      
      const refreshed = await AuthService.refreshAccessToken();
      
      if (!refreshed) {
        AuthService.logout();
        return false;
      }
    }
    
    return true;
  },



  async logout(): Promise<void> {
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    if (accessToken && !accessToken.startsWith('fake_token_')) {
      try {
        await DataService.logout(accessToken);
      } catch (error) {
        console.warn('Logout API call failed, clearing local storage anyway');
      }
    }
    
    (Object.keys(STORAGE_KEYS) as Array<keyof typeof STORAGE_KEYS>).forEach(key => {
      localStorage.removeItem(STORAGE_KEYS[key]);
    });
    
    window.location.href = '/login';
  },

  
  getUserRole(): UserRole {
    const user = AuthService.getCurrentUser();
    return user?.role || 
           localStorage.getItem('user_role') as UserRole || 
           USER_ROLES.GUEST;
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
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr) as UserData;
    } catch (error) {
      console.error('Error parsing user data:', error);
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

  
  /**
   * Сохранение токенов в localStorage
   * @private
   */
  _saveTokens({ accessToken, refreshToken, expiresIn }: TokenData): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    
    // Сохраняем время истечения с запасом 30 секунд
    const expiryTime = Date.now() + (expiresIn * 1000) - 30000;
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
  },

  /**
   * Сохранение данных пользователя в localStorage
   * @private
   */
  _saveUser(user: UserData): void {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    if (user.role) {
      localStorage.setItem('user_role', user.role);
    }
  }
};