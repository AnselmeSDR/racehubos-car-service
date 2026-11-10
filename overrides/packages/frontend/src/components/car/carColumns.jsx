export * from '@base'
import { carColumns as baseColumns } from '@base'
import ServiceBadge from '@addon/web/ServiceBadge.jsx'

/** The core's columns of the cars list, with each car's service status before the edit column. */
export function carColumns(t, options) {
  const columns = baseColumns(t, options)
  const service = {
    id: 'car-service',
    header: t('car-service:listColumn'),
    enableSorting: false,
    cell: ({ row }) => <ServiceBadge carId={row.original.id} link={false} />,
  }
  // Before the edit column, which comes last
  return columns.toSpliced(columns.filter((column) => column.id !== 'actions').length, 0, service)
}
