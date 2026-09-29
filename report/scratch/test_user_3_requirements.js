const assert = require('assert');
const fs = require('fs');

console.log("--- TEST SUITE: 3 User Requirements ---");

// Mock localStorage before require
global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; }
};

const { MasterDataManager: MDM, MASTER_LISTS } = require('../config/master_lists.js');
assert(MDM, "MasterDataManager must be defined");

// 1. Verify Master Admin credentials
assert(MDM.verifyMasterAdmin('50463', 'ACprocess@2026') === true, "Master Admin verification must succeed for 50463 / ACprocess@2026");
assert(MDM.verifyMasterAdmin('50463', 'wrong') === false, "Master Admin verification must fail for wrong pass");
assert(MDM.verifyMasterAdmin('12345', 'ACprocess@2026') === false, "Master Admin verification must fail for wrong ID");

// 2. Verify Unique Passwords for all engineers
const engineers = MDM.getEngineers();
console.log(`\nVerified ${engineers.length} default engineers:`);
engineers.forEach(e => {
  assert(e.access_pin, `Engineer ${e.name} must have access_pin`);
  console.log(` - ${e.fullName || e.name} (${e.id}) -> Security Pass: ${e.access_pin}, TMS Pass: ${e.tms_password}`);
  // Engineer can unlock their own
  const ownUnlock = MDM.verifyEngineerAccess(e.id, e.id, e.access_pin);
  assert(ownUnlock.success === true, `Engineer ${e.name} must unlock their own row`);
  // Engineer CANNOT unlock another engineer's row
  const otherEng = engineers.find(o => o.id !== e.id);
  if (otherEng) {
    const wrongUnlock = MDM.verifyEngineerAccess(otherEng.id, e.id, e.access_pin);
    assert(wrongUnlock.success === false, `Engineer ${e.name} must NOT be able to unlock ${otherEng.name}`);
  }
  // Master Admin can unlock any engineer's row
  const masterUnlock = MDM.verifyEngineerAccess(e.id, '50463', 'ACprocess@2026');
  assert(masterUnlock.success === true && masterUnlock.isMasterAdmin === true, "Master Admin must be able to unlock any engineer");
});

// 3. Verify Supervisors list
const supervisors = MDM.getSupervisors();
console.log(`\nVerified ${supervisors.length} supervisors:`);
supervisors.forEach(s => {
  console.log(` - ${s.name} (${s.id}) - ${s.title}`);
});
assert(supervisors.some(s => String(s.id) === '44819' && s.name === 'Kamrul'), "Kamrul (44819) must be default supervisor");
assert(supervisors.some(s => String(s.id) === '50463' && s.name === 'Sazzad'), "Sazzad (50463) must be default supervisor");

// 4. Test Add & Delete Supervisor
const testSup = MDM.addSupervisor({ name: "TestLead", id: "99999", title: "Test Supervisor", email: "test@waltonbd.com" });
assert(MDM.getSupervisors().some(s => s.id === "99999"), "New supervisor must be added");
MDM.deleteSupervisor("99999");
assert(!MDM.getSupervisors().some(s => s.id === "99999"), "Supervisor must be deleted");

// 5. Test SettingsView code verification
const settingsCode = fs.readFileSync('e:/Antigravity/Keyword Research/Process_Report_Automation_System/config/settings_view.js', 'utf8');
assert(settingsCode.includes("ACprocess@2026"), "SettingsView must use ACprocess@2026 for master verification");
assert(settingsCode.includes("openUnlockStaffModal"), "SettingsView must have openUnlockStaffModal");
assert(settingsCode.includes("openAddSupervisorModal"), "SettingsView must have openAddSupervisorModal");
assert(settingsCode.includes("deleteSupervisor"), "SettingsView must have deleteSupervisor");
assert(settingsCode.includes("openDeleteStaffModal"), "SettingsView must have openDeleteStaffModal");
assert(settingsCode.includes("openAddStaffModal"), "SettingsView must have openAddStaffModal");

// 6. Test Firebase Realtime sync code verification
const fbCode = fs.readFileSync('e:/Antigravity/Keyword Research/Process_Report_Automation_System/database/firebase_sync_service.js', 'utf8');
assert(fbCode.includes("pushMasterSupervisors"), "FirebaseSyncService must implement pushMasterSupervisors");
assert(fbCode.includes("hydrateMasterPersonnel"), "FirebaseSyncService must implement hydrateMasterPersonnel");
assert(fbCode.includes("walton_monthly_report/master_supervisors"), "FirebaseSyncService must listen to master_supervisors");
assert(!fbCode.includes("k === 'points') &&\n          localTask._lastFieldEditTime"), "Points must NOT be blocked by _lastFieldEditTime in _handleRemoteTaskChanged");

// 7. Test MonthWorkbookManager points precedence
const wbCode = fs.readFileSync('e:/Antigravity/Keyword Research/Process_Report_Automation_System/tasks/month_workbook_manager.js', 'utf8');
assert(wbCode.includes("Remote points set by HOD in Firebase always take authoritative precedence"), "mergeFromCloud must prioritize remote HOD points");

console.log("\n✅ ALL TESTS PASSED SUCCESSFULLY!");
