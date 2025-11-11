/**
 * MAX WebApp Types
 * Type definitions for MAX Bridge API
 */

export interface MaxWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface MaxWebAppChat {
  id: number;
  type: string;
}

export interface MaxWebAppData {
  query_id?: string;
  auth_date: number;
  hash: string;
  start_param?: string;
  user?: MaxWebAppUser;
  chat?: MaxWebAppChat;
}

export interface MaxWebApp {
  initData: string;
  initDataUnsafe: MaxWebAppData;
  version: string;
  platform: 'ios' | 'android' | 'desktop' | 'web';
  ready: () => void;
  close: () => void;
  expand: () => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
}

declare global {
  interface Window {
    WebApp?: MaxWebApp;
  }
}

export {};
