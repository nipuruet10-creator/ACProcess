/**
 * Verification test suite for Supervisor defaulting to Kamrul, Cross-PC Sync, and Text Area adjustments
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock localStorage
const localStorageMock = (function () {
  let store = {};
  return {
    getItem: function (key) {
      return store[key] || null;
    },
    setItem: function (key, value) {
      store[key] = value.toString();
    },
    removeItem: function (key) {
      delete store[key];
    },
    clear: function () {
      store = {};
    }
  };
})();
global.localStorage = localStorageMock;
global.window = {
  location: { pathname: '', search: '', hash: '' },
  addEventListener: () => {}
};
global.document = {
  getElementById: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {}
};
global.alert = () => {};
global.confirm = () => true;

// Mock APP_CONFIG
global.APP_CONFIG = {
  FIREBASE: {
    DATABASE_URL: 'https://ac-monthly-report-default-rtdb.asia-southeast1.firebasedatabase.app',
    ENABLED: true
  },
  GOOGLE_WORKSPACE: {
    APPS_SCRIPT_WEBAPP_URL: 'https://script.google.com/test/exec'
  }
};

// Require helpers & master lists
const HELPERS = require('../utils/helpers.js');
global.HELPERS = HELPERS;
const MASTER_LISTS = require('../config/master_lists.js');
global.MASTER_LISTS = MASTER_LISTS;
const MasterDataManager = require('../database/master_data_view.js');
global.MasterDataManager = MasterDataManager;

// Load MonthWorkbookManager
const MonthWorkbookManager = require('../tasks/month_workbook_manager.js');
global.MonthWorkbookManager = MonthWorkbookManager;

// Track Firebase calls
const fbCalls = {
  pushTask: [],
  pushEntireMonth: [],
  hydrateMonth: []
};
global.FirebaseSyncService = {
  isConnected: () => true,
  pushTask: async (month, task) => { fbCalls.pushTask.push({ month, task }); return true; },
  pushEntireMonth: async (month) => { fbCalls.pushEntireMonth.push(month); return 1; },
  hydrateMonth: async (month) => { fbCalls.hydrateMonth.push(month); return true; },
  deleteTask: async () => true,
  deleteMultipleTasks: async () => true
};

const gasCalls = {
  pushAllLocalData: 0
};
global.GoogleSheetsSync = {
  getWebAppUrl: () => 'https://script.google.com/test/exec',
  pushTask: async () => true,
  pushAllLocalData: async () => { gasCalls.pushAllLocalData++; return { status: 'OK' }; },
  pullFromCloud: async () => true
};

console.log('=== TEST SUITE: SUPERVISOR TO KAMRUL & CROSS-PC SYNC VERIFICATION ===\n');

// Load MonthlyInputView
const MonthlyInputView = require('../tasks/monthly_input_view.js');
global.MonthlyInputView = MonthlyInputView;
const inputViewCode = fs.readFileSync(path.join(__dirname, '../tasks/monthly_input_view.js'), 'utf8');

// Test 1: parseExcelClipboard without supervisor
console.log('--- Test 1: parseExcelClipboard defaults Supervisor to Kamrul (44819) ---');
const rawExcelNoSup = "Smart QR Scanning System\tImplement QR code on line 1\tProcess development\t25\n24H ODU Backnet forma\tWooden forma making\tProcess development\t30";
const parsed1 = MonthlyInputView.parseExcelClipboard(rawExcelNoSup, "Sazzad");

assert.strictEqual(parsed1.length, 2, 'Should parse 2 tasks');
assert.strictEqual(parsed1[0].supervisor, "Kamrul (44819)", 'Task 1 supervisor must default to Kamrul (44819)');
assert.strictEqual(parsed1[1].supervisor, "Kamrul (44819)", 'Task 2 supervisor must default to Kamrul (44819)');
console.log('✔ PASS: parseExcelClipboard without supervisor correctly assigns Kamrul (44819)');

// Test 2: parseExcelClipboard with legacy Sazzad supervisor
console.log('\n--- Test 2: parseExcelClipboard auto-corrects Sazzad supervisor to Kamrul ---');
const rawExcelSazzadSup = "Die Relocation\tMove die to station B\tProcess development\t50\tSazzad (50463)\tPear";
const parsed2 = MonthlyInputView.parseExcelClipboard(rawExcelSazzadSup, "Pear");
assert.strictEqual(parsed2[0].supervisor, "Kamrul (44819)", 'Sazzad in supervisor column must auto-correct to Kamrul (44819)');
console.log('✔ PASS: parseExcelClipboard auto-corrects Sazzad in supervisor column to Kamrul (44819)');

// Test 3: MonthWorkbookManager auto-repair in sanitizeWorkbooks
console.log('\n--- Test 3: MonthWorkbookManager auto-repairs legacy Sazzad supervisor ---');
localStorage.setItem("walton_pd_month_workbooks_v2", JSON.stringify({
  "SEP-2026": [
    { task_id: "SEP-2026-901", month: "SEP-2026", task_name: "Test Task", supervisor: "Sazzad (50463)", assignee: "Emon" },
    { task_id: "SEP-2026-902", month: "SEP-2026", task_name: "Test Task 2", supervisor: "Kamrul (44819)", assignee: "Hashmi" }
  ]
}));
const wbMgr = new MonthWorkbookManager();
const tasks = wbMgr.getTasksForMonth("SEP-2026");
const task1 = tasks.find(t => t.task_id === "SEP-2026-901");
assert.strictEqual(task1.supervisor, "Kamrul (44819)", 'Legacy Sazzad supervisor must be auto-repaired to Kamrul (44819)');
console.log('✔ PASS: MonthWorkbookManager auto-repaired legacy Sazzad supervisor in existing tasks');

// Test 4: addTask and updateTask push to Firebase
console.log('\n--- Test 4: addTask & updateTask immediately notify Firebase ---');
fbCalls.pushTask = [];
const newTask = wbMgr.addTask("SEP-2026", "Emon", "New Test Task for Firebase Sync", "YES", "Step 1", "Process development", 40);
assert.strictEqual(fbCalls.pushTask.length, 1, 'FirebaseSyncService.pushTask must be called on addTask');
assert.strictEqual(fbCalls.pushTask[0].task.task_name, "New Test Task for Firebase Sync");

wbMgr.updateTask("SEP-2026", newTask.task_id, { task_name: "Updated Test Task Name" });
assert.strictEqual(fbCalls.pushTask.length, 2, 'FirebaseSyncService.pushTask must be called on updateTask');
assert.strictEqual(fbCalls.pushTask[1].task.task_name, "Updated Test Task Name");
console.log('✔ PASS: Both addTask and updateTask automatically trigger Firebase sync');

// Test 5: confirmBulkPaste pushes entire month to Firebase and Google Sheets
console.log('\n--- Test 5: confirmBulkPaste broadcasts to Firebase and Google Sheets ---');
global.window.appState = {
  workbookMgr: wbMgr,
  syncEngine: { syncMonth: async () => ({}) },
  activeTab: 'monthly-input'
};
MonthlyInputView.selectedMonth = "SEP-2026";
MonthlyInputView.closePasteModal = () => {};
MonthlyInputView.render = async () => {};

// Mock paste textarea DOM
global.document.getElementById = (id) => {
  if (id === 'bulk-paste-textarea') {
    return { value: "Task A\tDetails A\tProcess development\t20\nTask B\tDetails B\tProcess development\t30" };
  }
  if (id === 'bulk-paste-default-eng') return { value: "Sazzad" };
  return null;
};
global.document.getElementsByName = () => [{ checked: true, value: 'append' }];

fbCalls.pushEntireMonth = [];
gasCalls.pushAllLocalData = 0;

(async () => {
  await MonthlyInputView.confirmBulkPaste();
  assert.strictEqual(fbCalls.pushEntireMonth.length, 1, 'FirebaseSyncService.pushEntireMonth must be called on bulk paste');
  assert.strictEqual(fbCalls.pushEntireMonth[0], "SEP-2026");
  assert.strictEqual(gasCalls.pushAllLocalData, 1, 'GoogleSheetsSync.pushAllLocalData must be called on bulk paste');
  console.log('✔ PASS: confirmBulkPaste successfully pushed all tasks to Firebase & Google Sheets');

  // Test 6: Text adjustments in monthly_input_view
  console.log('\n--- Test 6: Text Area and Table Column Dimensions ---');
  assert.strictEqual(inputViewCode.includes('min-h-[46px]'), true, 'Must include min-h-[46px]');
  assert.strictEqual(inputViewCode.includes('32%') || inputViewCode.includes('w-[275px]'), true, 'Task Name col must expand responsive full width');
  assert.strictEqual(inputViewCode.includes('oninput="this.style.height=\'auto\';this.style.height=Math.min(88, Math.max(46, this.scrollHeight))+\'px\'"'), true, 'Must have auto-expanding oninput handler');
  console.log('✔ PASS: Text Area and Table Column widths and auto-expansion confirmed');

  console.log('\n================================================================');
  console.log('🏆 ALL 6 TEST SUITES PASSED! SUPERVISOR & CROSS-PC SYNC VERIFIED!');
  console.log('================================================================\n');
})();
