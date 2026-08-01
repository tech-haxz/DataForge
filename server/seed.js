import bcrypt from 'bcryptjs'
import { config } from './config.js'
import { db } from './db.js'
import { slugify } from './lib/validate.js'

const courses = [
  {
    title: 'Build with React',
    summary: 'Ship a real React product in eight weeks, with code reviews that teach you to think.',
    description: 'Components, state, routing, data fetching and deployment — every module is anchored to a project you actually ship.',
    level: 'Beginner → Intermediate',
    schedule: 'FEB 03 — MAR 28 · 2x weekly',
    seats: 12,
    accent: '#b8ff3d',
    status: 'published'
  },
  {
    title: 'Python for the real world',
    summary: 'Automate the boring parts, then build an API worth putting on your résumé.',
    description: 'Fundamentals without the fluff, then scripting, data wrangling and a FastAPI service you deploy yourself.',
    level: 'Beginner-friendly',
    schedule: 'MAR 10 — APR 18 · 2x weekly',
    seats: 8,
    accent: '#9dd8ff',
    status: 'published'
  },
  {
    title: 'Portfolio & storytelling lab',
    summary: 'Turn finished work into a portfolio that gets replies.',
    description: 'Case-study writing, screenshots that sell, and a personal site you can maintain in ten minutes a week.',
    level: 'All levels',
    schedule: 'Rolling · self-paced',
    seats: 25,
    accent: '#f5b1d5',
    status: 'draft'
  }
]

const projects = [
  { title: 'CampusCart', type: 'FULL-STACK / E-COMMERCE', description: 'A marketplace for students to buy, sell and discover useful campus essentials.', tags: ['React', 'Node.js', 'PostgreSQL'], color: '#b8ff3d' },
  { title: 'Pulseboard', type: 'DATA / VISUALIZATION', description: 'Real-time data dashboard that turns messy metrics into confident decisions.', tags: ['Next.js', 'D3.js', 'Supabase'], color: '#9dd8ff' },
  { title: 'Nourish', type: 'MOBILE / HEALTH', description: 'A mindful nutrition companion designed around small, sustainable habits.', tags: ['React Native', 'Firebase', 'Figma'], color: '#f5b1d5' },
  { title: 'Routewise', type: 'AI / LOGISTICS', description: 'Smarter campus routes using constraint-aware optimization and delightful maps.', tags: ['Python', 'FastAPI', 'Maps API'], color: '#ffd27a' }
]

function seedAdmin() {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(config.seedAdmin.email)
  if (existing) {
    console.log(`[seed] admin already exists: ${config.seedAdmin.email}`)
    return existing.id
  }
  const hash = bcrypt.hashSync(config.seedAdmin.password, 10)
  const info = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(config.seedAdmin.name, config.seedAdmin.email, hash, 'admin')
  console.log(`[seed] admin created: ${config.seedAdmin.email} / ${config.seedAdmin.password}`)
  return info.lastInsertRowid
}

function seedDemoStudent() {
  const email = 'student@codingmindset.dev'
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) return
  db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run('Demo Student', email, bcrypt.hashSync('Student123!', 10), 'student')
  console.log(`[seed] demo student created: ${email} / Student123!`)
}

function seedCourses(adminId) {
  const insert = db.prepare(`
    INSERT INTO courses (title, slug, summary, description, level, schedule, seats, accent, status, created_by)
    VALUES (@title, @slug, @summary, @description, @level, @schedule, @seats, @accent, @status, @created_by)`)

  for (const course of courses) {
    const slug = slugify(course.title)
    if (db.prepare('SELECT id FROM courses WHERE slug = ?').get(slug)) continue
    insert.run({ ...course, slug, created_by: adminId })
    console.log(`[seed] course created: ${course.title}`)
  }
}

function seedProjects() {
  const insert = db.prepare('INSERT INTO projects (title, type, description, tags, color) VALUES (?, ?, ?, ?, ?)')
  for (const project of projects) {
    if (db.prepare('SELECT id FROM projects WHERE title = ?').get(project.title)) continue
    insert.run(project.title, project.type, project.description, JSON.stringify(project.tags), project.color)
    console.log(`[seed] project created: ${project.title}`)
  }
}

const adminId = seedAdmin()
seedDemoStudent()
seedCourses(adminId)
seedProjects()
console.log('[seed] done')
