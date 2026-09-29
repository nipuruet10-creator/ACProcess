const assert = require('assert');

// Mock localStorage and window
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

global.window = {
  localStorage: global.localStorage
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
  isHOD: () => false
};

// Require modules
const PROMPT_TEMPLATES = require('../ai/prompt_templates.js');
const MonthWorkbookManager = require('../tasks/month_workbook_manager.js');

console.log('=== RUNNING TARGETED UNIT TESTS ===');

// 1. Test Prompt Templates Step Generation
console.log('\n--- 1. Testing AI Step Breakdown (4-5 Numbered Steps) ---');
const tasksToTest = [
  { name: 'Assembly Line Relocation', cat: 'Process extension' },
  { name: 'Task entry from new setup', cat: 'Process development' },
  { name: 'task 2', cat: 'Process development' },
  { name: 'task 3', cat: 'Process development' },
  { name: '5.6 KW - 0101 Compact Cassettes Brazing Jig Development', cat: 'Major Dev' }
];

tasksToTest.forEach(t => {
  const steps = PROMPT_TEMPLATES.generateEngineeringSteps(t.name, t.cat);
  console.log(`\nTask: "${t.name}"`);
  console.log(`Steps: ${steps}`);
  
  // Verify starts with 1.
  assert(steps.startsWith('1. '), `Should start with '1. ', got: ${steps}`);
  // Verify contains numbered steps 1 to at least 4
  const count = (steps.match(/\b\d+\.\s/g) || []).length;
  assert(count >= 4 && count <= 5, `Expected 4 or 5 numbered steps, got ${count}`);
  console.log(`[PASS] Verified ${count} numbered steps`);
});

// 2. Test MonthWorkbookManager
console.log('\n--- 2. Testing MonthWorkbookManager Tombstone & Sync Defense ---');
const mgr = new MonthWorkbookManager();

// Seed with an old deleted task to verify sanitizeWorkbooks purges it
mgr.workbooks['SEP-2026'] = [
  { task_id: 'SEP-2026-001', task_name: 'Assembly Line Relocation', month: 'SEP-2026', points: 50, include_in_report: 'YES' },
  { task_id: 'SEP-2026-002-TEST', task_name: 'Task entry from new setup', month: 'SEP-2026', points: 100, include_in_report: 'YES' },
  { task_id: 'SEP-2026-003', task_name: '5.6 KW - 0101 Compact Cassettes  Brazing Jig Development', month: 'SEP-2026', points: 60, include_in_report: 'YES' }
];

mgr.sanitizeWorkbooks();
const sepTasksAfterSanitize = mgr.getTasksForMonth('SEP-2026');
console.log('Tasks after sanitize:', sepTasksAfterSanitize.map(t => `${t.task_id} (${t.task_name})`));

// Verify 5.6 KW and -TEST were purged
assert(!sepTasksAfterSanitize.some(t => t.task_name.includes('Compact Cassettes')), '5.6 KW should be purged by sanitizeWorkbooks');
assert(!sepTasksAfterSanitize.some(t => t.task_id.includes('-TEST')), 'TEST task should be purged by sanitizeWorkbooks');
console.log('[PASS] sanitizeWorkbooks successfully purged legacy deleted tasks');

// Verify deletedIds contains the purged IDs
const deletedIds = JSON.parse(store['walton_deleted_task_ids'] || '[]');
console.log('walton_deleted_task_ids:', deletedIds);
assert(deletedIds.includes('SEP-2026-003'), 'walton_deleted_task_ids must contain SEP-2026-003');
console.log('[PASS] walton_deleted_task_ids recorded tombstones');

// Test mergeFromCloud when cloud tries to push 5.6 KW back
console.log('\n--- 3. Testing mergeFromCloud Suppression of Resurrected Tasks ---');
mgr.mergeFromCloud({
  'SEP-2026': [
    { task_id: 'SEP-2026-001', task_name: 'Assembly Line Relocation', month: 'SEP-2026', points: 50, include_in_report: 'YES' },
    { task_id: 'SEP-2026-002', task_name: 'Task entry from new setup', month: 'SEP-2026', points: 100, include_in_report: 'YES' },
    { task_id: 'SEP-2026-003', task_name: '5.6 KW - 0101 Compact Cassettes  Brazing Jig Development', month: 'SEP-2026', points: 60, include_in_report: 'YES' }
  ]
}, true);

const sepTasksAfterCloud = mgr.getTasksForMonth('SEP-2026');
console.log('Tasks after mergeFromCloud:', sepTasksAfterCloud.map(t => `${t.task_id} (${t.task_name})`));
assert(!sepTasksAfterCloud.some(t => t.task_id === 'SEP-2026-003'), 'Resurrected SEP-2026-003 must NOT be present in local workbook');
console.log('[PASS] mergeFromCloud successfully blocked resurrected task');

// Test default Sep 2026 tasks
console.log('\n--- 4. Testing Default SEP-2026 Tasks ---');
const defaults = mgr.getDefaultSep2026Tasks();
console.log('Defaults count:', defaults.length);
assert.strictEqual(defaults.length, 2, 'Should have 2 canonical default tasks');
console.log('[PASS] 2 canonical default tasks verified');

console.log('\n>>> ALL UNIT TESTS PASSED SUCCESSFULLY! <<<');
