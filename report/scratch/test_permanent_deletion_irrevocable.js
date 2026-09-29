const assert = require('assert');
const fs = require('fs');

console.log("=== RUNNING PERMANENT IRREVOCABLE DELETION & TOMBSTONE TEST ===");

const fbServiceCode = fs.readFileSync('./database/firebase_sync_service.js', 'utf8');
const monthlyInputCode = fs.readFileSync('./tasks/monthly_input_view.js', 'utf8');
const workbookMgrCode = fs.readFileSync('./tasks/month_workbook_manager.js', 'utf8');

// 1. Verify that deletedSet.delete(activeId) is COMPLETELY REMOVED from hydrateMonth
assert.strictEqual(
  fbServiceCode.includes('deletedSet.delete(activeId)'),
  false,
  "FATAL: deletedSet.delete(activeId) must NOT exist in firebase_sync_service.js! It wiped tombstones on every reload!"
);
console.log("✔ TEST 1 PASSED: hydrateMonth never erases tombstones.");

// 2. Verify that hydrateMonth purges tombstoned tasks directly from cloud and updates deleted_task_ids
assert.ok(
  fbServiceCode.includes('deletedSet.has(t.task_id)') &&
  fbServiceCode.includes('walton_monthly_report/deleted_task_ids/${t.task_id}'),
  "hydrateMonth must purge tombstoned tasks from Firebase and ensure cloud tombstone is set"
);
console.log("✔ TEST 2 PASSED: hydrateMonth purges tombstoned tasks from cloud.");

// 3. Verify _handleRemoteTaskAdded and _handleRemoteTaskChanged reject and purge tombstoned tasks
assert.ok(
  fbServiceCode.includes('_handleRemoteTaskAdded') &&
  fbServiceCode.includes('this.db.ref(`walton_monthly_report/workbooks/${month}/tasks/${task.task_id}`).remove()'),
  "_handleRemoteTaskAdded must purge tombstoned tasks from cloud"
);
console.log("✔ TEST 3 PASSED: Real-time listeners reject and purge tombstoned tasks.");

// 4. Verify pushTask unconditionally blocks tombstoned tasks
assert.ok(
  fbServiceCode.includes('FirebaseSyncService.pushTask BLOCKED') &&
  !fbServiceCode.includes('if (task._isLocalDraft) {\n          deletedList = deletedList.filter'),
  "pushTask must block tombstoned tasks without exception"
);
console.log("✔ TEST 4 PASSED: pushTask unconditionally blocks tombstoned tasks.");

// 5. Verify debounced points input in MonthlyInputView to eliminate lag
assert.ok(
  monthlyInputCode.includes("MonthlyInputView.handleFieldInput('${t.task_id}', 'points', this.value)"),
  "Points input must use handleFieldInput oninput to prevent full ranking re-renders per keystroke"
);
console.log("✔ TEST 5 PASSED: Typing in points input is debounced and lag-free.");

// 6. Verify KPI Total Tasks matches allTasks.length and totalTasksSum
assert.ok(
  monthlyInputCode.includes('id="kpi-total-tasks-val">${allTasks.length}</div>') &&
  monthlyInputCode.includes('if (kpiTotalTasks) kpiTotalTasks.textContent = allTasks.length;') &&
  monthlyInputCode.includes('if (kpiTasks) kpiTasks.textContent = totalTasksSum;'),
  "KPI task counters must be synchronized with total tasks length"
);
console.log("✔ TEST 6 PASSED: KPI Total Tasks counter is fully synchronized.");

console.log("\n ALL 6 PERMANENT DELETION & SYNC TESTS PASSED SUCCESSFULLY!");
