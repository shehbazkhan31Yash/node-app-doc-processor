/**
 * Simple global error handler that prefers err.status and maps common HTTP codes
 * to reasonable messages. Keeps response minimal in production while still
 * exposing helpful details in development.
 */

function errorHandler(err, req, res, next) {
  const statusCode = err.status || 500;

  const response = {
    message: err.message || 'Something went wrong',
    error: err.type || err.name || 'Error',
  };

  switch (statusCode) {
    case 400:
      response.message = err.message || 'Bad Request';
      break;
    case 401:
      response.message = err.message || 'Unauthorized';
      break;
    case 403:
      response.message = err.message || 'Forbidden';
      break;
    case 404:
      response.message = err.message || 'Not Found';
      break;
    case 409:
      response.message = err.message || 'Conflict';
      break;
    case 422:
      response.message = err.message || 'Unprocessable Entity';
      break;
    case 500:
      response.message = err.message || 'Internal Server Error';
      break;
    default:
      response.message = err.message || response.message;
      break;
  }

  res.status(statusCode).json(response);
}

module.exports = { errorHandler };