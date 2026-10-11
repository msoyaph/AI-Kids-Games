// Fails the build if the single-file game grows past the 3 MB budget for the Ai Kids Games site.
import fs from 'fs';

const LIMIT = 3 * 1024 * 1024;
const size = fs.statSync('dist/index.html').size;
const mb = (size / 1048576).toFixed(2);
if (size > LIMIT) {
  console.error(`dist/index.html is ${mb} MB: over the 3 MB budget.`);
  process.exit(1);
}
console.log(`dist/index.html: ${mb} MB (budget 3 MB)`);
