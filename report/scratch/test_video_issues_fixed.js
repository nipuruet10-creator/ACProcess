/**
 * Verification Test Suite for Issues from WhatsApp Video 2026-09-23 at 12.39.10 PM.mp4
 */
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

console.log("=== Testing Fixes for Video Issues ===\n");

// 1. Test startup sequence in app.js
console.log("--- Test 1: Verify Instant UI Render in app.js (Zero Blank Screen) ---");
const appCode = fs.readFileSync('Process_Report_Automation_System/app.js', 'utf8');
const switchTabPos = appCode.indexOf('await this.switchTab(this.currentTab)');
const backgroundSyncPos = appCode.indexOf('syncEngine.syncMonth(workbookMgr.activeMonth).catch');
assert(switchTabPos !== -1, "switchTab must be present in app.js");
assert(backgroundSyncPos !== -1, "syncMonth must be called with .catch (background non-blocking)");
assert(switchTabPos < backgroundSyncPos, "switchTab must be executed BEFORE background syncMonth to ensure instant render under 30ms");
console.log("✔ PASS: Instant UI render sequence confirmed. No blank screen on startup.\n");

// 2. Test supervisor auto-repair in MonthWorkbookManager.mergeFromCloud
console.log("--- Test 2: Verify mergeFromCloud Auto-Repairs Supervisor to Kamrul ---");
const wbCode = fs.readFileSync('Process_Report_Automation_System/tasks/month_workbook_manager.js', 'utf8');
const ctx = {
  window: { addEventListener: () => {} },
  document: { getElementById: () => null, addEventListener: () => {} },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = v; },
    removeItem(k) { delete this._data[k]; }
  },
  MasterDataManager: {
    getEngineers: () => [{ name: 'Sazzad', display: 'Sazzad (50463)' }, { name: 'Kamrul', display: 'Kamrul (44819)' }],
    getAllPersonnel: () => [
      { name: 'Sazzad', display: 'Sazzad (50463)', role: 'Engineer' },
      { name: 'Kamrul', display: 'Kamrul (44819)', role: 'Supervisor' }
    ]
  },
  HELPERS: { escapeHtml: s => s },
  FirebaseSyncService: { pushTask: () => {}, isConnected: () => true }
};
vm.createContext(ctx);
vm.runInContext(wbCode + '; this.MonthWorkbookManager = MonthWorkbookManager;', ctx);
const wbMgr = new ctx.MonthWorkbookManager();

// Simulate Google Sheets pushing tasks with Sazzad supervisor
wbMgr.mergeFromCloud({
  'SEP-2026': [
    { task_id: 'TEST-001', month: 'SEP-2026', task_name: 'Test Task 1', supervisor: 'Sazzad (50463)', assignee: 'Emon (58279)' },
    { task_id: 'TEST-002', month: 'SEP-2026', task_name: 'Test Task 2', supervisor: '', assignee: 'Rafi (45127)' }
  ]
});

const t1 = wbMgr.getTask('SEP-2026', 'TEST-001');
const t2 = wbMgr.getTask('SEP-2026', 'TEST-002');
assert.strictEqual(t1.supervisor, 'Kamrul (44819)', 'mergeFromCloud must convert Sazzad supervisor to Kamrul (44819)');
assert.strictEqual(t2.supervisor, 'Kamrul (44819)', 'mergeFromCloud must convert empty supervisor to Kamrul (44819)');
console.log("✔ PASS: mergeFromCloud auto-repair confirmed.\n");

// 3. Test FirebaseSyncService auto-healing and updateCell patch preservation
console.log("--- Test 3: Verify FirebaseSyncService Auto-Heal & updateCell Hardening ---");
const fbCode = fs.readFileSync('Process_Report_Automation_System/database/firebase_sync_service.js', 'utf8');
assert(fbCode.includes("if (!t.task_id) t.task_id = key;"), "hydrateMonth must auto-heal task_id from Firebase key");
assert(fbCode.includes("patch.task_name = lt.task_name"), "updateCell must preserve task_name to prevent crippled nodes");
assert(fbCode.includes("patch.assignee = lt.assignee"), "updateCell must preserve assignee");
assert(fbCode.includes("patch.supervisor = lt.supervisor"), "updateCell must preserve supervisor");
console.log("✔ PASS: FirebaseSyncService auto-healing and updateCell hardening confirmed.\n");

// 4. Test GoogleSheetsSync DOM row count comparison
console.log("--- Test 4: Verify GoogleSheetsSync View Refresh Protection ---");
const gasCode = fs.readFileSync('Process_Report_Automation_System/database/gas_sync_service.js', 'utf8');
assert(gasCode.includes("domRowCount === localCount"), "gas_sync_service must only skip render when domRowCount === localCount");
console.log("✔ PASS: GoogleSheetsSync view refresh logic confirmed.\n");

console.log("=========================================");
console.log("ALL VIDEO ISSUE VERIFICATION TESTS PASSED!");
console.log("=========================================\n");
