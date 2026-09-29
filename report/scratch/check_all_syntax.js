const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function walk(dir) {
  let files = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== '.git') {
        files = files.concat(walk(full));
      }
    } else if (item.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const allJs = walk('.');
let errors = 0;
for (const f of allJs) {
  try {
    execSync(`node -c "${f}"`, { stdio: 'pipe' });
  } catch (err) {
    console.error(`SYNTAX ERROR in: ${f}`);
    console.error(err.stderr.toString());
    errors++;
  }
}

if (errors === 0) {
  console.log("All .js files have valid syntax!");
} else {
  console.log(`Found ${errors} syntax errors!`);
}
