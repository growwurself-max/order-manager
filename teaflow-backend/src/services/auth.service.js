import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { supabase } from '../config/supabase.js';
import { getOwnerById, getWorkerById } from './supabase.service.js';
import { AuthError, NotFoundError } from '../utils/AppError.js';

export const loginOwner = async (email, password) => {
  const owner = await findOwnerByEmailForAuth(email);
  if (!owner) {
    throw new AuthError('Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, owner.password);
  if (!isMatch) {
    throw new AuthError('Invalid credentials');
  }

  const token = generateToken(owner.id, owner.shop_id, 'owner');
  return {
    token,
    user: {
      id: owner.id,
      email: owner.email,
      name: owner.name,
      role: 'owner',
    },
  };
};

export const loginWorker = async (username, pin) => {
  const worker = await findWorkerByUsernameForAuth(username);
  if (!worker || !worker.is_active) {
    throw new AuthError('Invalid credentials or inactive account');
  }

  const isMatch = await bcrypt.compare(pin.toString(), worker.pin);
  if (!isMatch) {
    throw new AuthError('Invalid credentials');
  }

  if (worker.role !== 'worker') {
    throw new AuthError('Invalid credentials');
  }

  const token = generateToken(worker.id, worker.shop_id, 'worker');
  return {
    token,
    user: {
      id: worker.id,
      name: worker.name,
      role: 'worker',
      shopId: worker.shop_id,
    },
  };
};

export const getOwnerProfile = async (ownerId) => {
  const owner = await getOwnerById(ownerId);
  if (!owner) {
    throw new NotFoundError('Owner not found');
  }
  return owner;
};

export const getWorkerProfile = async (workerId) => {
  // For profile, we don't know shopId yet, so query without shopId filter
  const { data, error } = await supabase
    .from('workers')
    .select('id, shop_id, username, name, role, is_active, created_at, updated_at')
    .eq('id', workerId)
    .maybeSingle();
  
  if (!data) {
    throw new NotFoundError('Worker not found');
  }
  return data;
};

// Helper functions
const findOwnerByEmailForAuth = async (email) => {
  const { data, error } = await supabase
    .from('owners')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  
  if (error) return null;
  return data;
};

const findWorkerByUsernameForAuth = async (username) => {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('username', username)
    .maybeSingle();
  
  if (error) return null;
  return data;
};

export const getSuperAdminProfile = async (adminId) => {
  const { data, error } = await supabase
    .from('super_admins')
    .select('id, email, name, role, created_at, updated_at')
    .eq('id', adminId)
    .maybeSingle();
  
  if (error || !data) {
    throw new NotFoundError('Super admin not found');
  }
  return data;
};


