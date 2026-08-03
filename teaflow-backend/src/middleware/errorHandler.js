import { HTTP_STATUS } from '../utils/constants.js';
import { AppError } from '../utils/AppError.js';

export const notFound = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, HTTP_STATUS.NOT_FOUND);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  console.error('=== ERROR HANDLER ===');
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  console.error('Error code:', err.code);
  console.error('Error stack:', err.stack);
  console.error('Full error object:', JSON.stringify(err, null, 2));

  // If the error is an AppError (or subclass like AuthError), use its statusCode
  if (err instanceof AppError) {
    console.log('Error is AppError, using statusCode:', err.statusCode);
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.errors && { errors: err.errors }),
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }

  // Default to the response status if already set, otherwise 500
  const statusCode = res.statusCode === HTTP_STATUS.OK ? HTTP_STATUS.INTERNAL_SERVER_ERROR : res.statusCode;
  console.log('Using statusCode:', statusCode);
  res.status(statusCode);

  let errorResponse = {
    message: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  };

  // Supabase unique violation
  if (err.code === '23505') {
    console.log('Detected unique constraint violation');
    errorResponse.message = 'Duplicate field value entered';
    res.status(HTTP_STATUS.CONFLICT);
  }

  // Supabase foreign key violation
  if (err.code === '23503') {
    console.log('Detected foreign key violation');
    errorResponse.message = 'Referenced resource not found';
    res.status(HTTP_STATUS.BAD_REQUEST);
  }

  // Supabase not null violation
  if (err.code === '23502') {
    console.log('Detected not null violation');
    errorResponse.message = 'Missing required field';
    res.status(HTTP_STATUS.BAD_REQUEST);
  }

  if (err.name === 'JsonWebTokenError') {
    console.log('Detected JWT error');
    errorResponse.message = 'Invalid token';
    res.status(HTTP_STATUS.UNAUTHORIZED);
  }

  if (err.name === 'TokenExpiredError') {
    console.log('Detected token expired error');
    errorResponse.message = 'Token expired';
    res.status(HTTP_STATUS.UNAUTHORIZED);
  }

  if (err.name === 'AuthApiError') {
    console.log('Detected auth API error');
    errorResponse.message = err.message || 'Authentication error';
    res.status(HTTP_STATUS.UNAUTHORIZED);
  }

  if (err.name === 'PostgrestError' || err.name === 'PgError') {
    console.log('Detected Postgrest/Pg error');
    errorResponse.message = err.message || 'Database error';
    res.status(HTTP_STATUS.BAD_REQUEST);
    if (err.details) errorResponse.details = err.details;
    if (err.hint) errorResponse.hint = err.hint;
  }

  // Add error code to response for debugging
  if (err.code) {
    errorResponse.code = err.code;
  }

  console.log('Sending error response:', JSON.stringify(errorResponse, null, 2));
  res.json(errorResponse);
};
