import { HTTP_STATUS } from '../utils/constants.js';
import { AppError } from '../utils/AppError.js';

export const notFound = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, HTTP_STATUS.NOT_FOUND);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  // If the error is an AppError (or subclass like AuthError), use its statusCode
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.errors && { errors: err.errors }),
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }

  // Default to the response status if already set, otherwise 500
  const statusCode = res.statusCode === HTTP_STATUS.OK ? HTTP_STATUS.INTERNAL_SERVER_ERROR : res.statusCode;
  res.status(statusCode);

  let errorResponse = {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  };

  // Supabase unique violation
  if (err.code === '23505') {
    errorResponse.message = 'Duplicate field value entered';
    res.status(HTTP_STATUS.CONFLICT);
  }

  // Supabase foreign key violation
  if (err.code === '23503') {
    errorResponse.message = 'Referenced resource not found';
    res.status(HTTP_STATUS.BAD_REQUEST);
  }

  // Supabase not null violation
  if (err.code === '23502') {
    errorResponse.message = 'Missing required field';
    res.status(HTTP_STATUS.BAD_REQUEST);
  }

  if (err.name === 'JsonWebTokenError') {
    errorResponse.message = 'Invalid token';
    res.status(HTTP_STATUS.UNAUTHORIZED);
  }

  if (err.name === 'TokenExpiredError') {
    errorResponse.message = 'Token expired';
    res.status(HTTP_STATUS.UNAUTHORIZED);
  }

  if (err.name === 'AuthApiError') {
    errorResponse.message = err.message || 'Authentication error';
    res.status(HTTP_STATUS.UNAUTHORIZED);
  }

  if (err.name === 'PostgrestError' || err.name === 'PgError') {
    errorResponse.message = err.message || 'Database error';
    res.status(HTTP_STATUS.BAD_REQUEST);
    if (err.details) errorResponse.details = err.details;
    if (err.hint) errorResponse.hint = err.hint;
  }

  res.json(errorResponse);
};
