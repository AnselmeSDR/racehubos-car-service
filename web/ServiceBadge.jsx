import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useServiceStatus } from './useServiceStatus'

/**
 * A car's service status: due, or the laps left. Nothing while unknown.
 * With `link`, it opens the service page (not in a table row, which opens the car).
 */
export default function ServiceBadge({ carId, link = true }) {
  const { t } = useTranslation('car-service')
  const status = useServiceStatus(carId)

  if (!status) return null
  const badge = (
    <Badge variant={status.due ? 'destructive' : 'outline'}>
      <Wrench className="size-3" />
      {status.due ? t('due') : t('lapsLeft', { count: status.remaining })}
    </Badge>
  )
  if (!link) return <span data-testid="car-service-badge">{badge}</span>
  return (
    <Link to="/addons/car-service" data-testid="car-service-badge">
      {badge}
    </Link>
  )
}
