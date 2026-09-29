const assert = require('assert');

// Mock localStorage
global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  get length() { return Object.keys(this._store).length; },
  key(i) { return Object.keys(this._store)[i] || null; }
};

const MonthWorkbookManager = require('../tasks/month_workbook_manager.js');
const { PhotoManager } = require('../photos/photo_manager.js');

global.window = {
  appState: {
    workbookMgr: new MonthWorkbookManager(),
    activeTab: 'photo-manager',
    syncEngine: {
      getActiveSlides(m) {
        return this.slides || [];
      },
      slides: []
    }
  }
};

const wbMgr = global.window.appState.workbookMgr;
const pm = new PhotoManager();
global.photoManager = pm;

async function runComprehensiveTest() {
  console.log("=== COMPREHENSIVE PHOTO DELETE & ZERO-RESURRECTION TEST ===");

  const month = "SEP-2026";
  const taskId = "SEP-2026-003-SJ2";

  // Initialize task in workbook
  wbMgr.workbooks[month] = [{
    task_id: taskId,
    task_name: "Compressor Jacket 24M0610 Die Setup and trial",
    engineer: "Mohammad Faiyaz Hossain",
    photo_1: "data:image/png;base64,BEFORE_IMG_DATA",
    photo_2: "data:image/png;base64,AFTER_IMG_DATA"
  }];

  // Set slides in mock syncEngine
  window.appState.syncEngine.slides = [{
    task_id: taskId,
    slide_title: "Compressor Jacket 24M0610 Die Setup and trial",
    photo_before: "data:image/png;base64,BEFORE_IMG_DATA",
    photo_after: "data:image/png;base64,AFTER_IMG_DATA",
    photo: "data:image/png;base64,BEFORE_IMG_DATA"
  }];

  // Set photos in photoManager
  await pm.setTaskPhoto(taskId, 'before_photo', 'data:image/png;base64,BEFORE_IMG_DATA', null, month);
  await pm.setTaskPhoto(taskId, 'after_photo', 'data:image/png;base64,AFTER_IMG_DATA', null, month);

  // 1. Initial State Check
  let photos = pm.getTaskPhotos(taskId, month);
  assert.strictEqual(photos.before_photo, "data:image/png;base64,BEFORE_IMG_DATA", "Before photo must match");
  assert.strictEqual(photos.after_photo, "data:image/png;base64,AFTER_IMG_DATA", "After photo must match");
  console.log("✔ Test 1: Initial photo state verified");

  // 2. Delete Before Photo
  await pm.removePhoto(taskId, 'before_photo', month);
  photos = pm.getTaskPhotos(taskId, month);
  assert.strictEqual(photos.before_photo, null, "Before photo must be null after removal");
  assert.strictEqual(photos.photo_1, null, "photo_1 alias must be null after removal");
  assert.strictEqual(photos.after_photo, "data:image/png;base64,AFTER_IMG_DATA", "After photo must still remain");
  console.log("✔ Test 2: Before photo removed cleanly while after photo remains");

  // Verify workbook state
  const taskInWb = wbMgr.getTask(month, taskId);
  assert.strictEqual(taskInWb.photo_1, "", "Task photo_1 in workbook must be empty string");
  assert.strictEqual(taskInWb.before_photo, "", "Task before_photo in workbook must be empty string");
  assert(taskInWb._photoDeleted_before > 0, "_photoDeleted_before timestamp must be set");
  console.log("✔ Test 3: Workbook task photo_1 cleared and tombstone timestamp set");

  // Verify slide state
  const slide = window.appState.syncEngine.slides.find(s => s.task_id === taskId);
  assert.strictEqual(slide.photo_before, null, "Slide photo_before must be null");
  assert.strictEqual(slide.photo, "data:image/png;base64,AFTER_IMG_DATA", "Slide main photo must now fall back to after photo");
  console.log("✔ Test 4: Active slide updated immediately");

  // 3. Cloud Merge Attack: Cloud tries to resurrect the deleted before photo!
  console.log("\nSimulating Cloud Sync attempting to re-hydrate the deleted before photo...");
  wbMgr.mergeFromCloud({
    [month]: [{
      task_id: taskId,
      task_name: "Compressor Jacket 24M0610 Die Setup and trial",
      engineer: "Mohammad Faiyaz Hossain",
      photo_1: "data:image/png;base64,BEFORE_IMG_DATA", // Remote still has old photo!
      photo_2: "data:image/png;base64,AFTER_IMG_DATA"
    }]
  });

  const photosAfterCloud = pm.getTaskPhotos(taskId, month);
  assert.strictEqual(photosAfterCloud.before_photo, null, "mergeFromCloud must NOT resurrect before photo!");
  assert.strictEqual(photosAfterCloud.photo_1, null, "mergeFromCloud must NOT resurrect photo_1!");
  console.log("✔ Test 5: mergeFromCloud successfully blocked from resurrecting before photo");

  // 4. Delete After Photo
  await pm.removePhoto(taskId, 'after_photo', month);
  photos = pm.getTaskPhotos(taskId, month);
  assert.strictEqual(photos.before_photo, null, "Before photo must still be null");
  assert.strictEqual(photos.after_photo, null, "After photo must now be null");
  assert.strictEqual(pm.hasPhoto(taskId), false, "hasPhoto must return false when all photos deleted");
  console.log("✔ Test 6: After photo removed cleanly, hasPhoto returns false");

  // 5. Cloud Merge Attack 2: Cloud tries to resurrect BOTH photos!
  console.log("\nSimulating Cloud Sync attempting to re-hydrate both deleted photos...");
  wbMgr.mergeFromCloud({
    [month]: [{
      task_id: taskId,
      task_name: "Compressor Jacket 24M0610 Die Setup and trial",
      engineer: "Mohammad Faiyaz Hossain",
      photo_1: "data:image/png;base64,BEFORE_IMG_DATA",
      photo_2: "data:image/png;base64,AFTER_IMG_DATA"
    }]
  });

  const photosAfterBothCloud = pm.getTaskPhotos(taskId, month);
  assert.strictEqual(photosAfterBothCloud.before_photo, null, "mergeFromCloud must NOT resurrect before photo!");
  assert.strictEqual(photosAfterBothCloud.after_photo, null, "mergeFromCloud must NOT resurrect after photo!");
  console.log("✔ Test 7: Both photos successfully defended against resurrection");

  console.log("\n🎉 ALL COMPREHENSIVE TESTS PASSED! ZERO RESURRECTION CONFIRMED!");
}

runComprehensiveTest().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
