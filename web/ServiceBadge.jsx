import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useServerSocket } from '@/hooks'
import { UPDATED_EVENT, getStatus } from './api'

const EVENTS = [UPDATED_EVENT]

/** A car's service status, linking to the service page: due, or the laps left. Nothing while unknown. */
export default function ServiceBadge({ carId }) {
  const { t } = useTranslation('car-service')
  const [status, setStatus] = useState(null)

  const load = useCallback(
    () =>
      getStatus(carId).then(
        (data) => setStatus(data),
        () => setStatus(null)
      ),
    [carId]
  )
  useEffect(() => {
    load()
  }, [load])
  useServerSocket(EVENTS, (event, { carIds }) => {
    if (carIds.includes(carId)) load()
  })

  if (!status) return null
  return (
    <Link to="/addons/car-service" data-testid="car-service-badge">
      <Badge variant={status.due ? 'destructive' : 'outline'}>
        <Wrench className="size-3" />
        {status.due ? t('due') : t('lapsLeft', { count: status.remaining })}
      </Badge>
    </Link>
  )
}
