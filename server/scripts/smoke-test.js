/**
 * End-to-end smoke test for the API. Start the server first (`npm run dev:api`)
 * then run `npm run smoke`. It creates throwaway records and deletes them again.
 */
const BASE = process.env.API_URL || 'http://localhost:4000'
const ADMIN = { email: process.env.ADMIN_EMAIL || 'admin@codingmindset.dev', password: process.env.ADMIN_PASSWORD || 'ChangeMe123!' }

let passed = 0
let failed = 0

function check(name, condition, extra = '') {
  if (condition) { passed++; console.log(`  ok   ${name}`) }
  else { failed++; console.log(`  FAIL ${name} ${extra}`) }
}

async function call(path, { token, method = 'GET', body, raw, headers = {} } = {}) {
  const init = { method, headers: { ...headers } }
  if (token) init.headers.Authorization = `Bearer ${token}`
  if (body instanceof FormData) init.body = body
  else if (body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body) }

  const res = await fetch(`${BASE}${path}`, init)
  if (raw) return res
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { raw: text } }
  return { status: res.status, body: json }
}

const run = async () => {
  const stamp = Date.now()
  const student = { name: 'Smoke Student', email: `smoke+${stamp}@example.com`, password: 'Password123!' }

  console.log(`\nSmoke test against ${BASE}\n`)

  console.log('health + auth')
  check('health responds', (await call('/api/health')).body.ok === true)

  const signup = await call('/api/auth/signup', { method: 'POST', body: student })
  check('signup returns a token', signup.status === 201 && !!signup.body.token, JSON.stringify(signup.body))
  const studentToken = signup.body.token

  check('duplicate signup is rejected', (await call('/api/auth/signup', { method: 'POST', body: student })).status === 409)
  check('short password is rejected', (await call('/api/auth/signup', { method: 'POST', body: { name: 'x y', email: `b${stamp}@e.com`, password: 'short' } })).status === 400)
  check('wrong password is rejected', (await call('/api/auth/login', { method: 'POST', body: { email: student.email, password: 'nope-nope-nope' } })).status === 401)
  check('/me works with a token', (await call('/api/auth/me', { token: studentToken })).body.user?.email === student.email)
  check('/me is closed to anonymous callers', (await call('/api/auth/me')).status === 401)

  const adminLogin = await call('/api/auth/login', { method: 'POST', body: ADMIN })
  check('admin can log in', adminLogin.status === 200, JSON.stringify(adminLogin.body))
  const adminToken = adminLogin.body.token
  if (!adminToken) { console.log('\nCannot continue without an admin session. Run `npm run seed` first.\n'); process.exit(1) }

  console.log('\nauthorization')
  check('students cannot list users', (await call('/api/users', { token: studentToken })).status === 403)
  check('students cannot create courses', (await call('/api/courses', { token: studentToken, method: 'POST', body: { title: 'Nope' } })).status === 403)
  check('admins can read stats', (await call('/api/admin/stats', { token: adminToken })).body.totals?.users >= 1)

  console.log('\ncourses')
  const created = await call('/api/courses', { token: adminToken, method: 'POST', body: { title: `Smoke Course ${stamp}`, summary: 'temp', seats: 5 } })
  check('admin creates a course', created.status === 201, JSON.stringify(created.body))
  const courseId = created.body.course?.id
  check('new courses start as drafts', created.body.course?.status === 'draft')
  check('draft courses are hidden from the public list', !(await call('/api/courses')).body.courses.some(c => c.id === courseId))

  await call(`/api/courses/${courseId}`, { token: adminToken, method: 'PATCH', body: { status: 'published' } })
  check('published courses appear publicly', (await call('/api/courses')).body.courses.some(c => c.id === courseId))

  console.log('\nvideo upload + streaming')
  const bytes = Buffer.alloc(64 * 1024, 7)
  const form = new FormData()
  form.append('video', new Blob([bytes], { type: 'video/mp4' }), 'lesson.mp4')
  form.append('title', 'Smoke lesson')
  form.append('courseId', String(courseId))
  form.append('visibility', 'enrolled')

  const upload = await call('/api/videos', { token: adminToken, method: 'POST', body: form })
  check('admin uploads a video', upload.status === 201, JSON.stringify(upload.body))
  const videoId = upload.body.video?.id
  check('upload records the file size', upload.body.video?.sizeBytes === bytes.length)

  const badForm = new FormData()
  badForm.append('video', new Blob([Buffer.from('not a video')], { type: 'application/pdf' }), 'x.pdf')
  badForm.append('title', 'Bad upload')
  check('non-video uploads are rejected', (await call('/api/videos', { token: adminToken, method: 'POST', body: badForm })).status === 400)

  check('anonymous streaming is blocked', (await call(`/api/videos/${videoId}/stream`, { raw: true })).status === 401)
  check('non-enrolled students are blocked', (await call(`/api/videos/${videoId}/stream`, { token: studentToken, raw: true })).status === 403)

  check('student enrolls', (await call(`/api/courses/${courseId}/enroll`, { token: studentToken, method: 'POST' })).status === 201)

  const full = await call(`/api/videos/${videoId}/stream`, { token: studentToken, raw: true })
  check('enrolled student streams the file', full.status === 200 && Number(full.headers.get('content-length')) === bytes.length)
  check('range support is advertised', full.headers.get('accept-ranges') === 'bytes')
  await full.arrayBuffer()

  const ranged = await call(`/api/videos/${videoId}/stream`, { token: studentToken, raw: true, headers: { Range: 'bytes=0-1023' } })
  check('partial content is served for a range request', ranged.status === 206 && Number(ranged.headers.get('content-length')) === 1024, `status=${ranged.status}`)
  check('content-range header is correct', ranged.headers.get('content-range') === `bytes 0-1023/${bytes.length}`)
  await ranged.arrayBuffer()

  const unsatisfiable = await call(`/api/videos/${videoId}/stream`, { token: studentToken, raw: true, headers: { Range: `bytes=${bytes.length + 10}-` } })
  check('out-of-range requests return 416', unsatisfiable.status === 416)
  await unsatisfiable.arrayBuffer()

  check('progress is saved', (await call(`/api/videos/${videoId}/progress`, { token: studentToken, method: 'POST', body: { seconds: 42 } })).status === 200)
  const detail = await call(`/api/courses/${courseId}`, { token: studentToken })
  check('course detail reports enrollment', detail.body.course?.enrolled === true)
  check('course detail returns saved progress', detail.body.videos?.[0]?.progressSeconds === 42)
  check('unlocked lesson is not marked locked', detail.body.videos?.[0]?.locked === false)

  console.log('\nprojects + mentorship')
  const project = await call('/api/projects', { token: adminToken, method: 'POST', body: { title: `Smoke Project ${stamp}`, tags: ['React', 'Node'], description: 'temp' } })
  check('admin creates a project', project.status === 201, JSON.stringify(project.body))
  check('tags round-trip as an array', Array.isArray(project.body.project?.tags) && project.body.project.tags.length === 2)

  const request = await call('/api/mentorship', { method: 'POST', body: { email: `mentee+${stamp}@example.com`, focus: 'Data & AI', message: 'hello' } })
  check('anyone can request mentorship', request.status === 201, JSON.stringify(request.body))
  check('mentorship inbox is staff-only', (await call('/api/mentorship', { token: studentToken })).status === 403)
  check('admin reads the mentorship inbox', (await call('/api/mentorship', { token: adminToken })).body.requests?.length >= 1)
  check('invalid email is rejected', (await call('/api/mentorship', { method: 'POST', body: { email: 'not-an-email' } })).status === 400)

  console.log('\nsafeguards')
  const me = await call('/api/auth/me', { token: adminToken })
  check('admin cannot demote themselves', (await call(`/api/users/${me.body.user.id}`, { token: adminToken, method: 'PATCH', body: { role: 'student' } })).status === 400)
  check('unknown routes return 404', (await call('/api/nope')).status === 404)

  console.log('\ncleanup')
  check('video deleted', (await call(`/api/videos/${videoId}`, { token: adminToken, method: 'DELETE' })).status === 200)
  check('project deleted', (await call(`/api/projects/${project.body.project.id}`, { token: adminToken, method: 'DELETE' })).status === 200)
  check('course deleted', (await call(`/api/courses/${courseId}`, { token: adminToken, method: 'DELETE' })).status === 200)
  check('mentorship request deleted', (await call(`/api/mentorship/${request.body.request.id}`, { token: adminToken, method: 'DELETE' })).status === 200)
  check('smoke user deleted', (await call(`/api/users/${signup.body.user.id}`, { token: adminToken, method: 'DELETE' })).status === 200)

  console.log(`\n${passed} passed, ${failed} failed\n`)
  process.exit(failed ? 1 : 0)
}

run().catch(err => {
  console.error('\nSmoke test crashed:', err)
  process.exit(1)
})
