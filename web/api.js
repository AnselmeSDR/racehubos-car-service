const BASE = `${import.meta.env.VITE_API_URL || ''}/api/addons/car-service`

/** Sent by the server when the status of cars may have changed: `{ carIds }`. */
export const UPDATED_EVENT = 'car-service:updated'

async function call(path, init) {
  const res = await fetch(BASE + path, init)
  // No JSON when the backend is down or restarting: the proxy answers 502 without a body
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.success) throw new Error(body.error || `HTTP ${res.status}`)
  return body.data
}

const send = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
})

export const getStatuses = () => call('/cars')
export const getStatus = (carId) => call(`/cars/${carId}`)
export const getHistory = (carId) => call(`/cars/${carId}/history`)
export const saveInterval = (carId, laps) => call(`/cars/${carId}/interval`, send('PUT', { laps }))
export const markServiced = (carId) => call(`/cars/${carId}/service`, send('POST'))
