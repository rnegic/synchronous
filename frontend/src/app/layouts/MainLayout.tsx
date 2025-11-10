import { Outlet, useLocation, useNavigate } from 'react-router';
import { Header } from '@/shared/ui';

export const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getPageConfig = () => {
    const path = location.pathname;

    if (path === '/') {
      return {
        variant: 'home' as const,
        userName: 'Давид',
        avatarUrl: "https://i.pravatar.cc/150?img=1"
      };
    }

    if (path === '/session-setup') {
      return {
        variant: 'page' as const,
        pageTitle: 'Шаг 1: Настройка',
        onBack: () => navigate('/'),
      };
    }

    if (path === '/lobby') {
      return {
        variant: 'page' as const,
        pageTitle: 'Шаг 2: Ожидание',
        onBack: () => navigate('/session-setup'),
      };
    }

    if (path === '/focus-session') {
      return {
        variant: 'page' as const,
        pageTitle: 'Шаг 3: Фокус',
        onBack: () => navigate('/'),
      };
    }

    if (path === '/session-report') {
      return {
        variant: 'page' as const,
        pageTitle: 'Результаты',
        onBack: () => navigate('/'),
      };
    }

    //fallback
    return {
      variant: 'page' as const,
      pageTitle: 'Назад',
      onBack: () => navigate('/'),
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
