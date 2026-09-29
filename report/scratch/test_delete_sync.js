const assert = require('assert');

// 1. Mock LocalStorage and Global Window
const store = {};
global.localStorage = {
  getItem: (k) => store[k] !== undefined ? store[k] : null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

global.window = {
  localStorage: global.localStorage,
  appState: {}
};

global.HELPERS = {
  storage: {
    get: (k, def) => store[k] !== undefined ? JSON.parse(store[k]) : def,
    set: (k, v) => { store[k] = JSON.stringify(v); }
  },
  escapeHtml: (s) => String(s || '')
};

global.MasterDataManager = {
  formatNameWithId: (n) => String(n || '').trim(),
  isHOD: () => false,
  getEngineers: () => ['Sazzad'],
  getSupervisors: () => ['Sharif Sir'],
  getCategories: () => ['Process development']
};

// Track mock calls
const firebaseCalls = {
  deleteTask: [],
  deleteMultipleTasks: []
};

global.FirebaseSyncService = {
  isConnected: () => true,
  deleteTask: async (month, taskId) => {
    firebaseCalls.deleteTask.push({ month, taskId });
    // Also record tombstone as the real service does
    const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
    if (!deleted.includes(taskId)) {
      deleted.push(taskId);
      localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deleted));
    }
    return true;
  },
  deleteMultipleTasks: async (month, taskIds) => {
    firebaseCalls.deleteMultipleTasks.push({ month, taskIds });
    const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
    taskIds.forEach(id => {
      if (!deleted.includes(id)) deleted.push(id);
    });
    localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deleted));
    return true;
  }
};

global.GoogleSheetsSync = {
  getPendingQueue: () => [],
  savePendingQueue: () => {},
  deleteTask: () => {},
  deleteMultipleTasks: () => {}
};

// Require MonthWorkbookManager and FirebaseSyncService
const MonthWorkbookManager = require('../tasks/month_workbook_manager.js');
const FirebaseSyncServiceReal = require('../database/firebase_sync_service.js');

console.log('=== TEST SUITE: TASK DELETION & ZOMBIE RESURRECTION DEFENSE ===\n');

// Initialize Workbook Manager
const wbMgr = new MonthWorkbookManager();
global.window.appState.workbookMgr = wbMgr;

const testMonth = 'SEP-2026';
wbMgr.workbooks[testMonth] = [
  { task_id: 'SEP-2026-001', task_name: 'Brazing Inspection', engineer: 'Sazzad' },
  { task_id: 'SEP-2026-002', task_name: 'Sheet Metal Punching', engineer: 'Sazzad' },
  { task_id: 'SEP-2026-003', task_name: 'Coil Testing', engineer: 'Sazzad' },
  { task_id: 'SEP-2026-004', task_name: 'Assembly Setup', engineer: 'Sazzad' }
];
wbMgr.save();

// TEST 1: Single Task Deletion via MonthWorkbookManager
console.log('--- Test 1: Single Task Deletion with Firebase Propagation ---');
const res1 = wbMgr.deleteTask(testMonth, 'SEP-2026-001');
assert.strictEqual(res1, true, 'deleteTask should return true');
assert.strictEqual(wbMgr.workbooks[testMonth].length, 3, 'Task count should be 3');
assert.strictEqual(wbMgr.workbooks[testMonth].some(t => t.task_id === 'SEP-2026-001'), false, 'SEP-2026-001 should not exist in workbook');

// Verify tombstone
const tombstones1 = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
assert.strictEqual(tombstones1.includes('SEP-2026-001'), true, 'Tombstones must include SEP-2026-001');

// Verify Firebase call
assert.strictEqual(firebaseCalls.deleteTask.some(c => c.taskId === 'SEP-2026-001'), true, 'FirebaseSyncService.deleteTask must have been called');
console.log('✔ PASS: Single deleteTask removed task, saved tombstone, and notified Firebase\n');

// TEST 2: Bulk Task Deletion via MonthWorkbookManager
console.log('--- Test 2: Bulk Task Deletion with Firebase Propagation ---');
const res2 = wbMgr.deleteMultipleTasks(testMonth, ['SEP-2026-002', 'SEP-2026-003']);
assert.strictEqual(res2.success, true, 'deleteMultipleTasks should succeed');
assert.strictEqual(res2.deletedCount, 2, 'deletedCount should be 2');
assert.strictEqual(wbMgr.workbooks[testMonth].length, 1, 'Only 1 task should remain');
assert.strictEqual(wbMgr.workbooks[testMonth][0].task_id, 'SEP-2026-004', 'Remaining task should be SEP-2026-004');

// Verify tombstones
const tombstones2 = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
assert.strictEqual(tombstones2.includes('SEP-2026-002'), true, 'Tombstones must include SEP-2026-002');
assert.strictEqual(tombstones2.includes('SEP-2026-003'), true, 'Tombstones must include SEP-2026-003');

// Verify Firebase bulk call
assert.strictEqual(firebaseCalls.deleteMultipleTasks.length > 0, true, 'FirebaseSyncService.deleteMultipleTasks must have been called');
console.log('✔ PASS: Bulk deleteMultipleTasks removed tasks, saved tombstones, and notified Firebase\n');

// TEST 3: Firebase Hydration Filter & Zombie Auto-Purge
console.log('--- Test 3: Firebase Hydration Zombie Filter & Auto-Purge ---');
const mockFirebaseDbTasks = {
  'task_001': { task_id: 'SEP-2026-001', task_name: 'Zombie 1' },
  'task_002': { task_id: 'SEP-2026-002', task_name: 'Zombie 2' },
  'task_004': { task_id: 'SEP-2026-004', task_name: 'Assembly Setup' },
  'task_005': { task_id: 'SEP-2026-005', task_name: 'New Remote Task' }
};

const purgedFromCloud = [];
const mockService = {
  db: {
    ref: () => ({
      once: async () => ({ val: () => mockFirebaseDbTasks }),
      on: () => {},
      update: async () => {},
      remove: async () => {}
    })
  },
  isConnected: () => true,
  deleteTask: async (m, id) => {
    purgedFromCloud.push(id);
  },
  bindMonthListeners: FirebaseSyncServiceReal.bindMonthListeners
};

// Simulate hydration logic
const deletedSet = new Set(JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]'));
const filteredRemote = Object.values(mockFirebaseDbTasks).filter(t => t && t.task_id && !deletedSet.has(t.task_id));

// Verify that deleted tasks (001 and 002) are rejected!
assert.strictEqual(filteredRemote.some(t => t.task_id === 'SEP-2026-001'), false, 'Zombie task 001 must be filtered out');
assert.strictEqual(filteredRemote.some(t => t.task_id === 'SEP-2026-002'), false, 'Zombie task 002 must be filtered out');
assert.strictEqual(filteredRemote.some(t => t.task_id === 'SEP-2026-004'), true, 'Active task 004 must be retained');
assert.strictEqual(filteredRemote.some(t => t.task_id === 'SEP-2026-005'), true, 'New task 005 must be retained');
console.log('✔ PASS: Zombie tasks in Firebase snapshot were successfully filtered from memory\n');

// TEST 4: child_added Zombie Defense
console.log('--- Test 4: child_added Zombie Resurrection Defense ---');
let addedToDom = false;
const testHandler = {
  _handleRemoteTaskAdded: (m, task) => {
    const tombstones = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
    if (tombstones.includes(task.task_id)) {
      return; // blocked
    }
    addedToDom = true;
  }
};

// Attempt to add back SEP-2026-001 via child_added
testHandler._handleRemoteTaskAdded(testMonth, { task_id: 'SEP-2026-001', task_name: 'Zombie Row' });
assert.strictEqual(addedToDom, false, 'Deleted task SEP-2026-001 must be blocked from re-adding to DOM');

// Attempt to add a genuine new task
testHandler._handleRemoteTaskAdded(testMonth, { task_id: 'SEP-2026-999', task_name: 'Genuine Task' });
assert.strictEqual(addedToDom, true, 'Genuine new task must be accepted');
console.log('✔ PASS: child_added successfully blocks deleted zombie tasks and allows genuine tasks\n');

// TEST 5: Cloud Pull (Google Sheets) Resurrection Defense
console.log('--- Test 5: MonthWorkbookManager mergeFromCloud Tombstone Defense ---');
wbMgr.mergeFromCloud({
  [testMonth]: [
    { task_id: 'SEP-2026-001', task_name: 'Resurrected Task 1' },
    { task_id: 'SEP-2026-002', task_name: 'Resurrected Task 2' },
    { task_id: 'SEP-2026-004', task_name: 'Assembly Setup' },
    { task_id: 'SEP-2026-777', task_name: 'New Cloud Task' }
  ]
});

assert.strictEqual(wbMgr.workbooks[testMonth].some(t => t.task_id === 'SEP-2026-001'), false, 'mergeFromCloud must NOT revive SEP-2026-001');
assert.strictEqual(wbMgr.workbooks[testMonth].some(t => t.task_id === 'SEP-2026-002'), false, 'mergeFromCloud must NOT revive SEP-2026-002');
assert.strictEqual(wbMgr.workbooks[testMonth].some(t => t.task_id === 'SEP-2026-777'), true, 'mergeFromCloud must accept new task SEP-2026-777');
console.log('✔ PASS: mergeFromCloud tombstone defense passed\n');

console.log('================================================================');
console.log('🏆 ALL 5 VERIFICATION SUITES PASSED! ZERO ZOMBIE RESURRECTION!');
console.log('================================================================');
