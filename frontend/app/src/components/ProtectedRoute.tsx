import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthService, USER_ROLES } from '../services/AuthService';

interface ProtectedRouteProps {
  children: ReactNode;
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
  
  const userRole = AuthService.getUserRole();
  
  console.log('=== ProtectedRoute Debug ===');
  console.log('Path:', location.pathname);
  console.log('Access token exists:', isAuthenticated);
  console.log('User role:', userRole);
  console.log('Allowed roles:', allowedRoles);

  if (!isAuthenticated) {
    console.log('→ No token, redirect to', redirectTo);
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(userRole)) {
      console.log('→ Role mismatch. User:', userRole, 'Allowed:', roles);
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  console.log('→ Access granted, rendering children');
  return children;
};

export default ProtectedRoute;