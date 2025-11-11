import { AppRouter } from '@/app/providers/RouterProvider';
import { useAuthInit } from '@/app/store';
import { Spin } from 'antd';
import './App.css';

/**
 * Root App component
 * Initializes authentication and renders router
 */
function App() {
  // Check authentication on app mount
  const { isLoading } = useAuthInit();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #ebe2fd 0%, #b4ddf9 100%)',
      }}>
        <Spin size="large" tip="Загрузка..." />
      </div>
    );
  }

  return <AppRouter />;
}

export default App;
