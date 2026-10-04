const fs = require('fs');
const path = require('path');
const vm = require('vm');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') results = results.concat(walk(full));
    } else if (file.endsWith('.js')) {
      results.push(full);
    }
  });
  return results;
}

const allJs = walk('./report');
let errors = 0;
allJs.forEach(file => {
  try {
    const code = fs.readFileSync(file, 'utf8');
    new vm.Script(code, { filename: file });
  } catch (err) {
    console.error('Syntax error in:', file, err.message);
    errors++;
  }
});
console.log(`Checked ${allJs.length} JS files. Total syntax errors: ${errors}`);
