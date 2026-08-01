import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { db, publicUser } from '../db.js'
import { ApiError, asyncHandler } from '../lib/errors.js'
import { validate } from '../lib/validate.js'
import { clearAuthCookie, hashPassword, requireAuth, setAuthCookie, signToken, verifyPassword } from '../middleware/auth.js'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' }
})

router.post('/signup', authLimiter, asyncHandler(async (req, res) => {
  const data = validate(req.body, {
    name: { type: 'string', required: true, min: 2, max: 80 },
    email: { type: 'email', required: true },
    password: { type: 'string', required: true, min: 8, max: 128 }
  })

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email)
  if (existing) throw ApiError.conflict('An account with that email already exists')

  const info = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(data.name, data.email, await hashPassword(data.password), 'student')

  const user = publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid))
  const token = signToken(user)
  setAuthCookie(res, token)
  res.status(201).json({ user, token })
}))

router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const data = validate(req.body, {
    email: { type: 'email', required: true },
    password: { type: 'string', required: true, max: 128 }
  })

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(data.email)
  // Same message either way so the endpoint does not confirm which emails exist.
  if (!row || !(await verifyPassword(data.password, row.password_hash))) {
    throw ApiError.unauthorized('Email or password is incorrect')
  }
  if (row.status !== 'active') throw ApiError.forbidden('This account has been suspended')

  const user = publicUser(row)
  const token = signToken(user)
  setAuthCookie(res, token)
  res.json({ user, token })
}))

router.post('/logout', (req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }))

router.patch('/me', requireAuth, asyncHandler(async (req, res) => {
  const data = validate(req.body, {
    name: { type: 'string', min: 2, max: 80 },
    bio: { type: 'string', max: 500 },
    currentPassword: { type: 'string', max: 128 },
    newPassword: { type: 'string', min: 8, max: 128 }
  })

  if (data.newPassword) {
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id)
    if (!data.currentPassword || !(await verifyPassword(data.currentPassword, row.password_hash))) {
      throw ApiError.badRequest('Please check the highlighted fields', { currentPassword: 'Current password is incorrect' })
    }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await hashPassword(data.newPassword), req.user.id)
  }
  if (data.name !== undefined) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(data.name, req.user.id)
  if (data.bio !== undefined) db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(data.bio, req.user.id)

  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) })
}))

export default router
