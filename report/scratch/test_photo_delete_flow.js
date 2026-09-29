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
    activeTab: 'photo-manager'
  }
};

const wbMgr = global.window.appState.workbookMgr;
const pm = new PhotoManager();
global.photoManager = pm;

// Setup a task in SEP-2026
const taskId = 'SEP-2026-003-SJ2';
const month = 'SEP-2026';
wbMgr.workbooks[month] = [{
  task_id: taskId,
  task_name: 'Compressor Jacket 24M0610 Die Setup and trial',
  engineer: 'Mohammad Faiyaz Hossain',
  photo_1: 'data:image/png;base64,OLD_P1',
  photo_2: 'data:image/png;base64,OLD_P2'
}];

async function runTest() {
  await pm.setTaskPhoto(taskId, 'before_photo', 'data:image/png;base64,OLD_P1', null, month);
  await pm.setTaskPhoto(taskId, 'after_photo', 'data:image/png;base64,OLD_P2', null, month);

  console.log('BEFORE REMOVE:');
  console.log(pm.getTaskPhotos(taskId, month));

  await pm.removePhoto(taskId, 'before_photo', month);

  console.log('\nAFTER REMOVE:');
  const afterPhotos = pm.getTaskPhotos(taskId, month);
  console.log(afterPhotos);
  console.log('\nTASK IN WB:');
  console.log(wbMgr.getTask(month, taskId));

  // Now simulate mergeFromCloud (e.g. from Google Sheets or Firebase background sync)
  console.log('\n--- SIMULATING mergeFromCloud ---');
  wbMgr.mergeFromCloud({
    [month]: [{
      task_id: taskId,
      task_name: 'Compressor Jacket 24M0610 Die Setup and trial',
      engineer: 'Mohammad Faiyaz Hossain',
      photo_1: 'data:image/png;base64,OLD_P1', // Remote still has old photo!
      photo_2: 'data:image/png;base64,OLD_P2'
    }]
  });

  console.log('\nAFTER CLOUD MERGE:');
  console.log(pm.getTaskPhotos(taskId, month));
  console.log('TASK IN WB AFTER MERGE:');
  console.log(wbMgr.getTask(month, taskId));
}

runTest().catch(console.error);
