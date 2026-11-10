// The web tests run in the core's Vitest, with its aliases (`@/…`), its setup and this add-on
// built in: the add-on must be in the core's addons/ folder, installed or linked (test/web.js).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ADDON_DIR, findCore } from './findCore.js';

const frontend = path.join(findCore(), 'packages/frontend');
process.env.RACEHUBOS_ADDONS_DIR = path.join(findCore(), 'addons');
const { default: core } = await import(pathToFileURL(path.join(frontend, 'vitest.config.js')).href);

export default {
  ...core,
  root: frontend,
  test: {
    ...core.test,
    dir: ADDON_DIR,
    include: ['web/**/*.test.{js,jsx}', 'overrides/**/*.test.{js,jsx}'],
    coverage: {
      ...core.test.coverage,
      allowExternal: true,
      include: [`${ADDON_DIR}/web/**/*.{js,jsx}`, `${ADDON_DIR}/overrides/**/*.{js,jsx}`],
      exclude: ['**/*.test.{js,jsx}'],
      reporter: ['text'],
      reportsDirectory: path.join(ADDON_DIR, 'coverage'),
    },
  },
};
