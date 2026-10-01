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

    // 2. Clean up any bloated active slides in LocalStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("walton_pd_active_slides_")) {
          const val = localStorage.getItem(key);
          if (val && val.length > 500000) { // If larger than 500KB, strip base64
            const slides = JSON.parse(val);
            if (Array.isArray(slides)) {
              slides.forEach(s => {
                s.photo = null;
                s.photo_before = null;
                s.photo_after = null;
              });
              localStorage.setItem(key, JSON.stringify(slides));
              console.log(`Optimized storage for ${key}`);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Storage quota optimization notice:", e);
    }

    // 3. Load all photos from IndexedDB into memory
    try {
      if (typeof PhotoIndexedDB !== 'undefined') {
        const idbPhotos = await PhotoIndexedDB.getAllPhotos();
        if (idbPhotos && Object.keys(idbPhotos).length > 0) {
          this.photoMap = { ...this.photoMap, ...idbPhotos };
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

    // 5. Periodic background sync every 25 seconds for real-time cross-device photo updates
    if (typeof window !== 'undefined' && !this._serverPollTimer) {
      this._serverPollTimer = setInterval(() => {
        const m = (window.appState && window.appState.workbookMgr) ? window.appState.workbookMgr.activeMonth : 'SEP-2026';
        this.fetchPhotosFromServer(m);
      }, 25000);
    }

    this.isReady = true;
  }

  /**
   * Fetches server-stored photos from Hostinger API and merges into memory & IndexedDB
   */
  async fetchPhotosFromServer(month = 'SEP-2026') {
    try {
      const q = month ? `?month=${encodeURIComponent(month)}` : '';
      const resp = await fetch(`api/get_photos.php${q}`, { cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.success && data.photos) {
          let updatedCount = 0;
          for (const [tId, pData] of Object.entries(data.photos)) {
            if (!pData) continue;
            const current = this.photoMap[tId] || {};
            // Never let empty server fields wipe an actively loaded memory photo
            const merged = {
              ...current,
              before_photo: (pData.before_photo !== undefined && pData.before_photo !== null && pData.before_photo !== '') ? pData.before_photo : (current.before_photo || null),
              after_photo: (pData.after_photo !== undefined && pData.after_photo !== null && pData.after_photo !== '') ? pData.after_photo : (current.after_photo || null),
              photo_1: (pData.photo_1 !== undefined && pData.photo_1 !== null && pData.photo_1 !== '') ? pData.photo_1 : (pData.before_photo || current.photo_1 || null),
              photo_2: (pData.photo_2 !== undefined && pData.photo_2 !== null && pData.photo_2 !== '') ? pData.photo_2 : (pData.after_photo || current.photo_2 || null),
              photo: (pData.after_photo || pData.photo || pData.before_photo || current.after_photo || current.before_photo || null)
            };
            const hadPhoto = Boolean(current.before_photo || current.after_photo || current.photo);
            const hasPhotoNow = Boolean(merged.before_photo || merged.after_photo || merged.photo);

            this.photoMap[tId] = merged;
            if (month && month !== 'ALL') {
              const monthKey = `${month}_${tId}`;
              this.photoMap[monthKey] = { ...(this.photoMap[monthKey] || {}), ...merged };
            }
            if (typeof PhotoIndexedDB !== 'undefined') {
              PhotoIndexedDB.saveTaskPhotos(tId, merged).catch(() => {});
            }

            // Real-time live card update when photo is added on another PC
            if (!hadPhoto && hasPhotoNow) {
              if (typeof MonthlyReportView !== 'undefined' && typeof MonthlyReportView.updateSlideCardPhoto === 'function') {
                MonthlyReportView.updateSlideCardPhoto(tId);
              }
            }
            updatedCount++;
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
   */
  async uploadPhotoToServer(taskId, slot, base64Url, month = null) {
    if (!taskId || !base64Url) return null;
    let m = month;
    if (!m && typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
      m = window.appState.workbookMgr.activeMonth;
    }
    if (!m) m = 'SEP-2026';

    try {
      const resp = await fetch('api/save_photo.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: taskId,
          month: m,
          slot: slot,
          image: base64Url
        })
      });

      if (resp.ok) {
        const result = await resp.json();
        if (result && result.success && result.url) {
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

          // Persist clean server URL to IndexedDB
          if (typeof PhotoIndexedDB !== 'undefined') {
            PhotoIndexedDB.saveTaskPhotos(taskId, this.photoMap[taskId]).catch(() => {});
            PhotoIndexedDB.saveTaskPhotos(monthKey, this.photoMap[monthKey]).catch(() => {});
          }

          // Persist clean server URL to MonthWorkbookManager (lightweight URL prevents localStorage 5MB quota errors!)
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
                  delete targetTask._photoDeleted_after;
                }
                delete targetTask.clear_photos;
                targetTask._lastPhotoEditTime = Date.now();
                targetTask.last_updated = new Date().toISOString();
                wbMgr.save();
              }
            } catch(e) {}
          }

          // Broadcast server URL to peer laptops via Firebase Realtime Database
          if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
            try {
              FirebaseSyncService.updateCell(m, taskId, isBefore ? 'photo_1' : 'photo_2', serverUrl);
              FirebaseSyncService.updateCell(m, taskId, isBefore ? 'before_photo' : 'after_photo', serverUrl);
              FirebaseSyncService.updateCell(m, taskId, 'clear_photos', null);
              FirebaseSyncService.updateCell(m, taskId, isBefore ? '_photoDeleted_before' : '_photoDeleted_after', null);
            } catch(e) {}
          }

          // If MonthlyReportView is active, update targeted DOM directly (no full render!)
          if (typeof MonthlyReportView !== 'undefined') {
            if (MonthlyReportView._activeModalTaskId === taskId) {
              if (typeof MonthlyReportView.renderModalPhotoSlots === 'function') MonthlyReportView.renderModalPhotoSlots(taskId);
              if (typeof MonthlyReportView.renderModalLivePreview === 'function') MonthlyReportView.renderModalLivePreview(taskId);
            }
            if (typeof MonthlyReportView.updateSlideCardPhoto === 'function') {
              MonthlyReportView.updateSlideCardPhoto(taskId);
            }
          }

          return serverUrl;
        }
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

    // Case-insensitive lookup fallback if exact case not found in memory
    if (!memMonth && monthKey) {
      const lowerKey = monthKey.toLowerCase();
      const k = Object.keys(this.photoMap).find(key => key.toLowerCase() === lowerKey);
      if (k) memMonth = this.photoMap[k];
    }
    if (!this.photoMap[taskId]) {
      const lowerId = String(taskId).toLowerCase();
      const k = Object.keys(this.photoMap).find(key => key.toLowerCase() === lowerId);
      if (k) this.photoMap[taskId] = this.photoMap[k];
    }

    let t = null;
    let taskP1 = null;
    let taskP2 = null;
    if (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
      const wbMgr = window.appState.workbookMgr;
      t = m ? wbMgr.getTask(m, taskId) : wbMgr.getTask(wbMgr.activeMonth, taskId);
      if (t) {
        taskP1 = (!t.clear_photos && !t._photoDeleted_before && t.photo_1) ? t.photo_1 : null;
        taskP2 = (!t.clear_photos && !t._photoDeleted_after && t.photo_2) ? t.photo_2 : null;
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

    // Explicit deletion check: ONLY clear if explicit user deletion timestamp is newer than last edit
    // AND neither memory nor server photo cache has an active valid photo
    const hasActiveMemP1 = Boolean((memMonth && (memMonth.before_photo || memMonth.photo_1)) || (this.photoMap[taskId] && (this.photoMap[taskId].before_photo || this.photoMap[taskId].photo_1)));
    const hasActiveMemP2 = Boolean((memMonth && (memMonth.after_photo || memMonth.photo_2)) || (this.photoMap[taskId] && (this.photoMap[taskId].after_photo || this.photoMap[taskId].photo_2)));

    if (t) {
      if (t._photoDeleted_before && (!t._lastPhotoEditTime || t._photoDeleted_before > t._lastPhotoEditTime) && !hasActiveMemP1) {
        p1 = null;
      }
      if (t._photoDeleted_after && (!t._lastPhotoEditTime || t._photoDeleted_after > t._lastPhotoEditTime) && !hasActiveMemP2) {
        p2 = null;
      }
    }

    return {
      photo_1: p1 || null,
      photo_2: p2 || null,
      before_photo: p1 || null,
      after_photo: p2 || null
    };
  }

  /**
   * Compress and save photo file to IndexedDB and sync thumbnail to Google Sheets
   * Full resolution photo stored in IndexedDB; compact thumbnail synced across devices.
   */
  async savePhotoFile(taskId, slot, file, month = null) {
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

    return this.setTaskPhoto(taskId, slot, compressedData, syncThumbnail, month);
  }

  async savePhoto(taskId, slot, base64Url, month = null) {
    return this.setTaskPhoto(taskId, slot, base64Url, null, month);
  }

  async setTaskPhoto(taskId, slot, base64Url, syncThumbnail = null, month = null) {
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

    // 2. Safely update AI Breakdown sheet metadata
    try {
      if (typeof window !== 'undefined' && window.appState && window.appState.breakdownSheet) {
        const updates = { task_id: taskId, slide_status: "READY" };
        if (isBefore) updates.photo_before = base64Url;
        if (isAfter) updates.photo_after = base64Url;
        window.appState.breakdownSheet.upsertBreakdown(updates);
      }
    } catch (e) {
      console.warn("Breakdown update notice:", e);
    }

    // 3. Update in-memory active presentation slides immediately so Monthly Report reflects changes
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
          try {
            localStorage.setItem(`walton_pd_active_slides_${slideMonth}`, JSON.stringify(slides));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn("Active slides memory update notice:", e);
    }

    // 4. Synchronize thumbnail to MonthWorkbookManager & broadcast to Firebase & Google Sheets!
    try {
      if (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr) {
        const wbMgr = window.appState.workbookMgr;
        const activeM = m || wbMgr.activeMonth || "SEP-2026";
        let targetTask = wbMgr.getTask(activeM, taskId);
        if (!targetTask) {
          const allMonths = (wbMgr.getAllMonths && typeof wbMgr.getAllMonths === 'function')
            ? wbMgr.getAllMonths()
            : [activeM];
          for (const mon of allMonths) {
            const t = wbMgr.getTask(mon, taskId);
            if (t) { targetTask = t; break; }
          }
        }

        if (targetTask) {
          const photoKey = isBefore ? 'photo_1' : 'photo_2';
          
          if (isBefore) {
            targetTask.photo_1 = base64Url;
            targetTask.before_photo = base64Url;
            delete targetTask._photoDeleted_before;
          }
          if (isAfter) {
            targetTask.photo_2 = base64Url;
            targetTask.after_photo = base64Url;
            delete targetTask._photoDeleted_after;
          }
          targetTask._lastPhotoEditTime = Date.now();
          delete targetTask.clear_photos;
          targetTask.last_updated = new Date().toISOString();
          wbMgr.save();

          // Real-time Firebase Broadcast (syncs uploaded photo immediately to peer laptops!)
          if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
            FirebaseSyncService.updateCell(activeM, taskId, photoKey, base64Url);
            FirebaseSyncService.updateCell(activeM, taskId, isBefore ? 'before_photo' : 'after_photo', base64Url);
            FirebaseSyncService.updateCell(activeM, taskId, 'clear_photos', null);
            FirebaseSyncService.updateCell(activeM, taskId, isBefore ? '_photoDeleted_before' : '_photoDeleted_after', null);
            FirebaseSyncService.pushTask(activeM, targetTask);
          }

          // Push to cloud in background: prefer Google Drive direct CDN link, fallback to sharp thumbnail
          (async () => {
            let cloudPhotoRef = null;
            if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.uploadPhoto) {
              cloudPhotoRef = await GoogleSheetsSync.uploadPhoto(taskId, slot, base64Url);
            }

            if (cloudPhotoRef) {
              targetTask[photoKey] = cloudPhotoRef;
              targetTask.last_updated = new Date().toISOString();
              wbMgr.save();
              if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask) {
                GoogleSheetsSync.pushTask(targetTask);
              }
            } else {
              let th = syncThumbnail;
              if (!th && typeof PhotoStorageProvider !== 'undefined' && PhotoStorageProvider.generateSyncThumbnail) {
                th = await PhotoStorageProvider.generateSyncThumbnail(base64Url);
              }
              const taskToPush = { ...targetTask, [photoKey]: th || base64Url };
              if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask) {
                GoogleSheetsSync.pushTask(taskToPush);
              }
            }
          })().catch(err => console.warn("Background photo cloud sync notice:", err));
        }
      }
    } catch (syncErr) {
      console.warn("Photo sync notice:", syncErr);
    }

    // 5. Send to Hostinger Server Storage API for permanent disk storage across all devices
    if (base64Url && (base64Url.startsWith('data:image/') || base64Url.length > 500)) {
      this.uploadPhotoToServer(taskId, slot, base64Url, m).catch(e => console.warn("[Hostinger Photo Storage] Upload notice:", e));
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

    return base64Url;
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
    const monthKey = m ? `${m}_${taskId}` : null;
    const isAll = (slot === 'all');
    const isBefore = isAll || (slot === 'before_photo' || slot === 'photo_1');
    const isAfter = isAll || (slot === 'after_photo' || slot === 'photo_2');

    // 1. Clear MonthWorkbookManager FIRST so no fallback can resurrect stale photo!
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
              t._photoDeleted_before = Date.now();
            }
            if (isAfter) {
              t.photo_2 = "";
              t.after_photo = "";
              t._photoDeleted_after = Date.now();
            }
            if (!t.photo_1 && !t.photo_2) {
              t.clear_photos = true;
            } else {
              delete t.clear_photos;
            }
            t._lastPhotoEditTime = Date.now();
            t.last_updated = new Date().toISOString();
            if (mon === activeM) targetTask = t;
          }
        }
        wbMgr.save();
      }
    } catch (e) {
      console.warn("Workbook photo removal notice:", e);
    }

    // 2. Purge In-Memory PhotoMap on BOTH canonical and alias keys with explicit NULL!
    if (!this.photoMap[taskId]) this.photoMap[taskId] = {};
    if (isBefore) {
      this.photoMap[taskId].before_photo = null;
      this.photoMap[taskId].photo_1 = null;
    }
    if (isAfter) {
      this.photoMap[taskId].after_photo = null;
      this.photoMap[taskId].photo_2 = null;
    }

    if (monthKey) {
      if (!this.photoMap[monthKey]) this.photoMap[monthKey] = {};
      if (isBefore) {
        this.photoMap[monthKey].before_photo = null;
        this.photoMap[monthKey].photo_1 = null;
      }
      if (isAfter) {
        this.photoMap[monthKey].after_photo = null;
        this.photoMap[monthKey].photo_2 = null;
      }
    }

    // Also purge any other keys matching `_${taskId}`
    Object.keys(this.photoMap).forEach(k => {
      if (k === taskId || k.endsWith(`_${taskId}`)) {
        if (!this.photoMap[k]) this.photoMap[k] = {};
        if (isBefore) {
          this.photoMap[k].before_photo = null;
          this.photoMap[k].photo_1 = null;
        }
        if (isAfter) {
          this.photoMap[k].after_photo = null;
          this.photoMap[k].photo_2 = null;
        }
      }
    });

    // 3. Persist deletion / nulls to IndexedDB (Gigabytes quota)
    if (typeof PhotoIndexedDB !== 'undefined') {
      try {
        const remainingGlobal = this.photoMap[taskId];
        if (remainingGlobal && !remainingGlobal.before_photo && !remainingGlobal.after_photo && !remainingGlobal.photo_1 && !remainingGlobal.photo_2) {
          await PhotoIndexedDB.deleteTaskPhotos(taskId).catch(() => {});
          delete this.photoMap[taskId];
        } else if (remainingGlobal) {
          await PhotoIndexedDB.saveTaskPhotos(taskId, remainingGlobal).catch(() => {});
        }

        if (monthKey) {
          const remainingMonth = this.photoMap[monthKey];
          if (remainingMonth && !remainingMonth.before_photo && !remainingMonth.after_photo && !remainingMonth.photo_1 && !remainingMonth.photo_2) {
            await PhotoIndexedDB.deleteTaskPhotos(monthKey).catch(() => {});
            delete this.photoMap[monthKey];
          } else if (remainingMonth) {
            await PhotoIndexedDB.saveTaskPhotos(monthKey, remainingMonth).catch(() => {});
          }
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
      }
    } catch (e) {
      console.warn("Slide photo removal notice:", e);
    }

    // 6. Push real-time deletion broadcast to Firebase & Google Sheets!
    try {
      const photoField = isBefore ? 'photo_1' : 'photo_2';
      
      // REAL-TIME FIREBASE BROADCAST DELETION:
      if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
        await FirebaseSyncService.updateCell(activeM, taskId, photoField, "");
        if (targetTask) {
          await FirebaseSyncService.pushTask(activeM, targetTask);
        }
      }

      // Push to Google Sheets if configured
      if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.pushTask && targetTask) {
        GoogleSheetsSync.pushTask(targetTask, true);
      }
    } catch (e) {
      console.warn("Cloud photo broadcast removal notice:", e);
    }

    // 7. Delete from Hostinger server permanent disk storage
    try {
      fetch('api/delete_photo.php', {
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
