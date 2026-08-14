import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import { config } from '../config.js'
import { db } from '../db.js'
import { ApiError, asyncHandler } from '../lib/errors.js'
import { validate } from '../lib/validate.js'
import { toVideo } from '../lib/serialize.js'
import { requireAuth, requireStaff } from '../middleware/auth.js'
import { uploadVideo } from '../middleware/upload.js'

const router = Router()

const withCourse = `
  SELECT v.*, c.title AS course_title
  FROM videos v LEFT JOIN courses c ON c.id = v.course_id`

const getVideo = id => db.prepare(`${withCourse} WHERE v.id = ?`).get(id)

/** Public sees public videos; staff sees the whole library. */
router.get('/', asyncHandler(async (req, res) => {
  const isStaff = req.user && ['admin', 'instructor'].includes(req.user.role)
  const filters = []
  const params = []

  if (!isStaff) filters.push("v.visibility = 'public'")
  if (req.query.courseId) { filters.push('v.course_id = ?'); params.push(Number(req.query.courseId)) }
  if (req.query.search) { filters.push('v.title LIKE ?'); params.push(`%${req.query.search}%`) }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const rows = db.prepare(`${withCourse} ${where} ORDER BY v.created_at DESC LIMIT 200`).all(...params)
  res.json({ videos: rows.map(toVideo) })
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const row = getVideo(req.params.id)
  if (!row) throw ApiError.notFound('Video not found')
  const access = canWatch(req.user, row)
  const progress = req.user
    ? db.prepare('SELECT seconds, completed FROM video_progress WHERE user_id = ? AND video_id = ?').get(req.user.id, row.id)
    : null

  res.json({
    video: { ...toVideo(row), progressSeconds: progress?.seconds || 0, completed: Boolean(progress?.completed) },
    canWatch: access.ok,
    reason: access.reason
  })
}))

router.post('/', requireStaff, uploadVideo, asyncHandler(async (req, res) => {
  const file = req.files?.video?.[0]
  const thumb = req.files?.thumbnail?.[0]
  if (!file) throw ApiError.badRequest('Select a video file to upload')

  try {
    const data = validate(req.body, {
      title: { type: 'string', required: true, min: 2, max: 140 },
      description: { type: 'string', max: 2000 },
      courseId: { type: 'int', min: 1 },
      visibility: { type: 'enum', values: ['public', 'enrolled', 'private'] },
      position: { type: 'int', min: 0, max: 999 },
      duration: { type: 'int', min: 0, max: 60 * 60 * 24 }
    })

    if (data.courseId && !db.prepare('SELECT 1 FROM courses WHERE id = ?').get(data.courseId)) {
      throw ApiError.badRequest('That course does not exist')
    }

    const info = db.prepare(`
      INSERT INTO videos (title, description, course_id, filename, original_name, mime_type, size_bytes, duration, thumbnail, visibility, position, uploaded_by)
      VALUES (@title, @description, @course_id, @filename, @original_name, @mime_type, @size_bytes, @duration, @thumbnail, @visibility, @position, @uploaded_by)`)
      .run({
        title: data.title,
        description: data.description ?? '',
        course_id: data.courseId ?? null,
        filename: file.filename,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size_bytes: file.size,
        duration: data.duration ?? 0,
        thumbnail: thumb?.filename ?? null,
        visibility: data.visibility ?? 'enrolled',
        position: data.position ?? nextPosition(data.courseId),
        uploaded_by: req.user.id
      })

    res.status(201).json({ video: toVideo(getVideo(info.lastInsertRowid)) })
  } catch (err) {
    // Never leave orphaned bytes on disk when the metadata is rejected.
    removeFile(config.videoDir, file.filename)
    if (thumb) removeFile(config.thumbDir, thumb.filename)
    throw err
  }
}))

router.patch('/:id', requireStaff, asyncHandler(async (req, res) => {
  const row = getVideo(req.params.id)
  if (!row) throw ApiError.notFound('Video not found')

  const data = validate(req.body, {
    title: { type: 'string', min: 2, max: 140 },
    description: { type: 'string', max: 2000 },
    courseId: { type: 'int', min: 0 },
    visibility: { type: 'enum', values: ['public', 'enrolled', 'private'] },
    position: { type: 'int', min: 0, max: 999 }
  })

  const columns = { title: 'title', description: 'description', courseId: 'course_id', visibility: 'visibility', position: 'position' }
  const sets = []
  const params = []
  for (const [key, column] of Object.entries(columns)) {
    if (data[key] === undefined) continue
    sets.push(`${column} = ?`)
    params.push(key === 'courseId' && !data[key] ? null : data[key])
  }
  if (!sets.length) throw ApiError.badRequest('Nothing to update')

  db.prepare(`UPDATE videos SET ${sets.join(', ')} WHERE id = ?`).run(...params, row.id)
  res.json({ video: toVideo(getVideo(row.id)) })
}))

router.delete('/:id', requireStaff, asyncHandler(async (req, res) => {
  const row = getVideo(req.params.id)
  if (!row) throw ApiError.notFound('Video not found')

  db.prepare('DELETE FROM videos WHERE id = ?').run(row.id)
  removeFile(config.videoDir, row.filename)
  if (row.thumbnail) removeFile(config.thumbDir, row.thumbnail)
  res.json({ ok: true })
}))

/** Byte-range streaming so the browser player can seek without downloading everything. */
router.get('/:id/stream', asyncHandler(async (req, res) => {
  const row = getVideo(req.params.id)
  if (!row) throw ApiError.notFound('Video not found')

  const access = canWatch(req.user, row)
  if (!access.ok) throw access.status === 401 ? ApiError.unauthorized(access.reason) : ApiError.forbidden(access.reason)

  const filePath = safeJoin(config.videoDir, row.filename)
  if (!fs.existsSync(filePath)) throw ApiError.notFound('The video file is missing from storage')

  const total = fs.statSync(filePath).size
  const range = req.headers.range

  res.setHeader('Content-Type', row.mime_type)
  res.setHeader('Accept-Ranges', 'bytes')
  res.setHeader('Cache-Control', 'private, max-age=0, no-store')

  if (!range) {
    res.setHeader('Content-Length', total)
    return fs.createReadStream(filePath).pipe(res)
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range)
  const start = match && match[1] ? Number(match[1]) : 0
  const end = match && match[2] ? Math.min(Number(match[2]), total - 1) : total - 1

  if (!match || Number.isNaN(start) || Number.isNaN(end) || start >= total || start > end) {
    res.setHeader('Content-Range', `bytes */${total}`)
    return res.status(416).end()
  }

  res.status(206)
  res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`)
  res.setHeader('Content-Length', end - start + 1)
  fs.createReadStream(filePath, { start, end }).pipe(res)
}))

router.get('/:id/thumbnail', asyncHandler(async (req, res) => {
  const row = getVideo(req.params.id)
  if (!row?.thumbnail) throw ApiError.notFound('No thumbnail for this video')
  res.sendFile(safeJoin(config.thumbDir, row.thumbnail))
}))

router.post('/:id/progress', requireAuth, asyncHandler(async (req, res) => {
  const row = getVideo(req.params.id)
  if (!row) throw ApiError.notFound('Video not found')

  const data = validate(req.body, {
    seconds: { type: 'int', required: true, min: 0 },
    completed: { type: 'boolean', default: false }
  })

  db.prepare(`
    INSERT INTO video_progress (user_id, video_id, seconds, completed, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, video_id) DO UPDATE SET
      seconds = excluded.seconds, completed = excluded.completed, updated_at = excluded.updated_at`)
    .run(req.user.id, row.id, data.seconds, data.completed ? 1 : 0)

  res.json({ ok: true })
}))

function canWatch(user, video) {
  if (video.visibility === 'public') return { ok: true }
  if (!user) return { ok: false, status: 401, reason: 'Sign in to watch this lesson' }
  if (['admin', 'instructor'].includes(user.role)) return { ok: true }
  if (video.visibility === 'private') return { ok: false, status: 403, reason: 'This lesson is not published yet' }
  if (!video.course_id) return { ok: false, status: 403, reason: 'This lesson is not part of a course you can access' }

  const enrollment = db.prepare('SELECT payment_verified FROM enrollments WHERE user_id = ? AND course_id = ?').get(user.id, video.course_id)
  if (!enrollment) return { ok: false, status: 403, reason: 'Enroll in this course to watch the lesson' }
  return enrollment.payment_verified
    ? { ok: true }
    : { ok: false, status: 403, reason: 'Recording access is pending payment verification by an admin' }
}

function nextPosition(courseId) {
  if (!courseId) return 0
  const row = db.prepare('SELECT MAX(position) AS max FROM videos WHERE course_id = ?').get(courseId)
  return (row?.max ?? -1) + 1
}

/** Blocks path traversal in stored filenames before touching the filesystem. */
function safeJoin(dir, filename) {
  const resolved = path.resolve(dir, path.basename(String(filename)))
  if (!resolved.startsWith(path.resolve(dir) + path.sep)) throw ApiError.badRequest('Invalid file reference')
  return resolved
}

function removeFile(dir, filename) {
  if (!filename) return
  try { fs.unlinkSync(safeJoin(dir, filename)) } catch { /* already gone */ }
}

export default router
