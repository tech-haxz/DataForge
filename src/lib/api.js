const TOKEN_KEY = 'codingmindset-token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = token => token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details || {}
  }
}

/** Fetch wrapper that adds the bearer token, sends cookies and unwraps API errors. */
export async function api(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const token = getToken()
  const init = { method, credentials: 'include', headers: { ...headers }, signal }
  if (token) init.headers.Authorization = `Bearer ${token}`
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(`/api${path}`, init)
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the API running?')
  }

  const text = await res.text()
  let data = {}
  try { data = text ? JSON.parse(text) : {} } catch { data = { error: text } }

  if (!res.ok) throw new ApiError(res.status, data.error || `Request failed (${res.status})`, data.details)
  return data
}

/** XHR-based upload so the admin panel can show real progress for large video files. */
export function uploadVideo(formData, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/videos')
    xhr.withCredentials = true

    const token = getToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.addEventListener('progress', event => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100))
    })

    xhr.addEventListener('load', () => {
      let data = {}
      try { data = JSON.parse(xhr.responseText || '{}') } catch { data = {} }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data)
      else reject(new ApiError(xhr.status, data.error || `Upload failed (${xhr.status})`, data.details))
    })
    xhr.addEventListener('error', () => reject(new ApiError(0, 'Upload failed — the connection dropped')))
    xhr.addEventListener('abort', () => reject(new ApiError(0, 'Upload cancelled')))

    xhr.send(formData)
    if (onProgress) onProgress(0)
  })
}

export async function uploadProjectThumbnail(projectId, file) {
  const formData = new FormData()
  formData.append('thumbnail', file)
  const token = getToken()
  const res = await fetch(`/api/projects/${projectId}/thumbnail`, {
    method: 'POST',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  })
  const text = await res.text()
  let data = {}
  try { data = text ? JSON.parse(text) : {} } catch { data = { error: text } }
  if (!res.ok) throw new ApiError(res.status, data.error || `Upload failed (${res.status})`, data.details)
  return data
}

export const formatBytes = bytes => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export const formatDate = value => value
  ? new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  : '—'

export const formatDuration = seconds => {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
