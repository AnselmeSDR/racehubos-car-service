import { screen } from '@testing-library/react'
import i18n from '@/i18n'
import { renderCell, routeFetch } from '@/test/helpers'
// The core's own import: with the add-on built in, it is the add-on's override wrapping it
import { carColumns } from '@/components/car/carColumns'

vi.mock('@/hooks', async (original) => ({ ...(await original()), useServerSocket: () => {} }))

const API = '/api/addons/car-service'
const t = i18n.getFixedT('en', 'cars')

beforeAll(() => i18n.changeLanguage('en'))
afterEach(() => vi.unstubAllGlobals())

test("the cars list shows each car's service status, before the edit column, from one read", async () => {
  const fetchMock = routeFetch({
    [`${API}/cars`]: {
      success: true,
      data: [
        { car: { id: 'c1' }, remaining: 0, due: true },
        { car: { id: 'c2' }, remaining: 12, due: false },
      ],
    },
  })
  const columns = carColumns(t, { onEdit: vi.fn() })
  const ids = columns.map((column) => column.id ?? column.accessorKey)
  expect(ids).toContain('brand')
  expect(ids.slice(-2)).toEqual(['car-service', 'actions'])
  expect(columns.at(-2).header).toBe('Service')

  // A deleted car, shown with the deleted ones, has no status
  for (const id of ['c1', 'c2', 'deleted']) renderCell(columns, 'car-service', { id })
  expect(await screen.findByText('Service due')).toBeInTheDocument()
  expect(screen.getByText('Service in 12 laps')).toBeInTheDocument()
  expect(screen.getAllByTestId('car-service-badge')).toHaveLength(2)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  // The row opens the car: the badge is no link
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})
