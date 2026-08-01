import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { config } from '../config.js'
import { db, publicUser } from '../db.js'
import { ApiError } from '../lib/errors.js'

export const hashPassword = password => bcrypt.hash(password, 10)
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash)

export const signToken = user => jwt.sign(
  { sub: user.id, role: user.role },
  config.jwtSecret,
  { expiresIn: config.jwtExpiresIn }
)

export function setAuthCookie(res, token) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000
  })
}

export const clearAuthCookie = res => res.clearCookie(config.cookieName)

function readToken(req) {
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) return header.slice(7)
  return req.cookies?.[config.cookieName] || null
}

/** Attaches req.user when a valid token is present; never throws. */
export function attachUser(req, res, next) {
  const token = readToken(req)
  if (!token) return next()
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub)
    if (row && row.status === 'active') req.user = publicUser(row)
  } catch {
    // expired or tampered token — treated as anonymous
  }
  next()
}

export function requireAuth(req, res, next) {
  if (!req.user) return next(ApiError.unauthorized())
  next()
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized())
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden())
  next()
}

export const requireAdmin = requireRole('admin')
export const requireStaff = requireRole('admin', 'instructor')
