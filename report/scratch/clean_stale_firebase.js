const https = require('https');

function firebasePatch(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: 'ac-monthly-report-default-rtdb.asia-southeast1.firebasedatabase.app',
      path: path,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function firebasePut(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: 'ac-monthly-report-default-rtdb.asia-southeast1.firebasedatabase.app',
      path: path,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function cleanStale() {
  const targetTasks = ['SEP-2026-152-9DLZ', 'SEP-2026-153-82EE', 'SEP-2026-154-Z2U6'];
  const now = Date.now();
  for (const tId of targetTasks) {
    const patchRes = await firebasePatch(
      `/walton_monthly_report/workbooks/SEP-2026/tasks/${tId}.json`,
      {
        photo_1: '',
        photo_2: '',
        before_photo: '',
        after_photo: '',
        photo: '',
        clear_photos: true,
        _photoDeleted_before: now,
        _photoDeleted_after: now,
        _explicitUserPhotoDeleteTime: now,
        _lastPhotoDeleteTime: now,
        _lastPhotoEditTime: 0
      }
    );
    console.log('Patched', tId, patchRes);

    const tombRes = await firebasePut(
      `/walton_monthly_report/deleted_photos/SEP-2026/${tId}.json`,
      { timestamp: now, slot: 'all' }
    );
    console.log('Tombstoned', tId, tombRes);
  }
}

cleanStale();
