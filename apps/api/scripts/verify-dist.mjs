import { existsSync } from 'node:fs';

const candidates = ['dist/main.js', 'dist/src/main.js'];
const entry = candidates.find((path) => existsSync(path));

if (!entry) {
  console.error('Build failed: none of these exist:', candidates.join(', '));
  process.exit(1);
}

console.log('Build OK:', entry);
