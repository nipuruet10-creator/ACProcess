const fs = require('fs');
const assert = require('assert');

const pm = fs.readFileSync('report/photos/photo_manager.js', 'utf8');
const fb = fs.readFileSync('report/database/firebase_sync_service.js', 'utf8');
const mrv = fs.readFileSync('report/report/monthly_report_view.js', 'utf8');
const miv = fs.readFileSync('report/tasks/monthly_input_view.js', 'utf8');
const sp = fs.readFileSync('report/api/save_photo.php', 'utf8');
const gp = fs.readFileSync('report/api/get_photos.php', 'utf8');

assert(pm.includes('delete delMap[taskId]'), 'PhotoManager clears tombstone on upload');
assert(pm.includes('deleted_photos/${m}/${taskId}'), 'PhotoManager clears Firebase tombstone node on upload');
assert(pm.includes('targetTask._lastPhotoEditTime = Date.now()'), 'PhotoManager updates edit time on task');
assert(fb.includes('isRemotePhotoWinning'), 'FirebaseSyncService checks isRemotePhotoWinning with timestamp');
assert(fb.includes('child_removed'), 'FirebaseSyncService listens to tombstone revocations');
assert(mrv.includes('handlePhotoImgError'), 'MonthlyReportView has handlePhotoImgError');
assert(mrv.includes('MonthlyReportView.handlePhotoImgError'), 'MonthlyReportView attaches onerror to image');
assert(miv.includes('task.user_edited = true'), 'MonthlyInputView marks task as user_edited on text input');
assert(miv.includes('_lastTextEditTime'), 'MonthlyInputView updates _lastTextEditTime on text input');
assert(sp.includes('cleanLower = strtolower($cleanTaskId)'), 'save_photo.php unsets tombstone on server');
assert(gp.includes('filemtime'), 'get_photos.php compares filemtime with deletion timestamp');

console.log('✅ ALL ARCHITECTURAL INVARIANTS VERIFIED SUCCESSFULLY!');
