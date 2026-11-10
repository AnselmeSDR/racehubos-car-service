import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getHistory } from './api'
import { carName, formatDate, formatDistance } from './format'

/** The services done on `car`, the latest first; closed without a car. */
export default function HistoryDialog({ car, onClose }) {
  const { t, i18n } = useTranslation('car-service')
  const [history, setHistory] = useState({
    carId: null,
    entries: null,
    error: null,
  })

  useEffect(() => {
    if (!car) return
    getHistory(car.id).then(
      (entries) => setHistory({ carId: car.id, entries, error: null }),
      (err) => setHistory({ carId: car.id, entries: null, error: err.message })
    )
  }, [car])

  const loaded = car && history.carId === car.id
  return (
    <Dialog open={Boolean(car)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{car && t('historyTitle', { car: carName(car) })}</DialogTitle>
        </DialogHeader>
        {loaded && history.error && (
          <p role="alert" className="text-sm text-destructive">
            {history.error}
          </p>
        )}
        {loaded && history.entries?.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('historyEmpty')}</p>
        )}
        {loaded && history.entries?.length > 0 && (
          <ul className="divide-y divide-border text-sm">
            {history.entries.map((entry) => (
              <li key={entry.id} className="flex justify-between py-2">
                <span>{formatDate(entry.doneAt, i18n.language)}</span>
                <span className="text-muted-foreground tabular-nums">
                  {t('entry', {
                    count: entry.laps,
                    distance: formatDistance(entry.distance, i18n.language),
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
