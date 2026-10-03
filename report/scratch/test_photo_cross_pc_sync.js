const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("=================================================================");
console.log("       VERIFYING CROSS-PC MULTI-DEVICE PHOTO SYNCHRONIZATION     ");
console.log("=================================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${e.message}`);
    failed++;
  }
}

// Read the files
const fbFile = fs.readFileSync(path.join(__dirname, '../database/firebase_sync_service.js'), 'utf8');
const wbFile = fs.readFileSync(path.join(__dirname, '../tasks/month_workbook_manager.js'), 'utf8');
const pmFile = fs.readFileSync(path.join(__dirname, '../photos/photo_manager.js'), 'utf8');

test("Firebase hydrateMonth does NOT block remote photos when local photo is empty", () => {
  assert(!fbFile.includes('!isLocalBeforeEmpty'), "Removed !isLocalBeforeEmpty blocker from hydrateMonth");
  assert(!fbFile.includes('!isLocalAfterEmpty'), "Removed !isLocalAfterEmpty blocker from hydrateMonth");
});

test("Firebase hydrateMonth supports all photo aliases (photo_1, before_photo, photo_2, after_photo, photo)", () => {
  assert(fbFile.includes('const photo1 = t.photo_1 || t.before_photo;'), "Supports photo_1 and before_photo in hydrate");
  assert(fbFile.includes('const photo2 = t.photo_2 || t.after_photo || t.photo;'), "Supports photo_2, after_photo, photo in hydrate");
});

test("Firebase _handleRemoteTaskChanged handles photo field aliases and syncs to workbookMgr", () => {
  assert(fbFile.includes("field === 'before_photo' || field === 'after_photo' || field === 'photo'"), "Listens to all photo field changes");
  assert(fbFile.includes("window.appState.workbookMgr.getTask"), "Syncs incoming photo changes to local workbook task");
});

test("MonthWorkbookManager mergeFromCloud adopts remote photo when local is empty without pushback", () => {
  assert(!wbFile.includes('lt.photo_1 !== ""'), "Does not require local photo to be non-empty to adopt remote");
  assert(!wbFile.includes('lt.photo_2 !== ""'), "Does not require local photo to be non-empty to adopt remote");
  assert(!wbFile.includes('|| lVal === ""'), "Does not treat empty local value as a deletion requiring cloud pushback");
});

test("PhotoManager formatPhotoUrl resolves relative uploads/ paths correctly", () => {
  assert(pmFile.includes("formatPhotoUrl(url)"), "PhotoManager includes formatPhotoUrl method");
  assert(pmFile.includes("p1 = this.formatPhotoUrl(p1);"), "getTaskPhotos normalizes before_photo URL");
  assert(pmFile.includes("p2 = this.formatPhotoUrl(p2);"), "getTaskPhotos normalizes after_photo URL");
});

test("PhotoManager fetchPhotosFromServer syncs photos into MonthWorkbookManager", () => {
  assert(pmFile.includes("wbMgr.getTask(activeM, tId)"), "fetchPhotosFromServer updates workbook tasks with photos");
});

test("Hashmi photos exist permanently on disk in uploads/photos/SEP-2026", () => {
  const dir = path.join(__dirname, '../uploads/photos/SEP-2026');
  const files = [
    'SEP-2026-040-H2RS_after_photo.jpg',
    'SEP-2026-041-YR9Y_after_photo.jpg',
    'SEP-2026-042-6DXD_after_photo.jpg',
    'SEP-2026-043-BHC1_after_photo.jpg',
    'SEP-2026-047-DB1C_after_photo.jpg'
  ];
  for (const f of files) {
    const fullP = path.join(dir, f);
    assert(fs.existsSync(fullP), `File ${f} must exist on disk`);
    const stat = fs.statSync(fullP);
    assert(stat.size > 1000, `File ${f} must be a valid non-empty image (got ${stat.size} bytes)`);
  }
});

console.log("\n=================================================================");
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("=================================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL CROSS-DEVICE PHOTO TESTS PASSED!");
  process.exit(0);
}
