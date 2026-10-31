import { cpSync, mkdirSync } from 'node:fs';
// Keep public/backend/test paths stable so existing URLs and test fixtures continue working.
for (const [from, to] of [['netlify', 'netlify'], ['tests', 'tests'], ['scripts', 'scripts']]) {
  mkdirSync(to, { recursive: true });
  cpSync(`.compiled/${from}`, to, { recursive: true });
}
