import fs from 'node:fs'
import path from 'node:path'

const dir = path.join(import.meta.dirname, 'locales')
const read = (lang) => JSON.parse(fs.readFileSync(path.join(dir, `${lang}.json`), 'utf-8'))
const keys = (object, prefix = '') =>
  Object.entries(object).flatMap(([key, value]) =>
    typeof value === 'object' ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  )

test.each(['fr', 'de'])('%s has every English text, and only those', (lang) => {
  expect(keys(read(lang)).sort()).toEqual(keys(read('en')).sort())
})
