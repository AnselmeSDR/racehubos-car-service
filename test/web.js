// Runs the web tests with the core's Vitest: `npm run test:web [-- vitest options]`
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ADDON_DIR, findCore } from './findCore.js';

const core = findCore();
const manifest = JSON.parse(fs.readFileSync(path.join(ADDON_DIR, 'racehubos-addon.json'), 'utf-8'));
const installed = path.join(core, 'addons', manifest.id);
if (!fs.existsSync(installed) || fs.realpathSync(installed) !== fs.realpathSync(ADDON_DIR)) {
  console.error(`The add-on must be in ${installed} (link it: ln -s ${ADDON_DIR} ${installed})`);
  process.exit(1);
}

const vitest = path.join(core, 'node_modules/vitest/vitest.mjs');
const { status } = spawnSync(
  process.execPath,
  [vitest, 'run', '--config', path.join(ADDON_DIR, 'test/vitest.config.js'), ...process.argv.slice(2)],
  { cwd: path.join(core, 'packages/frontend'), stdio: 'inherit' }
);
process.exit(status ?? 1);
