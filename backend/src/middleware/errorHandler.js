// Centralized error handler. Keeps route handlers free of try/catch
// boilerplate for expected errors and avoids leaking stack traces in prod.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);

  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(status).json({ message });
}

module.exports = errorHandler;
