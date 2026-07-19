/**
 * Environment Configuration
 * Centralizes all environment variable handling for dev and production
 */

export const ENV = {
  // Deployment environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isStaging: process.env.VERCEL_ENV === 'preview',

  // Supabase
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },

  // WebSocket / Backend API
  api: {
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000',
    // Convert HTTP(S) to WS(S)
    getWsUrl: (token: string): string => {
      const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000';
      let wsUrl: string;

      if (baseUrl.startsWith('https://')) {
        wsUrl = `wss://${baseUrl.replace(/^https:\/\//, '')}/ws/chart?token=${token}`;
      } else if (baseUrl.startsWith('http://')) {
        wsUrl = `ws://${baseUrl.replace(/^http:\/\//, '')}/ws/chart?token=${token}`;
      } else {
        const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${proto}//${baseUrl}/ws/chart?token=${token}`;
      }

      return wsUrl;
    },
  },

  // Telegram (optional, for signal notifications)
  telegram: {
    botToken: process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN,
    chatId: process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID,
  },

  // Monitoring & Analytics (optional)
  monitoring: {
    sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },

  // Feature flags
  features: {
    enableWebSocket: process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET !== 'false',
    enableRealTimeSignals: process.env.NEXT_PUBLIC_ENABLE_REALTIME_SIGNALS !== 'false',
    enableTelegramNotifications: Boolean(process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN),
  },

  // Validation
  validateProduction: (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!ENV.supabase.url) errors.push('NEXT_PUBLIC_SUPABASE_URL not set');
    if (!ENV.supabase.anonKey) errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY not set');
    if (!ENV.api.wsUrl && ENV.isProduction) errors.push('NEXT_PUBLIC_WS_URL not set (required for production)');

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  // Print configuration (for debugging)
  print: (): void => {
    if (typeof window === 'undefined') return; // Skip on server
    console.group('[ENV] Configuration');
    console.log('Environment:', ENV.isDevelopment ? 'development' : ENV.isProduction ? 'production' : 'staging');
    console.log('Supabase URL:', ENV.supabase.url ? '✓ configured' : '✗ missing');
    console.log('WebSocket URL:', ENV.api.wsUrl);
    console.log('Features:', ENV.features);
    console.groupEnd();
  },
};

export default ENV;
