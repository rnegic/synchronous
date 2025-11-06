import type { ThemeConfig } from 'antd';

export const colors = {
  pastel: {
    blue: '#b4ddf9',
    lavender: '#cfc1f2',
    peach: '#fde8c9',
    mint: '#e0ebdd',
    purple: '#ebe2fd',
  },
  bright: {
    coral: '#fab3af',
    sage: '#bacda3',
    sky: '#afc5de',
    blue: '#1840ffd4',
  },
  neutral: {
    white: '#ffffff',
    lightGray: '#f8f9fa',
    gray: '#e9ecef',
    darkGray: '#6c757d',
    text: '#2c3e50',
  },
};

/**
 * Light theme configuration for Ant Design
 */
export const lightTheme: ThemeConfig = {
  token: {
    // Brand colors
    colorPrimary: colors.bright.blue,
    colorSuccess: colors.bright.sage,
    colorWarning: colors.pastel.peach,
    colorError: colors.bright.coral,
    colorInfo: colors.pastel.blue,

    // Background colors
    colorBgBase: colors.neutral.white,
    colorBgContainer: colors.neutral.white,
    colorBgElevated: colors.neutral.white,
    colorBgLayout: colors.neutral.lightGray,

    // Border and divider
    colorBorder: colors.neutral.gray,
    colorBorderSecondary: colors.neutral.lightGray,

    // Text colors
    colorText: colors.neutral.text,
    colorTextSecondary: colors.neutral.darkGray,

    // Typography
    fontFamily: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,

    // Border radius for modern look
    borderRadius: 12,
    borderRadiusLG: 16,
    borderRadiusSM: 8,

    // Spacing
    padding: 16,
    paddingLG: 24,
    paddingXL: 32,

    // Motion
    motionDurationSlow: '0.3s',
    motionDurationMid: '0.2s',
    motionDurationFast: '0.1s',
  },
  components: {
    Button: {
      borderRadius: 12,
      controlHeight: 44,
      controlHeightLG: 52,
      fontWeight: 600,
      primaryShadow: '0 4px 12px rgba(45, 154, 255, 0.3)',
    },
    Card: {
      borderRadiusLG: 16,
      boxShadowTertiary: '0 2px 8px rgba(0, 0, 0, 0.06)',
      paddingLG: 24,
    },
    Input: {
      borderRadius: 12,
      controlHeight: 44,
      paddingBlock: 12,
    },
    Progress: {
      defaultColor: colors.bright.sky,
      remainingColor: colors.neutral.gray,
    },
    Tabs: {
      borderRadius: 12,
      itemActiveColor: colors.bright.sky,
      itemSelectedColor: colors.bright.sky,
    },
    List: {
      paddingContentHorizontal: 0,
    },
  },
};

/**
 * Dark theme configuration
 */
export const darkTheme: ThemeConfig = {
  ...lightTheme,
  token: {
    ...lightTheme.token,
    colorBgBase: '#1a1a1a',
    colorBgContainer: '#242424',
    colorBgElevated: '#2d2d2d',
    colorBgLayout: '#141414',
    colorText: '#e8e8e8',
    colorTextSecondary: '#a8a8a8',
    colorBorder: '#3d3d3d',
  },
};
