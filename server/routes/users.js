import { Router } from 'express'
import { db, publicUser } from '../db.js'
import { ApiError, asyncHandler } from '../lib/errors.js'
import { validate } from '../lib/validate.js'
import { hashPassword, requireAdmin } from '../middleware/auth.js'

const router = Router()
router.use(requireAdmin)

router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const perPage = Math.min(100, Math.max(5, Number(req.query.perPage) || 20))
  const filters = []
  const params = []

  if (req.query.search) {
    filters.push('(name LIKE ? OR email LIKE ?)')
    params.push(`%${req.query.search}%`, `%${req.query.search}%`)
  }
  if (req.query.role && req.query.role !== 'all') { filters.push('role = ?'); params.push(req.query.role) }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const total = db.prepare(`SELECT COUNT(*) AS n FROM users ${where}`).get(...params).n
  const rows = db.prepare(`SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, perPage, (page - 1) * perPage)

  res.json({
    users: rows.map(row => ({
      ...publicUser(row),
      enrollments: db.prepare('SELECT COUNT(*) AS n FROM enrollments WHERE user_id = ?').get(row.id).n
    })),
    page,
    perPage,
    total,
    pages: Math.max(1, Math.ceil(total / perPage))
  })
}))

router.post('/', asyncHandler(async (req, res) => {
  const data = validate(req.body, {
    name: { type: 'string', required: true, min: 2, max: 80 },
    email: { type: 'email', required: true },
    password: { type: 'string', required: true, min: 8, max: 128 },
    role: { type: 'enum', values: ['student', 'instructor', 'admin'], default: 'student' }
  })
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(data.email)) throw ApiError.conflict('That email is already registered')

  const info = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(data.name, data.email, await hashPassword(data.password), data.role)
  res.status(201).json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)) })
}))

router.patch('/:id', asyncHandler(async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!user) throw ApiError.notFound('User not found')

  const data = validate(req.body, {
    name: { type: 'string', min: 2, max: 80 },
    role: { type: 'enum', values: ['student', 'instructor', 'admin'] },
    status: { type: 'enum', values: ['active', 'suspended'] },
    password: { type: 'string', min: 8, max: 128 }
  })

  // An admin must not be able to lock themselves out of the panel.
  if (user.id === req.user.id && (data.role && data.role !== 'admin')) throw ApiError.badRequest('You cannot change your own role')
  if (user.id === req.user.id && data.status === 'suspended') throw ApiError.badRequest('You cannot suspend your own account')
  if (user.role === 'admin' && data.role && data.role !== 'admin' && adminCount() <= 1) throw ApiError.badRequest('At least one admin must remain')

  const sets = []
  const params = []
  for (const key of ['name', 'role', 'status']) {
    if (data[key] !== undefined) { sets.push(`${key} = ?`); params.push(data[key]) }
  }
  if (data.password) { sets.push('password_hash = ?'); params.push(await hashPassword(data.password)) }
  if (!sets.length) throw ApiError.badRequest('Nothing to update')

  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...params, user.id)
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) })
}))

router.delete('/:id', asyncHandler(async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!user) throw ApiError.notFound('User not found')
  if (user.id === req.user.id) throw ApiError.badRequest('You cannot delete your own account')
  if (user.role === 'admin' && adminCount() <= 1) throw ApiError.badRequest('At least one admin must remain')

  db.prepare('DELETE FROM users WHERE id = ?').run(user.id)
  res.json({ ok: true })
}))

const adminCount = () => db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get().n

export default router
