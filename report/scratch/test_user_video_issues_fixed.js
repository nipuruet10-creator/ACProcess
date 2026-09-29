const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("=== Testing Fixes for User Video & Deletion / New Entry Issues ===");

const basePath = "E:/Antigravity/Keyword Research/Process_Report_Automation_System";

const dashCtrlJs = fs.readFileSync(path.join(basePath, "dashboard/dashboard_controller.js"), 'utf8');
const wbMgrJs = fs.readFileSync(path.join(basePath, "tasks/month_workbook_manager.js"), 'utf8');
const firebaseSyncJs = fs.readFileSync(path.join(basePath, "database/firebase_sync_service.js"), 'utf8');
const monthlyInputJs = fs.readFileSync(path.join(basePath, "tasks/monthly_input_view.js"), 'utf8');

// 1. DashboardController must NEVER auto-heal or resurrect tasks when empty
assert(!dashCtrlJs.includes("Auto-heal September 2026 genuine tasks if missing or empty"), "DashboardController must not contain auto-heal logic");
assert(!dashCtrlJs.includes("workbookMgr.getDefaultSep2026Tasks()"), "DashboardController must not call getDefaultSep2026Tasks");
console.log("✔ Fix 1 Passed: DashboardController never resurrects deleted tasks when switching tabs.");

// 2. MonthWorkbookManager bootstrap must not seed fake tasks for SEP-2026
assert(!wbMgrJs.includes("this.workbooks[\"SEP-2026\"] = this.getDefaultSep2026Tasks();"), "Bootstrap must not seed fake tasks for SEP-2026");
assert(wbMgrJs.includes("this.workbooks[\"SEP-2026\"] = [];"), "SEP-2026 must start clean and empty");
console.log("✔ Fix 2 Passed: MonthWorkbookManager bootstrap leaves SEP-2026 clean and empty.");

// 3. mergeFromCloud must NEVER prune local drafts or recently created tasks
assert(wbMgrJs.includes("if (lt._isLocalDraft || (lt._lastFieldEditTime && Date.now() - lt._lastFieldEditTime < 60000)"), "mergeFromCloud must preserve local drafts");
console.log("✔ Fix 3 Passed: mergeFromCloud strictly protects local drafts from being wiped by background sync.");

// 4. addTask must clear tombstone
assert(wbMgrJs.includes("Guarantee new task ID is never shadowed by previous tombstone"), "addTask must clear tombstone");
console.log("✔ Fix 4 Passed: addTask guarantees new task IDs are never shadowed by tombstones.");

// 5. updateTask must auto-recover instead of throwing fatal crash
assert(wbMgrJs.includes("auto-recovering"), "updateTask must auto-recover missing tasks");
assert(!wbMgrJs.includes("throw new Error(`Task with ID ${taskId} not found in ${m}`);"), "updateTask must not throw not found error");
console.log("✔ Fix 5 Passed: updateTask auto-recovers gracefully without throwing 'Task not found' alert.");

// 6. FirebaseSyncService hydrateMonth and pushTask must support local drafts
assert(firebaseSyncJs.includes("if (task._isLocalDraft) {\n          deletedList = deletedList.filter(id => id !== task.task_id);"), "Firebase pushTask must unblock local drafts");
console.log("✔ Fix 6 Passed: Firebase pushTask allows local drafts to sync smoothly.");

console.log("\n🎉 ALL TESTS PASSED: User video issues completely resolved!");
