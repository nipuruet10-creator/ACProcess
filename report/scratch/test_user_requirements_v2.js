/**
 * Test Suite: Verification of User Requirements (V2 & Mockup Alignment)
 * 1. 2-Column Sidebar Layout & 7 Core Navigation Tabs
 * 2. Top Executive Bar with Centered Month Pill & Actions
 * 3. 4 Top KPI Cards (Engineers, Tasks, Points, Top Performer)
 * 4. Engineers Filter Pills & Single-Row Search/Filter Toolbar
 * 5. Single Continuous Page Task Grid (Zero Pagination Numbers)
 * 6. Permanent Points Entry & Non-Loss Protection Across Devices
 * 7. Permanent Deletions with Firebase Cloud Tombstones
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

console.log('=== TEST SUITE: USER REQUIREMENTS & MOCKUP VERIFICATION ===\n');

// 1. Verify index.html 2-column sidebar layout, branding, and tabs
console.log('--- Test 1: 2-Column Sidebar Layout, Walton Branding & Core Tabs ---');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

assert.strictEqual(indexHtml.includes('<aside class="w-64 bg-white border-r'), true, 'Left sidebar must be present');
assert.strictEqual(indexHtml.includes('Better Process'), true, 'Sidebar must include Better Process graphic');
assert.strictEqual(indexHtml.includes('Brighter Tomorrow'), true, 'Sidebar must include Brighter Tomorrow graphic');
assert.strictEqual(indexHtml.includes('Plus+Jakarta+Sans'), true, 'index.html must load Plus Jakarta Sans');
assert.strictEqual(indexHtml.includes('Inter'), true, 'index.html must load Inter');

// Ensure 7 core tabs remain in sidebar
const coreTabs = ['dashboard', 'monthly-input', 'mgmt-report', 'projects', 'photo-manager', 'final-report', 'settings'];
coreTabs.forEach(tab => {
  assert.strictEqual(indexHtml.includes(`data-tab="${tab}"`), true, `Core tab ${tab} must be present`);
});
console.log('✔ PASS: 2-Column Sidebar Layout, Walton branding, and 7 core tabs confirmed.');

// 2. Verify Top Executive Header in index.html
console.log('\n--- Test 2: Top Executive Header & Centered Month Container ---');
assert.strictEqual(indexHtml.includes('id="top-month-selector-container"'), true, 'Centered month selector container must exist');
assert.strictEqual(indexHtml.includes('AC Process Development'), true, 'AC Process Development title must exist');
assert.strictEqual(indexHtml.includes('Process Development Monthly Report'), true, 'Subtitle must exist');
assert.strictEqual(indexHtml.includes('Real-Time Live'), true, 'Real-Time Live badge must exist');
assert.strictEqual(indexHtml.includes('Generate Report'), true, 'Generate Report button must exist');
console.log('✔ PASS: Top executive header with centered month container and action badges confirmed.');

// 3. Verify Monthly Input View Mockup Components (4 KPI Cards, Engineer Pills, Search Toolbar)
console.log('\n--- Test 3: 4 KPI Cards, Engineer Filter Pills & Search Toolbar ---');
const inputViewCode = fs.readFileSync(path.join(ROOT, 'tasks', 'monthly_input_view.js'), 'utf8');

// 4 KPI Cards
assert.strictEqual(inputViewCode.includes('Total Engineers'), true, 'Total Engineers card must exist');
assert.strictEqual(inputViewCode.includes('Total Tasks'), true, 'Total Tasks card must exist');
assert.strictEqual(inputViewCode.includes('Total Actual Points'), true, 'Total Actual Points card must exist');
assert.strictEqual(inputViewCode.includes('Top Performer'), true, 'Top Performer card must exist');

// Engineers Filter Bar
assert.strictEqual(inputViewCode.includes('Engineers:'), true, 'Engineers filter label must exist');
assert.strictEqual(inputViewCode.includes('All Personnel'), true, 'All Personnel pill must exist');

// Search & Filter Toolbar
assert.strictEqual(inputViewCode.includes('Search task name, details or keyword...'), true, 'Search input placeholder must exist');
assert.strictEqual(inputViewCode.includes('task-filter-category'), true, 'Category filter dropdown must exist');
assert.strictEqual(inputViewCode.includes('task-filter-supervisor'), true, 'Supervisor filter dropdown must exist');
assert.strictEqual(inputViewCode.includes('task-filter-assignee'), true, 'Assignee filter dropdown must exist');
assert.strictEqual(inputViewCode.includes('task-filter-report'), true, 'Report filter dropdown must exist');
console.log('✔ PASS: 4 KPI cards, engineer filter pills, and search/filter toolbar confirmed.');

// 4. Verify Single Page Task Grid (NO Pagination Numbers)
console.log('\n--- Test 4: Single Page Task Grid (Zero Pagination Numbers) ---');
assert.strictEqual(inputViewCode.includes('Showing all'), true, 'Footer must display "Showing all N tasks"');
assert.strictEqual(inputViewCode.includes('Real-Time Instant Cloud Sync Active'), true, 'Footer must show Real-Time Cloud Sync status');
// Verify pagination controls are NOT present
assert.strictEqual(inputViewCode.includes('10 / page'), false, 'Pagination items-per-page must NOT exist');
assert.strictEqual(inputViewCode.includes('10/page'), false, 'Pagination 10/page must NOT exist');
assert.strictEqual(inputViewCode.includes('pagination-btn'), false, 'Pagination buttons must NOT exist');
console.log('✔ PASS: Single scrollable page confirmed with ZERO pagination numbers (User requirement met).');

// 5. Verify Points Protection in MonthWorkbookManager
console.log('\n--- Test 5: Permanent Points Entry & Non-Loss Protection ---');
const localStorageData = {};
global.localStorage = {
  getItem: (k) => localStorageData[k] || null,
  setItem: (k, v) => { localStorageData[k] = String(v); },
  removeItem: (k) => { delete localStorageData[k]; }
};

global.window = {
  appState: {},
  showToast: () => {}
};

const wbManagerCode = fs.readFileSync(path.join(ROOT, 'tasks', 'month_workbook_manager.js'), 'utf8');
const vm = require('vm');
const context = {
  console,
  localStorage: global.localStorage,
  window: global.window,
  Date,
  Object,
  Array,
  String,
  parseFloat,
  isNaN,
  Boolean,
  Set,
  Map,
  JSON
};
vm.createContext(context);
vm.runInContext(wbManagerCode + '\nglobalThis.MonthWorkbookManager = MonthWorkbookManager;', context);
const MonthWorkbookManager = context.MonthWorkbookManager;

const mgr = new MonthWorkbookManager();
mgr.workbooks['SEP-2026'] = [
  {
    task_id: 'SEP-2026-001',
    month: 'SEP-2026',
    task_name: 'Assembly Line Relocation',
    task_details: 'Step 1 Step 2',
    category: 'Process development',
    points: 75,
    supervisor: 'Kamrul (44819)',
    assignee: 'Sazzad (50463)',
    last_updated: '2026-09-23T10:00:00.000Z'
  }
];

// Empty remote points must not overwrite local points
const cloudDataWithEmptyPoints = {
  'SEP-2026': [
    {
      task_id: 'SEP-2026-001',
      month: 'SEP-2026',
      task_name: 'Assembly Line Relocation',
      task_details: 'Step 1 Step 2',
      category: 'Process development',
      points: '',
      supervisor: 'Kamrul (44819)',
      assignee: 'Sazzad (50463)',
      last_updated: '2026-09-23T09:00:00.000Z'
    }
  ]
};

mgr.mergeFromCloud(cloudDataWithEmptyPoints, false);
const taskAfterSync = mgr.getTask('SEP-2026', 'SEP-2026-001');
assert.strictEqual(taskAfterSync.points, 75, 'Local points MUST NOT be wiped out by remote empty points!');
console.log('✔ PASS: Local points (75) were 100% preserved against empty remote sync.');

// Genuine remote points update with newer timestamp
const cloudDataWithNewerPoints = {
  'SEP-2026': [
    {
      task_id: 'SEP-2026-001',
      month: 'SEP-2026',
      task_name: 'Assembly Line Relocation',
      task_details: 'Step 1 Step 2',
      category: 'Process development',
      points: 85,
      supervisor: 'Kamrul (44819)',
      assignee: 'Sazzad (50463)',
      last_updated: '2026-09-23T12:00:00.000Z'
    }
  ]
};

mgr.mergeFromCloud(cloudDataWithNewerPoints, false);
const taskAfterGenuineUpdate = mgr.getTask('SEP-2026', 'SEP-2026-001');
assert.strictEqual(taskAfterGenuineUpdate.points, 85, 'Genuine remote points update with newer timestamp must be accepted');
console.log('✔ PASS: Genuine remote points update (85) was correctly applied.');

// 6. Verify Permanent Deletions with Firebase Cloud Tombstones
console.log('\n--- Test 6: Permanent Deletions & Cloud Tombstones ---');
const fbServiceCode = fs.readFileSync(path.join(ROOT, 'database', 'firebase_sync_service.js'), 'utf8');

assert.strictEqual(fbServiceCode.includes('walton_monthly_report/deleted_task_ids/${taskId}'), true, 'deleteTask must write to Firebase deleted_task_ids');
assert.strictEqual(fbServiceCode.includes('walton_monthly_report/deleted_task_ids/${id}'), true, 'deleteMultipleTasks must write to Firebase deleted_task_ids');
assert.strictEqual(fbServiceCode.includes('walton_monthly_report/deleted_task_ids\').on(\'child_added\''), true, 'Firebase listener must watch deleted_task_ids');
console.log('✔ PASS: Firebase cloud tombstones ensure deletions are permanent across all devices.');

console.log('\n================================================================');
console.log('🏆 ALL 6 USER REQUIREMENT TEST SUITES PASSED FLAWLESSLY!');
console.log('================================================================\n');
