import { Router } from 'express'
import { db } from '../db.js'
import { ApiError, asyncHandler } from '../lib/errors.js'
import { slugify, validate } from '../lib/validate.js'
import { toChapter, toCourse, toVideo } from '../lib/serialize.js'
import { requireAdmin, requireAuth, requireStaff } from '../middleware/auth.js'

const router = Router()

const courseSchema = (required = false) => ({
  title: { type: 'string', required, min: 3, max: 120 },
  summary: { type: 'string', max: 300 },
  description: { type: 'string', max: 5000 },
  syllabus: { type: 'string', max: 10000 },
  level: { type: 'string', max: 80 },
  schedule: { type: 'string', max: 120 },
  seats: { type: 'int', min: 0, max: 10000 },
  priceCents: { type: 'int', min: 0, max: 10_000_00 },
  accent: { type: 'string', max: 24 },
  status: { type: 'enum', values: ['draft', 'published', 'archived'] }
})

const listSql = `
  SELECT c.*,
         (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS student_count,
         (SELECT COUNT(*) FROM videos v WHERE v.course_id = c.id)      AS video_count
  FROM courses c`

/** Public listing shows published courses; staff can ask for every status. */
router.get('/', asyncHandler(async (req, res) => {
  const isStaff = req.user && ['admin', 'instructor'].includes(req.user.role)
  const status = req.query.status
  let where = "WHERE c.status = 'published'"
  const params = []

  if (isStaff) {
    if (status && status !== 'all') { where = 'WHERE c.status = ?'; params.push(status) }
    else where = ''
  }

  const rows = db.prepare(`${listSql} ${where} ORDER BY c.created_at DESC`).all(...params)
  res.json({ courses: rows.map(toCourse) })
}))

router.get('/:idOrSlug', asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params
  const row = db.prepare(`${listSql} WHERE c.id = ? OR c.slug = ?`).get(Number(idOrSlug) || 0, idOrSlug)
  if (!row) throw ApiError.notFound('Course not found')

  const isStaff = req.user && ['admin', 'instructor'].includes(req.user.role)
  if (row.status !== 'published' && !isStaff) throw ApiError.notFound('Course not found')

  const enrollment = req.user
    ? db.prepare('SELECT payment_verified FROM enrollments WHERE user_id = ? AND course_id = ?').get(req.user.id, row.id)
    : null
  const enrolled = Boolean(enrollment)

  // Locked lessons stay visible in the outline, but only unlocked ones can stream.
  const canSeeAll = isStaff || enrollment?.payment_verified === 1
  const videos = db.prepare(`
    SELECT v.*, ch.title AS chapter_title, ${req.user ? 'p.seconds AS progress_seconds, p.completed' : 'NULL AS progress_seconds, 0 AS completed'}
    FROM videos v
    LEFT JOIN course_chapters ch ON ch.id = v.chapter_id
    ${req.user ? 'LEFT JOIN video_progress p ON p.video_id = v.id AND p.user_id = ?' : ''}
    WHERE v.course_id = ? AND (? = 1 OR v.visibility != 'private')
    ORDER BY v.position ASC, v.created_at ASC`)
    .all(...(req.user ? [req.user.id] : []), row.id, isStaff ? 1 : 0)
    .map(v => ({ ...toVideo(v), locked: !(canSeeAll || v.visibility === 'public') }))

  const chapters = db.prepare(`SELECT ch.*, (SELECT COUNT(*) FROM videos v WHERE v.chapter_id = ch.id) AS video_count FROM course_chapters ch WHERE ch.course_id = ? ORDER BY ch.position, ch.id`).all(row.id).map(toChapter)
  res.json({ course: { ...toCourse(row), enrolled, paymentVerified: Boolean(enrollment?.payment_verified) }, chapters, videos })
}))

router.post('/', requireStaff, asyncHandler(async (req, res) => {
  const data = validate(req.body, courseSchema(true))
  const slug = uniqueSlug(slugify(data.title))

  const info = db.prepare(`
    INSERT INTO courses (title, slug, summary, description, syllabus, level, schedule, seats, price_cents, accent, status, created_by)
    VALUES (@title, @slug, @summary, @description, @syllabus, @level, @schedule, @seats, @price_cents, @accent, @status, @created_by)`)
    .run({
      title: data.title,
      slug,
      summary: data.summary ?? '',
    description: data.description ?? '',
    syllabus: data.syllabus ?? '',
      level: data.level ?? 'Beginner-friendly',
      schedule: data.schedule ?? '',
      seats: data.seats ?? 20,
      price_cents: data.priceCents ?? 0,
      accent: data.accent ?? '#b8ff3d',
      status: data.status ?? 'draft',
      created_by: req.user.id
    })

  res.status(201).json({ course: toCourse(db.prepare(`${listSql} WHERE c.id = ?`).get(info.lastInsertRowid)) })
}))

router.patch('/:id', requireStaff, asyncHandler(async (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id)
  if (!course) throw ApiError.notFound('Course not found')

  const data = validate(req.body, courseSchema(false))
  const columns = {
    title: 'title', summary: 'summary', description: 'description', level: 'level',
    schedule: 'schedule', seats: 'seats', priceCents: 'price_cents', accent: 'accent', status: 'status', syllabus: 'syllabus'
  }
  const sets = []
  const params = []
  for (const [key, column] of Object.entries(columns)) {
    if (data[key] !== undefined) { sets.push(`${column} = ?`); params.push(data[key]) }
  }
  if (data.title && data.title !== course.title) { sets.push('slug = ?'); params.push(uniqueSlug(slugify(data.title), course.id)) }
  if (!sets.length) throw ApiError.badRequest('Nothing to update')

  sets.push("updated_at = datetime('now')")
  db.prepare(`UPDATE courses SET ${sets.join(', ')} WHERE id = ?`).run(...params, course.id)
  res.json({ course: toCourse(db.prepare(`${listSql} WHERE c.id = ?`).get(course.id)) })
}))

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const info = db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id)
  if (!info.changes) throw ApiError.notFound('Course not found')
  res.json({ ok: true })
}))

router.post('/:id/enroll', requireAuth, asyncHandler(async (req, res) => {
  const course = db.prepare(`${listSql} WHERE c.id = ?`).get(req.params.id)
  if (!course) throw ApiError.notFound('Course not found')
  if (course.status !== 'published') throw ApiError.badRequest('This course is not open for enrollment yet')
  if (course.seats > 0 && course.student_count >= course.seats) throw ApiError.conflict('This cohort is full')

  db.prepare('INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)').run(req.user.id, course.id)
  res.status(201).json({ enrolled: true })
}))

router.delete('/:id/enroll', requireAuth, asyncHandler(async (req, res) => {
  db.prepare('DELETE FROM enrollments WHERE user_id = ? AND course_id = ?').run(req.user.id, req.params.id)
  res.json({ enrolled: false })
}))

router.get('/:id/students', requireStaff, asyncHandler(async (req, res) => {
  const students = db.prepare(`
    SELECT u.id, u.name, u.email, e.created_at, e.payment_verified
    FROM enrollments e JOIN users u ON u.id = e.user_id
    WHERE e.course_id = ? ORDER BY e.created_at DESC`).all(req.params.id)
  res.json({ students: students.map(s => ({ id: s.id, name: s.name, email: s.email, enrolledAt: s.created_at, paymentVerified: Boolean(s.payment_verified) })) })
}))

router.get('/:id/chapters', requireStaff, asyncHandler(async (req, res) => {
  const chapters = db.prepare(`SELECT ch.*, (SELECT COUNT(*) FROM videos v WHERE v.chapter_id = ch.id) AS video_count FROM course_chapters ch WHERE ch.course_id = ? ORDER BY ch.position, ch.id`).all(req.params.id).map(toChapter)
  res.json({ chapters })
}))

router.post('/:id/chapters', requireStaff, asyncHandler(async (req, res) => {
  if (!db.prepare('SELECT id FROM courses WHERE id = ?').get(req.params.id)) throw ApiError.notFound('Course not found')
  const data = validate(req.body, { title: { type: 'string', required: true, min: 1, max: 160 }, description: { type: 'string', max: 1000 }, position: { type: 'int', min: 0, max: 999 } })
  const info = db.prepare('INSERT INTO course_chapters (course_id, title, description, position) VALUES (?, ?, ?, ?)').run(req.params.id, data.title, data.description ?? '', data.position ?? 0)
  res.status(201).json({ chapter: toChapter(db.prepare('SELECT * FROM course_chapters WHERE id = ?').get(info.lastInsertRowid)) })
}))

router.patch('/:id/chapters/:chapterId', requireStaff, asyncHandler(async (req, res) => {
  const data = validate(req.body, { title: { type: 'string', min: 1, max: 160 }, description: { type: 'string', max: 1000 }, position: { type: 'int', min: 0, max: 999 } })
  const sets = [], params = []
  for (const [key, column] of Object.entries({ title: 'title', description: 'description', position: 'position' })) if (data[key] !== undefined) { sets.push(`${column} = ?`); params.push(data[key]) }
  if (!sets.length) throw ApiError.badRequest('Nothing to update')
  params.push(req.params.chapterId, req.params.id)
  const info = db.prepare(`UPDATE course_chapters SET ${sets.join(', ')} WHERE id = ? AND course_id = ?`).run(...params)
  if (!info.changes) throw ApiError.notFound('Chapter not found')
  res.json({ chapter: toChapter(db.prepare('SELECT * FROM course_chapters WHERE id = ?').get(req.params.chapterId)) })
}))

router.delete('/:id/chapters/:chapterId', requireStaff, asyncHandler(async (req, res) => {
  const info = db.prepare('DELETE FROM course_chapters WHERE id = ? AND course_id = ?').run(req.params.chapterId, req.params.id)
  if (!info.changes) throw ApiError.notFound('Chapter not found')
  res.json({ ok: true })
}))

router.post('/:id/students', requireAdmin, asyncHandler(async (req, res) => {
  const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(req.params.id)
  if (!course) throw ApiError.notFound('Course not found')
  const data = validate(req.body, { userId: { type: 'int', required: true, min: 1 } })
  const student = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'student'").get(data.userId)
  if (!student) throw ApiError.badRequest('Select a student account')
  db.prepare('INSERT OR IGNORE INTO enrollments (user_id, course_id, payment_verified) VALUES (?, ?, 1)').run(data.userId, course.id)
  res.status(201).json({ ok: true })
}))

router.patch('/:id/students/:userId', requireAdmin, asyncHandler(async (req, res) => {
  const data = validate(req.body, { paymentVerified: { type: 'boolean', required: true } })
  const info = db.prepare('UPDATE enrollments SET payment_verified = ? WHERE course_id = ? AND user_id = ?')
    .run(data.paymentVerified ? 1 : 0, req.params.id, req.params.userId)
  if (!info.changes) throw ApiError.notFound('Enrollment not found')
  res.json({ paymentVerified: data.paymentVerified })
}))

function uniqueSlug(base, ignoreId = 0) {
  const taken = db.prepare('SELECT slug FROM courses WHERE slug LIKE ? AND id != ?').all(`${base}%`, ignoreId).map(r => r.slug)
  if (!taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base}-${n}`)) n++
  return `${base}-${n}`
}

export default router
