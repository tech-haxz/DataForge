export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
  static badRequest(message = 'Invalid request', details) { return new ApiError(400, message, details) }
  static unauthorized(message = 'You need to sign in') { return new ApiError(401, message) }
  static forbidden(message = 'You do not have access to this') { return new ApiError(403, message) }
  static notFound(message = 'Not found') { return new ApiError(404, message) }
  static conflict(message = 'Already exists') { return new ApiError(409, message) }
}

/** Wraps an async route handler so rejected promises reach the error middleware. */
export const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` })
}

// eslint-disable-next-line no-unused-vars -- express identifies error middleware by arity
export function errorHandler(err, req, res, next) {
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500)
  if (status >= 500) console.error('[error]', err)
  res.status(status).json({
    error: status >= 500 ? 'Something went wrong on our side' : err.message,
    ...(err.details ? { details: err.details } : {})
  })
}
