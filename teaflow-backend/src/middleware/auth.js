import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRY } from '../utils/constants.js';
import { supabase } from '../config/supabase.js';

const mapUser = (data, decoded) => {
  if (!data) return null;
  return {
    id: data.id,
    userId: decoded.userId,
    shopId: decoded.shopId || data.shop_id,
    role: decoded.role || data.role,
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

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
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { user } = await loadUserByRole(decoded);
        if (user && user.is_active === true) {
          req.user = mapUser(user, decoded);
        }
      }
    }
    next();
  } catch (error) {
    next();
  }
};

export const generateToken = (userId, shopId, role) => {
  return jwt.sign({ userId, shopId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};
