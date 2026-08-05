import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import { config } from '../config.js'
import { db } from '../db.js'
import { ApiError, asyncHandler } from '../lib/errors.js'
import { validate } from '../lib/validate.js'
import { toProject } from '../lib/serialize.js'
import { requireStaff } from '../middleware/auth.js'
import { uploadThumbnail } from '../middleware/upload.js'

const router = Router()

const schema = (required = false) => ({
  title: { type: 'string', required, min: 2, max: 120 },
  type: { type: 'string', max: 60 },
  description: { type: 'string', max: 1000 },
  tags: { type: 'array', max: 10 },
  color: { type: 'string', max: 24 },
  demoUrl: { type: 'string', max: 300 },
  reportUrl: { type: 'string', max: 300 },
  status: { type: 'enum', values: ['draft', 'published'] }
})

router.get('/', asyncHandler(async (req, res) => {
  const isStaff = req.user && ['admin', 'instructor'].includes(req.user.role)
  const rows = db.prepare(`SELECT * FROM projects ${isStaff ? '' : "WHERE status = 'published'"} ORDER BY created_at DESC`).all()
  res.json({ projects: rows.map(toProject) })
}))

router.post('/', requireStaff, asyncHandler(async (req, res) => {
  const data = validate(req.body, schema(true))
  const info = db.prepare(`
    INSERT INTO projects (title, type, description, tags, color, demo_url, report_url, status)
    VALUES (@title, @type, @description, @tags, @color, @demo_url, @report_url, @status)`)
    .run({
      title: data.title,
      type: data.type ?? 'FULL-STACK',
      description: data.description ?? '',
      tags: JSON.stringify(data.tags ?? []),
      color: data.color ?? '#b8ff3d',
      demo_url: data.demoUrl ?? '',
      report_url: data.reportUrl ?? '',
      status: data.status ?? 'published'
    })
  res.status(201).json({ project: toProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid)) })
}))

router.get('/:id/thumbnail', asyncHandler(async (req, res) => {
  const project = db.prepare('SELECT thumbnail FROM projects WHERE id = ?').get(req.params.id)
  if (!project?.thumbnail) throw ApiError.notFound('Project thumbnail not found')
  const thumbnailDir = path.resolve(config.thumbDir)
  const filePath = path.resolve(thumbnailDir, project.thumbnail)
  if (!filePath.startsWith(`${thumbnailDir}${path.sep}`) || !fs.existsSync(filePath)) {
    throw ApiError.notFound('Project thumbnail is missing from storage')
  }
  res.sendFile(filePath)
}))

router.post('/:id/thumbnail', requireStaff, uploadThumbnail, asyncHandler(async (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
  if (!project) throw ApiError.notFound('Project not found')
  if (!req.file) throw ApiError.badRequest('Select an image to upload')

  db.prepare('UPDATE projects SET thumbnail = ? WHERE id = ?').run(req.file.filename, project.id)
  if (project.thumbnail) {
    const thumbnailDir = path.resolve(config.thumbDir)
    const previous = path.resolve(thumbnailDir, project.thumbnail)
    if (previous.startsWith(`${thumbnailDir}${path.sep}`)) fs.rmSync(previous, { force: true })
  }
  res.json({ project: toProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id)) })
}))

router.patch('/:id', requireStaff, asyncHandler(async (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
  if (!project) throw ApiError.notFound('Project not found')

  const data = validate(req.body, schema(false))
  const columns = {
    title: 'title', type: 'type', description: 'description', color: 'color',
    demoUrl: 'demo_url', reportUrl: 'report_url', status: 'status'
  }
  const sets = []
  const params = []
  for (const [key, column] of Object.entries(columns)) {
    if (data[key] !== undefined) { sets.push(`${column} = ?`); params.push(data[key]) }
  }
  if (data.tags !== undefined) { sets.push('tags = ?'); params.push(JSON.stringify(data.tags)) }
  if (!sets.length) throw ApiError.badRequest('Nothing to update')

  db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...params, project.id)
  res.json({ project: toProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(project.id)) })
}))

router.delete('/:id', requireStaff, asyncHandler(async (req, res) => {
  const project = db.prepare('SELECT thumbnail FROM projects WHERE id = ?').get(req.params.id)
  const info = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id)
  if (!info.changes) throw ApiError.notFound('Project not found')
  if (project?.thumbnail) {
    const thumbnailDir = path.resolve(config.thumbDir)
    const filePath = path.resolve(thumbnailDir, project.thumbnail)
    if (filePath.startsWith(`${thumbnailDir}${path.sep}`)) fs.rmSync(filePath, { force: true })
  }
  res.json({ ok: true })
}))

export default router
