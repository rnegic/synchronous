import { useEffect, useState } from 'react';
import { AppRouter } from '@/app/providers/RouterProvider';
import { useAuth } from '@/app/store';
import { useMaxWebApp } from '@/shared/hooks/useMaxWebApp';
import { sessionsApi } from '@/shared/api';
import { message } from 'antd';
import { Spin } from 'antd';
import './App.css';

/**
 * Root App component
 * 
 * Handles automatic authentication via MAX initData
 * User doesn't need to interact - login happens automatically
 */
function App() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const { initData, user, isReady, webApp } = useMaxWebApp();
  const [isInitializing, setIsInitializing] = useState(true);
  const [loginAttempted, setLoginAttempted] = useState(false);

  // Automatic login when MAX initData is available
  useEffect(() => {
    // Prevent duplicate login attempts
    if (loginAttempted) {
      return;
    }
    const performAutoLogin = async () => {
      console.log('[App] 🔍 performAutoLogin started', {
        isReady,
        hasInitData: !!initData,
        hasUser: !!user,
        isAuthenticated,
        initDataPreview: initData?.substring(0, 50) + '...',
      });

      // Wait for MAX WebApp to be ready
      if (!isReady) {
        console.log('[App] ⏳ Waiting for MAX WebApp to be ready...');
        return;
      }

      // If already authenticated, stop initialization
      if (isAuthenticated) {
        console.log('[App] ✅ Already authenticated, skipping login');
        setIsInitializing(false);
        return;
      }

      // If no initData available (dev mode), skip auth entirely
      if (!initData || !user) {
        console.warn('[App] ⚠️ No initData - running in dev mode without auth');
        setIsInitializing(false);
        return;
      }

      // Perform automatic login
      try {
        console.log('[App] 🚀 Starting auto-login...', {
          userId: user.id,
          userName: `${user.first_name} ${user.last_name}`,
          initDataLength: initData.length,
        });
        
        setLoginAttempted(true); // Mark that we attempted login
        const deviceId = navigator.userAgent;
        const result = await login(initData, deviceId);
        
        console.log('[App] ✅ Auto-login successful!', result);
        
        // Обработка inviteLink из start_param
        if (webApp?.initDataUnsafe?.start_param) {
          const inviteLink = webApp.initDataUnsafe.start_param;
          console.log('[App] 📎 Found start_param (inviteLink):', inviteLink);
          
          try {
            const response = await sessionsApi.joinByInviteLink(inviteLink);
            console.log('[App] ✅ Successfully joined session by invite link:', response.session.id);
            message.success('Вы присоединились к сессии!');
            // Перенаправляем в лобби сессии используя window.location (Router еще не инициализирован)
            window.location.href = `/lobby/${response.session.id}`;
          } catch (error) {
            console.error('[App] ❌ Failed to join session by invite link:', error);
            // Не показываем ошибку пользователю, просто продолжаем работу
          }
        }
      } catch (error) {
        console.error('[App] ❌ Auto-login failed:', error);
        if (error instanceof Error) {
          console.error('[App] Error details:', {
            message: error.message,
            stack: error.stack,
          });
        }
      } finally {
        setIsInitializing(false);
      }
    };

    performAutoLogin();
  }, [isReady, initData, user, isAuthenticated, login, loginAttempted]);

  // Show loading spinner during initialization
  if (isInitializing || authLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      }}>
        <Spin size="large" tip="Загрузка приложения..." />
      </div>
    );
  }

  return <AppRouter />;
}

export default App;
