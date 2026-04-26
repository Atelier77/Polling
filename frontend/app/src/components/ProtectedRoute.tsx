import { Navigate, useLocation } from 'react-router-dom';
import { AuthService, USER_ROLES } from '../services/AuthService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

const ProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  redirectTo = '/login' 
}: ProtectedRouteProps) => {
  const location = useLocation();
  
  const accessToken = localStorage.getItem('access_token');
  const isAuthenticated = !!accessToken;
  
  if (!isAuthenticated) {
    console.log('ProtectedRoute: No token → redirect to', redirectTo);
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }
  
  if (allowedRoles.length > 0) {
    const userRole = AuthService.getUserRole();
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const userRoleLower = userRole?.toLowerCase();
    
    if (!userRoleLower || !roles.some(role => role.toLowerCase() === userRoleLower)) {
      console.log('ProtectedRoute: Role mismatch → redirect to /dashboard');
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;