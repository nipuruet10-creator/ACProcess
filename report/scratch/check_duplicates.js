const fs = require('fs');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const scriptMatches = [...indexHtml.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);

const seenDeclarations = {};

scriptMatches.forEach(src => {
  if (src.startsWith('http')) return;
  if (!fs.existsSync(src)) {
    console.log('Script NOT FOUND:', src);
    return;
  }
  const content = fs.readFileSync(src, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const match = line.match(/^(?:const|let)\s+([a-zA-Z0-9_$]+)\s*=/);
    if (match) {
      const varName = match[1];
      if (!seenDeclarations[varName]) {
        seenDeclarations[varName] = [];
      }
      seenDeclarations[varName].push({ file: src, line: idx + 1 });
    }
  });
});

console.log('--- Duplicate Top-Level const/let Declarations ---');
let hasDupes = false;
for (const [name, occurrences] of Object.entries(seenDeclarations)) {
  if (occurrences.length > 1) {
    hasDupes = true;
    console.log('DUPLICATE:', name);
    occurrences.forEach(o => console.log('  ->', o.file, 'line', o.line));
  }
}
if (!hasDupes) console.log('None found!');
