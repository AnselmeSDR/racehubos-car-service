import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { routeFetch } from '@/test/helpers'
import { Suspense } from 'react'
import addon from './index.jsx'
import ServicePage from './ServicePage'

const { socket } = vi.hoisted(() => ({ socket: {} }))
vi.mock('@/hooks', async (original) => ({
  ...(await original()),
  useServerSocket: (events, onEvent) => {
    socket.events = events
    socket.send = (event, data) => onEvent(event, data)
  },
}))

const API = '/api/addons/car-service'
const ford = {
  id: 'c1',
  brand: 'Ford',
  model: 'GT',
  img: null,
  color: '#ff0000',
}
const porsche = {
  id: 'c2',
  brand: 'Porsche',
  model: '911',
  img: null,
  color: null,
}
const status = (car, data = {}) => ({
  car,
  intervalLaps: 300,
  laps: 0,
  distance: 0,
  lapsWithoutLength: 0,
  lastService: null,
  remaining: 300,
  due: false,
  ...data,
})
const DONE_AT = Date.UTC(2026, 10, 3, 12)

let statuses, fetchMock
const reply = (data) => ({ success: true, data })
const failure = (error) => ({ success: false, error })

beforeAll(() => i18n.changeLanguage('en'))
beforeEach(() => {
  statuses = [
    status(ford, {
      laps: 320,
      distance: 4200,
      remaining: 0,
      due: true,
      lastService: { doneAt: DONE_AT },
    }),
    status(porsche, { laps: 12, distance: 150, lapsWithoutLength: 2 }),
  ]
  fetchMock = routeFetch({
    [`${API}/cars`]: () => reply(statuses),
    [`PUT ${API}/cars/c2/interval`]: (url, init) => reply({ ...statuses[1], intervalLaps: JSON.parse(init.body).laps }),
    [`POST ${API}/cars/c1/service`]: () => reply(statuses[0]),
    [`${API}/cars/c1/history`]: reply([
      { id: 2, doneAt: DONE_AT, laps: 310, distance: 4100 },
      { id: 1, doneAt: Date.UTC(2026, 8, 1), laps: 1, distance: 12 },
    ]),
    [`${API}/cars/c2/history`]: reply([]),
  })
})
afterEach(() => vi.unstubAllGlobals())

const shown = async () => {
  render(<ServicePage />)
  await screen.findByTestId('car-service-c1')
}
const row = (id) => within(screen.getByTestId(`car-service-${id}`))
const reads = () => fetchMock.mock.calls.filter(([url, init]) => url === `${API}/cars` && !init).length
const sent = (method) =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method === method)
    .map(([url, init]) => [url, init.body && JSON.parse(init.body)])

test("the add-on's page, at the root of its routes", async () => {
  const { component: Page } = addon.routes.find((route) => route.path === '')
  render(
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  )
  expect(await screen.findByTestId('car-service-c1')).toBeInTheDocument()
})

test('each car with its laps against its interval, its distance and its last service', async () => {
  await shown()
  expect(row('c1').getByText('Ford GT')).toBeInTheDocument()
  expect(row('c1').getByText('320 / 300 laps')).toBeInTheDocument()
  expect(row('c1').getByText('4.2 km')).toBeInTheDocument()
  expect(row('c1').getByText('Nov 3, 2026')).toBeInTheDocument()
  expect(row('c1').getByLabelText('Service interval of Ford GT, in laps')).toHaveValue(300)
  expect(row('c2').getByText('150 m')).toBeInTheDocument()
  expect(row('c2').getByText('2 laps on tracks without a length')).toBeInTheDocument()
  expect(row('c2').getByText('Never')).toBeInTheDocument()
})

test('the cars due are named at the top and flagged in their row', async () => {
  await shown()
  expect(screen.getByRole('status')).toHaveTextContent('1 car is due for service: Ford GT')
  expect(row('c1').getByText('Service due')).toBeInTheDocument()
  expect(row('c2').queryByText('Service due')).not.toBeInTheDocument()
})

test('no banner when no car is due', async () => {
  statuses = [status(porsche)]
  render(<ServicePage />)
  await screen.findByTestId('car-service-c2')
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

test('a new interval is saved, then the cars are read again; a wrong one is put back', async () => {
  await shown()
  const input = row('c2').getByLabelText('Service interval of Porsche 911, in laps')
  const before = reads()

  fireEvent.change(input, { target: { value: '300' } })
  fireEvent.blur(input)
  fireEvent.change(input, { target: { value: '0' } })
  fireEvent.blur(input)
  expect(input).toHaveValue(300)
  fireEvent.change(input, { target: { value: '2.5' } })
  fireEvent.blur(input)
  expect(sent('PUT')).toEqual([])

  fireEvent.change(input, { target: { value: '150' } })
  await act(async () => fireEvent.blur(input))
  expect(sent('PUT')).toEqual([[`${API}/cars/c2/interval`, { laps: 150 }]])
  expect(reads()).toBe(before + 1)
})

test('a service done is recorded, then the cars are read again', async () => {
  await shown()
  const before = reads()
  await userEvent.click(row('c1').getByRole('button', { name: /Service done/ }))
  expect(sent('POST')).toEqual([[`${API}/cars/c1/service`, undefined]])
  expect(reads()).toBe(before + 1)
})

test('a refused action shows why in its row', async () => {
  fetchMock = routeFetch({
    [`${API}/cars`]: () => reply(statuses),
    [`POST ${API}/cars/c1/service`]: failure('database locked'),
  })
  await shown()
  await userEvent.click(row('c1').getByRole('button', { name: /Service done/ }))
  expect(row('c1').getByRole('alert')).toHaveTextContent('database locked')
  expect(row('c1').getByRole('button', { name: /Service done/ })).toBeEnabled()
})

test("a car's history: its services, the latest first, or none yet", async () => {
  const user = userEvent.setup()
  await shown()
  await user.click(row('c1').getByRole('button', { name: 'Service history of Ford GT' }))
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText('Services of Ford GT')).toBeInTheDocument()
  await waitFor(() => expect(within(dialog).getAllByRole('listitem')).toHaveLength(2))
  expect(
    within(dialog)
      .getAllByRole('listitem')
      .map((item) => item.textContent)
  ).toEqual(['Nov 3, 2026after 310 laps · 4.1 km', 'Sep 1, 2026after 1 lap · 12 m'])

  await user.keyboard('{Escape}')
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  await user.click(row('c2').getByRole('button', { name: 'Service history of Porsche 911' }))
  expect(await screen.findByText('No service recorded yet.')).toBeInTheDocument()
})

test('a history that cannot be read says so', async () => {
  fetchMock = routeFetch({
    [`${API}/cars`]: () => reply(statuses),
    [`${API}/cars/c1/history`]: failure('car c1 not found'),
  })
  await shown()
  await userEvent.click(row('c1').getByRole('button', { name: 'Service history of Ford GT' }))
  expect(await within(await screen.findByRole('dialog')).findByRole('alert')).toHaveTextContent('car c1 not found')
})

test('the cars are read again when the server says some changed', async () => {
  await shown()
  expect(socket.events).toEqual(['car-service:updated'])
  statuses = [status(porsche, { laps: 13 }), status(ford)]
  await act(async () => socket.send('car-service:updated', { carIds: ['c2'] }))
  expect(row('c2').getByText('13 / 300 laps')).toBeInTheDocument()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

test('loading, then no cars, or the error', async () => {
  statuses = []
  const { unmount } = render(<ServicePage />)
  expect(screen.getByText('Loading…')).toBeInTheDocument()
  expect(await screen.findByText('No cars yet.')).toBeInTheDocument()
  unmount()

  fetchMock = routeFetch({ [`${API}/cars`]: failure('offline') })
  render(<ServicePage />)
  expect(await screen.findByRole('alert')).toHaveTextContent('The cars could not be read: offline')
})
