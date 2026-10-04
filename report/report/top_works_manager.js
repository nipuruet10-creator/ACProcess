/**
 * Process Development Monthly Report Automation System
 * Module: Top Works Manager (Final Summary Page Dataset)
 * Manages Top 5 Completed and Top 5 Ongoing Engineering Projects per Month
 * Logic:
 * - Top 5 Completed starts blank for every month
 * - Top 5 Ongoing automatically carries over from the previous month and can be edited
 * WALTON Hi-Tech Industries PLC
 */

const TopWorksManager = {
  storageKey: "walton_top_works_data",

  MONTH_ORDER: [
    "APR-2026", "MAY-2026", "JUN-2026", "JUL-2026", "AUG-2026", "SEP-2026",
    "OCT-2026", "NOV-2026", "DEC-2026", "JAN-2027", "FEB-2027", "MAR-2027"
  ],

  // Initial reference baseline from Image 1
  DEFAULT_ONGOING: [
    { sl: 1, name: "CNC Tube Bending & End Shaping M/C Automation Development", progress: "Trail run and modification ongoing", deadline: "Oct, 2026" },
    { sl: 2, name: "CNC Turret Punch Machine Project", progress: "Machine manufacturing almost done; PSI preparation ongoing", deadline: "Oct, 2026" },
    { sl: 3, name: "Evaporator Brazing Fixture for without water brazing", progress: "One model running under observation and working for rest model", deadline: "Sep, 2026" },
    { sl: 4, name: "MPE Tube rust repair process development", progress: "Mass production trial ongoing", deadline: "Oct, 2026" },
    { sl: 5, name: "New fin material (Aluzinc Sheet) supplier (MAX) development for Evaporator and condenser", progress: "All test completed, Trial production lot order is ongoing", deadline: "Dec, 2026" }
  ],

  _loadStore() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn("Could not load top works data:", e);
      return {};
    }
  },

  _saveStore(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error("Could not save top works data:", e);
    }
  },

  getPreviousMonth(month) {
    if (!month) return null;
    const m = month.toUpperCase();
    const idx = this.MONTH_ORDER.indexOf(m);
    if (idx > 0) {
      return this.MONTH_ORDER[idx - 1];
    }
    return null;
  },

  /**
   * Retrieves Top 5 Works for a given month
   * - Completed works are blank ["", "", "", "", ""] if not entered
   * - Ongoing works auto-carryover from previous month if not entered
   */
  getTopWorksForMonth(month = "SEP-2026") {
    const m = month.toUpperCase();
    const store = this._loadStore();

    // Check if MonthWorkbookManager has live ongoing/completed projects
    const liveOngoing = [];
    const liveCompleted = [];
    try {
      const wbMgr = (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr)
        ? window.appState.workbookMgr
        : (typeof MonthWorkbookManager !== 'undefined' ? new MonthWorkbookManager() : null);
      if (wbMgr) {
        const allTasks = wbMgr.getTasksForMonth(m);
        const projectTasks = allTasks.filter(t => {
          const cat = (t.category || '').toLowerCase();
          const name = (t.task_name || '').toLowerCase();
          return Boolean(t.is_project || cat.includes('project') || name.includes('project'));
        });

        projectTasks.forEach(t => {
          const status = (t.status || t.project_status || '').toLowerCase();
          const cat = (t.category || '').toLowerCase();
          const isComp = status.includes('complete') || cat.includes('completed');
          if (isComp) {
            liveCompleted.push(t.task_name);
          } else {
            liveOngoing.push({
              name: t.task_name,
              progress: t.progress || "Trial production run & line balancing verification ongoing",
              deadline: t.deadline || t.timeline || "4-5 Months"
            });
          }
        });
      }
    } catch (e) {}

    if (store[m]) {
      let ongoing = store[m].ongoingTop5;
      const isPlaceholderRAC = Array.isArray(ongoing) && ongoing.length > 0 &&
        ongoing[0].name === "RAC Assembly line relocation" &&
        ongoing.slice(1).every(p => !p.name || p.name === '—');

      if (liveOngoing.length > 0 && (!ongoing || ongoing.length === 0 || ongoing.every(p => !p.name || p.name === '—') || isPlaceholderRAC)) {
        ongoing = [];
        for (let i = 0; i < 5; i++) {
          if (liveOngoing[i]) {
            ongoing.push({ sl: i + 1, name: liveOngoing[i].name, progress: liveOngoing[i].progress, deadline: liveOngoing[i].deadline });
          } else {
            ongoing.push({ sl: i + 1, name: "—", progress: "—", deadline: "—" });
          }
        }
      }
      return {
        completedTop5: Array.isArray(store[m].completedTop5) ? store[m].completedTop5 : (liveCompleted.length > 0 ? liveCompleted.slice(0, 5) : ["", "", "", "", ""]),
        ongoingTop5: Array.isArray(ongoing) ? ongoing : this._cloneOngoing(this.DEFAULT_ONGOING),
        isCarriedOver: false,
        sourceMonth: m
      };
    }

    // New month: If live ongoing projects exist, populate from live projects!
    let ongoingTop5 = null;
    if (liveOngoing.length > 0) {
      ongoingTop5 = [];
      for (let i = 0; i < 5; i++) {
        if (liveOngoing[i]) {
          ongoingTop5.push({ sl: i + 1, name: liveOngoing[i].name, progress: liveOngoing[i].progress, deadline: liveOngoing[i].deadline });
        } else {
          ongoingTop5.push({ sl: i + 1, name: "—", progress: "—", deadline: "—" });
        }
      }
    }

    // Otherwise check carryover from previous months
    if (!ongoingTop5) {
      const prev = this.getPreviousMonth(m);
      if (prev && store[prev] && Array.isArray(store[prev].ongoingTop5)) {
        ongoingTop5 = this._cloneOngoing(store[prev].ongoingTop5);
      }
    }

    if (!ongoingTop5) {
      ongoingTop5 = this._cloneOngoing(this.DEFAULT_ONGOING);
    }

    const completedTop5 = liveCompleted.length > 0 ? liveCompleted.slice(0, 5) : ["", "", "", "", ""];

    return {
      completedTop5,
      ongoingTop5,
      isCarriedOver: true,
      sourceMonth: m
    };
  },

  applyRemoteStore(allData) {
    if (!allData || typeof allData !== 'object') return null;
    const store = this._loadStore();
    let changed = false;

    for (const [monthKey, monthData] of Object.entries(allData)) {
      if (!monthData || typeof monthData !== 'object') continue;
      const m = monthKey.toUpperCase();

      const cleanCompleted = (Array.isArray(monthData.completedTop5) ? monthData.completedTop5 : []).slice(0, 5);
      while (cleanCompleted.length < 5) cleanCompleted.push("");

      const cleanOngoing = (Array.isArray(monthData.ongoingTop5) ? monthData.ongoingTop5 : []).slice(0, 5).map((p, idx) => ({
        sl: idx + 1,
        name: (p.name || "").trim(),
        progress: (p.progress || "").trim(),
        deadline: (p.deadline || "").trim()
      }));
      while (cleanOngoing.length < 5) {
        cleanOngoing.push({ sl: cleanOngoing.length + 1, name: "", progress: "", deadline: "" });
      }

      const existing = store[m];
      const remoteTime = monthData.updated_at ? (typeof monthData.updated_at === 'number' ? monthData.updated_at : new Date(monthData.updated_at).getTime()) : 0;
      const localTime = (existing && existing.updated_at) ? (typeof existing.updated_at === 'number' ? existing.updated_at : new Date(existing.updated_at).getTime()) : 0;

      const localMissingData = !existing || 
        !Array.isArray(existing.completedTop5) || existing.completedTop5.every(s => !s) ||
        !Array.isArray(existing.ongoingTop5) || existing.ongoingTop5.every(p => !p.name || p.name === '—');

      if (!existing || remoteTime >= localTime || localMissingData) {
        store[m] = {
          completedTop5: cleanCompleted,
          ongoingTop5: cleanOngoing,
          updated_at: monthData.updated_at || Date.now()
        };
        changed = true;
      }
    }

    if (changed) {
      this._saveStore(store);
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('walton_top_works_changed', { detail: store }));
        }
      } catch (e) {}
    }
    return store;
  },

  applyRemoteUpdate(month, data) {
    if (!month || !data || typeof data !== 'object') return null;
    const m = month.toUpperCase();
    const store = this._loadStore();

    const cleanCompleted = (Array.isArray(data.completedTop5) ? data.completedTop5 : []).slice(0, 5);
    while (cleanCompleted.length < 5) cleanCompleted.push("");

    const cleanOngoing = (Array.isArray(data.ongoingTop5) ? data.ongoingTop5 : []).slice(0, 5).map((p, idx) => ({
      sl: idx + 1,
      name: (p.name || "").trim(),
      progress: (p.progress || "").trim(),
      deadline: (p.deadline || "").trim()
    }));
    while (cleanOngoing.length < 5) {
      cleanOngoing.push({ sl: cleanOngoing.length + 1, name: "", progress: "", deadline: "" });
    }

    store[m] = {
      completedTop5: cleanCompleted,
      ongoingTop5: cleanOngoing,
      updated_at: data.updated_at || Date.now()
    };

    this._saveStore(store);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('walton_top_works_changed', { detail: { month: m, data: store[m] } }));
      }
    } catch (e) {}

    return store[m];
  },

  saveTopWorks(month, completedOrData, ongoingTop5) {
    if (completedOrData && typeof completedOrData === 'object' && !Array.isArray(completedOrData)) {
      return this.saveTopWorksForMonth(month, completedOrData.completedTop5, completedOrData.ongoingTop5);
    }
    return this.saveTopWorksForMonth(month, completedOrData, ongoingTop5);
  },

  /**
   * Saves completed and ongoing works for a specific month
   */
  saveTopWorksForMonth(month, completedTop5, ongoingTop5) {
    const m = month.toUpperCase();
    const store = this._loadStore();

    // Ensure array of 5 completed strings
    const cleanCompleted = (Array.isArray(completedTop5) ? completedTop5 : []).slice(0, 5);
    while (cleanCompleted.length < 5) cleanCompleted.push("");

    // Ensure array of 5 ongoing objects
    const cleanOngoing = (Array.isArray(ongoingTop5) ? ongoingTop5 : []).slice(0, 5).map((p, idx) => ({
      sl: idx + 1,
      name: (p.name || "").trim(),
      progress: (p.progress || "").trim(),
      deadline: (p.deadline || "").trim()
    }));
    while (cleanOngoing.length < 5) {
      cleanOngoing.push({ sl: cleanOngoing.length + 1, name: "", progress: "", deadline: "" });
    }

    const now = Date.now();
    store[m] = {
      completedTop5: cleanCompleted,
      ongoingTop5: cleanOngoing,
      updated_at: now
    };

    this._saveStore(store);

    // 1. Instant Realtime sync to Google Firebase (triggers sub-50ms listener across all open browsers)
    try {
      if (typeof FirebaseSyncService !== 'undefined') {
        if (FirebaseSyncService.db) {
          FirebaseSyncService.db.ref(`walton_monthly_report/top_works/${m}`).set({
            completedTop5: cleanCompleted,
            ongoingTop5: cleanOngoing,
            updated_at: now
          }).catch(e => console.warn('[TopWorks Sync] Firebase sync notice:', e));
        } else {
          const unwatch = setInterval(() => {
            if (FirebaseSyncService.db) {
              clearInterval(unwatch);
              FirebaseSyncService.db.ref(`walton_monthly_report/top_works/${m}`).set({
                completedTop5: cleanCompleted,
                ongoingTop5: cleanOngoing,
                updated_at: now
              }).catch(() => {});
            }
          }, 500);
          setTimeout(() => clearInterval(unwatch), 5000);
        }
      }
    } catch(e) {}

    // 2. Sync to Hostinger server storage via API
    try {
      if (typeof fetch !== 'undefined') {
        fetch('api/sync_top_works.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            month: m,
            completedTop5: cleanCompleted,
            ongoingTop5: cleanOngoing,
            updated_at: now
          })
        }).catch(e => console.warn('[TopWorks Sync] Server sync notice:', e));
      }
    } catch(e) {}

    return store[m];
  },

  async fetchFromServer(month = "SEP-2026") {
    const m = (month || "SEP-2026").toUpperCase();
    let dataLoaded = null;

    // 1. Firebase (fastest sub-50ms real-time source of truth)
    try {
      if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.db) {
        const snap = await FirebaseSyncService.db.ref(`walton_monthly_report/top_works/${m}`).once('value');
        const val = snap.val();
        if (val && typeof val === 'object' && (val.completedTop5 || val.ongoingTop5)) {
          dataLoaded = val;
        }
      }
    } catch(e) {}

    // 2. Hostinger server storage API fallback
    if (!dataLoaded) {
      try {
        if (typeof fetch !== 'undefined') {
          const res = await fetch(`api/sync_top_works.php?month=${m}`);
          if (res.ok) {
            const json = await res.json();
            if (json && json.success && json.data) {
              dataLoaded = json.data;
            }
          }
        }
      } catch(e) {}
    }

    if (dataLoaded) {
      return this.applyRemoteUpdate(m, dataLoaded);
    }
    return null;
  },

  /**
   * Copies ongoing works from previous month explicitly
   */
  copyFromPreviousMonth(targetMonth) {
    const prev = this.getPreviousMonth(targetMonth);
    if (!prev) return null;
    const store = this._loadStore();
    const prevData = store[prev] ? store[prev].ongoingTop5 : this.DEFAULT_ONGOING;
    return this._cloneOngoing(prevData);
  },

  _cloneOngoing(list) {
    return (list || []).map((item, idx) => ({
      sl: idx + 1,
      name: item.name || "",
      progress: item.progress || "",
      deadline: item.deadline || ""
    }));
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TopWorksManager;
} else if (typeof window !== 'undefined') {
  window.TopWorksManager = TopWorksManager;
}
