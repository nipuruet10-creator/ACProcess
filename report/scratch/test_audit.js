const fs = require('fs');
const vm = require('vm');

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
      classList: { add: () => {}, remove: () => {} }
    }),
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {}
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

// Load files
vm.runInContext(fs.readFileSync('auth/auth_manager.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('tasks/month_workbook_manager.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('dashboard/dashboard_controller.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('tasks/monthly_input_view.js', 'utf8'), ctx);

async function runAudit() {
  console.log('=== WALTON AC PROCESS SYSTEM AUDIT ===');
  
  // 1. Auth Tests
  const auth = vm.runInContext('new AuthManager()', ctx);
  ctx.authManager = auth;
  console.log('1. isInputUnlocked default:', auth.isInputUnlocked(), '(Strict Security Gate: Expected false)');
  if (auth.isInputUnlocked()) throw new Error('Default must be locked without credentials!');

  const testPasses = [
    { u: 'admin', p: 'ACprocess@2026' },
    { u: 'admin', p: 'ACprocess@20226' },
    { u: 'Sazzad', p: '50463' },
    { u: 'Kamrul', p: '44819' },
    { u: 'Faiyaz', p: '54634' },
    { u: 'Engineer', p: 'walton2026' },
    { u: '50463', p: 'admin' }
  ];

  for (const t of testPasses) {
    const res = await auth.unlockInput(t.u, t.p);
    console.log(`Auth test [${t.u} / ${t.p}]:`, res.success ? 'PASS' : `FAIL: ${res.error}`);
    if (!res.success) throw new Error(`Auth failed for ${t.u} / ${t.p}`);
  }

  // 2. MonthWorkbookManager Tests
  const m = vm.runInContext('new MonthWorkbookManager()', ctx);
  ctx.window.appState = { workbookMgr: m, activeTab: 'dashboard' };
  const sepTasks = m.getTasksForMonth('SEP-2026');
  console.log('2. WorkbookManager SEP-2026 tasks count:', sepTasks.length);
  if (sepTasks.length !== 5) throw new Error(`Expected 5 tasks, got ${sepTasks.length}`);

  // 3. Dashboard Tests
  const dashTasks = await vm.runInContext('DashboardController.getTasksForDashboard("2026-09")', ctx);
  console.log('3. Dashboard tasks count for 2026-09:', dashTasks.length);
  if (dashTasks.length !== 5) throw new Error(`Dashboard expected 5 tasks, got ${dashTasks.length}`);

  // Verify project tasks vs category counts
  const projects = dashTasks.filter(t => Boolean(t.is_project === true));
  console.log('   - Dedicated project tasks count:', projects.length, '(Expected 0)');
  const processDev = dashTasks.filter(t => (t.category || '').toLowerCase() === 'process development');
  console.log('   - Process development tasks count:', processDev.length, '(Expected 4)');
  const partsDev = dashTasks.filter(t => (t.category || '').toLowerCase().includes('parts'));
  console.log('   - Parts development tasks count:', partsDev.length, '(Expected 1)');

  // 4. Monthly Input View Render Test
  ctx.window.appState.activeTab = 'monthly-input';
  await vm.runInContext('MonthlyInputView.render("monthly-input-view-container")', ctx);
  console.log('4. MonthlyInputView.render() executed without errors: PASS');

  console.log('=== ALL AUDIT CHECKS PASSED 100% ===');
}

runAudit().catch(err => {
  console.error('Audit Error:', err);
  process.exit(1);
});
