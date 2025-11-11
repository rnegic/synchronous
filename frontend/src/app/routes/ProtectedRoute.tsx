/**
 * Protected Route Component
 * Redirects to home page if user is not authenticated
 */

import { Navigate } from 'react-router';
import { Spin } from 'antd';
import { useIsAuthenticated, useAuthLoading } from '@/app/store';
import styles from './ProtectedRoute.module.css';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Wraps routes that require authentication
 * Shows loading spinner while checking auth
 * Redirects to home if not authenticated
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" tip="Проверка авторизации..." />
      </div>
    );
  }

  // Redirect to home if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
