/**
 * Process Development Monthly Report Automation System
 * Module: Synchronization Engine
 * Implements 10-Step Idempotent Synchronization Pipeline
 * Meets Specification in docs/sync-logic.md
 * WALTON Hi-Tech Industries PLC
 */

class SyncEngine {
  constructor(workbookMgr, breakdownSheet, aiClient, photoMgr) {
    this.workbookMgr = workbookMgr || (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr ? window.appState.workbookMgr : (typeof MonthWorkbookManager !== 'undefined' ? new MonthWorkbookManager() : null));
    this.breakdownSheet = breakdownSheet || (typeof window !== 'undefined' && window.appState && window.appState.breakdownSheet ? window.appState.breakdownSheet : (typeof AIBreakdownSheet !== 'undefined' ? new AIBreakdownSheet() : null));
    this.aiClient = aiClient || (typeof window !== 'undefined' && window.geminiClient ? window.geminiClient : (typeof GeminiClient !== 'undefined' ? new GeminiClient() : null));
    this.photoMgr = photoMgr || (typeof window !== 'undefined' && window.photoManager ? window.photoManager : (typeof PhotoManager !== 'undefined' ? new PhotoManager() : null));
    this.manualOverridesKey = "walton_pd_manual_overrides_v1";
    this.manualOverrides = this.loadManualOverrides();
  }

  loadManualOverrides() {
    try {
      const saved = localStorage.getItem(this.manualOverridesKey);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  saveManualOverrides() {
    try {
      localStorage.setItem(this.manualOverridesKey, JSON.stringify(this.manualOverrides));
    } catch (e) {
      console.error("Failed to save manual overrides:", e);
    }
  }

  setManualOverride(taskId, overrides = {}, month = null) {
    this.manualOverrides[taskId] = {
      ...(this.manualOverrides[taskId] || {}),
      ...overrides,
      updated_at: new Date().toISOString()
    };
    this.saveManualOverrides();

    // Sync overrides to Hostinger Server Storage
    const m = month || (this.workbookMgr ? this.workbookMgr.activeMonth : 'SEP-2026');
    try {
      fetch('api/sync_overrides.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: taskId,
          month: m,
          overrides: overrides
        })
      }).catch(() => {});
    } catch (e) {}
  }

  saveManualOverride(taskId, overrides = {}, month = null) {
    return this.setManualOverride(taskId, overrides, month);
  }

  async fetchServerOverrides(month = 'SEP-2026') {
    try {
      const resp = await fetch(`api/sync_overrides.php?month=${encodeURIComponent(month)}`, { cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.success && data.overrides) {
          for (const [tId, oData] of Object.entries(data.overrides)) {
            if (oData && typeof oData === 'object') {
              this.manualOverrides[tId] = {
                ...(this.manualOverrides[tId] || {}),
                ...oData
              };
            }
          }
          this.saveManualOverrides();
          return data.overrides;
        }
      }
    } catch (e) {}
    return null;
  }

  removeManualOverride(taskId) {
    if (this.manualOverrides[taskId]) {
      delete this.manualOverrides[taskId];
      this.saveManualOverrides();
    }
  }

  getManualOverride(taskId) {
    return this.manualOverrides[taskId] || null;
  }

  /**
   * Executes the full 10-Step Idempotent Synchronization for a specific month
   * @param {String} month - e.g. "SEP-2026"
   * @param {Boolean} forceAiRegenerate - If true, re-calls AI even if source hash matches
   * @returns {Object} Sync Report Metrics
   */
  async syncMonth(month = "SEP-2026", forceAiRegenerate = false) {
    const normalizedMonth = this.workbookMgr ? this.workbookMgr.normalizeMonth(month) : month.toUpperCase();
    const startTime = Date.now();

    // Ingest latest cloud overrides from Hostinger
    try {
      await this.fetchServerOverrides(normalizedMonth);
    } catch(e) {}

    // Step 1: Ingest Month-Wise Input Sheet
    const rawTasks = this.workbookMgr ? this.workbookMgr.getTasksForMonth(normalizedMonth) : [];

    let addedCount = 0;
    let updatedCount = 0;
    let excludedCount = 0;
    const activeSlides = [];

    // Process each task in sequence
    for (const task of rawTasks) {
      // Step 2 & 3: Validate Task ID & Compute Source Hash
      const taskId = task.task_id;
      const engineer = task.engineer;
      const taskName = task.task_name;
      const isIncluded = task.include_in_report !== "NO";

      const currentHash = this.breakdownSheet.computeSourceHash(engineer, taskName);
      const existingBreakdown = this.breakdownSheet.getBreakdown(taskId);

      let breakdownRecord = existingBreakdown;
      let needsAi = false;

      if (!existingBreakdown) {
        // Step 4: Detected New Task
        addedCount++;
        needsAi = true;
      } else if (existingBreakdown.source_hash !== currentHash || forceAiRegenerate) {
        // Step 4: Detected Changed Task Name
        updatedCount++;
        needsAi = true;
      }

      // Step 5: Execute AI Synthesis (Incremental Delta Only)
      if (needsAi && this.aiClient) {
        const aiOutput = await this.aiClient.transformTask(task, forceAiRegenerate);
        breakdownRecord = this.breakdownSheet.upsertBreakdown({
          task_id: taskId,
          month: normalizedMonth,
          engineer: engineer,
          original_task_name: taskName,
          split_title_1: aiOutput.split_title_1,
          split_title_2: aiOutput.split_title_2,
          ai_report_title: aiOutput.ai_report_title,
          ai_description: aiOutput.ai_description,
          ai_impact: aiOutput.ai_impact,
          metrics: aiOutput.metrics,
          quote: aiOutput.quote,
          ai_category: aiOutput.ai_category,
          ai_project_type: aiOutput.ai_project_type
        });
      }

      // Step 6: Reconcile photos
      let photos = this.photoMgr ? this.photoMgr.getTaskPhotos(taskId) : null;
      if (photos && (photos.photo_1 || photos.before_photo || photos.after_photo)) {
        breakdownRecord = this.breakdownSheet.upsertBreakdown({
          task_id: taskId,
          month: normalizedMonth,
          engineer: engineer,
          original_task_name: taskName,
          photo: photos.photo_1 || photos.after_photo,
          photo_before: photos.before_photo,
          photo_after: photos.after_photo,
          slide_status: "READY"
        });
      }

      // Always ensure we have latest breakdown record
      if (!breakdownRecord) {
        breakdownRecord = this.breakdownSheet.getBreakdown(taskId);
      }

      // Step 7 & 8: 1 Row = 1 Slide & Exclusion Filtering
      if (!isIncluded) {
        excludedCount++;
      } else {
        // Step 9: Bind Preserved Photos & Manual User Overrides
        const overrides = this.getManualOverride(taskId) || {};
        const localPhotoObj = (this.photoMgr && this.photoMgr.getTaskPhotos) ? this.photoMgr.getTaskPhotos(taskId) : null;
        
        const photoBefore = overrides.photo_before || 
                            (localPhotoObj && (localPhotoObj.before_photo || localPhotoObj.photo_1)) || 
                            (photos && (photos.before_photo || photos.photo_1)) || 
                            (breakdownRecord && typeof breakdownRecord.photo_before === 'string' && breakdownRecord.photo_before.length > 5 ? breakdownRecord.photo_before : null) || 
                            task.photo_1 || task.before_photo || null;

        const photoAfter = overrides.photo_after || 
                           (localPhotoObj && (localPhotoObj.after_photo || localPhotoObj.photo_2)) || 
                           (photos && (photos.after_photo || photos.photo_2)) || 
                           (breakdownRecord && typeof breakdownRecord.photo_after === 'string' && breakdownRecord.photo_after.length > 5 ? breakdownRecord.photo_after : null) || 
                           task.photo_2 || task.after_photo || null;

        const photoGeneral = overrides.photo || 
                             (localPhotoObj && (localPhotoObj.photo_1 || localPhotoObj.before_photo || localPhotoObj.after_photo)) || 
                             (photos && (photos.photo_1 || photos.before_photo || photos.after_photo)) || 
                             (breakdownRecord && typeof breakdownRecord.photo === 'string' && breakdownRecord.photo.length > 5 ? breakdownRecord.photo : null) || 
                             task.photo_1 || task.photo_2 || null;

        const slideData = {
          task_id: taskId,
          month: normalizedMonth,
          engineer: overrides.engineer || engineer,
          raw_task_name: taskName,
          slide_title: overrides.slide_title || (breakdownRecord ? breakdownRecord.ai_report_title : taskName),
          split_title_1: overrides.split_title_1 || (breakdownRecord ? breakdownRecord.split_title_1 : ""),
          split_title_2: overrides.split_title_2 || (breakdownRecord ? breakdownRecord.split_title_2 : ""),
          description: overrides.description || (breakdownRecord ? breakdownRecord.ai_description : ""),
          impact: overrides.impact || (breakdownRecord ? breakdownRecord.ai_impact : []),
          metrics: overrides.metrics || (breakdownRecord ? breakdownRecord.metrics : []),
          quote: overrides.quote || (breakdownRecord ? breakdownRecord.quote : "Automation for a Smarter Tomorrow"),
          category: overrides.category || task.category || (breakdownRecord ? breakdownRecord.ai_category : "Process development"),
          project_type: overrides.project_type || (breakdownRecord ? breakdownRecord.ai_project_type : "Process Improvement"),
          photo: photoGeneral,
          photo_before: photoBefore,
          photo_after: photoAfter,
          status: overrides.status || "Completed",
          investment: overrides.investment || (task.investment || "In-house / Direct Implementation"),
          has_manual_override: Object.keys(overrides).length > 0,
          manual_override_time: overrides.updated_at || null
        };

        activeSlides.push(slideData);
      }
    }

    // Step 10: Order Slides (Standard process tasks first, Completed Projects & Ongoing Projects at the end)
    const stdSlides = [];
    const projSlides = [];
    activeSlides.forEach(s => {
      const cat = (s.category || '').toLowerCase();
      const title = (s.slide_title || s.raw_task_name || '').toLowerCase();
      const isProj = Boolean(cat.includes('project') || title.includes('project'));
      if (isProj) projSlides.push(s);
      else stdSlides.push(s);
    });
    projSlides.sort((a, b) => {
      const aDone = ((a.status || '').toLowerCase().includes('complete') || (a.category || '').toLowerCase().includes('completed')) ? 0 : 1;
      const bDone = ((b.status || '').toLowerCase().includes('complete') || (b.category || '').toLowerCase().includes('completed')) ? 0 : 1;
      return aDone - bDone;
    });
    activeSlides.length = 0;
    activeSlides.push(...stdSlides, ...projSlides);

    // Step 10: Commit Idempotent Presentation State & Audit
    const syncResult = {
      month: normalizedMonth,
      total_tasks: rawTasks.length,
      added: addedCount,
      updated: updatedCount,
      excluded: excludedCount,
      active_slides: activeSlides.length,
      slides: activeSlides,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    // Cache active slides for the month (store lightweight metadata only, omit huge base64 photos to protect LocalStorage quota)
    try {
      const lightweightSlides = activeSlides.map(s => ({
        ...s,
        photo: null,
        photo_before: null,
        photo_after: null
      }));
      localStorage.setItem(`walton_pd_active_slides_${normalizedMonth}`, JSON.stringify(lightweightSlides));
    } catch (e) {
      console.warn("Could not cache active slides to localStorage:", e);
    }

    return syncResult;
  }

  getActiveSlides(month) {
    const wbMgr = this.workbookMgr || (typeof window !== 'undefined' && window.appState && window.appState.workbookMgr ? window.appState.workbookMgr : null);
    const normalizedMonth = wbMgr ? wbMgr.normalizeMonth(month) : (month ? month.toUpperCase() : "SEP-2026");

    let deletedSet = new Set();
    try {
      const deletedList = JSON.parse(localStorage.getItem('walton_deleted_task_ids') || '[]');
      deletedList.forEach(id => {
        if (typeof SAZZAD_PROTECTED_TASK_IDS === 'undefined' || !SAZZAD_PROTECTED_TASK_IDS.has(id)) {
          deletedSet.add(id);
        }
      });
    } catch (e) {}

    const rawTasks = wbMgr ? wbMgr.getTasksForMonth(normalizedMonth) : [];
    const validTaskMap = new Map();
    rawTasks.forEach(t => {
      if (t && t.task_id && !deletedSet.has(t.task_id)) {
        validTaskMap.set(t.task_id, t);
        validTaskMap.set(String(t.task_id).toLowerCase(), t);
      }
    });

    try {
      const saved = localStorage.getItem(`walton_pd_active_slides_${normalizedMonth}`);
      let slides = saved ? JSON.parse(saved) : [];

      if (!Array.isArray(slides)) slides = [];

      // 1. Strictly filter out any tombstoned tasks, tasks no longer in workbook, or marked NO for presentation (Requirement 3: Anam 35 NO -> 1 slide)
      const originalLen = slides.length;
      slides = slides.filter(s => {
        if (!s || !s.task_id) return false;
        if (deletedSet.has(s.task_id)) return false;
        const sId = String(s.task_id).trim();
        let t = validTaskMap.get(sId) || validTaskMap.get(sId.toLowerCase());
        if (!t && sId.includes('-')) {
          const p = sId.split('-');
          if (p.length >= 3) {
            const pfx = `${p[0]}-${p[1]}-${p[2]}`.toLowerCase();
            t = rawTasks.find(x => x.task_id && String(x.task_id).toLowerCase().startsWith(pfx));
          }
        }
        if (!t) return false;
        const rep = String(t.include_in_report || t.presentation_status || t.monthly_report || 'YES').toUpperCase().trim();
        if (rep === "NO") return false;
        const tid = String(t.task_id || '').toUpperCase();
        if (t.is_project === true || tid.startsWith('PROJ-')) return false;
        if (t.is_cost_saving === true || tid.startsWith('CS-')) return false;
        const cat = String(t.category || '').toLowerCase();
        if (cat.includes('ongoing project') || cat.includes('completed project') || cat.includes('cost saving')) return false;
        return true;
      });

      // 2. Auto-include any active tasks from workbook not yet present in cached slides
      validTaskMap.forEach((t) => {
        if (!t || !t.task_id) return;
        const tId = t.task_id;
        const rep = String(t.include_in_report || t.presentation_status || t.monthly_report || 'YES').toUpperCase().trim();
        if (rep === "NO") return;
        const tid = String(tId).toUpperCase();
        const cat = String(t.category || '').toLowerCase();
        const isProj = Boolean(t.is_project || tid.startsWith('PROJ-') || cat.includes('ongoing project') || cat.includes('completed project'));
        const isCost = Boolean(t.is_cost_saving || tid.startsWith('CS-') || cat.includes('cost saving'));

        if (!isProj && !isCost && !slides.some(s => s.task_id === tId || (s.task_id && String(s.task_id).toLowerCase() === String(tId).toLowerCase()))) {
          let domainData = null;
          if (typeof PROMPT_TEMPLATES !== 'undefined' && PROMPT_TEMPLATES.localFactualTransform) {
            domainData = PROMPT_TEMPLATES.localFactualTransform(t);
          }
          slides.push({
            task_id: tId,
            month: normalizedMonth,
            engineer: t.concern_engineer || t.engineer || t.assignee || "Concern Engineer",
            raw_task_name: t.task_name,
            slide_title: (domainData && domainData.ai_report_title) ? domainData.ai_report_title : (t.task_name || `Task ${tId}`),
            split_title_1: (domainData && domainData.split_title_1) || "",
            split_title_2: (domainData && domainData.split_title_2) || "",
            description: (domainData && domainData.ai_description) ? domainData.ai_description : (t.task_details || "Standard operating procedure execution and engineering development."),
            impact: (domainData && domainData.ai_impact && domainData.ai_impact.length > 0) ? domainData.ai_impact : ["Zero defect manufacturing", "Enhanced line balancing and cycle efficiency"],
            category: t.category || (domainData && domainData.ai_category) || "Process Development",
            status: t.status || "Completed",
            investment: t.investment || "In-house / Direct Implementation",
            has_manual_override: false
          });
        }
      });

      // Synchronize category, engineer, task name from current workbook task
      slides.forEach(s => {
        const t = validTaskMap.get(s.task_id);
        if (t) {
          if (t.category) s.category = t.category;
          if (t.task_name) s.raw_task_name = t.task_name;
          if (t.concern_engineer || t.engineer || t.assignee) {
            s.engineer = t.concern_engineer || t.engineer || t.assignee;
          }
          if (t.status) s.status = t.status;
          if (t.user_edited) {
            if (t.task_name) s.slide_title = t.task_name;
            if (t.task_details || t.description) s.description = t.task_details || t.description;
            if (t.impact) s.impact = Array.isArray(t.impact) ? t.impact : [t.impact];
          }

          const hasOverride = Boolean(this.getManualOverride(s.task_id) || s.has_manual_override || t.user_edited || t.has_manual_override);

          // If not manually overridden or user-edited, auto-derive domain description and impact based on title (Requirement 7)
          if (!hasOverride && typeof PROMPT_TEMPLATES !== 'undefined' && PROMPT_TEMPLATES.localFactualTransform) {
            const domainData = PROMPT_TEMPLATES.localFactualTransform(t);
            if (domainData) {
              if (!s.description || s.description.includes("foil cutting") || s.description.includes("Standard operating procedure execution")) {
                s.description = domainData.ai_description;
              }
              if (!s.impact || s.impact.length === 0 || (s.impact.length === 2 && s.impact[0] === "Zero defect manufacturing")) {
                s.impact = domainData.ai_impact;
              }
              if (!s.split_title_1) s.split_title_1 = domainData.split_title_1;
              if (!s.split_title_2) s.split_title_2 = domainData.split_title_2;
            }
          }
        }
      });

      // Save sanitized slides if count changed
      if (slides.length !== originalLen) {
        try {
          const lightweight = slides.map(s => ({ ...s, photo: null, photo_before: null, photo_after: null }));
          localStorage.setItem(`walton_pd_active_slides_${normalizedMonth}`, JSON.stringify(lightweight));
        } catch (e) {}
      }

      // 3. Apply manual overrides (slide_title, description, impact, engineer, investment, category, etc.)
      slides.forEach(s => {
        const overrides = this.getManualOverride(s.task_id);
        if (overrides) {
          if (overrides.slide_title) s.slide_title = overrides.slide_title;
          if (overrides.split_title_1) s.split_title_1 = overrides.split_title_1;
          if (overrides.split_title_2) s.split_title_2 = overrides.split_title_2;
          if (overrides.description) s.description = overrides.description;
          if (overrides.impact) s.impact = overrides.impact;
          if (overrides.metrics) s.metrics = overrides.metrics;
          if (overrides.quote) s.quote = overrides.quote;
          if (overrides.engineer) s.engineer = overrides.engineer;
          if (overrides.investment) s.investment = overrides.investment;
          if (overrides.category) s.category = overrides.category;
          if (overrides.status) s.status = overrides.status;
          if (overrides.photo_fit) s.photo_fit = overrides.photo_fit;
          s.has_manual_override = true;
          s.manual_override_time = overrides.updated_at || null;
        }
      });

      // 4. Dynamically bind 100% current fresh photos from PhotoManager / IndexedDB
      const pMgr = this.photoMgr || (typeof photoManager !== 'undefined' ? photoManager : null);
      if (pMgr) {
        slides.forEach(s => {
          const p = pMgr.getTaskPhotos(s.task_id, normalizedMonth);
          if (p) {
            s.photo_before = p.before_photo || null;
            s.photo_after = p.after_photo || null;
            s.photo = p.before_photo || p.after_photo || null;
            s.has_dual_photo = Boolean(s.photo_before && s.photo_after);
          } else {
            s.photo_before = null;
            s.photo_after = null;
            s.photo = null;
            s.has_dual_photo = false;
          }
        });
      }

      // 5. Strict Presentation Sequence: Standard process tasks first, Completed Projects next, Ongoing Projects at the very end
      const stdSlides = [];
      const completedProjSlides = [];
      const ongoingProjSlides = [];
      slides.forEach(s => {
        const cat = (s.category || '').toLowerCase();
        const title = (s.slide_title || s.raw_task_name || '').toLowerCase();
        const isProj = Boolean(s.is_project || cat.includes('project') || title.includes('project'));
        if (isProj) {
          const status = (s.status || s.project_status || '').toLowerCase();
          if (status.includes('complete') || cat.includes('completed project')) {
            completedProjSlides.push(s);
          } else {
            ongoingProjSlides.push(s);
          }
        } else {
          stdSlides.push(s);
        }
      });

      slides = [...stdSlides, ...completedProjSlides, ...ongoingProjSlides];
      try {
        const lightweightSlides = slides.map(s => ({
          ...s,
          photo: null,
          photo_before: null,
          photo_after: null
        }));
        localStorage.setItem(`walton_pd_active_slides_${normalizedMonth}`, JSON.stringify(lightweightSlides));
      } catch (e) {}
      return slides;
    } catch (e) {
      console.warn("getActiveSlides notice:", e);
    }
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SyncEngine;
} else if (typeof window !== 'undefined') {
  window.SyncEngine = SyncEngine;
}
