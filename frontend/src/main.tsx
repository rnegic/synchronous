import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { store } from '@/app/store';
import { lightTheme } from '@/app/styles/theme';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ConfigProvider theme={lightTheme} locale={ruRU}>
        <App />
      </ConfigProvider>
    </Provider>
  </StrictMode>,
);
