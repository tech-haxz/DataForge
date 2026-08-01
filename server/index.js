import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { config } from './config.js'
import { attachUser } from './middleware/auth.js'
import { errorHandler, notFoundHandler } from './lib/errors.js'
import authRoutes from './routes/auth.js'
import meRoutes from './routes/me.js'
import userRoutes from './routes/users.js'
import courseRoutes from './routes/courses.js'
import videoRoutes from './routes/videos.js'
import projectRoutes from './routes/projects.js'
import mentorshipRoutes from './routes/mentorship.js'
import adminRoutes from './routes/admin.js'

const app = express()
app.set('trust proxy', 1)

// crossOriginResourcePolicy is relaxed so the SPA on :5173 can pull thumbnails in dev.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: config.corsOrigins, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(attachUser)

app.get('/api/health', (req, res) => res.json({ ok: true, env: config.env, time: new Date().toISOString() }))
app.use('/api/auth', authRoutes)
app.use('/api/me', meRoutes)
app.use('/api/users', userRoutes)
app.use('/api/courses', courseRoutes)
app.use('/api/videos', videoRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/mentorship', mentorshipRoutes)
app.use('/api/admin', adminRoutes)

// In production the API also serves the built SPA, so everything is one origin.
const distDir = path.join(config.rootDir, 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

app.use('/api', notFoundHandler)
app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`[server] API ready on http://localhost:${config.port} (${config.env})`)
  if (!fs.existsSync(distDir)) console.log('[server] No dist/ build found — run the Vite dev server for the UI.')
})
