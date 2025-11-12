import { AppRouter } from '@/app/providers/RouterProvider';
import './App.css';

/**
 * Root App component
 * 
 * NOTE: We DON'T check auth on mount because in MAX mini-app,
 * user must first login via initData from OnboardingPage.
 * Checking auth before login causes infinite 401 loops.
 */
function App() {
  return <AppRouter />;
}

export default App;
