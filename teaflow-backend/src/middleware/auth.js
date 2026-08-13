import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRY, JWT_ALGORITHM } from '../utils/constants.js';
import { supabase } from '../config/supabase.js';

export const AUTH_COOKIE_NAME = 'teaflow_token';

// Read the bearer token from the Authorization header OR the httpOnly cookie.
const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token) return token;
  }
  return req.cookies?.[AUTH_COOKIE_NAME] || null;
};

export const authCookieOptions = (req) => {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const host = req.get?.('host') || '';
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  return {
    httpOnly: true,
    secure: isSecure,
    // Cross-site (production: https frontend -> https API) requires SameSite=None;
    // same-site (localhost dev over http) works with Lax.
    sameSite: isSecure && !isLocalhost ? 'none' : 'lax',
    maxAge: 8 * 60 * 60 * 1000, // matches JWT_EXPIRY (8h)
    path: '/',
  };
};

// Set the auth cookie on the response (called from login controllers).
export const setAuthCookie = (res, req, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions(req));
};

// Clear the auth cookie (called on logout).
export const clearAuthCookie = (res, req) => {
  res.clearCookie(AUTH_COOKIE_NAME, { path: '/', httpOnly: true, sameSite: 'lax' });
};

const mapUser = (data, decoded) => {
  if (!data) return null;
  return {
    id: data.id,
    userId: decoded.userId,
    // Prefer database values over token claims so role/shop reassignments
    // take effect immediately instead of waiting for token expiry.
    shopId: data.shop_id || decoded.shopId,
    role: data.role || decoded.role,
    name: data.name,
    email: data.email,
    is_active: data.is_active,
  };
};

const loadUserByRole = async (decoded) => {
  if (decoded.role === 'owner') {
    const { data } = await supabase
      .from('owners')
      .select('id, email, name, shop_id, role, is_active')
      .eq('id', decoded.userId)
      .maybeSingle();
    return { user: data, userType: 'owner' };
  }

  if (decoded.role === 'worker') {
    const { data } = await supabase
      .from('workers')
      .select('id, name, shop_id, role, is_active')
      .eq('id', decoded.userId)
      .eq('role', 'worker')
      .maybeSingle();
    return { user: data, userType: 'worker' };
  }

  if (decoded.role === 'super_admin') {
    const { data } = await supabase
      .from('super_admins')
      .select('id, email, name, role')
      .eq('id', decoded.userId)
      .eq('role', 'super_admin')
      .maybeSingle();
    return { user: data, userType: 'super_admin' };
  }

  return { user: null, userType: null };
};

export const authenticate = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });

    const { user, userType } = await loadUserByRole(decoded);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if ((userType === 'worker' || userType === 'owner') && user.is_active === false) {
      return res.status(403).json({ message: 'Account is disabled' });
    }

    req.user = mapUser(user, decoded);
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
      const { user } = await loadUserByRole(decoded);
      if (user && user.is_active === true) {
        req.user = mapUser(user, decoded);
      }
    }
    next();
  } catch (error) {
    next();
  }
};

export const generateToken = (userId, shopId, role) => {
  return jwt.sign({ userId, shopId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRY, algorithm: JWT_ALGORITHM });
};
