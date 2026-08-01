import { Router } from 'express'
import { db } from '../db.js'
import { asyncHandler } from '../lib/errors.js'
import { toCourse, toVideo } from '../lib/serialize.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

/** Everything the student dashboard needs in one round trip. */
router.get('/courses', asyncHandler(async (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, e.created_at AS enrolled_at,
           (SELECT COUNT(*) FROM videos v WHERE v.course_id = c.id) AS video_count,
           (SELECT COUNT(*) FROM enrollments e2 WHERE e2.course_id = c.id) AS student_count,
           (SELECT COUNT(*) FROM video_progress p JOIN videos v2 ON v2.id = p.video_id
             WHERE v2.course_id = c.id AND p.user_id = ? AND p.completed = 1) AS completed_count
    FROM enrollments e JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = ? ORDER BY e.created_at DESC`).all(req.user.id, req.user.id)

  res.json({
    courses: rows.map(row => ({
      ...toCourse(row),
      enrolledAt: row.enrolled_at,
      completedCount: row.completed_count,
      progressPercent: row.video_count ? Math.round((row.completed_count / row.video_count) * 100) : 0
    }))
  })
}))

/** Lessons the student has started but not finished, newest first. */
router.get('/continue', asyncHandler(async (req, res) => {
  const rows = db.prepare(`
    SELECT v.*, c.title AS course_title, p.seconds AS progress_seconds, p.completed
    FROM video_progress p
    JOIN videos v ON v.id = p.video_id
    LEFT JOIN courses c ON c.id = v.course_id
    WHERE p.user_id = ? AND p.completed = 0 AND p.seconds > 0
    ORDER BY p.updated_at DESC LIMIT 4`).all(req.user.id)
  res.json({ videos: rows.map(toVideo) })
}))

export default router
