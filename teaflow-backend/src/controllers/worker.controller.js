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
    const shopId = req.user.shopId;
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
    const shopId = req.user.shopId;
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
    const shopId = req.user.shopId;

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
    const shopId = req.user.shopId;
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
    const shopId = req.user.shopId;

    await deleteWorkerDB(id, shopId);

    res.status(HTTP_STATUS.OK).json({
      message: 'Worker deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
