/** A distance in metres, in kilometres from 1 km on, in the reader's language. */
export function formatDistance(metres, language) {
  const km = metres >= 1000
  return new Intl.NumberFormat(language, {
    style: 'unit',
    unit: km ? 'kilometer' : 'meter',
    maximumFractionDigits: km ? 1 : 0,
  }).format(km ? metres / 1000 : metres)
}

export const formatDate = (ms, language) =>
  new Date(ms).toLocaleDateString(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

export const carName = (car) => `${car.brand} ${car.model}`
