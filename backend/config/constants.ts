export const SERVER_CONFIG = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

const _jwtSecret = process.env.JWT_SECRET;
const _isProduction = process.env.NODE_ENV === 'production';

export const JWT_CONFIG = {
  SECRET: _jwtSecret,
  // Local development remains convenient, but deployed apps must receive a
  // unique secret from platform provisioning.
  FALLBACK_SECRET: _isProduction ? undefined : 'development-jwt-secret',
  EXPIRES_IN: '24h',
} as const;

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid credentials',
  EMAIL_ALREADY_EXISTS: 'Email already registered',
  INVALID_TOKEN: 'Invalid token',
  NO_TOKEN: 'No token provided',
  UNAUTHORIZED: 'Unauthorized access',
} as const;
