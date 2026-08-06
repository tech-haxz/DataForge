# DataForge

A full-stack learning platform: a React front end for the public site plus a Node/Express API with
accounts, cohort enrollment, video upload and streaming, and an admin control room.

```
├── index.html, vite.config.js      Vite SPA entry
├── src/                            React app (public site, dashboard, admin panel)
│   ├── lib/api.js                  fetch/XHR client + formatters
│   ├── context/AuthContext.jsx     session state
│   ├── components/                 shared UI (ui.jsx, ProtectedRoute, existing visuals)
│   └── pages/                      public pages, auth, dashboard, watch, admin/*
└── server/                         Express API
    ├── index.js                    app bootstrap, also serves dist/ in production
    ├── config.js                   env config + directory bootstrap
    ├── db.js                       SQLite schema (better-sqlite3)
    ├── seed.js                     first admin, demo student, demo content
    ├── middleware/                 auth (JWT), upload (multer)
    ├── lib/                        errors, validation, serializers
    ├── routes/                     auth, me, users, courses, videos, projects, mentorship, admin
    └── scripts/smoke-test.js       end-to-end API test
```

## Quick start

```bash
npm install
cp .env.example .env          # set JWT_SECRET (required in production)
npm run seed                  # creates the first admin + demo content
npm run dev                   # API on :4000, Vite on :5173
```

Open http://localhost:5173. Vite proxies `/api` to the API, so the browser stays on one origin and
the auth cookie works.

Seeded accounts (change them before deploying):

| Role    | Email                       | Password       |
| ------- | --------------------------- | -------------- |
| Admin   | `admin@codingmindset.dev`   | `ChangeMe123!` |
| Student | `student@codingmindset.dev` | `Student123!`  |

### Production

```bash
npm run build     # emits dist/
npm start         # Express serves the API *and* dist/ on :4000
```

### Tests

```bash
npm run dev:api   # in one terminal
npm run smoke     # 43 end-to-end API checks: auth, roles, upload, range streaming, cleanup
```

## What's included

**Accounts.** Email/password signup and login, bcrypt hashes, JWT (sent both as a bearer token and
an httpOnly cookie so `<video>` requests authenticate too), profile editing, password change, and
three roles — `student`, `instructor`, `admin`. Auth endpoints are rate limited.

**Courses.** Draft/published/archived states, seats, price, schedule, accent colour, slugs, and
one-click enrollment with a seat-limit check. Drafts are invisible to non-staff.

**Video.** Admin upload with drag-and-drop, a real progress bar, optional thumbnail, and
client-side duration detection. Files land outside the web root and are served only through
`GET /api/videos/:id/stream`, which honours HTTP range requests so students can seek. Access is
checked per request: `public` (anyone), `enrolled` (enrolled students + staff), `private` (staff
only). Playback position is saved and resumed.

**Admin panel** (`/admin`, staff only). Stats overview with a signup chart, course CRUD with an
enrolled-student list, the video library, member management with role/suspend/delete (admins only),
the project showcase, and the mentorship inbox with status tracking.

**Student dashboard** (`/dashboard`). Enrolled courses with per-course progress, a
continue-watching row, and profile settings.

## API

All routes live under `/api`. Send `Authorization: Bearer <token>` or rely on the `cm_token` cookie.

| Method                  | Route                           | Access | Purpose                                  |
| ----------------------- | ------------------------------- | ------ | ---------------------------------------- |
| `GET`                   | `/health`                       | public | Liveness probe                           |
| `POST`                  | `/auth/signup`                  | public | Create a student account                 |
| `POST`                  | `/auth/login`                   | public | Sign in                                  |
| `POST`                  | `/auth/logout`                  | public | Clear the auth cookie                    |
| `GET` `PATCH`           | `/auth/me`                      | auth   | Read / update your profile               |
| `GET`                   | `/me/courses`                   | auth   | Your enrollments with progress           |
| `GET`                   | `/me/continue`                  | auth   | Lessons you started but did not finish   |
| `GET`                   | `/courses`                      | public | Published courses (`?status=` for staff) |
| `GET`                   | `/courses/:idOrSlug`            | public | Course + lesson outline                  |
| `POST` `PATCH`          | `/courses` `/courses/:id`       | staff  | Create / update a course                 |
| `DELETE`                | `/courses/:id`                  | admin  | Delete a course                          |
| `POST` `DELETE`         | `/courses/:id/enroll`           | auth   | Join / leave a cohort                    |
| `GET`                   | `/courses/:id/students`         | staff  | Roster                                   |
| `GET`                   | `/videos`                       | public | Public videos (staff see everything)     |
| `GET`                   | `/videos/:id`                   | public | Metadata + whether you may watch         |
| `POST`                  | `/videos`                       | staff  | Upload (multipart: `video`, `thumbnail`) |
| `PATCH` `DELETE`        | `/videos/:id`                   | staff  | Edit / delete (also removes the file)    |
| `GET`                   | `/videos/:id/stream`            | varies | Range-enabled stream                     |
| `GET`                   | `/videos/:id/thumbnail`         | public | Poster image                             |
| `POST`                  | `/videos/:id/progress`          | auth   | Save playback position                   |
| `GET`                   | `/projects`                     | public | Published showcase                       |
| `POST` `PATCH` `DELETE` | `/projects` `/projects/:id`     | staff  | Manage the showcase                      |
| `POST`                  | `/mentorship`                   | public | Submit a request (rate limited)          |
| `GET` `PATCH` `DELETE`  | `/mentorship` `/mentorship/:id` | staff  | Inbox management                         |
| `GET` `POST`            | `/users`                        | admin  | List / create members                    |
| `PATCH` `DELETE`        | `/users/:id`                    | admin  | Update role, suspend, delete             |
| `GET`                   | `/admin/stats`                  | staff  | Dashboard metrics                        |

Errors come back as `{ "error": "message", "details": { "field": "why" } }`, and the front end maps
`details` onto the matching form fields.

## Configuration

See `.env.example`. Notable values:

- `JWT_SECRET` — **required in production**; the server refuses to boot without it. In development
  an ephemeral secret is generated, so sessions reset when you restart.
- `DATA_DIR` / `UPLOAD_DIR` — where the SQLite file and uploaded media live (both gitignored).
  Point these at a persistent volume when deploying.
- `MAX_UPLOAD_MB` — per-file upload ceiling, default 512.
- `CORS_ORIGIN` — comma-separated origins allowed to call the API with credentials. Only needed
  when the front end is served from a different origin than the API.

## Notes and trade-offs

- **SQLite** keeps setup to zero external services. The schema is plain SQL in `server/db.js`;
  moving to Postgres means swapping the driver and the few SQLite-specific bits (`datetime('now')`,
  `INTEGER PRIMARY KEY AUTOINCREMENT`).
- **Local disk storage** for video. For a multi-instance deploy, move the files to object storage
  and keep the same access checks in front of signed URLs.
- **No transcoding.** Uploads are stored as-is, so the browser must be able to play the source
  format. Add an ffmpeg step if you need consistent MP4/HLS output.
- **No email delivery.** Mentorship requests land in the admin inbox; wire an SMTP provider into
  `server/routes/mentorship.js` to notify staff automatically.
