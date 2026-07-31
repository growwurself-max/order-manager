export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

export const ORDER_STATUS = {
  PLACED: 'placed',
  PREPARING: 'preparing',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const ORDER_STATUS_WORKFLOW = {
  placed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const WORKER_ROLE = {
  WORKER: 'worker',
};

export const MENU_CATEGORIES = {
  MILK_TEA: 'milk-tea',
  FRUIT_TEA: 'fruit-tea',
  SLUSH: 'slush',
  SPECIALTY: 'specialty',
};

export const DEFAULT_SHOP_SETTINGS = {
  orderPrefix: 'TF',
  allowPreorder: false,
  currency: 'INR',
  primaryColor: '#4CAF50',
  theme: 'light',
  notifications: {
    email: true,
    sms: false,
  },
};

// WARNING: JWT_SECRET MUST be set via environment variable in production
// Generate a strong random secret: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: JWT_SECRET environment variable is not set!');
}
export const JWT_SECRET = process.env.JWT_SECRET || 'teaflow_jwt_secret_key_change_in_production';
export const JWT_EXPIRY = process.env.JWT_EXPIRY || '8h'; // Reduced from 24h for better security

export const PASSWORD_SALT_ROUNDS = 10;

export const DEFAULT_RECALL_TIMER_MINUTES = 2;
