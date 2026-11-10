import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'
import { routeFetch } from '@/test/helpers'
// The core's own import: with the add-on built in, it is the add-on's override wrapping it
import CarIdentity from '@/components/car/CarIdentity'

const { socket } = vi.hoisted(() => ({ socket: {} }))
vi.mock('@/hooks', async (original) => ({
  ...(await original()),
  useServerSocket: (events, onEvent) => {
    socket.send = (event, data) => onEvent(event, data)
  },
}))

const API = '/api/addons/car-service'
const car = {
  id: 'c1',
  brand: 'Ford',
  model: 'GT',
  maxSpeed: 10,
  brakeForce: 10,
  fuelCapacity: 10,
}
let status, fetchMock

beforeAll(() => i18n.changeLanguage('en'))
beforeEach(() => {
  status = { remaining: 40, due: false }
  fetchMock = routeFetch({
    [`${API}/cars/c1`]: () => ({ success: true, data: status }),
  })
})
afterEach(() => vi.unstubAllGlobals())

const show = () =>
  render(
    <MemoryRouter>
      <CarIdentity car={car} />
    </MemoryRouter>
  )

test("the car's profile keeps its identity and shows the laps left before its service", async () => {
  show()
  expect(screen.getByTestId('car-identity')).toHaveTextContent('Ford GT')
  const badge = await screen.findByTestId('car-service-badge')
  expect(badge).toHaveTextContent('Service in 40 laps')
  expect(badge).toHaveAttribute('href', '/addons/car-service')
})

test('a car due for service says so', async () => {
  status = { remaining: 0, due: true }
  show()
  expect(await screen.findByTestId('car-service-badge')).toHaveTextContent('Service due')
})

test('read again when the server says this car changed, not for another one', async () => {
  show()
  await screen.findByText('Service in 40 laps')
  const reads = () => fetchMock.mock.calls.length
  const before = reads()

  await act(async () => socket.send('car-service:updated', { carIds: ['c9'] }))
  expect(reads()).toBe(before)
  status = { remaining: 1, due: false }
  await act(async () => socket.send('car-service:updated', { carIds: ['c1'] }))
  expect(screen.getByTestId('car-service-badge')).toHaveTextContent('Service in 1 lap')
})

test('nothing when the status cannot be read', async () => {
  fetchMock = routeFetch({
    [`${API}/cars/c1`]: { success: false, error: 'boom' },
  })
  show()
  await act(async () => {})
  expect(screen.queryByTestId('car-service-badge')).not.toBeInTheDocument()
  expect(screen.getByTestId('car-identity')).toBeInTheDocument()
})
