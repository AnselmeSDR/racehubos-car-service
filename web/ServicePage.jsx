import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import CarServiceRow from './CarServiceRow'
import HistoryDialog from './HistoryDialog'
import { carName } from './format'
import { useCarStatuses } from './useCarStatuses'

// The layout gives a page no padding: the core pages start like this too
const Page = ({ children }) => <div className="p-4 space-y-4">{children}</div>

/** Every car's use since its last service, the most worn first, and the cars due. */
export default function ServicePage() {
  const { t } = useTranslation('car-service')
  const { statuses, error, reload } = useCarStatuses()
  const [historyCar, setHistoryCar] = useState(null)

  if (error) {
    return (
      <Page>
        <p role="alert" className="text-sm text-destructive">
          {t('loadError', { error })}
        </p>
      </Page>
    )
  }
  if (!statuses || statuses.length === 0) {
    return (
      <Page>
        <p className="text-sm text-muted-foreground">{t(statuses ? 'noCars' : 'loading')}</p>
      </Page>
    )
  }

  const due = statuses.filter((status) => status.due)
  return (
    <Page>
      {due.length > 0 && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
          <span>
            {t('dueBanner', {
              count: due.length,
              cars: due.map((status) => carName(status.car)).join(', '),
            })}
          </span>
        </div>
      )}
      <Card className="py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.car')}</TableHead>
                <TableHead>{t('columns.laps')}</TableHead>
                <TableHead>{t('columns.distance')}</TableHead>
                <TableHead>{t('columns.interval')}</TableHead>
                <TableHead>{t('columns.lastService')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {statuses.map((status) => (
                <CarServiceRow
                  key={status.car.id}
                  status={status}
                  onChanged={reload}
                  onHistory={() => setHistoryCar(status.car)}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <HistoryDialog car={historyCar} onClose={() => setHistoryCar(null)} />
    </Page>
  )
}
