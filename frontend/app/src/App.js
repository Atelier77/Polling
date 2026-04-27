import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Poll from './components/Poll';
import Results from './components/Results';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthService, USER_ROLES } from './services/AuthService';
import { DataService } from './services/DataService';
import './App.css';
import { lazy, Suspense } from 'react';


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const Dashboard = lazy(() => import('./components/Dashboard'));
  const Poll = lazy(() => import('./components/Poll'));
  const Results = lazy(() => import('./components/Results'));
  const LoadingFallback = () => (
    <div className="loading-fallback">
      <div className="spinner"></div>
      <p>Загрузка...</p>
    </div>
  );

  useEffect(() => { 
    initializeAuth(); 
  }, []);

  useEffect(() => {
    console.log('🔍 App: State changed:', { isAuthenticated, user, userRole });
  }, [isAuthenticated, user, userRole]);

  const initializeAuth = async () => {
    try {
      console.log('🔍 App: Initializing auth...');
      
      const authStatus = await AuthService.checkAuth();
      console.log('🔍 App: authStatus =', authStatus);
      
      setIsAuthenticated(authStatus);
      
      if (authStatus) {
        const userData = AuthService.getCurrentUser();
        const role = AuthService.getUserRole();
        
        console.log('🔍 App: userData from service =', userData);
        console.log('🔍 App: role from service =', role);
        
        setUser(userData);
        setUserRole(role);
      }
    } catch (error) {
      console.error('App: Initialization error:', error);
      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
    } finally {
      console.log('🔍 App: initializeAuth finished, loading = false');
      setLoading(false);
    }
  };

  const handleLogin = async (studentId, password) => {
    try {
      setLoading(true);
      console.log('🔍 App: Login attempt for', studentId);
      
      const result = await AuthService.login(studentId, password);
      
      if (result.success) {
        console.log('🔍 App: Login success');
        console.log('🔍 App: result.user =', result.user);
        console.log('🔍 App: result.role =', result.role);
        
        setIsAuthenticated(true);
        setUser(result.user || null);
        setUserRole(result.role || null);
        
        await DataService.syncPendingVotes();
        
        window.location.href = '/dashboard';
        
      } else {
        console.warn('🔍 App: Login failed:', result.error);
      }
      return result;
    } catch (error) {
      console.error('App: Login error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    console.log('App: Logout called');

    try {
    await AuthService.logout();
  } catch (error) {
    console.warn('App: Logout API error, continuing anyway:', error);
  }
    
    setIsAuthenticated(false);
    setUser(null);
    setUserRole(null);
    
  //   window.location.replace('/login');
  
  // // 🔹 4. Альтернатива: если replace не сработал, пробуем href
  // setTimeout(() => {
  //   if (window.location.pathname !== '/login') {
  //     console.log('🔍 App: Forced redirect to /login');
  //     window.location.href = '/login';
  //   }
  // }, 100);
  };

  if (loading) {
    console.log('🔍 App: Rendering loading screen');
    return <div className="loading-screen">Загрузка...</div>;
  }

  console.log('🔍 App: Rendering routes', { isAuthenticated, user, userRole });

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/register" 
            element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/dashboard" 
            element={
              <Suspense fallback={<LoadingFallback />}>
                <ProtectedRoute allowedRoles={[USER_ROLES.USER, USER_ROLES.ADMIN]}>
                  <Dashboard 
                    user={user}
                    userRole={userRole}
                    onLogout={handleLogout} 
                  />
                </ProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/poll/:pollId" 
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.USER, USER_ROLES.ADMIN]}>
                <Poll 
                  user={user} 
                  userRole={userRole} 
                />
              </ProtectedRoute>
            } 
          /> 
          <Route 
            path="/results/:pollId" 
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.USER, USER_ROLES.ADMIN]}>
                <Results 
                  user={user} 
                  userRole={userRole} 
                />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <Dashboard 
                  user={user} 
                  userRole={userRole} 
                  onLogout={handleLogout} 
                  adminView={true} 
                />
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;