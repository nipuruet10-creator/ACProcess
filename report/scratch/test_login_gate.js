const fs = require('fs');
const vm = require('vm');

let renderedHtml = '';
const globalObj = {
  window: {},
  document: {
    getElementById: (id) => ({
      id,
      set innerHTML(val) { renderedHtml = val; },
      get innerHTML() { return renderedHtml; },
      style: {},
      querySelectorAll: () => [],
      querySelector: () => null,
      classList: { add: () => {}, remove: () => {} }
    }),
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {}
  },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  APP_CONFIG: { 
    DEFAULT_MONTH: '2026-09',
    STORAGE_KEYS: { USER: 'walton_user_auth', TASKS: 'walton_tasks' },
    ROLES: { ADMIN: 'ADMIN' }
  },
  HELPERS: { escapeHtml: s => s },
  console: console
};
globalObj.window = globalObj;
globalObj.addEventListener = () => {};

const ctx = vm.createContext(globalObj);
vm.runInContext(fs.readFileSync('auth/auth_manager.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('tasks/month_workbook_manager.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('tasks/monthly_input_view.js', 'utf8'), ctx);

ctx.MonthlyInputView.renderLoginGate('test-container');

console.log('--- Rendered Login Gate HTML ---');
console.log(renderedHtml);

if (renderedHtml.includes('Handover Mode') || renderedHtml.includes('ACprocess@2026') || renderedHtml.includes('50463')) {
  console.error('FAIL: Found hints or handover mode in login gate!');
  process.exit(1);
} else {
  console.log('SUCCESS: No hints or handover mode in login gate! 100% Clean!');
}
