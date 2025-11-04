/**
 * Simple 404 middleware.
 * If a route is not matched, create an Error and pass to next().
 */

function notFound(req, res, next) {
  const err = new Error(`Not Found - ${req.originalUrl}`);
  err.status = 404;
  err.type = 'NotFoundError';
  next(err);
}

module.exports = { notFound };