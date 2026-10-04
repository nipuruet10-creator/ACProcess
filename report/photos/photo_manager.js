/**
 * Process Development Monthly Report Automation System
 * Module: Photo Manager (Enterprise Hybrid Storage)
 * Stores full-resolution compressed photos in IndexedDB (Gigabytes quota)
 * Keeps lightweight in-memory cache for zero-latency synchronous slide rendering
 * Completely immune to browser 5MB LocalStorage quota limitations
 * WALTON Hi-Tech Industries PLC
 */

class PhotoManager {
  constructor(storageKey = "walton_pd_task_photos_v1") {
    this.storageKey = storageKey;
    this.photoMap = {}; // In-memory map of taskId -> { photo_1, photo_2, before_photo, after_photo }
    this.isReady = false;
    this.init();
  }

  async init() {
    // 1. First, check and migrate any legacy photos from LocalStorage to IndexedDB
    try {
      const legacySaved = localStorage.getItem(this.storageKey);
      if (legacySaved) {
        const parsed = JSON.parse(legacySaved);
        if (parsed && typeof parsed === 'object') {
          this.photoMap = { ...parsed };
          // Migrate each to IndexedDB
          if (typeof PhotoIndexedDB !== 'undefined') {
            for (const [tId, pData] of Object.entries(parsed)) {
              if (pData) await PhotoIndexedDB.saveTaskPhotos(tId, pData);
            }
          }
        }
        // Remove massive photo blobs from localStorage to free up the 5MB browser quota!
        localStorage.removeItem(this.storageKey);
        console.log("Migrated photos from LocalStorage to IndexedDB and cleared LocalStorage quota.");
      }
    } catch (e) {
      console.warn("Legacy photo migration notice:", e);
    }

    // 2. Safe local active slides preservation (never nullify user photos, respect deletions)
    let delMap = {};
    try {
      delMap = JSON.parse(localStorage.getItem('walton_deleted_photo_tasks') || '{}');
    } catch(e) {}

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("walton_pd_active_slides_")) {
          const val = localStorage.getItem(key);
          if (val) {
            const slides = JSON.parse(val);
            if (Array.isArray(slides)) {
              let cacheCleaned = false;
              // Extract any local base64 photos into memory and IndexedDB only if NOT deleted
              slides.forEach(s => {
                if (s && s.task_id) {
                  const sClean = String(s.task_id).toLowerCase();
                  const sParts = sClean.split('-');
                  const sPrefix = sParts.length >= 3 ? `${sParts[0]}-${sParts[1]}-${sParts[2]}` : sClean;
                  const tomb = delMap[s.task_id] || delMap[sClean] || delMap[sPrefix];
                  if (tomb) {
                    if (tomb.slot === 'all' || tomb.slot === 'after_photo' || tomb.slot === 'photo_2') {
                      s.photo_after = null;
                      cacheCleaned = true;
                    }
                    if (tomb.slot === 'all' || tomb.slot === 'before_photo' || tomb.slot === 'photo_1') {
                      s.photo_before = null;
                      cacheCleaned = true;
                    }
                    s.photo = s.photo_after || s.photo_before || null;
                    return;
                  }
                  if (s.photo_after && s.photo_after.startsWith('data:image/')) {
                    if (!this.photoMap[s.task_id]) this.photoMap[s.task_id] = {};
                    this.photoMap[s.task_id].after_photo = s.photo_after;
                    this.photoMap[s.task_id].photo_2 = s.photo_after;
                  }
                  if (s.photo_before && s.photo_before.startsWith('data:image/')) {
                    if (!this.photoMap[s.task_id]) this.photoMap[s.task_id] = {};
                    this.photoMap[s.task_id].before_photo = s.photo_before;
                    this.photoMap[s.task_id].photo_1 = s.photo_before;
                  }
                }
              });
              if (cacheCleaned) {
                try { localStorage.setItem(key, JSON.stringify(slides)); } catch(err) {}
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Storage preservation notice:", e);
    }

    // 3. Load photos from IndexedDB into memory, filtering out tombstoned deleted photos
    try {
      if (typeof PhotoIndexedDB !== 'undefined') {
        const idbPhotos = await PhotoIndexedDB.getAllPhotos();
        if (idbPhotos && Object.keys(idbPhotos).length > 0) {
          for (const [k, p] of Object.entries(idbPhotos)) {
            const kClean = String(k).toLowerCase();
            const kParts = kClean.split('-');
            const kPrefix = kParts.length >= 3 ? `${kParts[0]}-${kParts[1]}-${kParts[2]}` : kClean;
            const tomb = delMap[k] || delMap[kClean] || delMap[kPrefix];
            if (tomb) {
              if (typeof PhotoIndexedDB !== 'undefined' && PhotoIndexedDB.deleteTaskPhotos) {
                PhotoIndexedDB.deleteTaskPhotos(k).catch(() => {});
              }
              continue;
            }
            this.photoMap[k] = p;
          }
        }
      }
    } catch (e) {
      console.warn("Could not read photos from IndexedDB:", e);
    }

    // 4. Fetch all photos from Hostinger permanent server storage for active months
    try {
      await this.fetchPhotosFromServer('SEP-2026');
      await this.fetchPhotosFromServer('AUG-2026');
      await this.fetchPhotosFromServer('ALL');
    } catch (e) {
      console.warn("[Hostinger Photo Storage] Server photo sync notice:", e);
    }

    // 5. Auto-upload any legitimate local IndexedDB photos to server permanently
    try {
      await this.reconcileLocalPhotosToServer();
    } catch (e) {
      console.warn("[Hostinger Photo Storage] Local reconciliation notice:", e);
    }

    // 6. Periodic background sync every 10 seconds for real-time cross-device photo updates
    if (typeof window !== 'undefined' && !this._serverPollTimer) {
      let pollCount = 0;
      this._serverPollTimer = setInterval(() => {
        pollCount++;
        const m = (window.appState && window.appState.workbookMgr) ? window.appState.workbookMgr.activeMonth : 'SEP-2026';
        this.fetchPhotosFromServer(m);
        // Every 30 seconds, auto-reconcile any pending local photos
        if (pollCount % 3 === 0) {
          this.reconcileLocalPhotosToServer();
        }
      }, 10000);
    }

    this.isReady = true;
  }

  /**
   * Helper: Resolves robust API URL avoiding 404s even if accessed without trailing slash
   */
  _getApiUrl(endpoint) {
    if (!endpoint) return '';
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint;
    const clean = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    if (typeof window !== 'undefined' && window.location) {
      if (window.location.hostname && window.location.hostname.includes('acprocess.com')) {
        return 'https://acprocess.com/report/' + clean;
      }
      const p = window.location.pathname;
      if (p.includes('/report')) {
        const idx = p.indexOf('/report');
        return window.location.origin + p.substring(0, idx) + '/report/' + clean;
      }
      const base = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
      return window.location.origin + base + clean;
    }
    return 'https://acprocess.com/report/' + clean;
  }

  /**
   * Auto-heals cross-PC photo sync: If any photo exists locally as Base64 data (e.g. uploaded on an engineer's PC),
   * pushes it automatically to Hostinger disk and server catalog so all other PCs receive it!
   */
  async reconcileLocalPhotosToServer() {
    let delMap = {};
    try {
      delMap = JSON.parse(localStorage.getItem('walton_deleted_photo_tasks') || '{}');
    } catch(e) {}

    const currentMonth = (window.appState && window.appState.workbookMgr) ? window.appState.workbookMgr.activeMonth : 'SEP-2026';

    // 1. Scan memory map
    if (this.photoMap) {
      for (const [key, pData] of Object.entries(this.photoMap)) {
        if (!pData) continue;
        let tId = key;
        let m = currentMonth;
        if (key.includes('_') && (key.startsWith('SEP-') || key.startsWith('AUG-') || key.startsWith('OCT-'))) {
          const parts = key.split('_');
          m = parts[0];
          tId = parts.slice(1).join('_');
        }

        const cleanT = String(tId).toLowerCase();
        const pParts = cleanT.split('-');
        const pPrefix = pParts.length >= 3 ? `${pParts[0]}-${pParts[1]}-${pParts[2]}` : cleanT;
        const tombstone = delMap[tId] || delMap[cleanT] || delMap[pPrefix];

        if (tombstone) {
          this.purgeTaskPhotosMemory(tId);
          if (typeof PhotoIndexedDB !== 'undefined' && PhotoIndexedDB.deleteTaskPhotos) {
            PhotoIndexedDB.deleteTaskPhotos(tId).catch(() => {});
          }
          continue;
        }

        const afterP = pData.after_photo || pData.photo_2;
        if (afterP && typeof afterP === 'string' && afterP.startsWith('data:image/')) {
          console.log(`[Hostinger Photo Sync] Reconciling memory photo for ${tId} (after_photo)...`);
          try {
            await this.uploadPhotoToServer(tId, 'after_photo', afterP, m);
          } catch(e) {}
        }
        const beforeP = pData.before_photo || pData.photo_1;
        if (beforeP && typeof beforeP === 'string' && beforeP.startsWith('data:image/')) {
          console.log(`[Hostinger Photo Sync] Reconciling memory photo for ${tId} (before_photo)...`);
          try {
            await this.uploadPhotoToServer(tId, 'before_photo', beforeP, m);
          } catch(e) {}
        }
      }
    }

    // 2. Scan workbook tasks in MonthWorkbookManager
    if (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
      try {
        const wbMgr = window.appState.workbookMgr;
        const tasks = wbMgr.getTasksForMonth ? wbMgr.getTasksForMonth(currentMonth) : [];
        for (const t of tasks) {
          if (!t || !t.task_id) continue;
          const tId = t.task_id;
          const cleanT = String(tId).toLowerCase();
          const pParts = cleanT.split('-');
          const pPrefix = pParts.length >= 3 ? `${pParts[0]}-${pParts[1]}-${pParts[2]}` : cleanT;
          if (delMap[tId] || delMap[cleanT] || delMap[pPrefix]) continue;

          const afterP = t.after_photo || t.photo_2 || t.photo;
          if (afterP && typeof afterP === 'string' && afterP.startsWith('data:image/')) {
            console.log(`[Hostinger Photo Sync] Reconciling workbook task photo for ${tId} (after_photo)...`);
            try {
              await this.uploadPhotoToServer(tId, 'after_photo', afterP, currentMonth);
            } catch(e) {}
          }
          const beforeP = t.before_photo || t.photo_1;
          if (beforeP && typeof beforeP === 'string' && beforeP.startsWith('data:image/')) {
            console.log(`[Hostinger Photo Sync] Reconciling workbook task photo for ${tId} (before_photo)...`);
            try {
              await this.uploadPhotoToServer(tId, 'before_photo', beforeP, currentMonth);
            } catch(e) {}
          }
        }
      } catch (wbSyncErr) {}
    }

    // 3. Scan active slides in localStorage
    try {
      const slideKey = `walton_pd_active_slides_${currentMonth}`;
      const saved = localStorage.getItem(slideKey);
      if (saved) {
        const slides = JSON.parse(saved);
        if (Array.isArray(slides)) {
          for (const s of slides) {
            if (!s || !s.task_id) continue;
            const tId = s.task_id;
            const cleanT = String(tId).toLowerCase();
            const pParts = cleanT.split('-');
            const pPrefix = pParts.length >= 3 ? `${pParts[0]}-${pParts[1]}-${pParts[2]}` : cleanT;
            if (delMap[tId] || delMap[cleanT] || delMap[pPrefix]) continue;

            const afterP = s.photo_after || s.photo;
            if (afterP && typeof afterP === 'string' && afterP.startsWith('data:image/')) {
              console.log(`[Hostinger Photo Sync] Reconciling active slide photo for ${tId} (after_photo)...`);
              try {
                await this.uploadPhotoToServer(tId, 'after_photo', afterP, currentMonth);
              } catch(e) {}
            }
            const beforeP = s.photo_before;
            if (beforeP && typeof beforeP === 'string' && beforeP.startsWith('data:image/')) {
              console.log(`[Hostinger Photo Sync] Reconciling active slide photo for ${tId} (before_photo)...`);
              try {
                await this.uploadPhotoToServer(tId, 'before_photo', beforeP, currentMonth);
              } catch(e) {}
            }
          }
        }
      }
    } catch (slideSyncErr) {}
  }

  /**
   * Fetches server-stored photos from Hostinger API and merges into memory & IndexedDB
   */
  async fetchPhotosFromServer(month = 'SEP-2026') {
    try {
      const q = month ? `?month=${encodeURIComponent(month)}` : '';
      const resp = await fetch(this._getApiUrl(`api/get_photos.php${q}`), { cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.success && data.photos) {
          let updatedCount = 0;
          let delMap = {};
          try {
            delMap = JSON.parse(localStorage.getItem('walton_deleted_photo_tasks') || '{}');
          } catch(e) {}

          for (const [tId, pData] of Object.entries(data.photos)) {
            if (!pData) continue;
            const cleanT = String(tId).toLowerCase();
            const pParts = cleanT.split('-');
            const pPrefix = pParts.length >= 3 ? `${pParts[0]}-${pParts[1]}-${pParts[2]}` : cleanT;
            const tombstone = delMap[tId] || delMap[cleanT] || delMap[pPrefix];

            const current = this.photoMap[tId] || {};

            let serverBefore = (pData.before_photo !== undefined && pData.before_photo !== null && pData.before_photo !== '') ? pData.before_photo : (current.before_photo || null);
            let serverAfter = (pData.after_photo !== undefined && pData.after_photo !== null && pData.after_photo !== '') ? pData.after_photo : (current.after_photo || null);

            if (tombstone) {
              const tombTime = tombstone.timestamp || tombstone.time || 0;
              const serverTime = pData.time || 0;
              // If server has photo with timestamp newer than tombstone, or photo exists and tombstone is stale
              if (serverTime > 0 && serverTime >= tombTime) {
                delete delMap[tId];
                delete delMap[cleanT];
                delete delMap[pPrefix];
                try { localStorage.setItem('walton_deleted_photo_tasks', JSON.stringify(delMap)); } catch(e) {}
              } else {
                if (tombstone.slot === 'all' || tombstone.slot === 'before_photo' || tombstone.slot === 'photo_1') {
                  serverBefore = null;
                }
                if (tombstone.slot === 'all' || tombstone.slot === 'after_photo' || tombstone.slot === 'photo_2') {
                  serverAfter = null;
                }
              }
            }

            const merged = {
              ...current,
              before_photo: serverBefore,
              after_photo: serverAfter,
              photo_1: serverBefore,
              photo_2: serverAfter,
              photo: serverAfter || serverBefore || null
            };
            const hadPhoto = Boolean(current.before_photo || current.after_photo || current.photo);
            const hasPhotoNow = Boolean(merged.before_photo || merged.after_photo || merged.photo);
            const photoChanged = (merged.after_photo !== current.after_photo || merged.before_photo !== current.before_photo || (!hadPhoto && hasPhotoNow));

            this.photoMap[tId] = merged;
            if (pParts.length >= 3) {
              this.photoMap[pPrefix] = { ...(this.photoMap[pPrefix] || {}), ...merged };
            }
            if (month && month !== 'ALL') {
              const monthKey = `${month}_${tId}`;
              this.photoMap[monthKey] = { ...(this.photoMap[monthKey] || {}), ...merged };
            }
            if (typeof PhotoIndexedDB !== 'undefined') {
              PhotoIndexedDB.saveTaskPhotos(tId, merged).catch(() => {});
            }

            // Sync into MonthWorkbookManager tasks so views immediately reflect photos
            if (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
              const wbMgr = window.appState.workbookMgr;
              const activeM = (month && month !== 'ALL') ? month : (wbMgr.activeMonth || 'SEP-2026');
              let t = wbMgr.getTask(activeM, tId);
              if (!t && String(tId).includes('-')) {
                const parts = String(tId).split('-');
                if (parts.length >= 3) {
                  const prefix = `${parts[0]}-${parts[1]}-${parts[2]}`.toLowerCase();
                  const allTasks = wbMgr.getTasksForMonth ? wbMgr.getTasksForMonth(activeM) : [];
                  t = allTasks.find(tsk => tsk && tsk.task_id && tsk.task_id.toLowerCase().startsWith(prefix));
                }
              }
              if (t) {
                const isTaskDeletedAfter = Boolean(!merged.after_photo && (t.clear_photos || (t._photoDeleted_after && t._photoDeleted_after > (t._lastPhotoEditTime || 0)) || (tombstone && (tombstone.slot === 'all' || tombstone.slot === 'after_photo'))));
                const isTaskDeletedBefore = Boolean(!merged.before_photo && (t.clear_photos || (t._photoDeleted_before && t._photoDeleted_before > (t._lastPhotoEditTime || 0)) || (tombstone && (tombstone.slot === 'all' || tombstone.slot === 'before_photo'))));

                if (merged.before_photo) {
                  t.photo_1 = merged.before_photo;
                  t.before_photo = merged.before_photo;
                  delete t._photoDeleted_before;
                  delete t.clear_photos;
                } else if (isTaskDeletedBefore) {
                  t.photo_1 = "";
                  t.before_photo = "";
                  merged.before_photo = null;
                  merged.photo_1 = null;
                }

                if (merged.after_photo) {
                  t.photo_2 = merged.after_photo;
                  t.after_photo = merged.after_photo;
                  t.photo = merged.after_photo;
                  delete t._photoDeleted_after;
                  delete t.clear_photos;
                } else if (isTaskDeletedAfter) {
                  t.photo_2 = "";
                  t.after_photo = "";
                  t.photo = "";
                  merged.after_photo = null;
                  merged.photo_2 = null;
                  merged.photo = merged.before_photo || null;
                }
              }
            }

            // Real-time live card update when photo is added or updated on another PC
            if (photoChanged) {
              if (typeof MonthlyReportView !== 'undefined' && typeof MonthlyReportView.updateSlideCardPhoto === 'function') {
                MonthlyReportView.updateSlideCardPhoto(tId);
              }
              if (typeof MonthlyInputView !== 'undefined' && typeof MonthlyInputView.updateTaskCardPhoto === 'function') {
                MonthlyInputView.updateTaskCardPhoto(tId);
              }
            }
            updatedCount++;
          }

          // If photos were added or updated on another PC, also refresh active slides cache & views smoothly
          if (updatedCount > 0) {
            try {
              const activeM = month && month !== 'ALL' ? month : 'SEP-2026';
              const slideKey = `walton_pd_active_slides_${activeM}`;
              const saved = localStorage.getItem(slideKey);
              if (saved) {
                const slides = JSON.parse(saved);
                if (Array.isArray(slides)) {
                  let patched = false;
                  slides.forEach(s => {
                    const freshP = this.getTaskPhotos(s.task_id, activeM);
                    if (freshP && (freshP.after_photo || freshP.before_photo)) {
                      s.photo_after = freshP.after_photo || null;
                      s.photo_before = freshP.before_photo || null;
                      s.photo = freshP.after_photo || freshP.before_photo;
                      patched = true;
                    }
                  });
                  if (patched) {
                    localStorage.setItem(slideKey, JSON.stringify(slides));
                  }
                }
              }
            } catch(e) {}

            // Granular micro-updates already handled via updateSlideCardPhoto above (zero blinking, zero DOM destruction)
          }

          return data.photos;
        }
      }
    } catch (err) {
      // Quiet fail if offline
    }
    return null;
  }

  /**
   * Uploads photo to Hostinger Server Storage API for permanent disk persistence across all devices
   * Supports live upload progress percentage reporting and robust XMLHttpRequest error resilience
   */
  async uploadPhotoToServer(taskId, slot, base64Url, month = null, onProgress = null) {
    if (!taskId || !base64Url) return null;
    let m = month;
    if (!m && typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
      m = window.appState.workbookMgr.activeMonth;
    }
    if (!m) m = 'SEP-2026';

    if (typeof onProgress === 'function') onProgress(15, 'Sending to Hostinger...');

    try {
      const payload = JSON.stringify({
        taskId: taskId,
        month: m,
        slot: slot,
        image: base64Url
      });

      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', this._getApiUrl('api/save_photo.php'), true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.timeout = 60000;

        if (xhr.upload && typeof onProgress === 'function') {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && e.total > 0) {
              const netPct = Math.round((e.loaded / e.total) * 100);
              const mapped = 15 + Math.round(netPct * 0.75);
              onProgress(Math.min(mapped, 92), `Uploading (${netPct}%)...`);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              if (typeof onProgress === 'function') onProgress(96, 'Saving to Server SSD...');
              const parsed = JSON.parse(xhr.responseText);
              resolve(parsed);
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error(`Server returned HTTP ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.ontimeout = () => reject(new Error('Upload timeout'));

        xhr.send(payload);
      });

      if (result && result.success && result.url) {
        if (typeof onProgress === 'function') onProgress(100, 'Saved permanently!');
        console.log(`[Hostinger Photo Storage] Upload success for ${taskId}: ${result.url}`);
        const serverUrl = result.url;
        const isBefore = (slot === 'before_photo' || slot === 'photo_1');
        const isAfter = (slot === 'after_photo' || slot === 'photo_2');

        if (!this.photoMap[taskId]) {
          this.photoMap[taskId] = { photo_1: null, photo_2: null, before_photo: null, after_photo: null };
        }
        if (isBefore) {
          this.photoMap[taskId].before_photo = serverUrl;
          this.photoMap[taskId].photo_1 = serverUrl;
        }
        if (isAfter) {
          this.photoMap[taskId].after_photo = serverUrl;
          this.photoMap[taskId].photo_2 = serverUrl;
          this.photoMap[taskId].photo = serverUrl;
        }

        const monthKey = `${m}_${taskId}`;
        if (!this.photoMap[monthKey]) {
          this.photoMap[monthKey] = { photo_1: null, photo_2: null, before_photo: null, after_photo: null };
        }
        if (isBefore) {
          this.photoMap[monthKey].before_photo = serverUrl;
          this.photoMap[monthKey].photo_1 = serverUrl;
        }
        if (isAfter) {
          this.photoMap[monthKey].after_photo = serverUrl;
          this.photoMap[monthKey].photo_2 = serverUrl;
          this.photoMap[monthKey].photo = serverUrl;
        }

        // Clear all deletion tombstones locally and in Firebase because a fresh photo was uploaded!
        const cleanT = String(taskId).toLowerCase();
        const pParts = cleanT.split('-');
        const pPrefix = pParts.length >= 3 ? `${pParts[0]}-${pParts[1]}-${pParts[2]}` : cleanT;
        try {
          const delMap = JSON.parse(localStorage.getItem('walton_deleted_photo_tasks') || '{}');
          delete delMap[taskId];
          delete delMap[cleanT];
          delete delMap[pPrefix];
          delete delMap[`${m}_${taskId}`];
          delete delMap[`${m}_${cleanT}`];
          localStorage.setItem('walton_deleted_photo_tasks', JSON.stringify(delMap));
        } catch(e) {}

        if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected() && FirebaseSyncService.db) {
          try {
            FirebaseSyncService.db.ref(`walton_monthly_report/deleted_photos/${m}/${taskId}`).remove().catch(() => {});
            FirebaseSyncService.db.ref(`walton_monthly_report/deleted_photos/${m}/${cleanT}`).remove().catch(() => {});
            if (pPrefix && pPrefix !== taskId) {
              FirebaseSyncService.db.ref(`walton_monthly_report/deleted_photos/${m}/${pPrefix}`).remove().catch(() => {});
            }
          } catch(e) {}
        }

        // Persist clean server URL to IndexedDB
        if (typeof PhotoIndexedDB !== 'undefined') {
          PhotoIndexedDB.saveTaskPhotos(taskId, this.photoMap[taskId]).catch(() => {});
          PhotoIndexedDB.saveTaskPhotos(monthKey, this.photoMap[monthKey]).catch(() => {});
        }

        // Persist clean server URL to MonthWorkbookManager (lightweight URL prevents localStorage 5MB quota errors!)
        let updatedWbTask = null;
        if (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
          try {
            const wbMgr = window.appState.workbookMgr;
            const targetTask = wbMgr.getTask(m, taskId);
            if (targetTask) {
              if (isBefore) {
                targetTask.photo_1 = serverUrl;
                targetTask.before_photo = serverUrl;
                delete targetTask._photoDeleted_before;
              }
              if (isAfter) {
                targetTask.photo_2 = serverUrl;
                targetTask.after_photo = serverUrl;
                targetTask.photo = serverUrl;
                delete targetTask._photoDeleted_after;
              }
              delete targetTask.clear_photos;
              delete targetTask._explicitUserPhotoDeleteTime;
              delete targetTask._lastPhotoDeleteTime;
              targetTask._lastPhotoEditTime = Date.now();
              targetTask.last_updated = new Date().toISOString();
              wbMgr.save();
              updatedWbTask = targetTask;
            }
          } catch(e) {}
        }

        // Persist clean server URL to SyncEngine active slides
        try {
          if (typeof window !== 'undefined' && window.appState && window.appState.syncEngine) {
            const slides = window.appState.syncEngine.getActiveSlides(m);
            const target = slides.find(s => s && s.task_id === taskId);
            if (target) {
              if (isBefore) target.photo_before = serverUrl;
              if (isAfter) target.photo_after = serverUrl;
              target.photo = serverUrl;
              target.has_dual_photo = Boolean(target.photo_before && target.photo_after);
              localStorage.setItem(`walton_pd_active_slides_${m}`, JSON.stringify(slides));
            }
          }
        } catch(slideErr) {}

        // Broadcast server URL to peer laptops via Firebase Realtime Database
        if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
          try {
            FirebaseSyncService.updateCell(m, taskId, isBefore ? 'photo_1' : 'photo_2', serverUrl);
            FirebaseSyncService.updateCell(m, taskId, isBefore ? 'before_photo' : 'after_photo', serverUrl);
            FirebaseSyncService.updateCell(m, taskId, 'photo', serverUrl);
            FirebaseSyncService.updateCell(m, taskId, 'clear_photos', null);
            FirebaseSyncService.updateCell(m, taskId, '_lastPhotoDeleteTime', null);
            FirebaseSyncService.updateCell(m, taskId, '_explicitUserPhotoDeleteTime', null);
            FirebaseSyncService.updateCell(m, taskId, '_lastPhotoEditTime', Date.now());
            FirebaseSyncService.updateCell(m, taskId, isBefore ? '_photoDeleted_before' : '_photoDeleted_after', null);
            if (updatedWbTask) {
              FirebaseSyncService.pushTask(m, updatedWbTask);
            }
            if (FirebaseSyncService.db) {
              FirebaseSyncService.db.ref(`walton_monthly_report/live_photos/${m}/${taskId}`).update({
                taskId: taskId,
                month: m,
                slot: slot,
                [slot]: serverUrl,
                photo: serverUrl,
                [isBefore ? 'photo_1' : 'photo_2']: serverUrl,
                updated_at: Date.now()
              }).catch(() => {});
            }
          } catch(e) {}
        }

        // If MonthlyReportView is active, update targeted DOM directly (no full render!)
        if (typeof MonthlyReportView !== 'undefined') {
          if (MonthlyReportView._activeModalTaskId === taskId) {
            if (typeof MonthlyReportView.renderModalPhotoSlots === 'function') MonthlyReportView.renderModalPhotoSlots(taskId);
            if (typeof MonthlyReportView.renderModalLivePreview === 'function') MonthlyReportView.renderModalLivePreview(taskId);
          }
          if (typeof MonthlyReportView.updateSlideCardPhoto === 'function') {
            MonthlyReportView.updateSlideCardPhoto(taskId, serverUrl);
          }
        }

        // If MonthlyInputView is active, update task card photo
        if (typeof MonthlyInputView !== 'undefined' && typeof MonthlyInputView.updateTaskCardPhoto === 'function') {
          MonthlyInputView.updateTaskCardPhoto(taskId);
        }

        return serverUrl;
      }
    } catch (e) {
      console.warn("[Hostinger Photo Storage] Server upload error:", e);
    }
    return null;
  }

  getTaskPhotos(taskId, month = null) {
    if (!taskId) return { photo_1: null, photo_2: null, before_photo: null, after_photo: null };
    let m = month;
    if (!m && typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
      m = window.appState.workbookMgr.activeMonth;
    }
    if (!m && typeof MonthlyInputView !== 'undefined' && MonthlyInputView.selectedMonth) {
      m = MonthlyInputView.selectedMonth;
    }
    const monthKey = m ? `${m}_${taskId}` : null;
    let memMonth = monthKey ? this.photoMap[monthKey] : null;

    // Case-insensitive & prefix lookup fallback if exact case not found in memory
    if (!memMonth && monthKey) {
      const lowerKey = monthKey.toLowerCase();
      let k = Object.keys(this.photoMap).find(key => key.toLowerCase() === lowerKey);
      if (!k && String(taskId).includes('-')) {
        const parts = String(taskId).split('-');
        if (parts.length >= 3) {
          const prefix = `${parts[0]}-${parts[1]}-${parts[2]}`.toLowerCase();
          k = Object.keys(this.photoMap).find(key => key.toLowerCase().includes(prefix));
        }
      }
      if (k) memMonth = this.photoMap[k];
    }
    if (!this.photoMap[taskId]) {
      const lowerId = String(taskId).toLowerCase();
      let k = Object.keys(this.photoMap).find(key => key.toLowerCase() === lowerId);
      if (!k && String(taskId).includes('-')) {
        const parts = String(taskId).split('-');
        if (parts.length >= 3) {
          const prefix = `${parts[0]}-${parts[1]}-${parts[2]}`.toLowerCase();
          k = Object.keys(this.photoMap).find(key => key.toLowerCase().includes(prefix));
        }
      }
      if (k) this.photoMap[taskId] = this.photoMap[k];
    }

    let t = null;
    let taskP1 = null;
    let taskP2 = null;
    if (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
      const wbMgr = window.appState.workbookMgr;
      t = m ? wbMgr.getTask(m, taskId) : wbMgr.getTask(wbMgr.activeMonth, taskId);
      if (t) {
        if (!t.clear_photos) {
          taskP1 = (!t._photoDeleted_before && (t.photo_1 || t.before_photo)) ? (t.photo_1 || t.before_photo) : null;
          taskP2 = (!t._photoDeleted_after && (t.photo_2 || t.after_photo || t.photo)) ? (t.photo_2 || t.after_photo || t.photo) : null;
        }
      }
    }

    // Determine Before Photo (p1)
    let p1 = null;
    if (memMonth && (memMonth.before_photo || memMonth.photo_1)) {
      p1 = memMonth.before_photo || memMonth.photo_1;
    } else if (this.photoMap[taskId] && (this.photoMap[taskId].before_photo || this.photoMap[taskId].photo_1)) {
      p1 = this.photoMap[taskId].before_photo || this.photoMap[taskId].photo_1;
    } else if (taskP1) {
      p1 = taskP1;
    }

    // Determine After Photo (p2)
    let p2 = null;
    if (memMonth && (memMonth.after_photo || memMonth.photo_2)) {
      p2 = memMonth.after_photo || memMonth.photo_2;
    } else if (this.photoMap[taskId] && (this.photoMap[taskId].after_photo || this.photoMap[taskId].photo_2)) {
      p2 = this.photoMap[taskId].after_photo || this.photoMap[taskId].photo_2;
    } else if (taskP2) {
      p2 = taskP2;
    }

    // Check local tombstones
    let delMap = {};
    try {
      delMap = JSON.parse(localStorage.getItem('walton_deleted_photo_tasks') || '{}');
    } catch(e) {}
    const cleanT = String(taskId).toLowerCase();
    const pParts = cleanT.split('-');
    const pPrefix = pParts.length >= 3 ? `${pParts[0]}-${pParts[1]}-${pParts[2]}` : cleanT;
    const tombstone = delMap[taskId] || delMap[cleanT] || delMap[pPrefix] || (monthKey && delMap[monthKey]);

    if (tombstone) {
      if (tombstone.slot === 'all' || tombstone.slot === 'before_photo' || tombstone.slot === 'photo_1') {
        p1 = null;
      }
      if (tombstone.slot === 'all' || tombstone.slot === 'after_photo' || tombstone.slot === 'photo_2') {
        p2 = null;
      }
    }

    p1 = this.formatPhotoUrl(p1);
    p2 = this.formatPhotoUrl(p2);

    return {
      photo_1: p1 || null,
      photo_2: p2 || null,
      before_photo: p1 || null,
      after_photo: p2 || null
    };
  }

  formatPhotoUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const clean = url.trim();
    if (!clean) return null;
    if (clean.startsWith('data:image/') || clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('blob:')) {
      return clean;
    }
    if (clean.startsWith('uploads/') || clean.startsWith('/uploads/')) {
      const rel = clean.startsWith('/') ? clean.slice(1) : clean;
      if (typeof window !== 'undefined' && window.location) {
        if (window.location.hostname && window.location.hostname.includes('acprocess.com')) {
          return 'https://acprocess.com/report/' + rel;
        }
        const origin = window.location.origin;
        const p = window.location.pathname;
        if (p.includes('/report')) {
          const idx = p.indexOf('/report');
          return origin + p.substring(0, idx) + '/report/' + rel;
        }
        return origin + '/' + rel;
      }
      return 'https://acprocess.com/report/' + rel;
    }
    return clean;
  }

  /**
   * Real-time Cloud Photo Sync: Adopts live photo broadcasts from Firebase live_photos node
   * Instantly updates in-memory cache, IndexedDB, workbook, and live card UI across all devices
   */
  applyLivePhotoData(taskId, pData, month = 'SEP-2026', isBatch = false) {
    if (!taskId || !pData) return;
    const m = month || pData.month || 'SEP-2026';
    const mKey = `${m}_${taskId}`;

    const beforeP = this.formatPhotoUrl(pData.before_photo || pData.photo_1 || null);
    const afterP = this.formatPhotoUrl(pData.after_photo || pData.photo_2 || pData.photo || null);

    if (!this.photoMap[taskId]) this.photoMap[taskId] = {};
    if (!this.photoMap[mKey]) this.photoMap[mKey] = {};

    let hasChange = false;
    if (beforeP && this.photoMap[taskId].before_photo !== beforeP) {
      this.photoMap[taskId].before_photo = beforeP;
      this.photoMap[taskId].photo_1 = beforeP;
      this.photoMap[mKey].before_photo = beforeP;
      this.photoMap[mKey].photo_1 = beforeP;
      hasChange = true;
    }
    if (afterP && this.photoMap[taskId].after_photo !== afterP) {
      this.photoMap[taskId].after_photo = afterP;
      this.photoMap[taskId].photo_2 = afterP;
      this.photoMap[taskId].photo = afterP;
      this.photoMap[mKey].after_photo = afterP;
      this.photoMap[mKey].photo_2 = afterP;
      this.photoMap[mKey].photo = afterP;
      hasChange = true;
    }

    // Clear local deletion tombstones for this task so stale local tombstones cannot suppress live cloud photos
    if (!isBatch) {
      try {
        const delMap = JSON.parse(localStorage.getItem('walton_deleted_photo_tasks') || '{}');
        const cleanT = String(taskId).toLowerCase();
        const pParts = cleanT.split('-');
        const pPrefix = pParts.length >= 3 ? `${pParts[0]}-${pParts[1]}-${pParts[2]}` : cleanT;
        delete delMap[taskId];
        delete delMap[cleanT];
        delete delMap[pPrefix];
        delete delMap[mKey];
        delete delMap[`${m}_${cleanT}`];
        localStorage.setItem('walton_deleted_photo_tasks', JSON.stringify(delMap));
      } catch(e) {}

      // Persist to IndexedDB
      if (typeof PhotoIndexedDB !== 'undefined') {
        PhotoIndexedDB.saveTaskPhotos(taskId, this.photoMap[taskId]).catch(() => {});
        PhotoIndexedDB.saveTaskPhotos(mKey, this.photoMap[mKey]).catch(() => {});
      }
    }

    // Update Workbook task
    if (window.appState && window.appState.workbookMgr) {
      try {
        const wbMgr = window.appState.workbookMgr;
        let target = wbMgr.getTask(m, taskId);
        if (!target && String(taskId).includes('-')) {
          const parts = String(taskId).split('-');
          if (parts.length >= 3) {
            const prefix = `${parts[0]}-${parts[1]}-${parts[2]}`.toLowerCase();
            const allTasks = wbMgr.getTasksForMonth ? wbMgr.getTasksForMonth(m) : [];
            target = allTasks.find(tsk => tsk && tsk.task_id && tsk.task_id.toLowerCase().startsWith(prefix));
          }
        }
        if (target) {
          if (beforeP) { target.before_photo = beforeP; target.photo_1 = beforeP; delete target._photoDeleted_before; }
          if (afterP) { target.after_photo = afterP; target.photo_2 = afterP; target.photo = afterP; delete target._photoDeleted_after; }
          delete target.clear_photos;
          delete target._lastPhotoDeleteTime;
          target._lastPhotoEditTime = Date.now();
          if (!isBatch) {
            if (typeof wbMgr.debouncedSave === 'function') {
              wbMgr.debouncedSave(100);
            } else {
              wbMgr.save();
            }
          }
        }
      } catch(e) {}
    }

    // Update SyncEngine active slides
    if (window.appState && window.appState.syncEngine) {
      try {
        const slides = window.appState.syncEngine.getActiveSlides(m);
        let target = slides.find(s => s && s.task_id === taskId);
        if (!target && String(taskId).includes('-')) {
          const parts = String(taskId).split('-');
          if (parts.length >= 3) {
            const prefix = `${parts[0]}-${parts[1]}-${parts[2]}`.toLowerCase();
            target = slides.find(s => s && s.task_id && s.task_id.toLowerCase().startsWith(prefix));
          }
        }
        if (target) {
          if (beforeP) target.photo_before = beforeP;
          if (afterP) target.photo_after = afterP;
          target.photo = afterP || beforeP || target.photo;
          target.has_dual_photo = Boolean(target.photo_before && target.photo_after);
          if (!isBatch) {
            this._debouncedSaveSlides(m, slides);
          }
        }
      } catch(e) {}
    }

    // Update live DOM on cards
    if (hasChange) {
      const livePhoto = afterP || beforeP;
      if (typeof MonthlyReportView !== 'undefined' && typeof MonthlyReportView.updateSlideCardPhoto === 'function') {
        MonthlyReportView.updateSlideCardPhoto(taskId, livePhoto);
      }
      if (typeof MonthlyInputView !== 'undefined' && typeof MonthlyInputView.updateTaskCardPhoto === 'function') {
        MonthlyInputView.updateTaskCardPhoto(taskId);
      }
      if (typeof MonthlyReportView !== 'undefined' && MonthlyReportView._activeModalTaskId === taskId) {
        if (typeof MonthlyReportView.renderModalPhotoSlots === 'function') MonthlyReportView.renderModalPhotoSlots(taskId);
        if (typeof MonthlyReportView.renderModalLivePreview === 'function') MonthlyReportView.renderModalLivePreview(taskId);
      }
    }
  }

  _slidesSaveTimer = null;
  _debouncedSaveSlides(m, slides) {
    if (this._slidesSaveTimer) clearTimeout(this._slidesSaveTimer);
    this._slidesSaveTimer = setTimeout(() => {
      try {
        localStorage.setItem(`walton_pd_active_slides_${m}`, JSON.stringify(slides));
      } catch(e) {}
    }, 150);
  }

  /**
   * High-Performance Bulk Sync: Ingests 20-50 photos in a single rapid batch without UI freezing
   */
  applyLivePhotoBatch(photosMap, month = 'SEP-2026') {
    if (!photosMap || typeof photosMap !== 'object') return;
    const m = month || 'SEP-2026';
    let delMap = {};
    try {
      delMap = JSON.parse(localStorage.getItem('walton_deleted_photo_tasks') || '{}');
    } catch(e) {}

    let anyChange = false;
    for (const [taskId, pData] of Object.entries(photosMap)) {
      if (!taskId || !pData) continue;
      this.applyLivePhotoData(taskId, pData, m, true);
      const cleanT = String(taskId).toLowerCase();
      const pParts = cleanT.split('-');
      const pPrefix = pParts.length >= 3 ? `${pParts[0]}-${pParts[1]}-${pParts[2]}` : cleanT;
      delete delMap[taskId];
      delete delMap[cleanT];
      delete delMap[pPrefix];
      delete delMap[`${m}_${taskId}`];
      delete delMap[`${m}_${cleanT}`];
      anyChange = true;
    }

    if (anyChange) {
      try {
        localStorage.setItem('walton_deleted_photo_tasks', JSON.stringify(delMap));
      } catch(e) {}

      if (window.appState && window.appState.workbookMgr) {
        if (typeof window.appState.workbookMgr.debouncedSave === 'function') {
          window.appState.workbookMgr.debouncedSave(80);
        } else {
          window.appState.workbookMgr.save();
        }
      }

      if (window.appState && window.appState.syncEngine) {
        try {
          const slides = window.appState.syncEngine.getActiveSlides(m);
          this._debouncedSaveSlides(m, slides);
        } catch(e) {}
      }
    }
  }

  /**
   * Compress and save photo file to IndexedDB and sync thumbnail to Google Sheets
   * Full resolution photo stored in IndexedDB; compact thumbnail synced across devices.
   */
  async savePhotoFile(taskId, slot, file, month = null, onProgress = null) {
    if (!taskId || !file) return null;

    let compressedData = "";
    if (typeof PhotoStorageProvider !== 'undefined' && PhotoStorageProvider.compressImageFile) {
      compressedData = await PhotoStorageProvider.compressImageFile(file);
    } else if (typeof PhotoStorageProvider !== 'undefined' && PhotoStorageProvider.fileToBase64) {
      compressedData = await PhotoStorageProvider.fileToBase64(file);
    } else {
      compressedData = "";
    }

    if (!compressedData) {
      compressedData = await new Promise(res => {
        const r = new FileReader();
        r.onload = ev => res(ev.target.result);
        r.onerror = () => res("");
        r.readAsDataURL(file);
      });
    }

    let syncThumbnail = "";
    if (typeof PhotoStorageProvider !== 'undefined' && PhotoStorageProvider.generateSyncThumbnail) {
      syncThumbnail = await PhotoStorageProvider.generateSyncThumbnail(file);
    } else if (compressedData && compressedData.length < 35000) {
      syncThumbnail = compressedData;
    }

    return this.setTaskPhoto(taskId, slot, compressedData, syncThumbnail, month, onProgress || null);
  }

  async savePhoto(taskId, slot, base64Url, month = null, onProgress = null) {
    return this.setTaskPhoto(taskId, slot, base64Url, null, month, onProgress);
  }

  async setTaskPhoto(taskId, slot, base64Url, syncThumbnail = null, month = null, onProgress = null) {
    if (!taskId || !base64Url) return null;
    let m = month;
    if (!m && typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
      m = window.appState.workbookMgr.activeMonth;
    }
    if (!m && typeof MonthlyInputView !== 'undefined' && MonthlyInputView.selectedMonth) {
      m = MonthlyInputView.selectedMonth;
    }
    const monthKey = m ? `${m}_${taskId}` : null;
    const isBefore = (slot === 'before_photo' || slot === 'photo_1');
    const isAfter = (slot === 'after_photo' || slot === 'photo_2');
    const isBase64Blob = typeof base64Url === 'string' && base64Url.startsWith('data:image/');

    if (!this.photoMap[taskId]) {
      this.photoMap[taskId] = { photo_1: null, photo_2: null, before_photo: null, after_photo: null };
    }
    if (isBefore) {
      this.photoMap[taskId].before_photo = base64Url;
      this.photoMap[taskId].photo_1 = base64Url;
    }
    if (isAfter) {
      this.photoMap[taskId].after_photo = base64Url;
      this.photoMap[taskId].photo_2 = base64Url;
    }

    if (monthKey) {
      if (!this.photoMap[monthKey]) {
        this.photoMap[monthKey] = { photo_1: null, photo_2: null, before_photo: null, after_photo: null };
      }
      if (isBefore) {
        this.photoMap[monthKey].before_photo = base64Url;
        this.photoMap[monthKey].photo_1 = base64Url;
      }
      if (isAfter) {
        this.photoMap[monthKey].after_photo = base64Url;
        this.photoMap[monthKey].photo_2 = base64Url;
      }
    }

    // Immediately clear all deletion tombstones locally and in Firebase because a fresh photo was set!
    const cleanTargetT = String(taskId).toLowerCase();
    const targetParts = cleanTargetT.split('-');
    const targetPrefix = targetParts.length >= 3 ? `${targetParts[0]}-${targetParts[1]}-${targetParts[2]}` : cleanTargetT;
    try {
      const delMap = JSON.parse(localStorage.getItem('walton_deleted_photo_tasks') || '{}');
      delete delMap[taskId];
      delete delMap[cleanTargetT];
      delete delMap[targetPrefix];
      if (monthKey) delete delMap[monthKey];
      delete delMap[`${m}_${cleanTargetT}`];
      localStorage.setItem('walton_deleted_photo_tasks', JSON.stringify(delMap));
    } catch(e) {}

    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected() && FirebaseSyncService.db) {
      try {
        FirebaseSyncService.db.ref(`walton_monthly_report/deleted_photos/${m}/${taskId}`).remove().catch(() => {});
        FirebaseSyncService.db.ref(`walton_monthly_report/deleted_photos/${m}/${cleanTargetT}`).remove().catch(() => {});
        if (targetPrefix && targetPrefix !== taskId) {
          FirebaseSyncService.db.ref(`walton_monthly_report/deleted_photos/${m}/${targetPrefix}`).remove().catch(() => {});
        }
      } catch(e) {}
    }

    // 1. Asynchronously persist to IndexedDB (Gigabytes quota)
    if (typeof PhotoIndexedDB !== 'undefined') {
      PhotoIndexedDB.saveTaskPhotos(taskId, this.photoMap[taskId]).catch(err => {
        console.warn("IndexedDB async save notice:", err);
      });
      if (monthKey) {
        PhotoIndexedDB.saveTaskPhotos(monthKey, this.photoMap[monthKey]).catch(err => {
          console.warn("IndexedDB month async save notice:", err);
        });
      }
    }

    // 2. Update in-memory active presentation slides immediately so Monthly Report reflects changes
    try {
      if (typeof window !== 'undefined' && window.appState && window.appState.syncEngine) {
        const slideMonth = m || (window.appState.workbookMgr ? window.appState.workbookMgr.activeMonth : "SEP-2026");
        const slides = window.appState.syncEngine.getActiveSlides(slideMonth);
        const target = slides.find(s => s.task_id === taskId);
        if (target) {
          if (isBefore) target.photo_before = base64Url;
          if (isAfter) target.photo_after = base64Url;
          target.photo = base64Url;
          target.has_dual_photo = Boolean(target.photo_before && target.photo_after);
          // Only save clean lightweight URLs into localStorage to prevent 5MB quota errors!
          if (!isBase64Blob) {
            try {
              localStorage.setItem(`walton_pd_active_slides_${slideMonth}`, JSON.stringify(slides));
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.warn("Active slides memory update notice:", e);
    }

    // 3. For clean server URLs, persist directly to workbookMgr & Firebase
    if (!isBase64Blob) {
      try {
        if (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
          const wbMgr = window.appState.workbookMgr;
          const activeM = m || wbMgr.activeMonth || "SEP-2026";
          let targetTask = wbMgr.getTask(activeM, taskId);
          if (targetTask) {
            const photoKey = isBefore ? 'photo_1' : 'photo_2';
            if (isBefore) {
              targetTask.photo_1 = base64Url;
              targetTask.before_photo = base64Url;
              delete targetTask._photoDeleted_before;
            } else {
              targetTask.photo_2 = base64Url;
              targetTask.after_photo = base64Url;
              targetTask.photo = base64Url;
              delete targetTask._photoDeleted_after;
            }
            delete targetTask.clear_photos;
            delete targetTask._explicitUserPhotoDeleteTime;
            delete targetTask._lastPhotoDeleteTime;
            targetTask._lastPhotoEditTime = Date.now();
            targetTask.last_updated = new Date().toISOString();
            wbMgr.save();

            if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
              FirebaseSyncService.updateCell(activeM, taskId, photoKey, base64Url);
              FirebaseSyncService.updateCell(activeM, taskId, isBefore ? 'before_photo' : 'after_photo', base64Url);
              FirebaseSyncService.updateCell(activeM, taskId, 'photo', base64Url);
              FirebaseSyncService.updateCell(activeM, taskId, 'clear_photos', null);
              FirebaseSyncService.updateCell(activeM, taskId, '_lastPhotoDeleteTime', null);
              FirebaseSyncService.updateCell(activeM, taskId, '_explicitUserPhotoDeleteTime', null);
              FirebaseSyncService.updateCell(activeM, taskId, '_lastPhotoEditTime', Date.now());
              FirebaseSyncService.pushTask(activeM, targetTask);
            }
          }
        }
      } catch (syncErr) {
        console.warn("Photo sync notice:", syncErr);
      }
    }

    // 4. Send to Hostinger Server Storage API for permanent disk storage across all devices
    let serverUrl = null;
    if (base64Url && (base64Url.startsWith('data:image/') || base64Url.length > 500)) {
      try {
        serverUrl = await this.uploadPhotoToServer(taskId, slot, base64Url, m, onProgress);
      } catch (e) {
        console.warn("[Hostinger Photo Storage] Upload notice:", e);
      }
    }

    // Targeted DOM update: Never blow away entire DOM via MonthlyReportView.render()!
    if (typeof MonthlyReportView !== 'undefined') {
      if (typeof MonthlyReportView.updateSlideCardPhoto === 'function') {
        MonthlyReportView.updateSlideCardPhoto(taskId);
      }
      if (MonthlyReportView._activeModalTaskId === taskId) {
        if (typeof MonthlyReportView.renderModalPhotoSlots === 'function') MonthlyReportView.renderModalPhotoSlots(taskId);
        if (typeof MonthlyReportView.renderModalLivePreview === 'function') MonthlyReportView.renderModalLivePreview(taskId);
      }
    }

    return serverUrl || base64Url;
  }

  purgeTaskPhotosMemory(taskId) {
    if (!taskId) return;
    const cleanTarget = String(taskId).toLowerCase();
    const parts = cleanTarget.split('-');
    const prefix = parts.length >= 3 ? `${parts[0]}-${parts[1]}-${parts[2]}` : cleanTarget;

    delete this.photoMap[taskId];
    delete this.photoMap[prefix];
    Object.keys(this.photoMap).forEach(k => {
      const lowerK = k.toLowerCase();
      if (lowerK === cleanTarget || lowerK === prefix || lowerK.includes(cleanTarget) || lowerK.includes(prefix) || lowerK.endsWith(`_${cleanTarget}`)) {
        delete this.photoMap[k];
      }
    });
  }

  async removePhoto(taskId, slot, month = null) {
    if (!taskId || !slot) return false;
    let m = month;
    if (!m && typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
      m = window.appState.workbookMgr.activeMonth;
    }
    if (!m && typeof MonthlyInputView !== 'undefined' && MonthlyInputView.selectedMonth) {
      m = MonthlyInputView.selectedMonth;
    }
    const cleanTarget = String(taskId).toLowerCase();
    const parts = cleanTarget.split('-');
    const prefix = parts.length >= 3 ? `${parts[0]}-${parts[1]}-${parts[2]}` : cleanTarget;
    const monthKey = m ? `${m}_${taskId}` : null;
    const isAll = (slot === 'all');
    const isBefore = isAll || (slot === 'before_photo' || slot === 'photo_1');
    const isAfter = isAll || (slot === 'after_photo' || slot === 'photo_2');
    const now = Date.now();

    // 1. Record Permanent Local Tombstone in LocalStorage
    try {
      const delMap = JSON.parse(localStorage.getItem('walton_deleted_photo_tasks') || '{}');
      delMap[taskId] = { timestamp: now, slot: slot, prefix: prefix };
      delMap[prefix] = { timestamp: now, slot: slot };
      if (monthKey) delMap[monthKey] = { timestamp: now, slot: slot };
      localStorage.setItem('walton_deleted_photo_tasks', JSON.stringify(delMap));
    } catch(e) {}

    // 2. Clear MonthWorkbookManager FIRST so no fallback can resurrect stale photo!
    let targetTask = null;
    let activeM = m || "SEP-2026";
    try {
      if (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
        const wbMgr = window.appState.workbookMgr;
        activeM = m || wbMgr.activeMonth || "SEP-2026";
        const allMonths = (wbMgr.getAllMonths && typeof wbMgr.getAllMonths === 'function')
          ? wbMgr.getAllMonths()
          : [activeM];

        for (const mon of allMonths) {
          const t = wbMgr.getTask(mon, taskId);
          if (t) {
            if (isBefore) {
              t.photo_1 = "";
              t.before_photo = "";
              t._photoDeleted_before = now;
            }
            if (isAfter) {
              t.photo_2 = "";
              t.after_photo = "";
              t.photo = "";
              t._photoDeleted_after = now;
            }
            if (!t.photo_1 && !t.photo_2) {
              t.clear_photos = true;
            } else {
              delete t.clear_photos;
            }
            t._explicitUserPhotoDeleteTime = now;
            t._lastPhotoDeleteTime = now;
            t._lastPhotoEditTime = 0; // Wipe edit time so delete timestamp is strictly newer
            t.last_updated = new Date().toISOString();
            if (mon === activeM) targetTask = t;
          }
        }
        wbMgr.save();
      }
    } catch (e) {
      console.warn("Workbook photo removal notice:", e);
    }

    // 3. Purge In-Memory PhotoMap across ALL matching keys & prefixes
    this.purgeTaskPhotosMemory(taskId);

    // 4. Persist deletion to IndexedDB across all matching task keys & prefixes
    if (typeof PhotoIndexedDB !== 'undefined') {
      try {
        if (typeof PhotoIndexedDB.purgeAllTaskPhotos === 'function') {
          await PhotoIndexedDB.purgeAllTaskPhotos(taskId);
          if (prefix && prefix !== taskId) await PhotoIndexedDB.purgeAllTaskPhotos(prefix);
        } else if (typeof PhotoIndexedDB.deleteTaskPhotos === 'function') {
          await PhotoIndexedDB.deleteTaskPhotos(taskId);
          if (monthKey) await PhotoIndexedDB.deleteTaskPhotos(monthKey);
        }
      } catch (idbErr) {
        console.warn("IndexedDB photo delete notice:", idbErr);
      }
    }

    // 4. Clear AI Breakdown Sheet photos so they never resurrect
    try {
      if (typeof window !== 'undefined' && window.appState && window.appState.breakdownSheet) {
        const remaining = this.getTaskPhotos(taskId, m);
        const hasAny = Boolean(remaining.photo_1 || remaining.photo_2 || remaining.before_photo || remaining.after_photo);
        const updates = {
          task_id: taskId,
          slide_status: hasAny ? "READY" : "PHOTO PENDING"
        };
        if (isBefore) {
          updates.photo_before = null;
          updates.photo = remaining.after_photo || null;
        }
        if (isAfter) {
          updates.photo_after = null;
          updates.photo = remaining.before_photo || null;
        }
        window.appState.breakdownSheet.upsertBreakdown(updates);
      }
    } catch (e) {
      console.warn("Breakdown photo removal notice:", e);
    }

    // 5. Update SyncEngine Manual Overrides and Active Slides immediately
    try {
      if (typeof window !== 'undefined' && window.appState && window.appState.syncEngine) {
        const syncEngine = window.appState.syncEngine;
        if (syncEngine.manualOverrides && syncEngine.manualOverrides[taskId]) {
          if (isBefore) {
            delete syncEngine.manualOverrides[taskId].photo_before;
            delete syncEngine.manualOverrides[taskId].photo_1;
          }
          if (isAfter) {
            delete syncEngine.manualOverrides[taskId].photo_after;
            delete syncEngine.manualOverrides[taskId].photo_2;
          }
          syncEngine.saveManualOverrides();
        }

        const slides = syncEngine.getActiveSlides(activeM);
        const targetSlide = slides.find(s => s.task_id === taskId);
        if (targetSlide) {
          if (isBefore) targetSlide.photo_before = null;
          if (isAfter) targetSlide.photo_after = null;
          targetSlide.photo = targetSlide.photo_before || targetSlide.photo_after || null;
          targetSlide.has_dual_photo = Boolean(targetSlide.photo_before && targetSlide.photo_after);
          try {
            localStorage.setItem(`walton_pd_active_slides_${activeM}`, JSON.stringify(slides));
          } catch (e) {}
        }

        // Clean all cached slide decks in localStorage across all months
        for (let i = 0; i < localStorage.length; i++) {
          const lk = localStorage.key(i);
          if (lk && lk.startsWith('walton_pd_active_slides_')) {
            try {
              const rawSlides = localStorage.getItem(lk);
              if (rawSlides) {
                const parsedSlides = JSON.parse(rawSlides);
                if (Array.isArray(parsedSlides)) {
                  let deckCleaned = false;
                  parsedSlides.forEach(s => {
                    if (s && s.task_id) {
                      const sClean = String(s.task_id).toLowerCase();
                      if (s.task_id === taskId || sClean === cleanTarget || (prefix && sClean.startsWith(prefix))) {
                        if (isBefore) s.photo_before = null;
                        if (isAfter) s.photo_after = null;
                        s.photo = s.photo_before || s.photo_after || null;
                        s.has_dual_photo = Boolean(s.photo_before && s.photo_after);
                        deckCleaned = true;
                      }
                    }
                  });
                  if (deckCleaned) {
                    localStorage.setItem(lk, JSON.stringify(parsedSlides));
                  }
                }
              }
            } catch (err) {}
          }
        }
      }
    } catch (e) {
      console.warn("Slide photo removal notice:", e);
    }

    // 6. Push real-time deletion broadcast to Firebase & Google Sheets!
    try {
      if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected() && FirebaseSyncService.db) {
        const deletePayload = {
          _explicitUserPhotoDeleteTime: now,
          _lastPhotoDeleteTime: now,
          _lastPhotoEditTime: 0
        };
        if (isBefore) {
          deletePayload.photo_1 = null;
          deletePayload.before_photo = null;
          deletePayload._photoDeleted_before = now;
        }
        if (isAfter) {
          deletePayload.photo_2 = null;
          deletePayload.after_photo = null;
          deletePayload.photo = null;
          deletePayload._photoDeleted_after = now;
        }
        if (isAll) {
          deletePayload.photo_1 = null;
          deletePayload.photo_2 = null;
          deletePayload.before_photo = null;
          deletePayload.after_photo = null;
          deletePayload.photo = null;
          deletePayload._photoDeleted_before = now;
          deletePayload._photoDeleted_after = now;
        }
        
        await FirebaseSyncService.db.ref(`walton_monthly_report/workbooks/${activeM}/tasks/${taskId}`).update(deletePayload).catch(() => {});
        
        // Atomically remove properties from Firebase node
        if (isAll || isAfter) {
          FirebaseSyncService.db.ref(`walton_monthly_report/workbooks/${activeM}/tasks/${taskId}/photo_2`).remove().catch(() => {});
          FirebaseSyncService.db.ref(`walton_monthly_report/workbooks/${activeM}/tasks/${taskId}/after_photo`).remove().catch(() => {});
          FirebaseSyncService.db.ref(`walton_monthly_report/workbooks/${activeM}/tasks/${taskId}/photo`).remove().catch(() => {});
          FirebaseSyncService.db.ref(`walton_monthly_report/live_photos/${activeM}/${taskId}/after_photo`).remove().catch(() => {});
          FirebaseSyncService.db.ref(`walton_monthly_report/live_photos/${activeM}/${taskId}/photo_2`).remove().catch(() => {});
          FirebaseSyncService.db.ref(`walton_monthly_report/live_photos/${activeM}/${taskId}/photo`).remove().catch(() => {});
        }
        if (isAll || isBefore) {
          FirebaseSyncService.db.ref(`walton_monthly_report/workbooks/${activeM}/tasks/${taskId}/photo_1`).remove().catch(() => {});
          FirebaseSyncService.db.ref(`walton_monthly_report/workbooks/${activeM}/tasks/${taskId}/before_photo`).remove().catch(() => {});
          FirebaseSyncService.db.ref(`walton_monthly_report/live_photos/${activeM}/${taskId}/before_photo`).remove().catch(() => {});
          FirebaseSyncService.db.ref(`walton_monthly_report/live_photos/${activeM}/${taskId}/photo_1`).remove().catch(() => {});
        }
        if (isAll) {
          FirebaseSyncService.db.ref(`walton_monthly_report/live_photos/${activeM}/${taskId}`).remove().catch(() => {});
        }

        // Record persistent tombstone in Firebase so ALL devices permanently know this photo is deleted
        FirebaseSyncService.db.ref(`walton_monthly_report/deleted_photos/${activeM}/${taskId}`).set({ timestamp: now, slot: slot }).catch(() => {});
        if (prefix && prefix !== taskId) {
          FirebaseSyncService.db.ref(`walton_monthly_report/deleted_photos/${activeM}/${prefix}`).set({ timestamp: now, slot: slot }).catch(() => {});
        }

        if (targetTask) {
          targetTask.photo_1 = null;
          targetTask.photo_2 = null;
          targetTask.before_photo = null;
          targetTask.after_photo = null;
          targetTask.photo = null;
          await FirebaseSyncService.pushTask(activeM, targetTask);
        }
      }

      // Also notify Hostinger Server to delete photo file and remove from index
      try {
        fetch(this._getApiUrl('api/delete_photo.php'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: taskId, slot: slot, month: activeM })
        }).catch(() => {});
      } catch(apiErr) {}

      // Push to Google Sheets if configured
      if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask && targetTask) {
        GoogleSheetsSync.pushTask(targetTask, true);
      }
    } catch (e) {
      console.warn("Cloud photo broadcast removal notice:", e);
    }

    // 7. Delete from Hostinger server permanent disk storage
    try {
      fetch(this._getApiUrl('api/delete_photo.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: taskId,
          month: activeM,
          slot: isAll ? 'all' : (isBefore ? 'before_photo' : 'after_photo')
        })
      }).catch(err => console.warn("[Hostinger Photo Storage] Server delete notice:", err));
    } catch (e) {}

    // Targeted DOM update: Never blow away entire page via full render!
    if (typeof MonthlyReportView !== 'undefined') {
      if (typeof MonthlyReportView.updateSlideCardPhoto === 'function') {
        MonthlyReportView.updateSlideCardPhoto(taskId);
      }
      if (MonthlyReportView._activeModalTaskId === taskId) {
        if (typeof MonthlyReportView.renderModalPhotoSlots === 'function') MonthlyReportView.renderModalPhotoSlots(taskId);
        if (typeof MonthlyReportView.renderModalLivePreview === 'function') MonthlyReportView.renderModalLivePreview(taskId);
      }
    }

    return true;
  }

  hasPhoto(taskId) {
    const photos = this.getTaskPhotos(taskId);
    return Boolean(photos.photo_1 || photos.photo_2 || photos.before_photo || photos.after_photo);
  }
}

const photoManager = new PhotoManager();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PhotoManager, photoManager };
} else if (typeof window !== 'undefined') {
  window.PhotoManager = PhotoManager;
  window.photoManager = photoManager;
}
