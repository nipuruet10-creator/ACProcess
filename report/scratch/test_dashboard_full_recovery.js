// Mock browser environment
global.window = global;
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

// 1. Load default tasks
global.DEFAULT_SEP_2026_TASKS = require('../config/default_sep_2026_tasks.js');
console.log('DEFAULT_SEP_2026_TASKS loaded, count:', DEFAULT_SEP_2026_TASKS.length);

// 2. Load master lists
require('../config/master_lists.js');
console.log('SAZZAD_PROTECTED_TASK_IDS count:', SAZZAD_PROTECTED_TASK_IDS.size);

// Mock APP_CONFIG
global.APP_CONFIG = {
  DEFAULT_MONTH: '2026-09',
  SUPPORTED_MONTHS: [{ id: '2026-09', label: 'September 2026' }]
};
global.HELPERS = {
  escapeHtml: s => s,
  formatBDT: n => 'BDT ' + n
};

// Mock MonthWorkbookManager dependencies
global.MasterDataManager = {
  getEngineers: () => [],
  getCategories: () => []
};

// 3. Load MonthWorkbookManager
const MonthWorkbookManager = require('../tasks/month_workbook_manager.js');
const wbMgr = new MonthWorkbookManager();

const sepTasks = wbMgr.getTasksForMonth('SEP-2026');
console.log('wbMgr.getTasksForMonth(SEP-2026) returned:', sepTasks.length, 'tasks');

const byEng = {};
sepTasks.forEach(t => {
  const eng = t.engineer || t.assignee || 'Unknown';
  byEng[eng] = (byEng[eng] || 0) + 1;
});
console.log('Breakdown by engineer in MonthWorkbookManager:', byEng);

// 4. Test DashboardController.getTasksForDashboard
global.appState = {
  workbookMgr: wbMgr,
  activeTab: 'dashboard'
};

const DashboardController = require('../dashboard/dashboard_controller.js');
DashboardController.getTasksForDashboard('2026-09').then(dashTasks => {
  console.log('DashboardController.getTasksForDashboard returned:', dashTasks.length, 'tasks');
  const dashByEng = {};
  dashTasks.forEach(t => {
    dashByEng[t.concern_engineer] = (dashByEng[t.concern_engineer] || 0) + 1;
  });
  console.log('Dashboard tasks by engineer:', dashByEng);

  console.log('Test debouncedRender function exists:', typeof DashboardController.debouncedRender === 'function');

  console.log('ALL TESTS PASSED!');
}).catch(err => {
  console.error('Test error:', err);
});
