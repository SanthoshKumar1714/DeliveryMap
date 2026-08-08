// Wraps async route handlers so thrown errors/rejected promises
// automatically reach the error handler below, instead of needing
// try/catch in every single route.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Centralized error handler — must be registered LAST in server.js,
// after all routes.
function errorHandler(err, req, res, next) {
  console.error(`[${req.method} ${req.originalUrl}]`, err.message);

  // Mongoose validation errors (e.g. required field missing on .save())
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  // Mongoose bad ObjectId (e.g. malformed :id in URL)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  // Duplicate key (e.g. phone number already registered)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(400).json({ error: `${field} already in use` });
  }

  // Fallback — anything unexpected
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Something went wrong. Please try again.' : err.message,
  });
}

module.exports = { asyncHandler, errorHandler };