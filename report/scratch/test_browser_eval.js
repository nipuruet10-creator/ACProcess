const fs = require('fs');
const vm = require('vm');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const scriptMatches = [...indexHtml.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);

const mockStorage = {};
const globalObj = {
  window: {},
  document: {
    getElementById: (id) => ({
      id,
      innerHTML: '',
      style: {},
      querySelectorAll: () => [],
      querySelector: () => null,
      classList: { add: () => {}, remove: () => {} },
      addEventListener: () => {}
    }),
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
    createElement: (tag) => ({
      tagName: tag,
      innerHTML: '',
      style: {},
      firstElementChild: { style: {}, classList: { add: () => {} } },
      querySelectorAll: () => [],
      appendChild: () => {}
    })
  },
  localStorage: {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => { mockStorage[k] = String(v); },
    removeItem: (k) => { delete mockStorage[k]; }
  },
  APP_CONFIG: {
    DEFAULT_MONTH: '2026-09',
    ROLES: { ADMIN: 'ADMIN' },
    STORAGE_KEYS: { USER: 'u', TASKS: 't' },
    SUPPORTED_MONTHS: [
      { id: "2026-09", label: "September 2026", status: "Active", code: "SEP-2026" }
    ]
  },
  HELPERS: {
    escapeHtml: s => s,
    formatPersonnelName: s => s,
    renderMonthSelectorUI: () => '<div></div>',
    storage: {
      get: (k, def) => mockStorage[k] ? JSON.parse(mockStorage[k]) : def,
      set: (k, v) => { mockStorage[k] = JSON.stringify(v); }
    }
  },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};
globalObj.window = globalObj;
globalObj.addEventListener = () => {};
globalObj.setTimeout = setTimeout;
globalObj.clearTimeout = clearTimeout;

const ctx = vm.createContext(globalObj);

console.log('Testing evaluation of all scripts in exact index.html order...');
for (const src of scriptMatches) {
  if (src.startsWith('http')) continue;
  try {
    const code = fs.readFileSync(src, 'utf8');
    vm.runInContext(code, ctx);
    console.log('PASS:', src);
  } catch (err) {
    console.error('FAIL in script:', src, err);
    process.exit(1);
  }
}

console.log('All scripts evaluated successfully without syntax or runtime error!');
console.log('MonthWorkbookManager defined?:', typeof ctx.MonthWorkbookManager !== 'undefined');
console.log('window.MonthWorkbookManager defined?:', typeof ctx.window.MonthWorkbookManager !== 'undefined');

// Now simulate MonthlyInputView.render
async function testRender() {
  const m = new ctx.MonthWorkbookManager();
  ctx.window.appState = { workbookMgr: m, activeTab: 'monthly-input' };
  await ctx.MonthlyInputView.render('monthly-input-view-container');
  console.log('MonthlyInputView.render() SUCCESS!');
}

testRender().catch(err => {
  console.error('Render test failed:', err);
  process.exit(1);
});
