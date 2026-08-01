export const toCourse = row => row && {
  id: row.id,
  title: row.title,
  slug: row.slug,
  summary: row.summary,
  description: row.description,
  level: row.level,
  schedule: row.schedule,
  seats: row.seats,
  priceCents: row.price_cents,
  accent: row.accent,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ...(row.student_count !== undefined ? { studentCount: row.student_count } : {}),
  ...(row.video_count !== undefined ? { videoCount: row.video_count } : {})
}

export const toVideo = row => row && {
  id: row.id,
  title: row.title,
  description: row.description,
  courseId: row.course_id,
  courseTitle: row.course_title ?? null,
  originalName: row.original_name,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes,
  duration: row.duration,
  hasThumbnail: Boolean(row.thumbnail),
  visibility: row.visibility,
  position: row.position,
  createdAt: row.created_at,
  ...(row.progress_seconds !== undefined ? { progressSeconds: row.progress_seconds || 0, completed: Boolean(row.completed) } : {})
}

export const toProject = row => row && {
  id: row.id,
  title: row.title,
  type: row.type,
  description: row.description,
  tags: safeJson(row.tags),
  color: row.color,
  demoUrl: row.demo_url,
  reportUrl: row.report_url,
  status: row.status,
  createdAt: row.created_at
}

export const toRequest = row => row && {
  id: row.id,
  userId: row.user_id,
  userName: row.user_name ?? null,
  email: row.email,
  focus: row.focus,
  message: row.message,
  status: row.status,
  createdAt: row.created_at
}

function safeJson(value) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
