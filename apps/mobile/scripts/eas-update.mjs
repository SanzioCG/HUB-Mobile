// M-A8: `npm run update:preview -- "<izoh>"` — OTA yangilanish (EAS Update) `preview` kanaliga.
// Avval viewer build + nusxa (viewer.html JS bundle asset'i), keyin `eas update --channel preview --environment preview`.
// APP_VARIANT=internal — app config build'dagidek bo'lsin (fingerprint runtime versiyasi APK bilan mos kelishi uchun);
// EAS'dagi `preview` environment'ida ham APP_VARIANT=internal bo'lishi shart (docs/INSTALL-ANDROID.md).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const EAS_CLI = 'eas-cli@27.4.1';
const APP = fileURLToPath(new URL('..', import.meta.url));
const [channel = 'preview', ...rest] = process.argv.slice(2);
const message = rest.join(' ').trim();
if (!message) {
  console.error('Izoh kerak: npm run update:preview -- "nima o\'zgardi"');
  process.exit(1);
}

const run = (cmd, args, env = {}) => {
  const r = spawnSync(cmd, args, {
    cwd: APP,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run('npm', ['--prefix', '../..', 'run', 'build', '-w', '@hub-mobile/viewer']);
run('npm', ['run', 'copy-viewer']);
run(
  'npx',
  [
    '-y',
    EAS_CLI,
    'update',
    '--channel',
    channel,
    '--environment',
    channel,
    '--message',
    JSON.stringify(message),
  ],
  { APP_VARIANT: channel === 'production' ? 'production' : 'internal' },
);
