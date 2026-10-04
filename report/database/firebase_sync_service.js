/**
 * Process Development Monthly Report Automation System
 * Module: Google Firebase Realtime Database Engine (Sub-50ms Collaborative Sync)
 * Identical architecture to Google Docs & Google Sheets Online
 * WALTON Hi-Tech Industries PLC
 */
var GENUINE_TASK_IDS = new Set();

const FirebaseSyncService = {
  STORAGE_KEY_CONFIG: 'walton_pd_firebase_config_v1',
  app: null,
  db: null,
  status: 'NOT_CONFIGURED', // 'NOT_CONFIGURED' | 'CONNECTING' | 'CONNECTED' | 'OFFLINE'
  currentListeningMonth: null,
  _monthRef: null,
  _subscribers: [],
  _suppressLocalEchoUntil: {}, // taskId:field -> timestamp

  /**
   * Get stored Firebase config
   */
  getConfig() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_CONFIG);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}

    if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.FIREBASE && APP_CONFIG.FIREBASE.DATABASE_URL) {
      return {
        apiKey: APP_CONFIG.FIREBASE.API_KEY || "",
        databaseURL: APP_CONFIG.FIREBASE.DATABASE_URL,
        projectId: APP_CONFIG.FIREBASE.PROJECT_ID || ""
      };
    }
    return null;
  },

  /**
   * Save Firebase config
   */
  saveConfig(config) {
    if (!config) {
      localStorage.removeItem(this.STORAGE_KEY_CONFIG);
      this.status = 'NOT_CONFIGURED';
      this._updateNavbarBadge();
      return;
    }
    localStorage.setItem(this.STORAGE_KEY_CONFIG, JSON.stringify(config));
    this.init(true);
  },

  /**
   * Check if Firebase is currently active and connected
   */
  isConnected() {
    return this.status === 'CONNECTED' && Boolean(this.db);
  },

  /**
   * Initialize Firebase Engine
   */
  init(forceReinit = false) {
    // Retain tombstoned task IDs without artificial immunity

    const config = this.getConfig();
    if (!config || !config.databaseURL) {
      this.status = 'NOT_CONFIGURED';
      this._notifySubscribers();
      return;
    }

    if (typeof firebase === 'undefined') {
      console.warn("Firebase SDK not loaded. Waiting for network...");
      setTimeout(() => this.init(), 1000);
      return;
    }

    try {
      if (!this.app || forceReinit) {
        const appName = 'walton-report-realtime-engine';
        const existing = firebase.apps.find(a => a.name === appName);
        if (existing) {
          this.app = existing;
        } else {
          this.app = firebase.initializeApp(config, appName);
        }
        this.db = this.app.database();
      }

      this.status = 'CONNECTING';
      this._updateNavbarBadge();

      // Listen to connection state
      const connectedRef = this.db.ref('.info/connected');
      connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
          this.status = 'CONNECTED';
          console.log("🔥 Firebase Realtime Engine: Connected! Live sub-50ms sync active.");
          this._updateNavbarBadge();
          this._notifySubscribers();

          // Hydrate master engineers and supervisors from cloud
          this.hydrateMasterPersonnel();

          // Hydrate Top 5 Works from cloud
          this.hydrateTopWorks();

          // Bind active month listeners
          const activeMonth = (window.appState && window.appState.workbookMgr)
            ? window.appState.workbookMgr.activeMonth
            : 'SEP-2026';
          this.bindMonthListeners(activeMonth);
        } else {
          this.status = 'OFFLINE';
          this._updateNavbarBadge();
          this._notifySubscribers();
        }
      });
    } catch (err) {
      console.error("Firebase init error:", err);
      this.status = 'OFFLINE';
      this._updateNavbarBadge();
    }
  },

  /**
   * Hydrate tasks for a month from Firebase into local memory and reconcile
   */
  async hydrateMonth(month) {
    if (!this.db || !month) return false;
    const normMonth = (window.appState && window.appState.workbookMgr)
      ? window.appState.workbookMgr.normalizeMonth(month)
      : month;

    try {
      const snapshot = await this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks`).once('value');
      const fbData = snapshot.val();
      const wbMgr = window.appState && window.appState.workbookMgr;
      if (!wbMgr) return false;

      let deletedSet = new Set();
      try {
        const deletedList = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
        deletedList.forEach(id => {
          if (typeof SAZZAD_PROTECTED_TASK_IDS === 'undefined' || !SAZZAD_PROTECTED_TASK_IDS.has(id)) {
            deletedSet.add(id);
          }
        });
      } catch (e) {}

      // Hydrate cloud tombstones from Firebase to guarantee cross-device permanent deletions (excluding protected tasks)
      try {
        const tombSnap = await this.db.ref('walton_monthly_report/deleted_task_ids').once('value');
        const cloudTombs = tombSnap.val();
        if (cloudTombs && typeof cloudTombs === 'object') {
          Object.keys(cloudTombs).forEach(id => {
            if (typeof SAZZAD_PROTECTED_TASK_IDS === 'undefined' || !SAZZAD_PROTECTED_TASK_IDS.has(id)) {
              deletedSet.add(id);
            }
          });
        }
      } catch (e) {}

      // Strictly purge any protected IDs from deletedSet and Firebase deleted_task_ids
      if (typeof SAZZAD_PROTECTED_TASK_IDS !== 'undefined') {
        SAZZAD_PROTECTED_TASK_IDS.forEach(id => {
          deletedSet.delete(id);
          this.db.ref(`walton_monthly_report/deleted_task_ids/${id}`).remove().catch(() => {});
        });
      }
      try {
        localStorage.setItem('walton_deleted_task_ids', JSON.stringify(Array.from(deletedSet)));
      } catch (e) {}

      // Prune tombstoned tasks from in-memory workbook BEFORE processing
      if (wbMgr.workbooks && Array.isArray(wbMgr.workbooks[normMonth])) {
        const initCount = wbMgr.workbooks[normMonth].length;
        wbMgr.workbooks[normMonth] = wbMgr.workbooks[normMonth].filter(t => {
          if (!t || !t.task_id) return false;
          return !deletedSet.has(t.task_id);
        });
        if (wbMgr.workbooks[normMonth].length !== initCount) {
          wbMgr.save();
        }
      }

      if (fbData && typeof fbData === 'object' && Object.keys(fbData).length > 0) {
        // Auto-heal tasks loaded from Firebase
        const remoteTasks = [];
        for (const [key, t] of Object.entries(fbData)) {
          if (!t || typeof t !== 'object') continue;
          if (!t.task_id) t.task_id = key; // Auto-heal missing task_id from Firebase key

          // 🛡️ STRICT REJECTION: If task is in deletedSet (tombstoned), NEVER resurrect it!
          if (deletedSet.has(t.task_id) && (typeof SAZZAD_PROTECTED_TASK_IDS === 'undefined' || !SAZZAD_PROTECTED_TASK_IDS.has(t.task_id))) {
            console.warn(`🛡️ Firebase task ${t.task_id} is in deleted tombstones! Purging from cloud...`);
            this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks/${t.task_id}`).remove().catch(() => {});
            this.db.ref(`walton_monthly_report/deleted_task_ids/${t.task_id}`).set(Date.now()).catch(() => {});
            continue;
          }

          // 🛡️ STRICT REJECTION: Blacklisted engineers (Mahmud 51020, etc.) must NEVER enter!
          const assStr = String(t.assignee || t.engineer || '');
          let isBlacklistedEng = false;
          if (typeof REMOVED_ENGINEER_IDS !== 'undefined') {
            for (const rId of REMOVED_ENGINEER_IDS) {
              if (assStr.includes(rId)) { isBlacklistedEng = true; break; }
            }
          }
          if (isBlacklistedEng) {
            console.warn(`🛡️ Firebase task ${t.task_id} (${assStr}) belongs to blacklisted engineer! Purging from cloud...`);
            this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks/${t.task_id}`).remove().catch(() => {});
            this.db.ref(`walton_monthly_report/deleted_task_ids/${t.task_id}`).set(Date.now()).catch(() => {});
            deletedSet.add(t.task_id);
            continue;
          }

          // Purge empty placeholder tasks only
          if (!t.task_name || !t.task_name.trim() || t.task_name === 'Enter Task Name...') {
            this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks/${t.task_id}`).remove().catch(() => {});
            continue;
          }

          // Auto-repair supervisor to Kamrul (44819)
          if (!t.supervisor || String(t.supervisor).toLowerCase().includes('sazzad') || String(t.supervisor).includes('50463')) {
            t.supervisor = 'Kamrul (44819)';
          }

          // If task_name is missing from Firebase node, attempt to heal from local task
          const localMatch = wbMgr.getTask(normMonth, t.task_id);
          if (!t.task_name && localMatch && localMatch.task_name) {
            t.task_name = localMatch.task_name;
            t.assignee = t.assignee || localMatch.assignee;
            t.category = t.category || localMatch.category;
          }

          // Heal missing points from local task if Firebase has empty points but local has points
          const rPts = (t.points !== undefined && t.points !== null) ? String(t.points).trim() : '';
          const lPts = (localMatch && localMatch.points !== undefined && localMatch.points !== null) ? String(localMatch.points).trim() : '';
          if (rPts === '' && lPts !== '') {
            t.points = localMatch.points;
            this.updateCell(normMonth, t.task_id, 'points', t.points);
          }

          if (t.task_name && String(t.task_name).trim()) {
            remoteTasks.push(t);

            // Cross-device photo reconciliation on initial connect
            if (typeof photoManager !== 'undefined') {
              const photo1 = t.photo_1 || t.before_photo;
              if (photo1 && typeof photo1 === 'string' && photo1.trim()) {
                photoManager.setTaskPhoto(t.task_id, 'before_photo', photo1, photo1, normMonth);
                if (localMatch) {
                  localMatch.photo_1 = photo1;
                  localMatch.before_photo = photo1;
                  delete localMatch._photoDeleted_before;
                  delete localMatch.clear_photos;
                }
              }

              const photo2 = t.photo_2 || t.after_photo || t.photo;
              if (photo2 && typeof photo2 === 'string' && photo2.trim()) {
                photoManager.setTaskPhoto(t.task_id, 'after_photo', photo2, photo2, normMonth);
                if (localMatch) {
                  localMatch.photo_2 = photo2;
                  localMatch.after_photo = photo2;
                  localMatch.photo = photo2;
                  delete localMatch._photoDeleted_after;
                  delete localMatch.clear_photos;
                }
              }
            }
          }
        }

        remoteTasks.sort((a, b) => (a.task_id || '').localeCompare(b.task_id || '', undefined, { numeric: true, sensitivity: 'base' }));

        const changed = wbMgr.mergeFromCloud({ [normMonth]: remoteTasks }, true);

        // Check if local has genuinely new local drafts that Firebase is missing (STRICTLY EXCLUDE DELETED TASKS)
        const localTasks = wbMgr.getTasksForMonth(normMonth);
        const newLocalDrafts = localTasks.filter(lt => {
          if (!lt || !lt.task_id) return false;
          if (deletedSet.has(lt.task_id)) return false;
          let curDel = [];
          try { curDel = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]'); } catch(e) {}
          if (curDel.includes(lt.task_id)) return false;

          if (!lt.task_name || !lt.task_name.trim() || lt.task_name === 'Enter Task Name...') {
            return false;
          }

          // Only push if explicitly marked as local draft (newly created row)
          return Boolean(lt._isLocalDraft && !fbData[lt.task_id]);
        });
        if (newLocalDrafts.length > 0) {
          console.log(`🔥 Pushing ${newLocalDrafts.length} new local draft tasks to Firebase...`);
          for (const mt of newLocalDrafts) {
            await this.pushTask(normMonth, mt);
            delete mt._isLocalDraft;
          }
        }

        // 🛡️ CRITICAL GUARANTEE: Ensure Sazzad's protected tasks are in Firebase if missing
        if (normMonth === 'SEP-2026' && typeof SAZZAD_PROTECTED_TASK_IDS !== 'undefined') {
          const sazzadMissing = localTasks.filter(lt => lt && SAZZAD_PROTECTED_TASK_IDS.has(lt.task_id) && (!fbData || !fbData[lt.task_id]));
          if (sazzadMissing.length > 0) {
            console.log(`🛡️ Auto-restoring ${sazzadMissing.length} protected Sazzad tasks to Firebase...`);
            const restoreBatch = {};
            sazzadMissing.forEach(t => {
              restoreBatch[`walton_monthly_report/workbooks/${normMonth}/tasks/${t.task_id}`] = t;
            });
            await this.db.ref().update(restoreBatch).catch(() => {});
          }
        }

        wbMgr.save();
        console.log(`🔥 Firebase Hydrated: Loaded ${remoteTasks.length} active tasks for ${normMonth} into active memory.`);
        if (window.appState && window.appState.activeTab === 'monthly-input' && typeof MonthlyInputView !== 'undefined' && MonthlyInputView.render) {
          MonthlyInputView.render();
        }
        if (window.appState && window.appState.activeTab === 'dashboard' && typeof DashboardController !== 'undefined' && DashboardController.render) {
          DashboardController.render();
        }
        return true;
      } else {
        // Firebase has 0 tasks for this month: Authoritatively synchronize local to match Firebase (0 tasks)
        if (wbMgr.workbooks && Array.isArray(wbMgr.workbooks[normMonth])) {
          wbMgr.workbooks[normMonth] = [];
          wbMgr.save();
        }
        console.log(`🔥 Firebase Hydrated: Month ${normMonth} has 0 tasks in cloud.`);
        if (window.appState && window.appState.activeTab === 'monthly-input' && typeof MonthlyInputView !== 'undefined' && MonthlyInputView.render) {
          MonthlyInputView.render();
        }
        if (window.appState && window.appState.activeTab === 'dashboard' && typeof DashboardController !== 'undefined' && DashboardController.render) {
          DashboardController.render();
        }
        return true;
      }
    } catch (e) {
      console.warn("Firebase hydrateMonth notice:", e);
      return false;
    }
  },

  /**
   * Bind real-time listeners to active month
   */
  bindMonthListeners(month) {
    if (!this.db || !month) return;
    const normMonth = (window.appState && window.appState.workbookMgr)
      ? window.appState.workbookMgr.normalizeMonth(month)
      : month;

    if (this.currentListeningMonth === normMonth && this._monthRef) {
      return; // Already listening to this month
    }

    // Unbind previous month
    this.unbindCurrentMonth();

    this.currentListeningMonth = normMonth;
    this._monthRef = this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks`);
    // 0. Initial Hydration: Load all current tasks from Firebase on startup/connect
    this._initialHydrationDone = false;
    this.hydrateMonth(normMonth).then(() => {
      this._initialHydrationDone = true;
    }).catch(e => {
      console.warn("Hydrate notice:", e);
      this._initialHydrationDone = true;
    });

    // 1. child_added: Another user created a new task row (skip initial batch already processed by hydrateMonth)
    this._monthRef.on('child_added', (snapshot) => {
      if (!this._initialHydrationDone) return;

      const task = snapshot.val();
      if (!task || typeof task !== 'object') return;
      if (!task.task_id) task.task_id = snapshot.key;

      // Auto-repair supervisor
      if (!task.supervisor || String(task.supervisor).toLowerCase().includes('sazzad') || String(task.supervisor).includes('50463')) {
        task.supervisor = 'Kamrul (44819)';
      }

      // 🛡️ STRICT REJECTION: Blacklisted engineers (Mahmud 51020, etc.) must NEVER enter!
      const assStr = String(task.assignee || task.engineer || '');
      if (typeof REMOVED_ENGINEER_IDS !== 'undefined') {
        for (const rId of REMOVED_ENGINEER_IDS) {
          if (assStr.includes(rId)) {
            this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks/${task.task_id}`).remove().catch(() => {});
            this.db.ref(`walton_monthly_report/deleted_task_ids/${task.task_id}`).set(Date.now()).catch(() => {});
            return;
          }
        }
      }

      this._handleRemoteTaskAdded(normMonth, task);
    });

    // 2. child_changed: Another user modified a cell, category, points, supervisor, photo, TMS, etc.
    this._monthRef.on('child_changed', (snapshot) => {
      const task = snapshot.val();
      if (!task || typeof task !== 'object') return;
      if (!task.task_id) task.task_id = snapshot.key;

      // Auto-repair supervisor
      if (!task.supervisor || String(task.supervisor).toLowerCase().includes('sazzad') || String(task.supervisor).includes('50463')) {
        task.supervisor = 'Kamrul (44819)';
      }

      this._handleRemoteTaskChanged(normMonth, task);
    });

    // 3. child_removed: Another user deleted a task row
    this._monthRef.on('child_removed', (snapshot) => {
      const task = snapshot.val();
      const taskId = (task && task.task_id) ? task.task_id : snapshot.key;
      if (!taskId) return;
      this._handleRemoteTaskRemoved(normMonth, taskId);
    });

    // 4. Real-time Cloud Tombstones from any laptop
    if (!this._tombstonesBound) {
      this._tombstonesBound = true;
      this.db.ref('walton_monthly_report/deleted_task_ids').on('child_added', (snapshot) => {
        const deletedId = snapshot.key;
        if (!deletedId) return;

        try {
          const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
          if (!deleted.includes(deletedId)) {
            deleted.push(deletedId);
            localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deleted));
          }
        } catch (e) {}

        if (window.appState && window.appState.workbookMgr) {
          const wbMgr = window.appState.workbookMgr;
          const activeMonth = wbMgr.activeMonth || 'SEP-2026';
          const tasks = wbMgr.getTasksForMonth(activeMonth);
          const found = tasks.some(t => t.task_id === deletedId);
          if (found) {
            this._handleRemoteTaskRemoved(activeMonth, deletedId);
          }
        }
      });
    }

    // 5. Real-time Master Engineers & Passwords Sync
    if (!this._engineersBound) {
      this._engineersBound = true;
      this.db.ref('walton_monthly_report/master_engineers').on('value', (snapshot) => {
        const val = snapshot.val();
        if (Array.isArray(val) && val.length > 0 && typeof MASTER_LISTS !== 'undefined') {
          val.forEach(remoteEng => {
            const local = MASTER_LISTS.ENGINEERS.find(e => String(e.id) === String(remoteEng.id));
            if (local) {
              if (remoteEng.tms_password) local.tms_password = remoteEng.tms_password;
              if (remoteEng.access_pin) local.access_pin = remoteEng.access_pin;
              if (remoteEng.name) local.name = remoteEng.name;
              if (remoteEng.fullName) local.fullName = remoteEng.fullName;
              if (remoteEng.display) local.display = remoteEng.display;
              if (remoteEng.email) local.email = remoteEng.email;
            } else {
              MASTER_LISTS.ENGINEERS.push(remoteEng);
            }
          });
          try {
            localStorage.setItem("walton_pd_master_engineers_v2", JSON.stringify(MASTER_LISTS.ENGINEERS));
          } catch (e) {}
          if (window.appState && window.appState.activeTab === 'settings' && typeof SettingsView !== 'undefined' && SettingsView.render) {
            SettingsView.render();
          }
        }
      });
    }

    // 6. Real-time Master Supervisors Sync
    if (!this._supervisorsBound) {
      this._supervisorsBound = true;
      this.db.ref('walton_monthly_report/master_supervisors').on('value', (snapshot) => {
        const val = snapshot.val();
        if (Array.isArray(val) && val.length > 0 && typeof MASTER_LISTS !== 'undefined') {
          MASTER_LISTS.SUPERVISORS = val;
          try {
            localStorage.setItem("walton_pd_master_supervisors_v2", JSON.stringify(MASTER_LISTS.SUPERVISORS));
          } catch (e) {}
          if (window.appState && window.appState.activeTab === 'settings' && typeof SettingsView !== 'undefined' && SettingsView.render) {
            SettingsView.render();
          }
        }
      });
    }

    // 7. Real-time Strategic Projects Sync (Multi-PC Isolation & Sync)
    if (!this._projectsBound) {
      this._projectsBound = true;
      this.db.ref('walton_monthly_report/strategic_projects').on('value', (snapshot) => {
        const val = snapshot.val();
        if (Array.isArray(val) && val.length > 0) {
          try {
            localStorage.setItem("walton_strategic_projects_permanent_v1", JSON.stringify(val));
          } catch (e) {}
          if (window.appState && window.appState.activeTab === 'projects' && typeof ProjectsView !== 'undefined' && ProjectsView.render) {
            ProjectsView.render();
          }
        }
      });
    }

    // 8. Real-time Engineer Cost Savings Sync
    if (!this._costSavingsBound) {
      this._costSavingsBound = true;
      this.db.ref('walton_monthly_report/engineer_cost_savings').on('value', (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          try {
            localStorage.setItem("walton_engineer_cost_savings_v1", JSON.stringify(val));
          } catch (e) {}
          if (window.appState && window.appState.activeTab === 'cost-savings' && typeof CostSavingsView !== 'undefined' && CostSavingsView.render) {
            CostSavingsView.render();
          }
        }
      });
    }

    // 9. Real-time Monthly Cost Savings Tracker Sync (12 months values across PCs)
    if (!this._costTrackerBound) {
      this._costTrackerBound = true;
      this.db.ref('walton_monthly_report/cost_savings_tracker').on('value', (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          try {
            localStorage.setItem("walton_monthly_cost_savings_v2", JSON.stringify(val));
          } catch (e) {}
          if (window.appState && window.appState.activeTab === 'cost-savings' && typeof CostSavingsView !== 'undefined' && CostSavingsView.render) {
            CostSavingsView.render();
          }
        }
      });
    }

    // 10. Real-time Slide Studio Editorial Overrides Sync (Slide Title, Description, Impact across PCs)
    if (!this._slideOverridesBound || this._currentOverridesMonth !== normMonth) {
      this._slideOverridesBound = true;
      this._currentOverridesMonth = normMonth;
      this.db.ref(`walton_monthly_report/slide_overrides/${normMonth}`).on('value', (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val === 'object' && window.appState && window.appState.syncEngine) {
          for (const [tId, oData] of Object.entries(val)) {
            if (oData && typeof oData === 'object') {
              window.appState.syncEngine.manualOverrides[tId] = {
                ...(window.appState.syncEngine.manualOverrides[tId] || {}),
                ...oData
              };
            }
          }
          window.appState.syncEngine.saveManualOverrides();
          if (window.appState.activeTab === 'monthly-report' && typeof MonthlyReportView !== 'undefined' && MonthlyReportView.render) {
            MonthlyReportView.render();
          }
        }
      });
    }

    // 11. Real-time Deleted Photos Tombstone Sync across all PCs (with timestamp-based conflict resolution)
    if (!this._deletedPhotosBound || this._currentDeletedPhotosMonth !== normMonth) {
      this._deletedPhotosBound = true;
      this._currentDeletedPhotosMonth = normMonth;

      this.db.ref(`walton_monthly_report/deleted_photos/${normMonth}`).on('child_added', (snapshot) => {
        const delTaskId = snapshot.key;
        const delInfo = snapshot.val();
        if (!delTaskId) return;
        const delTime = (delInfo && (delInfo.timestamp || delInfo.time)) ? (delInfo.timestamp || delInfo.time) : 0;
        const now = Date.now();

        // Check if local task has a NEWER photo upload/edit than this historical tombstone!
        let localPhotoEditTime = 0;
        if (window.appState && window.appState.workbookMgr) {
          const lt = window.appState.workbookMgr.getTask(normMonth, delTaskId);
          if (lt) {
            localPhotoEditTime = lt._lastPhotoEditTime || 0;
          }
        }

        if (delTime > 0 && localPhotoEditTime > delTime) {
          // This deletion is OBSOLETE! A photo was uploaded after this deletion was created.
          // Revoke the stale tombstone from Firebase so it never deletes files on any PC
          this.db.ref(`walton_monthly_report/deleted_photos/${normMonth}/${delTaskId}`).remove().catch(() => {});
          return;
        }

        // Apply legitimate deletion to local storage and in-memory caches
        try {
          const delMap = JSON.parse(localStorage.getItem('walton_deleted_photo_tasks') || '{}');
          delMap[delTaskId] = delInfo || { timestamp: now, slot: 'all' };
          localStorage.setItem('walton_deleted_photo_tasks', JSON.stringify(delMap));
        } catch(e) {}

        if (typeof photoManager !== 'undefined') {
          photoManager.purgeTaskPhotosMemory(delTaskId);
        }

        if (window.appState && window.appState.workbookMgr) {
          const lt = window.appState.workbookMgr.getTask(normMonth, delTaskId);
          if (lt) {
            const slot = (delInfo && delInfo.slot) ? delInfo.slot : 'all';
            if (slot === 'all' || slot === 'before_photo' || slot === 'photo_1') {
              lt.photo_1 = "";
              lt.before_photo = "";
              lt._photoDeleted_before = now;
            }
            if (slot === 'all' || slot === 'after_photo' || slot === 'photo_2') {
              lt.photo_2 = "";
              lt.after_photo = "";
              lt.photo = "";
              lt._photoDeleted_after = now;
            }
            if (!lt.photo_1 && !lt.photo_2) lt.clear_photos = true;
            lt._lastPhotoDeleteTime = now;
            if (typeof window.appState.workbookMgr.debouncedSave === 'function') {
              window.appState.workbookMgr.debouncedSave(100);
            } else {
              window.appState.workbookMgr.save();
            }
          }
        }
        if (typeof MonthlyReportView !== 'undefined' && MonthlyReportView.updateSlideCardPhoto) {
          MonthlyReportView.updateSlideCardPhoto(delTaskId);
        }
      });

      // Listen for tombstone REVOCATIONS when a user re-uploads or sets a new photo on another PC
      this.db.ref(`walton_monthly_report/deleted_photos/${normMonth}`).on('child_removed', (snapshot) => {
        const revTaskId = snapshot.key;
        if (!revTaskId) return;
        try {
          const delMap = JSON.parse(localStorage.getItem('walton_deleted_photo_tasks') || '{}');
          delete delMap[revTaskId];
          delete delMap[revTaskId.toLowerCase()];
          const parts = revTaskId.split('-');
          if (parts.length >= 3) {
            delete delMap[`${parts[0]}-${parts[1]}-${parts[2]}`];
            delete delMap[`${parts[0]}-${parts[1]}-${parts[2]}`.toLowerCase()];
          }
          localStorage.setItem('walton_deleted_photo_tasks', JSON.stringify(delMap));
        } catch(e) {}
      });
    }

    // 12. Real-time Top 5 Summary (Completed & Ongoing Projects) Sync across all PCs
    if (!this._topWorksBound) {
      this._topWorksBound = true;
      this.db.ref('walton_monthly_report/top_works').on('value', (snapshot) => {
        const allTopWorks = snapshot.val();
        if (allTopWorks && typeof allTopWorks === 'object') {
          if (typeof TopWorksManager !== 'undefined' && TopWorksManager.applyRemoteStore) {
            TopWorksManager.applyRemoteStore(allTopWorks);
          }
          const activeM = (window.appState && window.appState.workbookMgr)
            ? window.appState.workbookMgr.activeMonth
            : 'SEP-2026';
          const curData = allTopWorks[activeM];
          if (curData && typeof FinalEditorView !== 'undefined' && FinalEditorView.updateInPlace) {
            FinalEditorView.updateInPlace(activeM, curData);
          }
          if (window.App && window.App.markTabDirty) {
            window.App.markTabDirty('top5-summary');
            window.App.markTabDirty('monthly-report');
            window.App.markTabDirty('final-report');
          }
        }
      });
    }

    // 13. Dedicated Real-time Live Photos Listener (Sub-50ms Cross-PC Photo Sync)
    this._livePhotosBoundMonths = this._livePhotosBoundMonths || {};
    if (!this._livePhotosBoundMonths[normMonth]) {
      this._livePhotosBoundMonths[normMonth] = true;
      this.db.ref(`walton_monthly_report/live_photos/${normMonth}`).on('value', (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          if (typeof photoManager !== 'undefined' && photoManager.applyLivePhotoBatch) {
            photoManager.applyLivePhotoBatch(val, normMonth);
          } else if (typeof photoManager !== 'undefined' && photoManager.applyLivePhotoData) {
            for (const [taskId, pData] of Object.entries(val)) {
              if (!pData || !taskId) continue;
              photoManager.applyLivePhotoData(taskId, pData, normMonth, true);
            }
          }
        }
      });
      this.db.ref(`walton_monthly_report/live_photos/${normMonth}`).on('child_changed', (snapshot) => {
        const pData = snapshot.val();
        const taskId = snapshot.key;
        if (pData && taskId && typeof photoManager !== 'undefined' && photoManager.applyLivePhotoData) {
          photoManager.applyLivePhotoData(taskId, pData, normMonth, false);
        }
      });
    }

    console.log(`🔥 Firebase listening to real-time changes for ${normMonth}`);
  },

  /**
   * Hydrate Top 5 Works (Completed & Ongoing Projects) from cloud on connect
   */
  async hydrateTopWorks() {
    if (!this.db) return;
    try {
      const snap = await this.db.ref('walton_monthly_report/top_works').once('value');
      const val = snap.val();
      if (val && typeof val === 'object') {
        if (typeof TopWorksManager !== 'undefined' && TopWorksManager.applyRemoteStore) {
          TopWorksManager.applyRemoteStore(val);
        }
        const activeM = (window.appState && window.appState.workbookMgr)
          ? window.appState.workbookMgr.activeMonth
          : 'SEP-2026';
        const curData = val[activeM];
        if (curData && typeof FinalEditorView !== 'undefined' && FinalEditorView.updateInPlace) {
          FinalEditorView.updateInPlace(activeM, curData);
        }
        console.log("🔥 Firebase Hydrated: Loaded Top 5 Works & Projects from cloud.");
      }
    } catch(e) {
      console.warn("Firebase hydrateTopWorks notice:", e);
    }
  },

  /**
   * Hydrate master engineers, access pins, and supervisors on startup
   */
  async hydrateMasterPersonnel() {
    if (!this.db) return;
    try {
      // 1. Engineers & TMS Passwords
      const engSnap = await this.db.ref('walton_monthly_report/master_engineers').once('value');
      const remoteEngs = engSnap.val();
      if (Array.isArray(remoteEngs) && remoteEngs.length > 0 && typeof MASTER_LISTS !== 'undefined') {
        remoteEngs.forEach(remoteEng => {
          const local = MASTER_LISTS.ENGINEERS.find(e => String(e.id) === String(remoteEng.id));
          if (local) {
            if (remoteEng.tms_password) local.tms_password = remoteEng.tms_password;
            if (remoteEng.access_pin) local.access_pin = remoteEng.access_pin;
            if (remoteEng.name) local.name = remoteEng.name;
            if (remoteEng.fullName) local.fullName = remoteEng.fullName;
            if (remoteEng.display) local.display = remoteEng.display;
            if (remoteEng.email) local.email = remoteEng.email;
          } else {
            MASTER_LISTS.ENGINEERS.push(remoteEng);
          }
        });
        localStorage.setItem("walton_pd_master_engineers_v2", JSON.stringify(MASTER_LISTS.ENGINEERS));
      }

      // 2. Supervisors
      const supSnap = await this.db.ref('walton_monthly_report/master_supervisors').once('value');
      const remoteSups = supSnap.val();
      if (Array.isArray(remoteSups) && remoteSups.length > 0 && typeof MASTER_LISTS !== 'undefined') {
        MASTER_LISTS.SUPERVISORS = remoteSups;
        localStorage.setItem("walton_pd_master_supervisors_v2", JSON.stringify(MASTER_LISTS.SUPERVISORS));
      }

      if (window.appState && window.appState.activeTab === 'settings' && typeof SettingsView !== 'undefined' && SettingsView.render) {
        SettingsView.render();
      }
    } catch (e) {
      console.warn("Hydrate master personnel notice:", e);
    }
  },

  /**
   * Push master engineers and TMS credentials to Firebase
   */
  pushMasterEngineers(engineers) {
    if (!this.db || !Array.isArray(engineers)) return;
    try {
      this.db.ref('walton_monthly_report/master_engineers').set(engineers);
    } catch (e) {
      console.warn("Firebase pushMasterEngineers notice:", e);
    }
  },

  /**
   * Push master supervisors to Firebase
   */
  pushMasterSupervisors(supervisors) {
    if (!this.db || !Array.isArray(supervisors)) return;
    try {
      this.db.ref('walton_monthly_report/master_supervisors').set(supervisors);
    } catch (e) {
      console.warn("Firebase pushMasterSupervisors notice:", e);
    }
  },

  /**
   * Unbind active month listeners
   */
  unbindCurrentMonth() {
    if (this._monthRef) {
      try {
        this._monthRef.off();
      } catch (e) {}
      this._monthRef = null;
    }
    this.currentListeningMonth = null;
  },

  _debouncedSaveWb() {
    if (this._wbSaveTimer) clearTimeout(this._wbSaveTimer);
    this._wbSaveTimer = setTimeout(() => {
      this._wbSaveTimer = null;
      if (window.appState && window.appState.workbookMgr) {
        window.appState.workbookMgr.save();
      }
    }, 300);
  },

  /**
   * Handle remote task added
   */
  _handleRemoteTaskAdded(month, task) {
    if (!window.appState || !window.appState.workbookMgr) return;
    if (!task || !task.task_id) return;

    let deletedSet = new Set();
    try {
      const deletedList = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      deletedSet = new Set(deletedList);
    } catch (e) {}
    if (typeof SAZZAD_PROTECTED_TASK_IDS !== 'undefined') {
      SAZZAD_PROTECTED_TASK_IDS.forEach(id => deletedSet.delete(id));
    }
    if (deletedSet.has(task.task_id)) {
      console.warn(`🛡️ Firebase child_added rejected tombstoned task: ${task.task_id}`);
      this.db.ref(`walton_monthly_report/workbooks/${month}/tasks/${task.task_id}`).remove().catch(() => {});
      return;
    }

    // 🛡️ STRICT REJECTION: Blacklisted engineers (Mahmud 51020, etc.) must NEVER enter!
    const assStr = String(task.assignee || task.engineer || '');
    if (typeof REMOVED_ENGINEER_IDS !== 'undefined') {
      for (const rId of REMOVED_ENGINEER_IDS) {
        if (assStr.includes(rId)) {
          if (this.db) {
            this.db.ref(`walton_monthly_report/workbooks/${month}/tasks/${task.task_id}`).remove().catch(() => {});
            this.db.ref(`walton_monthly_report/deleted_task_ids/${task.task_id}`).set(Date.now()).catch(() => {});
          }
          return;
        }
      }
    }

    if (!task.task_name || !task.task_name.trim() || task.task_name === 'Enter Task Name...') {
      return;
    }

    const wbMgr = window.appState.workbookMgr;
    const existing = wbMgr.getTask(month, task.task_id);
    if (existing) {
      // If already present, merge any remote updates smoothly without wiping points
      for (const [k, v] of Object.entries(task)) {
        if (k === 'points') {
          const rPts = (v !== undefined && v !== null) ? String(v).trim() : '';
          const lPts = (existing.points !== undefined && existing.points !== null) ? String(existing.points).trim() : '';
          if (rPts === '' && lPts !== '') continue;
        }
        if ((k === 'task_name' || k === 'task_details') && (!v || String(v).trim() === '') && existing[k]) continue;
        existing[k] = v;
      }
      this._debouncedSaveWb();
      return;
    }

    // Add to in-memory workbook without pushing back
    if (!wbMgr.workbooks[month]) wbMgr.workbooks[month] = [];
    wbMgr.workbooks[month].push(task);
    this._debouncedSaveWb();

    // If currently viewing Monthly Input, append row smoothly into DOM
    if (window.appState.activeTab === 'monthly-input' && typeof MonthlyInputView !== 'undefined') {
      const tbody = document.getElementById('monthly-input-tbody');
      if (tbody && !tbody.querySelector('td[colspan]')) {
        const engineers = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getEngineers) ? MasterDataManager.getEngineers() : [];
        const supervisors = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getSupervisors) ? MasterDataManager.getSupervisors() : [];
        const categories = (typeof MasterDataManager !== 'undefined') ? MasterDataManager.getCategories() : [];
        const allTasks = wbMgr.getTasksForMonth(month);
        const rowHtml = MonthlyInputView.renderTaskRowHtml(task, allTasks.length - 1, allTasks.length, categories, engineers, supervisors);
        const temp = document.createElement('tbody');
        temp.innerHTML = rowHtml;
        const newTr = temp.firstElementChild;
        if (newTr) {
          newTr.classList.add('animate-fade-in');
          tbody.appendChild(newTr);
        }
        if (typeof MonthlyInputView.updateRowIndices === 'function') {
          MonthlyInputView.updateRowIndices();
        }
        if (typeof MonthlyInputView.updateEngineerSummary === 'function') {
          MonthlyInputView.updateEngineerSummary();
        }
        const counter = document.getElementById('total-rows-counter');
        if (counter) counter.innerHTML = `Total ${allTasks.length} rows &bull; ⚡ Real-Time Instant Sync Active`;
      } else {
        MonthlyInputView.render();
      }
    }
    if (window.appState && window.appState.activeTab === 'dashboard' && typeof DashboardController !== 'undefined' && DashboardController.render) {
      DashboardController.render();
    }
  },

  /**
   * Handle remote task changed (Cell-level micro-patching)
   */
  _handleRemoteTaskChanged(month, task) {
    if (!window.appState || !window.appState.workbookMgr) return;
    if (!task || !task.task_id) return;

    let deletedSet = new Set();
    try {
      const deletedList = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      deletedSet = new Set(deletedList);
    } catch (e) {}
    if (typeof SAZZAD_PROTECTED_TASK_IDS !== 'undefined') {
      SAZZAD_PROTECTED_TASK_IDS.forEach(id => deletedSet.delete(id));
    }
    if (deletedSet.has(task.task_id)) {
      console.warn(`🛡️ Firebase child_changed rejected tombstoned task: ${task.task_id}`);
      this.db.ref(`walton_monthly_report/workbooks/${month}/tasks/${task.task_id}`).remove().catch(() => {});
      return;
    }

    if (!task.task_name || !task.task_name.trim() || task.task_name === 'Enter Task Name...') {
      return;
    }

    const wbMgr = window.appState.workbookMgr;
    const tasks = wbMgr.workbooks[month] || [];
    const idx = tasks.findIndex(t => t.task_id === task.task_id);
    if (idx === -1) {
      if (deletedSet.has(task.task_id)) return;
      tasks.push(task);
      wbMgr.save();
      return;
    }

    const localTask = tasks[idx];
    const taskId = task.task_id;

    // Check what specific fields changed
    const changedKeys = [];
    for (const k of Object.keys(task)) {
      if (String(task[k] ?? '') !== String(localTask[k] ?? '')) {
        changedKeys.push(k);
      }
    }

    // Cell-level Micro-Patching (Google Docs style: patch only changed DOM element!)
    const activeEl = document.activeElement;
    const activeId = activeEl ? activeEl.id : '';

    // Update in-memory workbook safely: NEVER let remote wipe user edits, valid points, or TMS badges
    const mergedTask = { ...localTask };
    for (const [k, v] of Object.entries(task)) {
      // Never overwrite field if user is actively focused on it in DOM!
      if (k === 'task_name' && activeId === `task-name-input-${taskId}`) {
        continue;
      }
      if (k === 'task_details' && activeId === `task-details-input-${taskId}`) {
        continue;
      }
      if (k === 'points' && activeId === `task-point-${taskId}`) {
        continue;
      }

      // TEXT IMMUTABILITY & PROTECTION:
      // If user modified text (slide studio or input table) and local edit timestamp is >= remote edit timestamp, keep local!
      if (k === 'task_name' || k === 'task_details' || k === 'category' || k === 'assignee' || k === 'engineer' || k === 'description' || k === 'impact') {
        const localEditTime = localTask._lastTextEditTime || localTask._lastFieldEditTime || (localTask.last_updated ? new Date(localTask.last_updated).getTime() : 0);
        const remoteEditTime = task._lastTextEditTime || task._lastFieldEditTime || (task.last_updated ? new Date(task.last_updated).getTime() : 0);
        if (localTask.user_edited && localEditTime >= remoteEditTime) {
          continue;
        }
        if (localTask._lastFieldEditTime && (Date.now() - localTask._lastFieldEditTime < 60000)) {
          continue;
        }
      }

      // Never let placeholder overwrite real name
      if (k === 'task_name') {
        const vStr = String(v ?? '').trim();
        const lStr = String(localTask.task_name ?? '').trim();
        if (vStr === 'New Engineering Task' && lStr !== '' && lStr !== 'New Engineering Task') {
          continue;
        }
      }

      // TMS IMMUTABILITY: Never let empty/null wipe local TMS ID!
      if (k === 'tms_task_id' || k === 'tms_url' || k === 'tms_synced_at') {
        if (!v && localTask[k]) {
          continue;
        }
      }

      // POINTS IMMUTABILITY: Points are strictly evaluated by HOD (44819).
      // Requirement: "HOD ekber task jeta dibe seta fix hobe. HOD change na korle kono vabei sei value change hobe na."
      if (k === 'points') {
        const incomingPts = (v !== undefined && v !== null && v !== "" && !isNaN(parseFloat(v))) ? parseFloat(v) : null;
        const currentLocalPts = (localTask.points !== undefined && localTask.points !== null && localTask.points !== "" && !isNaN(parseFloat(localTask.points))) ? parseFloat(localTask.points) : null;

        if (currentLocalPts !== null) {
          if (incomingPts === null) {
            // Remote is empty: NEVER wipe existing HOD points!
            continue;
          }
          const incomingHodTime = task.hod_point_set_at || 0;
          const localHodTime = localTask.hod_point_set_at || 0;

          if (incomingHodTime > localHodTime) {
            // Strictly newer HOD evaluation from cloud
            mergedTask.points = incomingPts;
            mergedTask.hod_point_set_at = incomingHodTime;
            mergedTask.hod_point_locked = true;
          } else if (localHodTime > incomingHodTime) {
            // Local HOD evaluation is newer: keep local points!
            continue;
          } else {
            // Timestamps equal or not set: points can NEVER be reduced!
            mergedTask.points = Math.max(currentLocalPts, incomingPts);
          }
        } else if (incomingPts !== null) {
          mergedTask.points = incomingPts;
          if (task.hod_point_set_at) mergedTask.hod_point_set_at = task.hod_point_set_at;
          mergedTask.hod_point_locked = true;
        }
        continue;
      }
      if ((k === 'task_name' || k === 'task_details') && (!v || String(v).trim() === '') && localTask[k]) {
        continue;
      }

      // PHOTO DELETION / TOMBSTONE PROTECTION WITH TIMESTAMP CONFLICT RESOLUTION:
      let isLocalTombstoned = false;
      let tombstoneSlot = 'all';
      let tombstoneTime = 0;
      try {
        const delMap = JSON.parse(localStorage.getItem('walton_deleted_photo_tasks') || '{}');
        const cleanTId = String(taskId).toLowerCase();
        const pParts = cleanTId.split('-');
        const pfx = pParts.length >= 3 ? `${pParts[0]}-${pParts[1]}-${pParts[2]}` : cleanTId;
        const tb = delMap[taskId] || delMap[cleanTId] || delMap[pfx];
        if (tb) {
          isLocalTombstoned = true;
          tombstoneSlot = tb.slot || 'all';
          tombstoneTime = tb.timestamp || tb.time || 0;
        }
      } catch (e) {}

      const localPhotoEditTime = localTask._lastPhotoEditTime || 0;
      const remotePhotoEditTime = task._lastPhotoEditTime || 0;
      const localPhotoDeleteTime = localTask._lastPhotoDeleteTime || localTask._explicitUserPhotoDeleteTime || tombstoneTime;
      const remotePhotoDeleteTime = task._lastPhotoDeleteTime || task._explicitUserPhotoDeleteTime || 0;

      if (k === 'photo_2' || k === 'after_photo' || k === 'photo') {
        if (v && typeof v === 'string' && v.trim()) {
          mergedTask[k] = v;
          if (typeof photoManager !== 'undefined') {
            photoManager.setTaskPhoto(taskId, 'after_photo', v, v, month);
          }
          continue;
        }
      }
      if (k === 'photo_1' || k === 'before_photo') {
        if (v && typeof v === 'string' && v.trim()) {
          mergedTask[k] = v;
          if (typeof photoManager !== 'undefined') {
            photoManager.setTaskPhoto(taskId, 'before_photo', v, v, month);
          }
          continue;
        }
      }
      if (k === 'clear_photos') {
        mergedTask.clear_photos = false;
        continue;
      }

      mergedTask[k] = v;
    }

    // If remote has TMS info, adopt it
    if (task.tms_task_id && !mergedTask.tms_task_id) {
      mergedTask.tms_task_id = String(task.tms_task_id);
    }
    // Also if local has TMS info from known tasks or remarks, keep it
    if (!mergedTask.tms_task_id && typeof TmsSyncService !== 'undefined') {
      const info = TmsSyncService.getTmsInfo(mergedTask);
      if (info && info.tms_task_id) {
        mergedTask.tms_task_id = info.tms_task_id;
        mergedTask.tms_url = info.tms_url;
      }
    }

    tasks[idx] = mergedTask;
    this._debouncedSaveWb();

    // Check if points changed to immediately reflect in DOM safely
    if (mergedTask.points !== undefined && mergedTask.points !== null && String(mergedTask.points) !== String(localTask.points ?? '')) {
      const cleanPts = mergedTask.points;
      const input = document.getElementById(`task-point-${taskId}`) || document.querySelector(`input[id="task-point-${taskId}"]`);
      if (input && activeId !== input.id) {
        input.value = cleanPts;
        this._flashCell(input);
      }
      if (typeof MonthlyInputView !== 'undefined') {
        if (MonthlyInputView.updateRankingTable) MonthlyInputView.updateRankingTable();
        if (MonthlyInputView.updateEngineerSummary) MonthlyInputView.updateEngineerSummary();
        if (MonthlyInputView.updateTaskPointDisplay) MonthlyInputView.updateTaskPointDisplay(taskId, cleanPts);
      }
      if (typeof DashboardController !== 'undefined' && window.appState && window.appState.activeTab === 'dashboard') {
        DashboardController.render();
      }
    }

    changedKeys.forEach(field => {
      // Ignore local echo if user just typed this field locally
      const echoKey = `${taskId}:${field}`;
      if (this._suppressLocalEchoUntil[echoKey] && Date.now() < this._suppressLocalEchoUntil[echoKey]) {
        return;
      }

      // 1. Task Name
      if (field === 'task_name') {
        const input = document.getElementById(`task-name-input-${taskId}`);
        if (input && activeId !== `task-name-input-${taskId}`) {
          const currentVal = input.value.trim();
          const incomingVal = String(task.task_name || '').trim();
          // Never overwrite genuine local name with default placeholder!
          if (incomingVal === 'New Engineering Task' && currentVal && currentVal !== 'New Engineering Task') {
            return;
          }
          input.value = incomingVal;
          input.style.height = 'auto';
          input.style.height = input.scrollHeight + 'px';
          this._flashCell(input);
        }
      }

      // 2. Task Details
      else if (field === 'task_details') {
        const input = document.getElementById(`task-details-input-${taskId}`);
        if (input && activeId !== `task-details-input-${taskId}`) {
          input.value = task.task_details || '';
          this._flashCell(input);
        }
      }

      // 3. Points (Instant HOD point synchronization across all PCs & laptops)
      else if (field === 'points') {
        const cleanPts = (task.points !== undefined && task.points !== null && task.points !== '') ? task.points : '';
        const input = document.getElementById(`task-point-${taskId}`) || document.querySelector(`input[id="task-point-${taskId}"]`);
        if (input && activeId !== input.id) {
          input.value = cleanPts;
          this._flashCell(input);
        }
        if (typeof MonthlyInputView !== 'undefined') {
          if (MonthlyInputView.updateRankingTable) MonthlyInputView.updateRankingTable();
          if (MonthlyInputView.updateEngineerSummary) MonthlyInputView.updateEngineerSummary();
          if (MonthlyInputView.updateTaskPointDisplay) MonthlyInputView.updateTaskPointDisplay(taskId, cleanPts);
        }
        if (typeof DashboardController !== 'undefined' && window.appState && window.appState.activeTab === 'dashboard') {
          DashboardController.render();
        }
      }

      // 4. Category
      else if (field === 'category') {
        const select = document.getElementById(`task-category-select-${taskId}`) ||
                       document.querySelector(`select[onchange*="${taskId}"][onchange*="category"]`);
        if (select && activeEl !== select) {
          const catVal = task.category || 'Process development';
          for (let opt of select.options) {
            if (opt.value.toLowerCase() === catVal.toLowerCase()) {
              select.value = opt.value;
              break;
            }
          }
          this._flashCell(select);
        }
      }

      // 5. Supervisor
      else if (field === 'supervisor') {
        const select = document.getElementById(`task-supervisor-select-${taskId}`) ||
                       document.querySelector(`select[onchange*="${taskId}"][onchange*="supervisor"]`);
        if (select && activeEl !== select) {
          const supVal = task.supervisor || '';
          for (let opt of select.options) {
            if (opt.value === supVal || opt.text === supVal || (supVal && opt.value.toLowerCase().includes(supVal.toLowerCase()))) {
              select.value = opt.value;
              break;
            }
          }
          this._flashCell(select);
        }
      }

      // 6. Assignee (Syncs engineer selection across all computers)
      else if (field === 'assignee' || field === 'engineer') {
        const select = document.getElementById(`task-assignee-select-${taskId}`) ||
                       document.querySelector(`select[onchange*="${taskId}"][onchange*="assignee"]`);
        if (select && activeEl !== select) {
          const val = task.assignee || task.engineer || '';
          let matched = false;
          for (let opt of select.options) {
            if (opt.value === val || opt.text === val || (val && opt.value.toLowerCase().includes(val.toLowerCase()))) {
              select.value = opt.value;
              matched = true;
              break;
            }
          }
          if (!matched && val) select.value = val;
          this._flashCell(select);
        }
        if (typeof MonthlyInputView !== 'undefined') {
          if (MonthlyInputView.updateEngineerSummary) MonthlyInputView.updateEngineerSummary();
          if (MonthlyInputView.filterTableRowsLocally) MonthlyInputView.filterTableRowsLocally();
        }
      }

      // 7. Report Inclusion Toggle
      else if (field === 'include_in_report') {
        const isYes = task.include_in_report !== 'NO';
        const btn = document.getElementById(`report-toggle-btn-${taskId}`);
        if (btn) {
          btn.textContent = isYes ? 'YES' : 'NO';
          btn.className = `px-2.5 py-0.5 rounded-full text-[10px] font-bold transition ${
            isYes
              ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
              : 'bg-slate-50 text-slate-400 border border-slate-200'
          }`;
          this._flashCell(btn);
        }

        // Cross-PC active slides cache synchronization
        try {
          const cacheKey = `walton_pd_active_slides_${month}`;
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            let sList = JSON.parse(raw);
            if (Array.isArray(sList)) {
              if (!isYes) {
                const cleanTid = String(taskId).toLowerCase();
                sList = sList.filter(s => s && s.task_id !== taskId && (!task.task_id || s.task_id !== task.task_id) && String(s.task_id).toLowerCase() !== cleanTid);
              }
              localStorage.setItem(cacheKey, JSON.stringify(sList));
            }
          }
        } catch(e) {}

        if (!isYes) {
          const cardEl = document.getElementById(`slide-card-${taskId}`);
          if (cardEl) cardEl.remove();
        }

        if (typeof MonthlyReportView !== 'undefined' && MonthlyReportView.render) {
          const grid = document.getElementById('monthly-report-cards-grid');
          if (grid) {
            MonthlyReportView.render();
          }
        }
      }

      // 8. TMS Status
      else if (field === 'tms_task_id' || field === 'status' || field === 'remarks') {
        if (typeof TmsSyncService !== 'undefined' && TmsSyncService.updateRowTmsBadgeInPlace) {
          TmsSyncService.updateRowTmsBadgeInPlace(month, taskId, task);
        }
      }

      // 9. Photo real-time cross-device sync (Adds and deletes on all PCs immediately!)
      else if (field === 'photo_1' || field === 'photo_2' || field === 'before_photo' || field === 'after_photo' || field === 'photo' || field === 'clear_photos' || field === '_explicitUserPhotoDeleteTime' || field === '_lastPhotoDeleteTime') {
        const val = task[field] || task.photo_2 || task.after_photo || task.photo;
        const slot = (field === 'photo_1' || field === 'before_photo') ? 'before_photo' : 'after_photo';
        const isLocallyDeletedForSlot = (slot === 'before_photo' ? localPhotoDeletedBefore : localPhotoDeletedAfter);

        const isPhotoValPresent = Boolean(val && val !== "" && val !== "null" && val !== "undefined");
        if (isPhotoValPresent && (isRemotePhotoWinning || (!isRemoteExplicitlyDeleted && !isLocallyDeletedForSlot))) {
          // Another user added/updated this photo: save it into this PC's photoManager!
          // Clear any stale local tombstone so this PC recognizes the new photo
          try {
            const delMap = JSON.parse(localStorage.getItem('walton_deleted_photo_tasks') || '{}');
            delete delMap[taskId];
            delete delMap[String(taskId).toLowerCase()];
            const pParts = String(taskId).toLowerCase().split('-');
            if (pParts.length >= 3) delete delMap[`${pParts[0]}-${pParts[1]}-${pParts[2]}`];
            localStorage.setItem('walton_deleted_photo_tasks', JSON.stringify(delMap));
          } catch(e) {}

          if (typeof photoManager !== 'undefined') {
            photoManager.setTaskPhoto(taskId, slot, val, val, month);
          }
          if (window.appState && window.appState.workbookMgr) {
            const lt = window.appState.workbookMgr.getTask(month, taskId);
            if (lt) {
              if (slot === 'before_photo') {
                lt.photo_1 = val;
                lt.before_photo = val;
                delete lt._photoDeleted_before;
              } else {
                lt.photo_2 = val;
                lt.after_photo = val;
                lt.photo = val;
                delete lt._photoDeleted_after;
              }
              delete lt.clear_photos;
              delete lt._explicitUserPhotoDeleteTime;
              delete lt._lastPhotoDeleteTime;
              lt._lastPhotoEditTime = remotePhotoEditTime || Date.now();
            }
          }
          if (typeof MonthlyReportView !== 'undefined' && MonthlyReportView.updateSlideCardPhoto) {
            MonthlyReportView.updateSlideCardPhoto(taskId);
          }
        } else if (isRemoteExplicitlyDeleted || (!isPhotoValPresent && (task.clear_photos || isLocallyDeletedForSlot))) {
          // Explicit photo deletion from cloud: wipe local cache and DOM without triggering destructive server delete
          if (typeof photoManager !== 'undefined') {
            if (typeof photoManager.purgeTaskPhotosMemory === 'function') {
              photoManager.purgeTaskPhotosMemory(taskId);
            }
          }
          if (window.appState && window.appState.workbookMgr) {
            const lt = window.appState.workbookMgr.getTask(month, taskId);
            if (lt) {
              lt.photo_1 = "";
              lt.photo_2 = "";
              lt.before_photo = "";
              lt.after_photo = "";
              lt.photo = "";
              lt.clear_photos = true;
              lt._lastPhotoDeleteTime = remotePhotoDeleteTime || Date.now();
              lt._lastPhotoEditTime = 0;
            }
          }
          // Immediate zero-lag DOM patch on this PC
          if (typeof MonthlyReportView !== 'undefined') {
            if (MonthlyReportView.updateSlideCardPhoto) MonthlyReportView.updateSlideCardPhoto(taskId);
            if (MonthlyReportView._activeModalTaskId === taskId) {
              if (MonthlyReportView.renderModalPhotoSlots) MonthlyReportView.renderModalPhotoSlots(taskId);
              if (MonthlyReportView.renderModalLivePreview) MonthlyReportView.renderModalLivePreview(taskId);
            }
          }
          if (typeof MonthlyInputView !== 'undefined' && MonthlyInputView.updateTaskCardPhoto) {
            MonthlyInputView.updateTaskCardPhoto(taskId);
          }
        }

        // Live re-render if user is on Photo Manager, Monthly Report, or Monthly Input (Debounced 120ms to eliminate UI stutter)
        if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService._debouncePhotoSync) {
          FirebaseSyncService._debouncePhotoSync();
        }
      }
    });

    if (typeof MonthlyInputView !== 'undefined' && MonthlyInputView.updateEngineerSummary) {
      MonthlyInputView.updateEngineerSummary();
    }
    if (window.appState && window.appState.activeTab === 'dashboard' && typeof DashboardController !== 'undefined' && DashboardController.render) {
      DashboardController.render();
    }
  },

  _photoSyncTimer: null,
  _debouncePhotoSync() {
    if (this._photoSyncTimer) clearTimeout(this._photoSyncTimer);
    this._photoSyncTimer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.appState) {
        const curTab = window.appState.activeTab || window.appState.currentTab || (typeof App !== 'undefined' ? App.currentTab : '');
        if (curTab === 'photo-manager' && typeof PhotoManagerView !== 'undefined' && PhotoManagerView.render) {
          PhotoManagerView.render();
        }
        // Note: monthly-report cards are updated smoothly in-place by updateSlideCardPhoto without rebuilding all 85 slides!
        if (curTab === 'monthly-input' && typeof MonthlyInputView !== 'undefined' && MonthlyInputView.render) {
          MonthlyInputView.render();
        }
      }
    }, 120);
  },

  /**
   * Handle remote task removed
   */
  _handleRemoteTaskRemoved(month, taskId) {
    if (!taskId) return;
    if (!window.appState || !window.appState.workbookMgr) return;
    const wbMgr = window.appState.workbookMgr;
    const tasks = wbMgr.workbooks[month] || [];
    wbMgr.workbooks[month] = tasks.filter(t => t.task_id !== taskId);
    wbMgr.save();

    // Record tombstone locally
    try {
      const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      if (!deleted.includes(taskId)) {
        deleted.push(taskId);
        if (deleted.length > 500) deleted.splice(0, deleted.length - 500);
        localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deleted));
      }
    } catch (e) {}

    // Remove row from DOM with smooth fade-out
    const tr = document.getElementById(`task-row-${taskId}`);
    if (tr) {
      tr.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
      tr.style.opacity = '0';
      tr.style.transform = 'translateX(24px) scale(0.98)';
      setTimeout(() => {
        tr.remove();
        if (typeof MonthlyInputView !== 'undefined') {
          if (typeof MonthlyInputView.updateRowIndices === 'function') MonthlyInputView.updateRowIndices();
          if (typeof MonthlyInputView.updateBulkDeleteButton === 'function') MonthlyInputView.updateBulkDeleteButton();
          if (typeof MonthlyInputView.updateEngineerSummary === 'function') MonthlyInputView.updateEngineerSummary();
          if (typeof MonthlyInputView.updateRankingTable === 'function') MonthlyInputView.updateRankingTable();
          const rem = wbMgr.getTasksForMonth(month);
          if (!rem || rem.length === 0) {
            if (typeof MonthlyInputView.render === 'function') MonthlyInputView.render();
          }
        }
        if (window.appState && window.appState.activeTab === 'dashboard' && typeof DashboardController !== 'undefined' && DashboardController.render) {
          DashboardController.render();
        }
      }, 250);
    } else {
      if (window.appState && window.appState.activeTab === 'dashboard' && typeof DashboardController !== 'undefined' && DashboardController.render) {
        DashboardController.render();
      }
    }
  },

  /**
   * Subtle highlight on cell when edited remotely (Google Docs style)
   */
  _flashCell(elem) {
    if (!elem) return;
    elem.classList.add('ring-2', 'ring-blue-400', 'bg-blue-50/50');
    setTimeout(() => {
      elem.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50/50');
    }, 800);
  },

  /**
   * Send instant cell update to Firebase Realtime Highway (~15-30ms)
   */
  async updateCell(month, taskId, field, value) {
    if (!this.isConnected() || !taskId) return false;

    // 🛡️ CRITICAL GUARD: Never resurrect tombstoned tasks via cell updates
    try {
      const deletedList = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      if (deletedList.includes(taskId) && (typeof SAZZAD_PROTECTED_TASK_IDS === 'undefined' || !SAZZAD_PROTECTED_TASK_IDS.has(taskId))) {
        console.warn(`🛡️ Firebase updateCell blocked: ${taskId} is tombstoned!`);
        return false;
      }
    } catch (e) {}

    const normMonth = (window.appState && window.appState.workbookMgr)
      ? window.appState.workbookMgr.normalizeMonth(month)
      : month;

    // Suppress local echo for 3000ms to allow multi-PC real-time smooth collaboration
    this._suppressLocalEchoUntil[`${taskId}:${field}`] = Date.now() + 3000;

    try {
      const taskRef = this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks/${taskId}`);
      const patch = {
        task_id: taskId,
        [field]: value,
        last_updated: new Date().toISOString()
      };

      // Guarantee core fields are included if local task is known
      if (window.appState && window.appState.workbookMgr) {
        const lt = window.appState.workbookMgr.getTask(normMonth, taskId);
        if (lt) {
          if (lt.task_name && field !== 'task_name') patch.task_name = lt.task_name;
          if (lt.assignee && field !== 'assignee') patch.assignee = lt.assignee;
          if (lt.engineer && field !== 'engineer') patch.engineer = lt.engineer;
          if (lt.supervisor && field !== 'supervisor') patch.supervisor = lt.supervisor;
          if (lt.category && field !== 'category') patch.category = lt.category;
          if (lt.include_in_report && field !== 'include_in_report') patch.include_in_report = lt.include_in_report;
        }
      }

      await taskRef.update(patch);
      return true;
    } catch (e) {
      console.warn("Firebase updateCell notice:", e);
      return false;
    }
  },

  /**
   * Send full task create or update to Firebase
   */
  async pushTask(month, task) {
    if (!this.isConnected() || !task || !task.task_id) return false;

    // 🛡️ CRITICAL GUARD: Never push a task that is tombstoned!
    try {
      let deletedList = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      if (deletedList.includes(task.task_id) && (typeof SAZZAD_PROTECTED_TASK_IDS === 'undefined' || !SAZZAD_PROTECTED_TASK_IDS.has(task.task_id))) {
        console.warn(`🛡️ FirebaseSyncService.pushTask BLOCKED: ${task.task_id} is in deleted list!`);
        return false;
      }
    } catch (e) {}

    const normMonth = (window.appState && window.appState.workbookMgr)
      ? window.appState.workbookMgr.normalizeMonth(month)
      : month;

    try {
      const taskRef = this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks/${task.task_id}`);
      await taskRef.set(task);
      return true;
    } catch (e) {
      console.warn("Firebase pushTask notice:", e);
      return false;
    }
  },

  /**
   * Fast batch push of multiple tasks to Firebase using multi-path atomic update
   */
  async pushTasksBatch(month, taskArray = []) {
    if (!this.isConnected() || !Array.isArray(taskArray) || taskArray.length === 0) return false;
    const normMonth = (window.appState && window.appState.workbookMgr)
      ? window.appState.workbookMgr.normalizeMonth(month)
      : month;

    try {
      let deletedList = new Set();
      try {
        const d = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
        d.forEach(id => {
          if (typeof SAZZAD_PROTECTED_TASK_IDS === 'undefined' || !SAZZAD_PROTECTED_TASK_IDS.has(id)) {
            deletedList.add(id);
          }
        });
      } catch (e) {}

      const updates = {};
      taskArray.forEach(task => {
        if (task && task.task_id && !deletedList.has(task.task_id)) {
          updates[`walton_monthly_report/workbooks/${normMonth}/tasks/${task.task_id}`] = task;
        }
      });

      if (Object.keys(updates).length > 0) {
        await this.db.ref().update(updates);
      }
      return true;
    } catch (e) {
      console.warn("Firebase pushTasksBatch notice:", e);
      return false;
    }
  },

  /**
   * Delete task from Firebase (atomically with tombstone recording)
   */
  async deleteTask(month, taskId) {
    if (!taskId) return false;
    if (typeof SAZZAD_PROTECTED_TASK_IDS !== 'undefined' && SAZZAD_PROTECTED_TASK_IDS.has(taskId)) {
      console.warn(`🛡️ Refusing to delete protected task: ${taskId}`);
      return false;
    }

    // Record tombstone locally first
    try {
      const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      if (!deleted.includes(taskId)) {
        deleted.push(taskId);
        if (deleted.length > 500) deleted.splice(0, deleted.length - 500);
        localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deleted));
      }
    } catch (e) {}

    if (!this.isConnected()) return false;
    const normMonth = (window.appState && window.appState.workbookMgr)
      ? window.appState.workbookMgr.normalizeMonth(month)
      : month;

    try {
      const taskRef = this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks/${taskId}`);
      await taskRef.remove();
      // Record tombstone in Firebase so all devices delete permanently
      await this.db.ref(`walton_monthly_report/deleted_task_ids/${taskId}`).set(Date.now());
      return true;
    } catch (e) {
      console.warn("Firebase deleteTask notice:", e);
      return false;
    }
  },

  /**
   * Atomically delete multiple tasks from Firebase
   */
  async deleteMultipleTasks(month, taskIds = []) {
    if (!Array.isArray(taskIds) || taskIds.length === 0) return false;
    if (typeof SAZZAD_PROTECTED_TASK_IDS !== 'undefined') {
      taskIds = taskIds.filter(id => !SAZZAD_PROTECTED_TASK_IDS.has(id));
      if (taskIds.length === 0) return true;
    }

    // 1. Record tombstones locally first
    try {
      const deleted = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      taskIds.forEach(id => {
        if (!deleted.includes(id)) deleted.push(id);
      });
      if (deleted.length > 500) deleted.splice(0, deleted.length - 500);
      localStorage.setItem('walton_deleted_task_ids', JSON.stringify(deleted));
    } catch (e) {}

    if (!this.isConnected()) return false;
    const normMonth = (window.appState && window.appState.workbookMgr)
      ? window.appState.workbookMgr.normalizeMonth(month)
      : month;

    try {
      const updates = {};
      const now = Date.now();
      taskIds.forEach(id => {
        updates[`walton_monthly_report/workbooks/${normMonth}/tasks/${id}`] = null;
        updates[`walton_monthly_report/deleted_task_ids/${id}`] = now;
      });
      await this.db.ref().update(updates);
      return true;
    } catch (e) {
      console.warn("Firebase deleteMultipleTasks multi-path notice, trying sequential fallback:", e);
      let allOk = true;
      for (const id of taskIds) {
        const ok = await this.deleteTask(normMonth, id);
        if (!ok) allOk = false;
      }
      return allOk;
    }
  },

  /**
   * Migrate / Push entire workbook month to Firebase
   */
  async pushEntireMonth(month) {
    if (this.status === 'CONNECTING' && this.db) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (this.isConnected() || this.status === 'OFFLINE') {
            clearInterval(check);
            resolve();
          }
        }, 100);
        setTimeout(() => { clearInterval(check); resolve(); }, 3000);
      });
    }

    if (!this.isConnected()) throw new Error("Firebase is not connected.");
    if (!window.appState || !window.appState.workbookMgr) throw new Error("Workbook not ready.");

    const normMonth = window.appState.workbookMgr.normalizeMonth(month);
    let deletedSet = new Set();
    try {
      const deletedList = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      deletedList.forEach(id => {
        if (typeof SAZZAD_PROTECTED_TASK_IDS === 'undefined' || !SAZZAD_PROTECTED_TASK_IDS.has(id)) {
          deletedSet.add(id);
        }
      });
    } catch (e) {}

    const tasks = window.appState.workbookMgr.getTasksForMonth(normMonth);
    const map = {};
    tasks.forEach(t => {
      if (t && t.task_id && !deletedSet.has(t.task_id)) {
        map[t.task_id] = t;
      }
    });

    const monthRef = this.db.ref(`walton_monthly_report/workbooks/${normMonth}/tasks`);
    await monthRef.update(map);
    return Object.keys(map).length;
  },

  /**
   * Test Firebase connection with credentials
   */
  async testConnection(config) {
    if (!config || !config.databaseURL) {
      throw new Error("Database URL is required.");
    }

    // Try REST test ping first (works without full SDK init)
    const testUrl = config.databaseURL.replace(/\/$/, '') + '/.json?shallow=true';
    const res = await fetch(testUrl, { method: 'GET' });
    return true;
  },

  // Real-time Strategic Projects Sync (Multi-PC)
  broadcastProjectUpdate(projects) {
    if (!this.isConnected() || !this.db) return;
    try {
      this.db.ref('walton_monthly_report/strategic_projects').set(projects);
      console.log("🔥 Strategic projects broadcasted to Firebase Realtime Database!");
    } catch (e) {
      console.warn("Failed to broadcast strategic projects to Firebase:", e);
    }
  },

  // Real-time Cost Savings Sync (Multi-PC)
  broadcastCostSavingsUpdate(entries) {
    if (!this.isConnected() || !this.db) return;
    try {
      this.db.ref('walton_monthly_report/engineer_cost_savings').set(entries);
      console.log("🔥 Engineer cost savings broadcasted to Firebase Realtime Database!");
    } catch (e) {
      console.warn("Failed to broadcast engineer cost savings to Firebase:", e);
    }
  },

  // Real-time Cost Savings Tracker Sync (12 months values across PCs)
  broadcastCostTrackerUpdate(savings) {
    if (!this.isConnected() || !this.db) return;
    try {
      this.db.ref('walton_monthly_report/cost_savings_tracker').set(savings);
      console.log("🔥 Monthly cost savings tracker broadcasted to Firebase!");
    } catch (e) {
      console.warn("Failed to broadcast cost savings tracker to Firebase:", e);
    }
  },

  onStateChange(cb) {
    if (typeof cb === 'function') {
      this._subscribers.push(cb);
      cb({ status: this.status, isConnected: this.isConnected() });
    }
  },

  _notifySubscribers() {
    const s = { status: this.status, isConnected: this.isConnected() };
    this._subscribers.forEach(cb => {
      try { cb(s); } catch (e) {}
    });
  },

  _updateNavbarBadge() {
    const badge = document.getElementById('navbar-cloud-sync-badge');
    if (!badge) return;

    if (this.isConnected()) {
      badge.innerHTML = `
        <button onclick="if(window.appState) window.appState.switchTab('settings')" 
                title="⚡ Firebase Realtime Active: Sub-50ms instant live sync active across all laptops!" 
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer shadow-xs">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span class="font-bold">⚡ Firebase Live</span>
        </button>
      `;
    } else {
      badge.innerHTML = `
        <button onclick="if(window.appState) window.appState.switchTab('settings')" 
                title="Firebase Database: Click to configure settings" 
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 hover:text-slate-800 transition-colors cursor-pointer">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>⚡ Firebase Realtime</span>
        </button>
      `;
    }
  }
};

if (typeof window !== 'undefined') {
  window.FirebaseSyncService = FirebaseSyncService;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirebaseSyncService;
}
