import { Outlet, useLocation, useNavigate } from 'react-router';
import { Header } from '@/shared/ui';
import { useAuth } from '@/app/store';

export const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const getPageConfig = () => {
    const path = location.pathname;

    // Use actual user data
    const userName = user?.name || 'Пользователь';
    const avatarUrl = user?.avatarUrl || undefined;

    if (path === '/') {
      return {
        variant: 'home' as const,
        userName,
        avatarUrl,
      };
    }

    if (path === '/session-setup') {
      return {
        variant: 'page' as const,
        pageTitle: 'Шаг 1: Настройка',
        onBack: () => navigate('/'),
        avatarUrl,
      };
    }

    if (path.startsWith('/lobby')) {
      return {
        variant: 'page' as const,
        pageTitle: 'Шаг 2: Ожидание',
        onBack: () => navigate('/'),
        avatarUrl,
      };
    }

    if (path.startsWith('/focus-session')) {
      return {
        variant: 'page' as const,
        pageTitle: 'Шаг 3: Фокус',
        onBack: () => navigate('/'),
        avatarUrl,
      };
    }

    if (path.startsWith('/session-report')) {
      return {
        variant: 'page' as const,
        pageTitle: 'Результаты',
        onBack: () => navigate('/'),
        avatarUrl,
      };
    }

    //fallback
    return {
      variant: 'page' as const,
      pageTitle: 'Назад',
      onBack: () => navigate('/'),
      avatarUrl,
    };
  };

  const config = getPageConfig();

  return (
    <>
      <Header {...config} />
      <Outlet />
    </>
  );
};
