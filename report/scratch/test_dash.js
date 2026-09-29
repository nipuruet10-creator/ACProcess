const fs = require('fs');
const vm = require('vm');

const mockStorage = {};
const globalObj = {
  window: {},
  document: {
    getElementById: () => null,
    querySelectorAll: () => []
  },
  localStorage: {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => { mockStorage[k] = String(v); },
    removeItem: (k) => { delete mockStorage[k]; }
  },
  APP_CONFIG: {
    DEFAULT_MONTH: '2026-09',
    ROLES: { ADMIN: 'ADMIN' },
    STORAGE_KEYS: { USER: 'u', TASKS: 't' }
  },
  HELPERS: {
    escapeHtml: s => s,
    storage: {
      get: (k, def) => mockStorage[k] ? JSON.parse(mockStorage[k]) : def,
      set: (k, v) => { mockStorage[k] = JSON.stringify(v); }
    }
  },
  console: console
};
globalObj.window = globalObj;

const ctx = vm.createContext(globalObj);

// Load scripts
vm.runInContext(fs.readFileSync('tasks/month_workbook_manager.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('dashboard/dashboard_controller.js', 'utf8'), ctx);

async function run() {
  const m = vm.runInContext('new MonthWorkbookManager()', ctx);
  ctx.window.appState = { workbookMgr: m };
  const tasks = await vm.runInContext('DashboardController.getTasksForDashboard("2026-09")', ctx);
  console.log('Result tasks length:', tasks.length);
  console.log('Task IDs:', tasks.map(t => t.task_id));
}

run().catch(console.error);
