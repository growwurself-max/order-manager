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

// WARNING: JWT_SECRET MUST always be set via environment variable.
// Generate a strong random secret: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set!');
}
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRY = process.env.JWT_EXPIRY || '8h'; // Reduced from 24h for better security
export const JWT_ALGORITHM = 'HS256';

export const PASSWORD_SALT_ROUNDS = 10;

export const DEFAULT_RECALL_TIMER_MINUTES = 2;

export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const PAYMENT_METHOD = {
  PAY_LATER: 'pay_later',
  PAY_NOW: 'pay_now',
};
