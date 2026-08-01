import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { db } from '../db.js'
import { ApiError, asyncHandler } from '../lib/errors.js'
import { validate } from '../lib/validate.js'
import { toRequest } from '../lib/serialize.js'
import { requireStaff } from '../middleware/auth.js'

const router = Router()

const submitLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false })

router.post('/', submitLimiter, asyncHandler(async (req, res) => {
  const data = validate(req.body, {
    email: { type: 'email', required: true },
    focus: { type: 'string', max: 120 },
    message: { type: 'string', max: 2000 }
  })

  const info = db.prepare('INSERT INTO mentorship_requests (user_id, email, focus, message) VALUES (?, ?, ?, ?)')
    .run(req.user?.id ?? null, data.email, data.focus ?? '', data.message ?? '')

  res.status(201).json({ request: toRequest(db.prepare('SELECT * FROM mentorship_requests WHERE id = ?').get(info.lastInsertRowid)) })
}))

router.get('/', requireStaff, asyncHandler(async (req, res) => {
  const status = req.query.status
  const where = status && status !== 'all' ? 'WHERE r.status = ?' : ''
  const rows = db.prepare(`
    SELECT r.*, u.name AS user_name
    FROM mentorship_requests r LEFT JOIN users u ON u.id = r.user_id
    ${where} ORDER BY r.created_at DESC LIMIT 300`).all(...(where ? [status] : []))
  res.json({ requests: rows.map(toRequest) })
}))

router.patch('/:id', requireStaff, asyncHandler(async (req, res) => {
  const data = validate(req.body, { status: { type: 'enum', values: ['new', 'contacted', 'closed'], required: true } })
  const info = db.prepare('UPDATE mentorship_requests SET status = ? WHERE id = ?').run(data.status, req.params.id)
  if (!info.changes) throw ApiError.notFound('Request not found')
  res.json({ request: toRequest(db.prepare('SELECT * FROM mentorship_requests WHERE id = ?').get(req.params.id)) })
}))

router.delete('/:id', requireStaff, asyncHandler(async (req, res) => {
  const info = db.prepare('DELETE FROM mentorship_requests WHERE id = ?').run(req.params.id)
  if (!info.changes) throw ApiError.notFound('Request not found')
  res.json({ ok: true })
}))

export default router
