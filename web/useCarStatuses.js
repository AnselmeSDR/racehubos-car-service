import { useCallback, useEffect, useState } from 'react'
import { useServerSocket } from '@/hooks'
import { UPDATED_EVENT, getStatuses } from './api'

const EVENTS = [UPDATED_EVENT]

/** The status of every car, read again whenever the server says some changed. */
export function useCarStatuses() {
  const [statuses, setStatuses] = useState(null)
  const [error, setError] = useState(null)

  const reload = useCallback(
    () =>
      getStatuses().then(
        (data) => {
          setStatuses(data)
          setError(null)
        },
        (err) => setError(err.message)
      ),
    []
  )

  useEffect(() => {
    reload()
  }, [reload])
  useServerSocket(EVENTS, reload)

  return { statuses, error, reload }
}
