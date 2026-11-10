import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { History, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { carColor } from '@/lib/colors'
import { markServiced, saveInterval } from './api'
import { carName, formatDate, formatDistance } from './format'

/** One car: its use against its interval, the interval itself, and its service actions. */
export default function CarServiceRow({ status, onChanged, onHistory }) {
  const { t, i18n } = useTranslation('car-service')
  const { car, laps, intervalLaps, distance, lapsWithoutLength, lastService, due } = status
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function run(action) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function changeInterval(event) {
    const value = Number(event.target.value)
    if (value === intervalLaps) return
    if (!Number.isInteger(value) || value <= 0) {
      event.target.value = intervalLaps
      return
    }
    run(() => saveInterval(car.id, value))
  }

  return (
    <TableRow data-testid={`car-service-${car.id}`}>
      <TableCell>
        <span className="flex items-center gap-2 font-medium">
          <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: carColor(car) }} />
          {carName(car)}
        </span>
      </TableCell>
      <TableCell className="min-w-40">
        <div className="text-sm tabular-nums">{t('lapsOf', { laps, interval: intervalLaps })}</div>
        <div className="h-1.5 mt-1 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${due ? 'bg-destructive' : 'bg-primary'}`}
            style={{ width: `${Math.min((laps / intervalLaps) * 100, 100)}%` }}
          />
        </div>
      </TableCell>
      <TableCell className="text-sm tabular-nums">
        {formatDistance(distance, i18n.language)}
        {lapsWithoutLength > 0 && (
          <div className="text-xs text-muted-foreground">{t('withoutLength', { count: lapsWithoutLength })}</div>
        )}
      </TableCell>
      <TableCell>
        <Input
          key={intervalLaps}
          type="number"
          min="1"
          defaultValue={intervalLaps}
          onBlur={changeInterval}
          aria-label={t('intervalOf', { car: carName(car) })}
          className="w-24 h-8"
        />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {lastService ? formatDate(lastService.doneAt, i18n.language) : t('never')}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2">
          {due && <Badge variant="destructive">{t('due')}</Badge>}
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => markServiced(car.id))}>
            <Wrench className="size-3.5" /> {t('markServiced')}
          </Button>
          <Button size="sm" variant="ghost" onClick={onHistory} aria-label={t('historyOf', { car: carName(car) })}>
            <History className="size-3.5" />
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive text-right mt-1">
            {error}
          </p>
        )}
      </TableCell>
    </TableRow>
  )
}
