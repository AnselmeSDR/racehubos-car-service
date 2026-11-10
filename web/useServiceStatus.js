import { useSyncExternalStore } from 'react'
import { useServerSocket } from '@/hooks'
import { getStatuses, UPDATED_EVENT } from './api'

const EVENTS = [UPDATED_EVENT]

// Every car's status, read once for all the badges on screen (a whole cars list), and read again
// when the server says some changed. Kept between pages: shown at once, then read again.
let byCar = null
let loading = null
const listeners = new Set()

function load() {
  loading ??= getStatuses()
    .then(
      (statuses) => {
        byCar = new Map(statuses.map((status) => [status.car.id, status]))
      },
      () => {
        byCar = null
      }
    )
    .finally(() => {
      loading = null
      listeners.forEach((listener) => listener())
    })
  return loading
}

function subscribe(listener) {
  if (listeners.size === 0) load()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** A car's service status, or null while unknown. */
export function useServiceStatus(carId) {
  const statuses = useSyncExternalStore(subscribe, () => byCar)
  useServerSocket(EVENTS, (event, { carIds }) => {
    if (carIds.includes(carId)) load()
  })
  return statuses?.get(carId) ?? null
}
