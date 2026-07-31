import express from 'express';
import {
  createWorker,
  getWorkers,
  getWorkerById,
  updateWorker,
  deleteWorker,
} from '../controllers/worker.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { createWorkerValidator, workerValidator, workerIdParamValidator } from '../middleware/validate.js';

const router = express.Router();

// All worker endpoints require owner authentication
router.post('/', authenticate, authorize('owner'), createWorkerValidator, createWorker);
router.get('/', authenticate, authorize('owner'), getWorkers);
router.get('/:id', authenticate, authorize('owner'), workerIdParamValidator, getWorkerById);
router.put('/:id', authenticate, authorize('owner'), workerIdParamValidator, workerValidator, updateWorker);
router.delete('/:id', authenticate, authorize('owner'), workerIdParamValidator, deleteWorker);

export default router;