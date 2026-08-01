import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const env = process.env.NODE_ENV || 'development'
const isProd = env === 'production'

if (isProd && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production. Copy .env.example to .env and set a long random value.')
}

const dataDir = path.resolve(rootDir, process.env.DATA_DIR || 'server/data')
const uploadDir = path.resolve(rootDir, process.env.UPLOAD_DIR || 'server/uploads')

export const config = {
  env,
  isProd,
  port: Number(process.env.PORT || 4000),
  rootDir,
  dataDir,
  uploadDir,
  videoDir: path.join(uploadDir, 'videos'),
  thumbDir: path.join(uploadDir, 'thumbnails'),
  dbFile: path.join(dataDir, 'codingmindset.db'),
  jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: 'cm_token',
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB || 512) * 1024 * 1024,
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4173').split(',').map(o => o.trim()).filter(Boolean),
  seedAdmin: {
    name: process.env.ADMIN_NAME || 'Site Admin',
    email: (process.env.ADMIN_EMAIL || 'admin@codingmindset.dev').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'ChangeMe123!'
  }
}

for (const dir of [config.dataDir, config.uploadDir, config.videoDir, config.thumbDir]) {
  fs.mkdirSync(dir, { recursive: true })
}

if (!config.isProd && !process.env.JWT_SECRET) {
  console.warn('[config] JWT_SECRET is not set — using an ephemeral secret. Sessions reset on every restart.')
}
