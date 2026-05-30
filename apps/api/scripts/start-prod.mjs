import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const candidates = ['dist/main.js', 'dist/src/main.js'];
const entry = candidates.find((path) => existsSync(path));

if (!entry) {
  console.error('No compiled entry found. Expected one of:', candidates.join(', '));
  console.error('Ensure the Render build command runs: npm install --include=dev && npm run build');
  process.exit(1);
}

const result = spawnSync(process.execPath, [entry], { stdio: 'inherit' });
process.exit(result.status ?? 1);
