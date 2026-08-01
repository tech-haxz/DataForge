import { Router } from 'express'
import { db } from '../db.js'
import { asyncHandler } from '../lib/errors.js'
import { toVideo } from '../lib/serialize.js'
import { requireStaff } from '../middleware/auth.js'

const router = Router()
router.use(requireStaff)

const count = sql => db.prepare(sql).get().n

router.get('/stats', asyncHandler(async (req, res) => {
  const storage = db.prepare('SELECT COALESCE(SUM(size_bytes), 0) AS bytes FROM videos').get().bytes

  res.json({
    totals: {
      users: count('SELECT COUNT(*) AS n FROM users'),
      students: count("SELECT COUNT(*) AS n FROM users WHERE role = 'student'"),
      courses: count('SELECT COUNT(*) AS n FROM courses'),
      publishedCourses: count("SELECT COUNT(*) AS n FROM courses WHERE status = 'published'"),
      videos: count('SELECT COUNT(*) AS n FROM videos'),
      enrollments: count('SELECT COUNT(*) AS n FROM enrollments'),
      projects: count('SELECT COUNT(*) AS n FROM projects'),
      openRequests: count("SELECT COUNT(*) AS n FROM mentorship_requests WHERE status = 'new'"),
      storageBytes: storage
    },
    signupsLast14Days: db.prepare(`
      SELECT date(created_at) AS day, COUNT(*) AS n
      FROM users WHERE created_at >= datetime('now', '-14 days')
      GROUP BY day ORDER BY day`).all(),
    topCourses: db.prepare(`
      SELECT c.id, c.title, c.status, COUNT(e.id) AS students
      FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id
      GROUP BY c.id ORDER BY students DESC, c.created_at DESC LIMIT 5`).all(),
    recentUsers: db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5')
      .all()
      .map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.created_at })),
    recentVideos: db.prepare(`
      SELECT v.*, c.title AS course_title FROM videos v LEFT JOIN courses c ON c.id = v.course_id
      ORDER BY v.created_at DESC LIMIT 5`).all().map(toVideo)
  })
}))

export default router
