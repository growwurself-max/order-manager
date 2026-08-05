import { HTTP_STATUS } from '../utils/constants.js';
import { addIdAlias } from '../utils/responseFormatter.js';
import { supabase } from '../config/supabase.js';
import {
  createWorker as createWorkerDB,
  getWorkersByShopId as getWorkersByShopIdDB,
  getWorkerById as getWorkerByIdDB,
  updateWorker as updateWorkerDB,
  deleteWorker as deleteWorkerDB,
} from '../services/supabase.service.js';
import { isShopId } from '../utils/generateShopId.js';
import { resolveShopId } from '../utils/resolveShopId.js';

// Helper to check if username already exists
const findWorkerByUsernameForCheck = async (username) => {
  const { data, error } = await supabase
    .from('workers')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  
  if (error) return null;
  return data;
};

export const createWorker = async (req, res, next) => {
  try {
    let shopId = req.user.shopId;
    console.log('[createWorker] Incoming shopId from user:', shopId);

    // Resolve Shop ID to UUID if needed
    if (shopId && isShopId(shopId)) {
      console.log('[createWorker] Shop ID detected, resolving to UUID');
      const resolvedShopId = await resolveShopId(shopId);
      if (!resolvedShopId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'Shop not found',
        });
      }
      shopId = resolvedShopId;
      console.log('[createWorker] Resolved UUID:', shopId);
    }

    const { username, name, password, pin } = req.body;

    // Check if username already exists
    const existingWorker = await findWorkerByUsernameForCheck(username);
    if (existingWorker) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Username already exists. Please choose a different username.',
      });
    }

    const worker = await createWorkerDB({
      shop_id: shopId,
      username,
      name,
      pin: password || pin,
      role: 'worker',
    });

    const workerResponse = { ...worker };
    delete workerResponse.pin;

    res.status(HTTP_STATUS.CREATED).json({
      message: 'Worker created successfully',
      data: addIdAlias(workerResponse),
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkers = async (req, res, next) => {
  try {
    let shopId = req.user.shopId;
    console.log('[getWorkers] Incoming shopId from user:', shopId);

    // Resolve Shop ID to UUID if needed
    if (shopId && isShopId(shopId)) {
      console.log('[getWorkers] Shop ID detected, resolving to UUID');
      const resolvedShopId = await resolveShopId(shopId);
      if (!resolvedShopId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'Shop not found',
        });
      }
      shopId = resolvedShopId;
      console.log('[getWorkers] Resolved UUID:', shopId);
    }

    const workers = await getWorkersByShopIdDB(shopId);

    res.status(HTTP_STATUS.OK).json({
      message: 'Workers fetched successfully',
      data: addIdAlias(workers),
      count: workers.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let shopId = req.user.shopId;
    console.log('[getWorkerById] Incoming shopId from user:', shopId);

    // Resolve Shop ID to UUID if needed
    if (shopId && isShopId(shopId)) {
      console.log('[getWorkerById] Shop ID detected, resolving to UUID');
      const resolvedShopId = await resolveShopId(shopId);
      if (!resolvedShopId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'Shop not found',
        });
      }
      shopId = resolvedShopId;
      console.log('[getWorkerById] Resolved UUID:', shopId);
    }

    const worker = await getWorkerByIdDB(id, shopId);

    if (!worker) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Worker not found',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Worker fetched successfully',
      data: addIdAlias(worker),
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorker = async (req, res, next) => {
  try {
    const { id } = req.params;
    let shopId = req.user.shopId;
    console.log('[updateWorker] Incoming shopId from user:', shopId);

    // Resolve Shop ID to UUID if needed
    if (shopId && isShopId(shopId)) {
      console.log('[updateWorker] Shop ID detected, resolving to UUID');
      const resolvedShopId = await resolveShopId(shopId);
      if (!resolvedShopId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'Shop not found',
        });
      }
      shopId = resolvedShopId;
      console.log('[updateWorker] Resolved UUID:', shopId);
    }

    const updates = req.body;

    const worker = await updateWorkerDB(id, shopId, updates);

    if (!worker) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        message: 'Worker not found',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      message: 'Worker updated successfully',
      data: addIdAlias(worker),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteWorker = async (req, res, next) => {
  try {
    const { id } = req.params;
    let shopId = req.user.shopId;
    console.log('[deleteWorker] Incoming shopId from user:', shopId);

    // Resolve Shop ID to UUID if needed
    if (shopId && isShopId(shopId)) {
      console.log('[deleteWorker] Shop ID detected, resolving to UUID');
      const resolvedShopId = await resolveShopId(shopId);
      if (!resolvedShopId) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          message: 'Shop not found',
        });
      }
      shopId = resolvedShopId;
      console.log('[deleteWorker] Resolved UUID:', shopId);
    }

    await deleteWorkerDB(id, shopId);

    res.status(HTTP_STATUS.OK).json({
      message: 'Worker deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
