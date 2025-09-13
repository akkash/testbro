/**
 * Environment Configuration
 * Centralized configuration management for the TestBro frontend
 */

// =============================================================================
// Environment Variables
// =============================================================================

export const env = {
  // API Configuration
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  WEBSOCKET_URL: import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:3001',

  // Authentication & Database
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',

  // Development Settings
  NODE_ENV: import.meta.env.VITE_NODE_ENV || import.meta.env.MODE || 'development',
  WS_DEBUG: import.meta.env.VITE_WS_DEBUG === 'true',
  API_DEBUG: import.meta.env.VITE_API_DEBUG === 'true',
  PERFORMANCE_DEBUG: import.meta.env.VITE_PERFORMANCE_DEBUG === 'true',

  // Application Settings
  APP_NAME: import.meta.env.VITE_APP_NAME || 'TestBro',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  APP_DESCRIPTION: import.meta.env.VITE_APP_DESCRIPTION || 'AI-Powered Automated Testing Platform',

  // Feature Flags
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_SENTRY: import.meta.env.VITE_ENABLE_SENTRY === 'true',
  ENABLE_STORYBOOK: import.meta.env.VITE_ENABLE_STORYBOOK !== 'false',

  // UI Configuration
  DEFAULT_THEME: import.meta.env.VITE_DEFAULT_THEME || 'light',
  ENABLE_DARK_MODE: import.meta.env.VITE_ENABLE_DARK_MODE !== 'false',
  ENABLE_PWA: import.meta.env.VITE_ENABLE_PWA === 'true',
  ENABLE_SERVICE_WORKER: import.meta.env.VITE_ENABLE_SERVICE_WORKER === 'true',

  // Testing Configuration
  DEFAULT_BROWSER: import.meta.env.VITE_DEFAULT_BROWSER || 'chromium',
  TEST_TIMEOUT: parseInt(import.meta.env.VITE_TEST_TIMEOUT || '30000'),
  SCREENSHOT_QUALITY: parseFloat(import.meta.env.VITE_SCREENSHOT_QUALITY || '0.8'),

  // External Services
  GA_TRACKING_ID: import.meta.env.VITE_GA_TRACKING_ID,
  MIXPANEL_TOKEN: import.meta.env.VITE_MIXPANEL_TOKEN,
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  CDN_URL: import.meta.env.VITE_CDN_URL || '',
  ASSETS_URL: import.meta.env.VITE_ASSETS_URL || '',
} as const;

// =============================================================================
// Computed Properties
// =============================================================================

export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

// =============================================================================
// API Configuration
// =============================================================================

export const apiConfig = {
  baseURL: env.API_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

// =============================================================================
// WebSocket Configuration
// =============================================================================

export const wsConfig = {
  url: env.WEBSOCKET_URL,
  reconnectAttempts: 5,
  reconnectInterval: 3000,
  timeout: 10000,
  debug: env.WS_DEBUG,
} as const;

// =============================================================================
// UI Theme Configuration
// =============================================================================

export const themeConfig = {
  defaultTheme: env.DEFAULT_THEME as 'light' | 'dark',
  enableDarkMode: env.ENABLE_DARK_MODE,
  storageKey: 'testbro-theme',
  transitionDuration: 200, // milliseconds
} as const;

// =============================================================================
// Test Execution Configuration
// =============================================================================

export const testConfig = {
  defaultBrowser: env.DEFAULT_BROWSER as 'chromium' | 'firefox' | 'webkit',
  timeout: env.TEST_TIMEOUT,
  screenshotQuality: env.SCREENSHOT_QUALITY,
  maxConcurrentTests: 3,
  retryAttempts: 2,
  viewport: {
    desktop: { width: 1280, height: 720 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 667 },
  },
} as const;

// =============================================================================
// Feature Flags
// =============================================================================

export const features = {
  analytics: env.ENABLE_ANALYTICS,
  sentry: env.ENABLE_SENTRY,
  storybook: env.ENABLE_STORYBOOK,
  pwa: env.ENABLE_PWA,
  serviceWorker: env.ENABLE_SERVICE_WORKER,
  darkMode: env.ENABLE_DARK_MODE,
} as const;

// =============================================================================
// Validation
// =============================================================================

export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required environment variables
  const required = [
    { key: 'VITE_API_URL', value: env.API_URL },
    { key: 'VITE_WEBSOCKET_URL', value: env.WEBSOCKET_URL },
  ];

  // Check required variables
  for (const { key, value } of required) {
    if (!value || value.trim() === '') {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // Validate URLs
  try {
    new URL(env.API_URL);
  } catch {
    errors.push(`Invalid API_URL: ${env.API_URL}`);
  }

  try {
    new URL(env.WEBSOCKET_URL);
  } catch {
    errors.push(`Invalid WEBSOCKET_URL: ${env.WEBSOCKET_URL}`);
  }

  // Validate numeric values
  if (env.TEST_TIMEOUT < 1000) {
    errors.push('TEST_TIMEOUT must be at least 1000ms');
  }

  if (env.SCREENSHOT_QUALITY < 0.1 || env.SCREENSHOT_QUALITY > 1.0) {
    errors.push('SCREENSHOT_QUALITY must be between 0.1 and 1.0');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// Development Utilities
// =============================================================================

export function logEnvironment(): void {
  if (!isDev) return;

  console.group('🔧 TestBro Environment Configuration');
  console.table({
    Environment: env.NODE_ENV,
    API_URL: env.API_URL,
    WEBSOCKET_URL: env.WEBSOCKET_URL,
    App_Name: env.APP_NAME,
    App_Version: env.APP_VERSION,
    Default_Theme: env.DEFAULT_THEME,
    Default_Browser: env.DEFAULT_BROWSER,
  });

  console.group('🎛️ Feature Flags');
  console.table(features);
  console.groupEnd();

  const validation = validateEnvironment();
  if (!validation.isValid) {
    console.group('❌ Environment Validation Errors');
    validation.errors.forEach(error => console.error(error));
    console.groupEnd();
  } else {
    console.log('✅ Environment validation passed');
  }

  console.groupEnd();
}

// =============================================================================
// Export Default Configuration
// =============================================================================

export default {
  env,
  apiConfig,
  wsConfig,
  themeConfig,
  testConfig,
  features,
  isDev,
  isProd,
  isTest,
  validateEnvironment,
  logEnvironment,
};
