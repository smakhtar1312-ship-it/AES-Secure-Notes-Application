const logger = require('../utils/logger');


function errorHandler(err, req, res, next) {

  logger.error(`${err.message} | Route: ${req.method} ${req.path} | Stack: ${err.stack}`);


  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

 
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Resource not found.' });
  }


  const statusCode = err.status || 500;
  const message = statusCode === 500 ? 'Internal server error.' : err.message;

  res.status(statusCode).json({ error: message });
}

module.exports = { errorHandler };
