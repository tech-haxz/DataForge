import crypto from 'node:crypto'
import path from 'node:path'
import multer from 'multer'
import { config } from '../config.js'
import { ApiError } from '../lib/errors.js'

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska']
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

const randomName = original => `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(original).toLowerCase().slice(0, 10)}`

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, file.fieldname === 'thumbnail' ? config.thumbDir : config.videoDir),
  filename: (req, file, cb) => cb(null, randomName(file.originalname))
})

function fileFilter(req, file, cb) {
  const allowed = file.fieldname === 'thumbnail' ? IMAGE_TYPES : VIDEO_TYPES
  if (!allowed.includes(file.mimetype)) {
    return cb(ApiError.badRequest(`Unsupported ${file.fieldname} format: ${file.mimetype}. Allowed: ${allowed.join(', ')}`))
  }
  cb(null, true)
}

export const uploadThumbnail = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.maxUploadBytes, files: 1 }
}).single('thumbnail')

export const uploadVideo = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.maxUploadBytes, files: 2 }
}).fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
])
