import { ZodError } from 'zod';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} was not found.` });
}

export function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  const status = error.status || (error instanceof ZodError ? 400 : 500);
  const message = error instanceof ZodError
    ? error.issues.map((issue) => issue.message).join('; ')
    : error.status ? error.message : status >= 500 ? 'Something went wrong while processing your capture.' : error.message;
  console.error(`[error] ${req.method} ${req.path}`, error.message);
  res.status(status).json({ error: message });
}
