/**
 * Process Development Monthly Report Automation System
 * Module: Dedicated Cost Savings View (Full-Page Section)
 * Features:
 * - Full-page view container replacing the pop-in modal
 * - Engineer-wise cost saving entry (Select engineer, initiative, category, amount BDT, remarks)
 * - Monthly financial impact calculation & departmental total setting
 * - Dynamic engineer contribution breakdown and progress charts
 * - 12-Month fiscal year overview table with direct month selection
 * - Seamless integration with CostSavingTracker & cloud sync
 * WALTON Hi-Tech Industries PLC
 */

const CostSavingsView = {
  storageKey: "walton_engineer_cost_savings_v1",
  selectedMonth: "SEP-2026",
  selectedYear: 2026,
  activeFilterEngineer: "",
  editingEntryId: null,

  CATEGORIES: [
    "Process Optimization",
    "Material Substitution",
    "Scrap Reduction",
    "Cycle Time Reduction",
    "Local Sourcing",
    "Packaging & Logistics",
    "Tooling & Fixture Innovation",
    "Energy & Resource Efficiency",
    "Other Cost Saving"
  ],

  _loadEngineerEntries() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.warn("Could not load engineer cost savings:", e);
    }
    return {};
  },

  _saveEngineerEntries(entries) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(entries));
    } catch (e) {
      console.error("Could not save engineer cost savings:", e);
    }
  },

  getEntriesForMonth(month) {
    const all = this._loadEngineerEntries();
    const key = (month || this.selectedMonth).toUpperCase().trim();
    return Array.isArray(all[key]) ? all[key] : [];
  },

  getEngineerSum(month) {
    const entries = this.getEntriesForMonth(month);
    return entries.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  },

  getMonthTotal(month) {
    const m = month || this.selectedMonth;
    // Check if CostSavingTracker has an amount
    if (typeof CostSavingTracker !== 'undefined' && CostSavingTracker.getMonthSaving) {
      const trackerVal = CostSavingTracker.getMonthSaving(m, this.selectedYear);
      if (trackerVal > 0) return trackerVal;
    }
    // Fallback to sum of engineer initiatives
    return this.getEngineerSum(m);
  },

  async handleMonthChange(m) {
    this.selectedMonth = m;
    this.selectedYear = (typeof CostSavingTracker !== 'undefined' && CostSavingTracker.extractYear)
      ? CostSavingTracker.extractYear(m)
      : 2026;
    if (window.appState && window.appState.workbookMgr) {
      window.appState.workbookMgr.activeMonth = m;
    }
    await this.render();
  },

  async handleYearChange(year) {
    this.selectedYear = parseInt(year, 10) || 2026;
    // Map current month to new year if applicable
    const parts = this.selectedMonth.split('-');
    if (parts.length === 2) {
      this.selectedMonth = `${parts[0]}-${this.selectedYear}`;
    }
    await this.render();
  },

  handleEngineerFilter(eng) {
    this.activeFilterEngineer = eng || "";
    this.render();
  },

  async saveMonthTotalManual(event) {
    if (event && event.preventDefault) event.preventDefault();
    const input = document.getElementById('manual-month-total-input');
    if (!input) return;
    const val = parseFloat(input.value) || 0;
    if (typeof CostSavingTracker !== 'undefined' && CostSavingTracker.setMonthSaving) {
      CostSavingTracker.setMonthSaving(this.selectedMonth, val, this.selectedYear);
    }
    if (typeof window.showToast === 'function') {
      window.showToast(`✅ Month total saved: ৳ ${val.toLocaleString()} BDT`, "success");
    }
    await this.render();
  },

  async syncFromEngineerSum() {
    const sum = this.getEngineerSum(this.selectedMonth);
    if (typeof CostSavingTracker !== 'undefined' && CostSavingTracker.setMonthSaving) {
      CostSavingTracker.setMonthSaving(this.selectedMonth, sum, this.selectedYear);
    }
    if (typeof window.showToast === 'function') {
      window.showToast(`🔄 Month total synchronized with engineer sum: ৳ ${sum.toLocaleString()} BDT`, "success");
    }
    await this.render();
  },

  _stagedPhotos: {},

  getSlidePhoto(taskId) {
    if (!taskId) return null;
    if (this._stagedPhotos && this._stagedPhotos[taskId]) {
      return this._stagedPhotos[taskId];
    }
    // Check entries in _loadEngineerEntries()
    try {
      const all = this._loadEngineerEntries();
      const monthKey = (this.selectedMonth || 'SEP-2026').toUpperCase().trim();
      const monthList = (all && all[monthKey]) ? all[monthKey] : [];
      let entry = monthList.find(e => String(e.task_id) === String(taskId) || String(e.id) === String(taskId));
      if (!entry && all) {
        for (const list of Object.values(all)) {
          if (Array.isArray(list)) {
            entry = list.find(e => String(e.task_id) === String(taskId) || String(e.id) === String(taskId));
            if (entry) break;
          }
        }
      }
      if (entry) {
        const p = (entry.slideObj && (entry.slideObj.photo_1 || entry.slideObj.photo || entry.slideObj.before_photo || entry.slideObj.after_photo)) || entry.photo || entry.photo_1;
        if (p) return p;
      }
    } catch(e) {}

    if (typeof photoManager !== 'undefined' && photoManager.getTaskPhotos) {
      const p = photoManager.getTaskPhotos(taskId, this.selectedMonth);
      if (p) {
        const found = p.after_photo || p.photo_1 || p.photo_2 || p.before_photo;
        if (found) return found;
      }
    }
    if (window.appState && window.appState.workbookMgr) {
      const t = window.appState.workbookMgr.getTask(this.selectedMonth, taskId);
      if (t && (t.photo_1 || t.photo || t.before_photo || t.after_photo)) {
        return t.photo_1 || t.photo || t.before_photo || t.after_photo;
      }
    }
    return null;
  },

  async uploadPhotoFromBlob(blobOrFile, taskId) {
    if (!blobOrFile || !taskId) return;
    try {
      let base64Url = "";
      if (typeof blobOrFile === 'string') {
        base64Url = blobOrFile;
      } else if (typeof PhotoStorageProvider !== 'undefined' && PhotoStorageProvider.compressImageFile) {
        base64Url = await PhotoStorageProvider.compressImageFile(blobOrFile);
      } else {
        base64Url = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = () => resolve("");
          reader.readAsDataURL(blobOrFile);
        });
      }

      if (!base64Url) return;
      this._stagedPhotos[taskId] = base64Url;

      // Persist to photoManager
      if (typeof photoManager !== 'undefined') {
        if (photoManager.setTaskPhoto) {
          await photoManager.setTaskPhoto(taskId, 'before_photo', base64Url, null, this.selectedMonth);
          await photoManager.setTaskPhoto(taskId, 'photo_1', base64Url, null, this.selectedMonth);
          await photoManager.setTaskPhoto(taskId, 'after_photo', base64Url, null, this.selectedMonth);
        } else if (photoManager.savePhoto) {
          await photoManager.savePhoto(taskId, 'before_photo', base64Url, this.selectedMonth);
        }
      }

      // Immediately save into engineer entries & Firebase!
      const all = this._loadEngineerEntries();
      const monthKey = (this.selectedMonth || 'SEP-2026').toUpperCase().trim();
      if (all && all[monthKey]) {
        const entry = all[monthKey].find(e => String(e.task_id) === String(taskId) || String(e.id) === String(taskId));
        if (entry) {
          if (!entry.slideObj) entry.slideObj = {};
          entry.slideObj.photo_1 = base64Url;
          entry.slideObj.photo = base64Url;
          entry.slideObj.before_photo = base64Url;
          entry.photo = base64Url;
          entry.photo_1 = base64Url;
          entry.last_updated = new Date().toISOString();
          this._saveEngineerEntries(all);

          if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.broadcastCostSavingsUpdate) {
            FirebaseSyncService.broadcastCostSavingsUpdate(all);
          }
        }
      }

      this.renderModalPhotoSlot(taskId);
      this.renderModalLiveSlidePreview(taskId);
      if (typeof window.showToast === 'function') {
        window.showToast("📷 Photo attached to Cost Saving slide!", "success");
      }
    } catch (err) {
      console.error("Cost saving photo upload error:", err);
      if (typeof window.showToast === 'function') {
        window.showToast("Failed to upload photo. Please try again.", "error");
      }
    }
  },

  handleModalPhotoDrop(event, taskId) {
    if (!event || !event.dataTransfer) return;
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name || ''))) {
      this.uploadPhotoFromBlob(file, taskId);
    }
  },

  async uploadModalPhoto(event, taskId) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    await this.uploadPhotoFromBlob(file, taskId);
  },

  async pasteFromClipboard(taskId) {
    if (!taskId) return;
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              await this.uploadPhotoFromBlob(blob, taskId);
              return;
            }
          }
        }
      }
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = (await navigator.clipboard.readText() || '').trim();
        if (text.startsWith('data:image/') || /^https?:\/\/.*\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(text)) {
          await this.uploadPhotoFromBlob(text, taskId);
          return;
        }
      }
      if (typeof window.showToast === 'function') {
        window.showToast("No image in clipboard! Copy an image first (Ctrl+C).", "warning");
      }
    } catch (err) {
      if (typeof window.showToast === 'function') {
        window.showToast("Press Ctrl+V on your keyboard to paste the photo.", "info");
      }
    }
  },

  async deleteModalPhoto(taskId) {
    delete this._stagedPhotos[taskId];
    if (typeof photoManager !== 'undefined' && photoManager.removePhoto) {
      try {
        await photoManager.removePhoto(taskId, 'before_photo', this.selectedMonth);
        await photoManager.removePhoto(taskId, 'photo_1', this.selectedMonth);
        await photoManager.removePhoto(taskId, 'after_photo', this.selectedMonth);
      } catch (e) {}
    }
    const all = this._loadEngineerEntries();
    const monthKey = (this.selectedMonth || 'SEP-2026').toUpperCase().trim();
    if (all && all[monthKey]) {
      const entry = all[monthKey].find(e => String(e.task_id) === String(taskId) || String(e.id) === String(taskId));
      if (entry) {
        if (entry.slideObj) {
          entry.slideObj.photo_1 = "";
          entry.slideObj.photo = "";
          entry.slideObj.before_photo = "";
        }
        entry.photo = "";
        entry.photo_1 = "";
        this._saveEngineerEntries(all);
        if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.broadcastCostSavingsUpdate) {
          FirebaseSyncService.broadcastCostSavingsUpdate(all);
        }
      }
    }
    this.renderModalPhotoSlot(taskId);
    this.renderModalLiveSlidePreview(taskId);
    if (typeof window.showToast === 'function') {
      window.showToast("Photo removed.", "info");
    }
  },

  renderModalPhotoSlot(taskId) {
    const container = document.getElementById('slide-photo-slot-container');
    if (!container) return;
    const photo = this.getSlidePhoto(taskId);

    container.innerHTML = `
      <div id="slide-slot-photo" class="bg-white border ${photo ? 'border-slate-200' : 'border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/20'} rounded-2xl p-3 flex flex-col justify-between shadow-2xs transition group"
           ondragover="event.preventDefault(); this.classList.add('ring-2', 'ring-emerald-500');"
           ondragleave="this.classList.remove('ring-2', 'ring-emerald-500');"
           ondrop="CostSavingsView.handleModalPhotoDrop(event, '${taskId}')">
        
        <div class="relative w-full h-36 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-200">
          ${photo ? `
            <div class="relative w-full h-full overflow-hidden flex items-center justify-center bg-slate-950">
              <img src="${photo}" alt="" class="absolute inset-[-12%] w-[124%] h-[124%] object-cover pointer-events-none select-none" style="filter: blur(14px) brightness(0.65); opacity: 0.65;" />
              <img src="${photo}" class="relative z-10 max-w-full max-h-full object-contain drop-shadow-md" alt="Cost Saving Photo" />
            </div>
            <div class="absolute inset-0 z-20 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition backdrop-blur-[1px]">
              <button type="button" onclick="event.stopPropagation(); CostSavingsView.pasteFromClipboard('${taskId}')" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow transition cursor-pointer">
                📋 Paste Ctrl+V
              </button>
              <label for="slide-photo-file-input" onclick="event.stopPropagation()" class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-bold cursor-pointer shadow transition">
                🔄 Replace
              </label>
              <button type="button" onclick="event.stopPropagation(); CostSavingsView.deleteModalPhoto('${taskId}')" class="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow transition cursor-pointer">
                🗑 Delete
              </button>
            </div>
          ` : `
            <div class="cursor-pointer flex flex-col items-center justify-center p-3 text-center w-full h-full hover:bg-emerald-50/40 transition"
                 onclick="CostSavingsView.pasteFromClipboard('${taskId}')">
              <span class="text-3xl text-emerald-500 mb-1 group-hover:scale-110 transition">📋</span>
              <span class="text-xs font-bold text-slate-800">Paste Photo (Ctrl+V)</span>
              <span class="text-[10px] text-slate-500 mt-0.5">Click to paste image from clipboard, or drag &amp; drop</span>
              <div class="mt-2 flex items-center gap-2" onclick="event.stopPropagation()">
                <label for="slide-photo-file-input" class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer shadow-xs transition">
                  📁 Browse File
                </label>
              </div>
            </div>
          `}
          <input type="file" id="slide-photo-file-input" accept="image/*" class="hidden" onchange="CostSavingsView.uploadModalPhoto(event, '${taskId}')" />
        </div>

        <div class="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
          <span class="text-slate-400 font-mono">16:9 Cost Optimization Slide Slot</span>
          <div class="flex items-center gap-1.5">
            <button type="button" onclick="event.stopPropagation(); CostSavingsView.pasteFromClipboard('${taskId}')" 
                    class="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition flex items-center gap-1 cursor-pointer">
              <span>📋</span> <span>Paste (Ctrl+V)</span>
            </button>
            <label for="slide-photo-file-input" onclick="event.stopPropagation()" class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition">
              ${photo ? '🔄 Replace' : '📁 Upload'}
            </label>
            ${photo ? `
              <button type="button" onclick="event.stopPropagation(); CostSavingsView.deleteModalPhoto('${taskId}')" class="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition cursor-pointer">
                🗑 Remove
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  onCalcChange(field, prefix = 'slide') {
    const yearlyEl = document.getElementById(prefix + '-calc-yearly');
    const onetimeEl = document.getElementById(prefix + '-calc-onetime');
    const monthlyEl = document.getElementById(prefix + '-calc-monthly') || document.getElementById('entry-amount');
    const summaryEl = document.getElementById(prefix + '-calc-summary');

    let yearly = parseFloat(yearlyEl ? yearlyEl.value : 0) || 0;
    let onetime = parseFloat(onetimeEl ? onetimeEl.value : 0) || 0;
    let monthly = parseFloat(monthlyEl ? monthlyEl.value : 0) || 0;

    if (field === 'yearly' || field === 'onetime') {
      monthly = Math.round((yearly + onetime) / 12);
      if (monthlyEl) monthlyEl.value = monthly > 0 ? monthly : '';
    } else if (field === 'monthly') {
      yearly = Math.round(monthly * 12);
      onetime = 0;
      if (yearlyEl) yearlyEl.value = yearly > 0 ? yearly : '';
      if (onetimeEl) onetimeEl.value = '';
    }

    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="flex items-center justify-between text-xs">
          <span class="text-emerald-900 font-bold">Monthly Financial Impact:</span>
          <span class="font-mono font-black text-emerald-700 text-sm">৳ ${monthly.toLocaleString()} BDT / Month</span>
        </div>
        <div class="text-[11px] text-slate-600 mt-1 flex flex-wrap items-center justify-between gap-1">
          <span>Formula: (৳ ${yearly.toLocaleString()} + ৳ ${onetime.toLocaleString()}) ÷ 12</span>
          <span class="font-bold text-emerald-800">Total Year 1: ৳ ${(yearly + onetime).toLocaleString()} BDT</span>
        </div>
      `;
    }
  },

  apply1YearCarryover(monthlyAmount, year = null) {
    if (!monthlyAmount || monthlyAmount <= 0) return;
    const targetYear = year || this.selectedYear || 2026;
    if (typeof CostSavingTracker !== 'undefined' && CostSavingTracker.setMonthSaving) {
      const monthCodes = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      monthCodes.forEach(code => {
        const mCode = `${code}-${targetYear}`;
        const current = CostSavingTracker.getMonthSaving(mCode, targetYear);
        CostSavingTracker.setMonthSaving(mCode, current + monthlyAmount, targetYear);
      });
    }
  },

  _slidePreviewTimer: null,
  debouncedLiveSlidePreview(taskId) {
    if (this._slidePreviewTimer) clearTimeout(this._slidePreviewTimer);
    this._slidePreviewTimer = setTimeout(() => {
      this.renderModalLiveSlidePreview(taskId);
    }, 50);
  },

  renderModalLiveSlidePreview(taskId) {
    const previewEl = document.getElementById('cost-slide-modal-preview');
    if (!previewEl) return;

    const title = (document.getElementById('slide-title')?.value || '').trim() || 'Cost Optimization Initiative';
    const engineer = (document.getElementById('slide-engineer')?.value || 'Concern Engineer').trim();
    const category = (document.getElementById('slide-category')?.value || 'Cost Savings').trim();
    const overview = (document.getElementById('slide-overview')?.value || '').trim() || 'Engineered and deployed industrial process optimization resulting in confirmed recurring cost savings.';
    const impactsRaw = (document.getElementById('slide-impacts')?.value || '').trim();
    const impacts = impactsRaw 
      ? impactsRaw.split('\n').map(l => l.trim()).filter(Boolean)
      : ['Verified annual recurring financial cost saving', 'Process optimization implemented and confirmed in regular production'];
    const monthly = parseFloat(document.getElementById('slide-calc-monthly')?.value) || 0;
    const yearly = parseFloat(document.getElementById('slide-calc-yearly')?.value) || 0;
    const onetime = parseFloat(document.getElementById('slide-calc-onetime')?.value) || 0;
    const totYear1 = yearly + onetime;
    const useCustom = document.getElementById('slide-use-custom-highlight')?.checked;
    const customHighlight = (document.getElementById('slide-custom-highlight')?.value || '').trim();
    const calcHighlight = monthly > 0 ? `৳ ${monthly.toLocaleString()} / Mo (৳ ${totYear1.toLocaleString()} / Yr)` : '';
    const highlightStr = (useCustom && customHighlight) ? customHighlight : calcHighlight;
    const photoUrl = this.getSlidePhoto(taskId) || null;

    const slideData = {
      task_id: taskId,
      month: this.selectedMonth,
      slide_title: title,
      raw_task_name: title,
      description: overview,
      impact: impacts,
      engineer: engineer,
      category: category,
      photo_fit: 'blur',
      status: 'Completed',
      is_project: false,
      is_cost_saving: true,
      cost_saving_monthly: monthly,
      cost_saving_yearly: yearly,
      cost_saving_onetime: onetime,
      cost_saving_amount: monthly,
      cost_saving_highlight: highlightStr,
      savings: monthly,
      photo_before: photoUrl,
      photo_after: null,
      photo: photoUrl,
      has_dual_photo: false
    };

    if (typeof SlideLayoutEngine !== 'undefined') {
      const stageW = previewEl.clientWidth || 640;
      const stageH = previewEl.clientHeight || 380;
      const refW = 1040;
      const refH = 585;
      const scale = Math.min((stageW - 12) / refW, (stageH - 12) / refH, 1);
      const scaledW = Math.round(refW * scale);
      const scaledH = Math.round(refH * scale);

      previewEl.innerHTML = `
        <div class="relative flex items-center justify-center flex-shrink-0" style="width: ${scaledW}px; height: ${scaledH}px;">
          <div style="width: ${refW}px; height: ${refH}px; transform: scale(${scale}); transform-origin: top left; position: absolute; top: 0; left: 0; box-shadow: 0 20px 45px rgba(0,0,0,0.6); border-radius: 12px; overflow: hidden;">
            ${SlideLayoutEngine.renderTaskSlide(slideData, 1, 1)}
          </div>
        </div>
      `;
    } else {
      previewEl.innerHTML = `<div class="p-6 text-center text-slate-400 font-mono text-xs">SlideLayoutEngine not available</div>`;
    }
  },

  openAddSlideModal(taskId = null) {
    let container = document.getElementById('cost-savings-entry-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cost-savings-entry-modal-container';
      document.body.appendChild(container);
    }

    const engineers = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getEngineers)
      ? MasterDataManager.getEngineers()
      : ((typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.ENGINEERS) ? MASTER_LISTS.ENGINEERS : []);
    const defaultEng = engineers[0] ? (engineers[0].display || engineers[0].name) : "Sazzad (50463)";

    const all = this._loadEngineerEntries();
    const monthKey = this.selectedMonth.toUpperCase().trim();
    const entries = Array.isArray(all[monthKey]) ? all[monthKey] : [];
    const existingEntry = entries.find(e => String(e.task_id) === String(taskId) || String(e.id) === String(taskId));
    const existingSlide = existingEntry?.slideObj || null;
    const existingTask = existingSlide || existingEntry || (taskId && window.appState && window.appState.workbookMgr ? window.appState.workbookMgr.getTask(this.selectedMonth, taskId) : null);

    const targetTaskId = taskId || (existingEntry ? existingEntry.task_id || existingEntry.id : `CS-2026-${Date.now().toString().slice(-4)}`);
    this.editingEntryId = existingEntry ? existingEntry.id : null;
    const isEdit = Boolean(existingTask);

    const initTitle = existingTask ? (existingTask.slide_title || existingTask.task_name || existingTask.title || '') : '';
    const initEng = existingTask ? (existingTask.engineer || existingTask.assignee || defaultEng) : defaultEng;
    const initDesc = existingTask ? (existingTask.description || existingTask.overview || existingTask.remarks || existingTask.task_details || '') : '';
    let initImpacts = "";
    if (existingTask) {
      if (Array.isArray(existingTask.impact)) {
        initImpacts = existingTask.impact.join("\n");
      } else if (Array.isArray(existingTask.impact_bullets)) {
        initImpacts = existingTask.impact_bullets.join("\n");
      } else if (existingTask.impact) {
        initImpacts = String(existingTask.impact);
      }
    }
    const initMonthly = existingTask ? (existingTask.cost_saving_monthly || existingTask.cost_saving_amount || existingTask.amount || existingTask.savings || '') : '';
    const initYearly = existingTask ? (existingTask.cost_saving_yearly || existingTask.yearly_amount || (initMonthly ? initMonthly * 12 : '')) : '';
    const initOnetime = existingTask ? (existingTask.cost_saving_onetime || existingTask.onetime_amount || '') : '';
    const initCustomHighlight = existingTask ? (existingTask.cost_saving_custom_highlight || '') : '';

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in font-sans">
        <div class="relative w-full max-w-6xl xl:max-w-7xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-800 flex flex-col max-h-[94vh] overflow-hidden">
          
          <!-- Header -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
            <div class="flex items-center gap-3">
              <span class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-lg shadow-md shadow-emerald-500/25">
                💰
              </span>
              <div>
                <h3 class="text-base sm:text-lg font-black text-slate-800">${isEdit ? 'Edit' : 'Add'} Cost Saving Presentation Slide</h3>
                <p class="text-xs text-slate-400 font-mono">Target Month: <span class="font-bold text-emerald-700">${this.selectedMonth}</span> &bull; 16:9 Presentation Deck Slide Preview</p>
              </div>
            </div>
            <button onclick="CostSavingsView.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer">&times;</button>
          </div>

          <!-- Body: Split 2-Column (Controls on Left: 5 cols, Real-Time Preview on Right: 7 cols) -->
          <div class="grid grid-cols-1 xl:grid-cols-12 gap-5 pt-3 flex-1 min-h-0 items-stretch overflow-hidden">
            
            <!-- Left: Controls & Financial Form (5 Columns) -->
            <form onsubmit="CostSavingsView.handleSlideSubmit(event)" class="xl:col-span-5 flex flex-col justify-between overflow-y-auto space-y-3 pr-2 min-h-0 text-xs">
              <input type="hidden" id="slide-task-id" value="${targetTaskId}">
              <input type="hidden" id="slide-is-edit" value="${isEdit ? 'true' : 'false'}">

              <!-- Title -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Cost Saving Initiative / Slide Title <span class="text-red-500">*</span></label>
                <input type="text" id="slide-title" required value="${HELPERS.escapeHtml(initTitle)}"
                       oninput="CostSavingsView.debouncedLiveSlidePreview('${targetTaskId}')"
                       placeholder="e.g. Copper Tube Diameter Optimization for Inverter AC"
                       class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 shadow-xs" />
              </div>

              <!-- Engineer & Category -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Concern Engineer <span class="text-red-500">*</span></label>
                  <select id="slide-engineer" required 
                          onchange="CostSavingsView.debouncedLiveSlidePreview('${targetTaskId}')"
                          class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500">
                    ${engineers.map(e => `
                      <option value="${e.display || e.name}" ${(initEng === e.display || initEng === e.name) ? 'selected' : ''}>
                        ${e.display || e.name}
                      </option>
                    `).join('')}
                  </select>
                </div>

                <div>
                  <label class="block font-bold text-slate-700 mb-1">Category <span class="text-red-500">*</span></label>
                  <select id="slide-category" required 
                          onchange="CostSavingsView.debouncedLiveSlidePreview('${targetTaskId}')"
                          class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500">
                    <option value="Cost Savings" selected>Cost Savings (Major Developments)</option>
                    ${this.CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                  </select>
                </div>
              </div>

              <!-- Photo Upload Dropzone -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Slide Implementation Photo (Drag &amp; Drop, Browse or Paste Ctrl+V)</label>
                <div id="slide-photo-slot-container"></div>
              </div>

              <!-- Description with AI Generate Button (Requirement 2) -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block font-bold text-slate-700">Description <span class="text-red-500">*</span></label>
                  <button type="button" onclick="CostSavingsView.generateAiDescription(event)" class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition shadow-xs cursor-pointer">
                    <span>✨</span> <span>AI Generate Description</span>
                  </button>
                </div>
                <textarea id="slide-overview" rows="3" required 
                          oninput="CostSavingsView.debouncedLiveSlidePreview('${targetTaskId}')"
                          placeholder="Describe technical background, design adjustments, testing validation, and process changes made..."
                          class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 resize-none shadow-xs">${HELPERS.escapeHtml(initDesc)}</textarea>
              </div>

              <!-- Key Impact with AI Generate Button (Requirement 2) -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block font-bold text-slate-700">Key Impact <span class="font-normal text-slate-400">(Bullets, 1 per line)</span></label>
                  <button type="button" onclick="CostSavingsView.generateAiImpact(event)" class="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-lg transition shadow-xs cursor-pointer">
                    <span>✨</span> <span>AI Generate Impact</span>
                  </button>
                </div>
                <textarea id="slide-impacts" rows="3" 
                          oninput="CostSavingsView.debouncedLiveSlidePreview('${targetTaskId}')"
                          placeholder="• Reduced raw material thickness with 100% burst test compliance&#10;• Annual recurring cost saving verified by finance&#10;• Zero negative effect on thermal cooling performance"
                          class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 resize-none shadow-xs">${HELPERS.escapeHtml(initImpacts)}</textarea>
              </div>

              <!-- HIGHLIGHTED COST SAVING CALCULATION BOX -->
              <div class="p-3.5 rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-emerald-50/80 space-y-2.5">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black">৳</span>
                  <span class="text-[11px] font-black text-emerald-900 uppercase tracking-wider">Cost Saving Calculation Engine</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label class="block font-bold text-slate-700 mb-0.5 text-[10px]">Yearly Saving (BDT)</label>
                    <input type="number" id="slide-calc-yearly" value="${initYearly}" step="1" min="0" placeholder="e.g. 1200000"
                           oninput="CostSavingsView.onCalcChange('yearly', 'slide')"
                           class="w-full bg-white border border-emerald-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600" />
                  </div>

                  <div>
                    <label class="block font-bold text-slate-700 mb-0.5 text-[10px]">One-Time Saving (BDT)</label>
                    <input type="number" id="slide-calc-onetime" value="${initOnetime}" step="1" min="0" placeholder="e.g. 500000"
                           oninput="CostSavingsView.onCalcChange('onetime', 'slide')"
                           class="w-full bg-white border border-emerald-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600" />
                  </div>

                  <div>
                    <label class="block font-bold text-emerald-900 mb-0.5 text-[10px]">Monthly Impact (BDT) <span class="text-red-500">*</span></label>
                    <input type="number" id="slide-calc-monthly" required value="${initMonthly}" step="1" min="0" placeholder="e.g. 141667"
                           oninput="CostSavingsView.onCalcChange('monthly', 'slide')"
                           class="w-full bg-white border-2 border-emerald-500 rounded-xl px-2.5 py-1.5 text-xs font-mono font-black text-emerald-700 focus:outline-none focus:border-emerald-600 shadow-sm" />
                  </div>
                </div>

                <!-- Live Formula & Output Summary (Full amounts without Lac) -->
                <div id="slide-calc-summary" class="p-2.5 rounded-xl bg-white/90 border border-emerald-200">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-emerald-900 font-bold">Monthly Financial Impact:</span>
                    <span class="font-mono font-black text-emerald-700 text-sm">৳ ${(parseFloat(initMonthly) || 0).toLocaleString()} BDT / Month</span>
                  </div>
                  <div class="text-[10px] text-slate-600 mt-1 flex flex-wrap items-center justify-between gap-1">
                    <span>Formula: (Yearly + One-Time) ÷ 12</span>
                    <span class="font-bold text-emerald-800">Total Year 1: ৳ ${((parseFloat(initYearly) || 0) + (parseFloat(initOnetime) || 0)).toLocaleString()} BDT</span>
                  </div>
                </div>

                <!-- Custom Highlight Amount & Text Option (Requirement 2) -->
                <div class="pt-2 border-t border-emerald-200 space-y-1.5">
                  <div class="flex items-center justify-between">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" id="slide-use-custom-highlight" ${initCustomHighlight ? 'checked' : ''}
                             onchange="document.getElementById('slide-custom-highlight-box').style.display = this.checked ? 'block' : 'none'; CostSavingsView.debouncedLiveSlidePreview('${targetTaskId}')"
                             class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                      <span class="text-[11px] font-bold text-emerald-950">Custom Highlight Text &amp; Amount</span>
                    </label>
                    <span class="text-[9.5px] text-slate-500 font-mono">Custom text/amount</span>
                  </div>
                  <div id="slide-custom-highlight-box" style="display: ${initCustomHighlight ? 'block' : 'none'};">
                    <input type="text" id="slide-custom-highlight" value="${HELPERS.escapeHtml(initCustomHighlight)}"
                           oninput="CostSavingsView.debouncedLiveSlidePreview('${targetTaskId}')"
                           placeholder="e.g. ৳ 2,50,000 / Batch (Process Optimization) or custom text"
                           class="w-full bg-white border border-emerald-400 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs" />
                  </div>
                </div>

                <!-- 1 Year Carryover Option -->
                <div class="flex items-start gap-2 pt-0.5">
                  <input type="checkbox" id="slide-carry-1year" checked class="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                  <label for="slide-carry-1year" class="text-[11px] font-bold text-slate-700 cursor-pointer">
                    Carry forward this monthly cost saving across 12 calendar months for 1 full rolling year
                  </label>
                </div>
              </div>

              <!-- Action buttons -->
              <div class="flex items-center justify-between pt-3 border-t border-slate-100 flex-shrink-0">
                <button type="button" onclick="CostSavingsView.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition cursor-pointer">Cancel</button>
                <button type="submit" class="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black shadow-md shadow-emerald-500/25 transition flex items-center gap-1.5 cursor-pointer">
                  <span>💾</span> <span>Save Cost Saving Slide</span>
                </button>
              </div>
            </form>

            <!-- Right: Real-Time 16:9 Presentation Canvas Preview (7 Columns) with Fullscreen Button -->
            <div class="xl:col-span-7 bg-slate-950 rounded-2xl p-3 border border-slate-800 flex flex-col justify-between shadow-2xl overflow-hidden min-h-[360px]">
              <div class="flex items-center justify-between pb-2 border-b border-slate-800/80 text-xs">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span class="font-bold text-slate-200 font-mono text-[11px]">Real-Time Slide Preview</span>
                  <span class="px-2 py-0.5 rounded text-[9.5px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                    Walton Executive 16:9
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <button type="button" onclick="CostSavingsView.toggleFullscreenPreview('${targetTaskId}')"
                          class="px-2.5 py-1 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-600/70 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer shadow-sm">
                    <span>⛶</span> <span>Fullscreen Preview</span>
                  </button>
                  <span class="text-[10px] text-slate-400 font-mono hidden sm:inline">Cost Optimization</span>
                </div>
              </div>

              <!-- Presentation Stage Area -->
              <div id="cost-slide-modal-preview" class="flex-1 flex items-center justify-center min-h-0 w-full overflow-hidden my-2">
                <!-- Injected via renderModalLiveSlidePreview -->
              </div>

              <div class="pt-1.5 text-[10px] text-slate-400 flex items-center justify-between font-mono flex-shrink-0">
                <span>Highlight badge and financial metrics update as you type</span>
                <span class="text-emerald-400 font-bold">✨ Real-time synced</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    `;

    setTimeout(() => {
      this.renderModalPhotoSlot(targetTaskId);
      this.onCalcChange('yearly', 'slide');
      this.renderModalLiveSlidePreview(targetTaskId);
    }, 20);
  },

  async handleSlideSubmit(event) {
    if (event && event.preventDefault) event.preventDefault();

    const taskId = document.getElementById('slide-task-id').value;
    const isEdit = document.getElementById('slide-is-edit').value === 'true';
    const title = document.getElementById('slide-title').value.trim();
    const engineer = document.getElementById('slide-engineer').value;
    const category = document.getElementById('slide-category').value;
    const overview = document.getElementById('slide-overview').value.trim();
    const impactsRaw = document.getElementById('slide-impacts').value.trim();
    const yearly = parseFloat(document.getElementById('slide-calc-yearly').value) || 0;
    const onetime = parseFloat(document.getElementById('slide-calc-onetime').value) || 0;
    const monthly = parseFloat(document.getElementById('slide-calc-monthly').value) || 0;
    const carry1Year = document.getElementById('slide-carry-1year') ? document.getElementById('slide-carry-1year').checked : true;

    if (!title || monthly < 0) {
      alert("Please provide a valid title and monthly impact amount.");
      return;
    }

    const impacts = impactsRaw
      ? impactsRaw.split("\n").map(l => l.trim()).filter(Boolean)
      : ["Verified annual recurring financial cost saving", "Process optimization implemented and confirmed in regular production"];

    const all = this._loadEngineerEntries();
    const monthKey = this.selectedMonth.toUpperCase().trim();
    if (!Array.isArray(all[monthKey])) all[monthKey] = [];

    const existingIdx = all[monthKey].findIndex(e => String(e.task_id) === String(taskId) || (isEdit && String(e.id) === String(this.editingEntryId)));
    let photoUrl = this.getSlidePhoto(taskId) || "";
    if (!photoUrl && existingIdx !== -1) {
      const existingEntry = all[monthKey][existingIdx];
      photoUrl = (existingEntry.slideObj && (existingEntry.slideObj.photo_1 || existingEntry.slideObj.photo || existingEntry.slideObj.before_photo)) || existingEntry.photo || existingEntry.photo_1 || "";
    }

    const totYear1 = yearly + onetime;
    const useCustom = document.getElementById('slide-use-custom-highlight')?.checked;
    const customHighlight = (document.getElementById('slide-custom-highlight')?.value || '').trim();
    const defaultHighlight = `৳ ${monthly.toLocaleString()} / Mo (৳ ${totYear1.toLocaleString()} / Yr)`;
    const highlightStr = (useCustom && customHighlight) ? customHighlight : defaultHighlight;

    // 1. Build Isolated Slide Object (Stored in Cost Savings ONLY - Never touches MonthWorkbookManager tasks!)
    const slideObj = {
      task_id: taskId,
      task_name: title,
      slide_title: title,
      assignee: engineer,
      engineer: engineer,
      category: category || "Cost Savings",
      task_details: overview,
      overview: overview,
      description: overview,
      impact: impacts,
      impact_bullets: impacts,
      photo_1: photoUrl,
      before_photo: photoUrl,
      photo: photoUrl,
      is_cost_saving: true,
      cost_saving_monthly: monthly,
      cost_saving_yearly: yearly,
      cost_saving_onetime: onetime,
      cost_saving_amount: monthly,
      cost_saving_custom_highlight: useCustom ? customHighlight : "",
      cost_saving_highlight: highlightStr,
      savings: monthly,
      last_updated: new Date().toISOString()
    };

    // 2. Save into CostSavingsView initiatives list (isolated from Monthly Input)
    const entryData = {
      id: existingIdx !== -1 ? all[monthKey][existingIdx].id : ("cs_" + Date.now() + "_" + Math.floor(Math.random() * 1000)),
      task_id: taskId,
      has_slide: true,
      engineer: engineer,
      title: title,
      category: category || "Cost Savings",
      amount: monthly,
      yearly_amount: yearly,
      onetime_amount: onetime,
      cost_saving_custom_highlight: useCustom ? customHighlight : "",
      cost_saving_highlight: highlightStr,
      remarks: overview,
      photo: photoUrl,
      photo_1: photoUrl,
      slideObj: slideObj,
      last_updated: new Date().toISOString()
    };

    if (existingIdx !== -1) {
      all[monthKey][existingIdx] = { ...all[monthKey][existingIdx], ...entryData };
    } else {
      entryData.created_at = new Date().toISOString();
      all[monthKey].push(entryData);
    }
    this._saveEngineerEntries(all);

    // 3. Update CostSavingTracker & Carry forward for 1 full rolling year (12 calendar months)
    const newSum = all[monthKey].reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    if (typeof CostSavingTracker !== 'undefined' && CostSavingTracker.setMonthSaving) {
      CostSavingTracker.setMonthSaving(this.selectedMonth, newSum, this.selectedYear);
      if (carry1Year && monthly > 0) {
        this.apply1YearCarryover(monthly, this.selectedYear);
      }
    }

    // 4. Cloud sync to Firebase
    if (typeof FirebaseSyncService !== 'undefined') {
      if (FirebaseSyncService.broadcastCostSavingsUpdate) {
        FirebaseSyncService.broadcastCostSavingsUpdate(all);
      }
      if (FirebaseSyncService.broadcastCostTrackerUpdate && typeof CostSavingTracker !== 'undefined') {
        FirebaseSyncService.broadcastCostTrackerUpdate(CostSavingTracker._loadSavings());
      }
    }

    this.closeModal();
    if (typeof window.showToast === 'function') {
      window.showToast(`💰 Saved Cost Saving Slide: ${title}`, "success");
    }
    await this.render();
  },

  openAddModal(entryId = null) {
    this.editingEntryId = entryId;
    let container = document.getElementById('cost-savings-entry-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cost-savings-entry-modal-container';
      document.body.appendChild(container);
    }

    const engineers = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getEngineers)
      ? MasterDataManager.getEngineers()
      : ((typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.ENGINEERS) ? MASTER_LISTS.ENGINEERS : []);

    let entry = {
      engineer: engineers[0] ? engineers[0].display : "Sazzad (50463)",
      title: "",
      category: "Process Optimization",
      amount: "",
      yearly_amount: "",
      onetime_amount: "",
      remarks: ""
    };

    if (entryId) {
      const entries = this.getEntriesForMonth(this.selectedMonth);
      const found = entries.find(e => String(e.id) === String(entryId));
      if (found) entry = found;
    }

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
        <div class="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-800 flex flex-col max-h-[92vh] overflow-y-auto">
          
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
            <div class="flex items-center gap-3">
              <span class="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shadow-xs">
                💰
              </span>
              <div>
                <h3 class="text-base font-bold text-slate-800">${entryId ? 'Edit' : 'Add'} Engineer Cost Saving Entry</h3>
                <p class="text-xs text-slate-400 font-mono">Month: <span class="font-bold text-emerald-600">${this.selectedMonth}</span></p>
              </div>
            </div>
            <button onclick="CostSavingsView.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition">
              ✕
            </button>
          </div>

          <form onsubmit="CostSavingsView.handleFormSubmit(event)" class="space-y-4 pt-4 text-xs">
            <input type="hidden" id="entry-id" value="${entryId || ''}">

            <!-- Concern Engineer -->
            <div>
              <label class="block font-bold text-slate-700 mb-1">Concern Engineer *</label>
              <select id="entry-engineer" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500">
                ${engineers.map(e => `
                  <option value="${e.display}" ${entry.engineer === e.display || entry.engineer === e.name ? 'selected' : ''}>
                    ${e.display}
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Initiative Title -->
            <div>
              <label class="block font-bold text-slate-700 mb-1">Cost Saving Initiative / Project Title *</label>
              <input type="text" id="entry-title" required value="${HELPERS.escapeHtml(entry.title || '')}"
                     placeholder="e.g. Sheet metal thickness optimization for 1.5 Ton AC chassis"
                     class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 shadow-xs" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <!-- Category -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Category *</label>
                <select id="entry-category" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500">
                  ${this.CATEGORIES.map(c => `
                    <option value="${c}" ${entry.category === c ? 'selected' : ''}>${c}</option>
                  `).join('')}
                </select>
              </div>

              <!-- Cost Saving Amount (Monthly) -->
              <div>
                <label class="block font-bold text-emerald-900 mb-1">Monthly Saving Amount (BDT / ৳) *</label>
                <input type="number" id="entry-amount" required step="1" min="0" value="${entry.amount || ''}"
                       placeholder="e.g. 45000"
                       oninput="CostSavingsView.onCalcChange('monthly', 'entry')"
                       class="w-full bg-slate-50 border-2 border-emerald-400 rounded-xl px-3.5 py-2 text-xs font-mono font-black text-emerald-700 focus:outline-none focus:border-emerald-600 shadow-xs" />
              </div>
            </div>

            <!-- Calculation Helper Engine -->
            <div class="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2.5">
              <div class="flex items-center justify-between text-xs font-bold text-emerald-900">
                <span>⚡ Quick Calculation Helper (Optional)</span>
                <span class="text-[10px] text-emerald-700 font-normal">Formula: (Yearly + One-Time) ÷ 12</span>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[10px] font-bold text-slate-600 mb-0.5">Yearly Saving (BDT)</label>
                  <input type="number" id="entry-calc-yearly" value="${entry.yearly_amount || ''}" step="1" min="0" placeholder="e.g. 1200000"
                         oninput="CostSavingsView.onCalcChange('yearly', 'entry')"
                         class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-600 mb-0.5">One-Time Saving (BDT)</label>
                  <input type="number" id="entry-calc-onetime" value="${entry.onetime_amount || ''}" step="1" min="0" placeholder="e.g. 500000"
                         oninput="CostSavingsView.onCalcChange('onetime', 'entry')"
                         class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800" />
                </div>
              </div>
              <div id="entry-calc-summary" class="text-[10px] text-slate-500">
                Enter Yearly and/or One-Time values to automatically calculate Monthly Impact.
              </div>
              <div class="flex items-center gap-2 pt-1 border-t border-emerald-100">
                <input type="checkbox" id="entry-carry-1year" checked class="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                <label for="entry-carry-1year" class="text-[11px] font-bold text-slate-700 cursor-pointer">
                  Carry forward monthly value across all 12 calendar months (1 full year)
                </label>
              </div>
            </div>

            <!-- Remarks / Technical Details -->
            <div>
              <label class="block font-bold text-slate-700 mb-1">Technical Implementation Details / Remarks</label>
              <textarea id="entry-remarks" rows="2"
                        placeholder="e.g. Reduced scrap rate by 3.2% through stamping die realignment and scrap nesting optimization."
                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 resize-none shadow-xs">${HELPERS.escapeHtml(entry.remarks || '')}</textarea>
            </div>

            <div class="flex items-center justify-between pt-4 border-t border-slate-100 flex-shrink-0">
              <span class="text-[11px] text-slate-400">Values are stored per month and aggregated for executive presentation.</span>
              <div class="flex items-center gap-2">
                <button type="button" onclick="CostSavingsView.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition">Cancel</button>
                <button type="submit" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md shadow-emerald-200/50 transition flex items-center gap-1.5 cursor-pointer">
                  <span>💾</span> <span>Save Initiative</span>
                </button>
              </div>
            </div>
          </form>

        </div>
      </div>
    `;
  },

  closeModal() {
    const container = document.getElementById('cost-savings-entry-modal-container');
    if (container) container.innerHTML = '';
    this.editingEntryId = null;
  },

  async handleFormSubmit(event) {
    if (event && event.preventDefault) event.preventDefault();
    const idInput = document.getElementById('entry-id');
    const engineer = document.getElementById('entry-engineer').value;
    const title = document.getElementById('entry-title').value.trim();
    const category = document.getElementById('entry-category').value;
    const amount = parseFloat(document.getElementById('entry-amount').value) || 0;
    const yearlyAmount = parseFloat(document.getElementById('entry-calc-yearly')?.value) || 0;
    const onetimeAmount = parseFloat(document.getElementById('entry-calc-onetime')?.value) || 0;
    const carry1Year = document.getElementById('entry-carry-1year') ? document.getElementById('entry-carry-1year').checked : true;
    const remarks = document.getElementById('entry-remarks').value.trim();

    if (!title || amount < 0) {
      alert("Please provide a valid initiative title and cost saving amount.");
      return;
    }

    const all = this._loadEngineerEntries();
    const monthKey = this.selectedMonth.toUpperCase().trim();
    if (!Array.isArray(all[monthKey])) all[monthKey] = [];

    const isEdit = idInput && idInput.value;
    if (isEdit) {
      const idx = all[monthKey].findIndex(e => String(e.id) === String(idInput.value));
      if (idx !== -1) {
        all[monthKey][idx] = {
          ...all[monthKey][idx],
          engineer,
          title,
          category,
          amount,
          yearly_amount: yearlyAmount,
          onetime_amount: onetimeAmount,
          remarks,
          last_updated: new Date().toISOString()
        };
      }
    } else {
      all[monthKey].push({
        id: "cs_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        engineer,
        title,
        category,
        amount,
        yearly_amount: yearlyAmount,
        onetime_amount: onetimeAmount,
        remarks,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      });
    }

    this._saveEngineerEntries(all);

    // Auto update monthly total in CostSavingTracker
    const newSum = all[monthKey].reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    if (typeof CostSavingTracker !== 'undefined' && CostSavingTracker.setMonthSaving) {
      CostSavingTracker.setMonthSaving(this.selectedMonth, newSum, this.selectedYear);
      if (carry1Year && amount > 0) {
        this.apply1YearCarryover(amount, this.selectedYear);
      }
    }

    this.closeModal();
    if (typeof window.showToast === 'function') {
      window.showToast(`✅ ${isEdit ? 'Updated' : 'Added'} cost saving initiative for ${engineer}!`, "success");
    }
    await this.render();
  },

  async deleteEntry(entryId) {
    if (!confirm("Are you sure you want to delete this cost saving initiative?")) return;
    const all = this._loadEngineerEntries();
    const monthKey = this.selectedMonth.toUpperCase().trim();
    if (Array.isArray(all[monthKey])) {
      all[monthKey] = all[monthKey].filter(e => String(e.id) !== String(entryId));
      this._saveEngineerEntries(all);

      // Auto update monthly total
      const newSum = all[monthKey].reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      if (typeof CostSavingTracker !== 'undefined' && CostSavingTracker.setMonthSaving) {
        CostSavingTracker.setMonthSaving(this.selectedMonth, newSum, this.selectedYear);
      }

      if (typeof window.showToast === 'function') {
        window.showToast("Initiative deleted.", "info");
      }

      // Sync with Firebase
      if (typeof FirebaseSyncService !== 'undefined') {
        FirebaseSyncService.broadcastCostSavingsUpdate(all);
        if (typeof CostSavingTracker !== 'undefined') {
          FirebaseSyncService.broadcastCostTrackerUpdate(CostSavingTracker._loadSavings());
        }
      }

      await this.render();
    }
  },

  async deleteSlide(taskId) {
    if (!confirm("Are you sure you want to delete this Cost Saving presentation slide?")) return;
    const all = this._loadEngineerEntries();
    const monthKey = this.selectedMonth.toUpperCase().trim();
    if (Array.isArray(all[monthKey])) {
      all[monthKey] = all[monthKey].filter(e => String(e.task_id) !== String(taskId) && String(e.id) !== String(taskId));
      this._saveEngineerEntries(all);

      const newSum = all[monthKey].reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      if (typeof CostSavingTracker !== 'undefined' && CostSavingTracker.setMonthSaving) {
        CostSavingTracker.setMonthSaving(this.selectedMonth, newSum, this.selectedYear);
      }

      if (typeof FirebaseSyncService !== 'undefined') {
        FirebaseSyncService.broadcastCostSavingsUpdate(all);
        if (typeof CostSavingTracker !== 'undefined') {
          FirebaseSyncService.broadcastCostTrackerUpdate(CostSavingTracker._loadSavings());
        }
      }

      if (typeof window.showToast === 'function') {
        window.showToast("Cost Saving slide removed.", "info");
      }
      await this.render();
    }
  },

  previewSlideEntry(id) {
    const all = this._loadEngineerEntries();
    const monthKey = this.selectedMonth.toUpperCase().trim();
    const entries = Array.isArray(all[monthKey]) ? all[monthKey] : [];
    const item = entries.find(e => String(e.task_id) === String(id) || String(e.id) === String(id));
    if (!item) return;

    const monthlyAmt = parseFloat(item.amount) || parseFloat(item.slideObj?.cost_saving_monthly) || 0;
    const yearlyAmt = parseFloat(item.yearly_amount) || parseFloat(item.slideObj?.cost_saving_yearly) || (monthlyAmt * 12);
    const onetimeAmt = parseFloat(item.onetime_amount) || parseFloat(item.slideObj?.cost_saving_onetime) || 0;
    const totYear1 = yearlyAmt + onetimeAmt;
    const photo = item.slideObj?.photo_1 || item.slideObj?.photo || this.getSlidePhoto(item.task_id || item.id);
    const impacts = Array.isArray(item.slideObj?.impact) 
      ? item.slideObj.impact 
      : (Array.isArray(item.slideObj?.impact_bullets) 
          ? item.slideObj.impact_bullets 
          : ["Verified annual recurring financial cost saving", "Process optimization implemented and confirmed in regular production"]);

    const slideData = {
      task_id: item.task_id || item.id,
      month: this.selectedMonth,
      slide_title: item.title || item.slideObj?.slide_title || 'Cost Optimization Initiative',
      raw_task_name: item.title || item.slideObj?.slide_title || 'Cost Optimization Initiative',
      description: item.slideObj?.description || item.remarks || 'Process development cost optimization initiative.',
      impact: impacts,
      engineer: item.engineer || 'Concern Engineer',
      category: item.category || 'Cost Savings',
      photo_fit: 'blur',
      status: 'Completed',
      is_project: false,
      is_cost_saving: true,
      cost_saving_monthly: monthlyAmt,
      cost_saving_yearly: yearlyAmt,
      cost_saving_onetime: onetimeAmt,
      cost_saving_amount: monthlyAmt,
      cost_saving_custom_highlight: item.slideObj?.cost_saving_custom_highlight || item.cost_saving_custom_highlight || '',
      cost_saving_highlight: (item.slideObj?.cost_saving_custom_highlight || item.cost_saving_custom_highlight)
        ? (item.slideObj?.cost_saving_custom_highlight || item.cost_saving_custom_highlight)
        : `৳ ${monthlyAmt.toLocaleString()} / Mo (৳ ${totYear1.toLocaleString()} / Yr)`,
      savings: monthlyAmt,
      photo_before: photo,
      photo_after: null,
      photo: photo,
      has_dual_photo: false
    };

    if (typeof SlidePreviewModal !== 'undefined' && SlidePreviewModal.openSingle) {
      SlidePreviewModal.openSingle(slideData);
    }
  },

  openFullscreenSlide(id) {
    this.previewSlideEntry(id);
    if (typeof SlidePreviewModal !== 'undefined' && typeof SlidePreviewModal.toggleFullscreen === 'function') {
      SlidePreviewModal.toggleFullscreen();
    }
  },

  generateAiDescription(event) {
    if (event && event.preventDefault) event.preventDefault();
    const titleInput = document.getElementById('slide-title');
    const catSelect = document.getElementById('slide-category');
    const descArea = document.getElementById('slide-overview');
    if (!titleInput || !descArea) return;
    const title = titleInput.value.trim();
    if (!title) {
      if (typeof window.showToast === 'function') window.showToast("Please enter a slide title first to generate AI description!", "warning");
      titleInput.focus();
      return;
    }
    const cat = catSelect ? catSelect.value : "Cost Savings";
    let text = "";
    if (typeof PROMPT_TEMPLATES !== 'undefined' && typeof PROMPT_TEMPLATES.localFactualTransform === 'function') {
      const tr = PROMPT_TEMPLATES.localFactualTransform({ task_name: title, category: cat });
      text = tr.ai_description || `Engineered and executed process optimization for ${title}. Conducted industrial trial runs, verified tooling parameters, and established standardized operating procedures to achieve verified recurring cost savings.`;
    } else {
      text = `Engineered and executed process optimization for ${title}. Conducted industrial trial runs, verified tooling parameters, and established standardized operating procedures to achieve verified recurring cost savings.`;
    }
    descArea.value = text;
    const taskId = document.getElementById('slide-task-id')?.value;
    if (taskId) this.debouncedLiveSlidePreview(taskId);
    if (typeof window.showToast === 'function') window.showToast("✨ AI generated cost saving description!", "success");
  },

  generateAiImpact(event) {
    if (event && event.preventDefault) event.preventDefault();
    const titleInput = document.getElementById('slide-title');
    const catSelect = document.getElementById('slide-category');
    const impactArea = document.getElementById('slide-impacts');
    if (!titleInput || !impactArea) return;
    const title = titleInput.value.trim();
    if (!title) {
      if (typeof window.showToast === 'function') window.showToast("Please enter a slide title first to generate AI impact!", "warning");
      titleInput.focus();
      return;
    }
    const cat = catSelect ? catSelect.value : "Cost Savings";
    let bullets = [];
    if (typeof PROMPT_TEMPLATES !== 'undefined' && typeof PROMPT_TEMPLATES.localFactualTransform === 'function') {
      const tr = PROMPT_TEMPLATES.localFactualTransform({ task_name: title, category: cat });
      bullets = Array.isArray(tr.ai_impact) ? tr.ai_impact : [
        "Verified recurring financial cost saving validated by industrial engineering",
        "Streamlined manufacturing process with zero compromise on quality and cooling performance",
        "Standardized production parameters and updated technical operational SOP"
      ];
    } else {
      bullets = [
        "Verified recurring financial cost saving validated by industrial engineering",
        "Streamlined manufacturing process with zero compromise on quality and cooling performance",
        "Standardized production parameters and updated technical operational SOP"
      ];
    }
    impactArea.value = bullets.join("\n");
    const taskId = document.getElementById('slide-task-id')?.value;
    if (taskId) this.debouncedLiveSlidePreview(taskId);
    if (typeof window.showToast === 'function') window.showToast("✨ AI generated key impact bullets!", "success");
  },

  toggleFullscreenPreview(taskId) {
    const title = (document.getElementById('slide-title')?.value || '').trim() || 'Cost Optimization Initiative';
    const engineer = (document.getElementById('slide-engineer')?.value || 'Concern Engineer').trim();
    const category = (document.getElementById('slide-category')?.value || 'Cost Savings').trim();
    const overview = (document.getElementById('slide-overview')?.value || '').trim();
    const impactsRaw = (document.getElementById('slide-impacts')?.value || '').trim();
    const impacts = impactsRaw ? impactsRaw.split('\n').map(l => l.trim()).filter(Boolean) : [];
    const monthly = parseFloat(document.getElementById('slide-calc-monthly')?.value) || 0;
    const yearly = parseFloat(document.getElementById('slide-calc-yearly')?.value) || 0;
    const onetime = parseFloat(document.getElementById('slide-calc-onetime')?.value) || 0;
    const totYear1 = yearly + onetime;
    const useCustom = document.getElementById('slide-use-custom-highlight')?.checked;
    const customHighlight = (document.getElementById('slide-custom-highlight')?.value || '').trim();
    const calcHighlight = monthly > 0 ? `৳ ${monthly.toLocaleString()} / Mo (৳ ${totYear1.toLocaleString()} / Yr)` : '';
    const highlightStr = (useCustom && customHighlight) ? customHighlight : calcHighlight;
    const photoUrl = this.getSlidePhoto(taskId) || null;

    const slideData = {
      task_id: taskId,
      month: this.selectedMonth,
      slide_title: title,
      raw_task_name: title,
      description: overview,
      impact: impacts,
      engineer: engineer,
      category: category,
      photo_fit: 'blur',
      status: 'Completed',
      is_project: false,
      is_cost_saving: true,
      cost_saving_monthly: monthly,
      cost_saving_yearly: yearly,
      cost_saving_onetime: onetime,
      cost_saving_amount: monthly,
      cost_saving_highlight: highlightStr,
      savings: monthly,
      photo_before: photoUrl,
      photo_after: null,
      photo: photoUrl,
      has_dual_photo: false
    };

    if (typeof SlidePreviewModal !== 'undefined' && SlidePreviewModal.openSingle) {
      SlidePreviewModal.openSingle(slideData);
      if (typeof SlidePreviewModal.toggleFullscreen === 'function') {
        SlidePreviewModal.toggleFullscreen();
      }
    }
  },

  async updateMonthValue(monthCode, value) {
    const num = Math.max(0, parseFloat(value) || 0);
    const year = (typeof CostSavingTracker !== 'undefined' && CostSavingTracker.extractYear)
      ? CostSavingTracker.extractYear(monthCode)
      : this.selectedYear;
    
    if (typeof CostSavingTracker !== 'undefined' && CostSavingTracker.setMonthSaving) {
      CostSavingTracker.setMonthSaving(monthCode, num, year);
    }
    
    if (typeof FirebaseSyncService !== 'undefined') {
      if (typeof CostSavingTracker !== 'undefined') {
        FirebaseSyncService.broadcastCostTrackerUpdate(CostSavingTracker._loadSavings());
      }
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`💰 Updated ${monthCode} Cost Saving: ৳ ${num.toLocaleString()} BDT`, "success");
    }

    await this.render();
  },

  async render(containerId = 'cost-savings-view-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const workbookMgr = window.appState && window.appState.workbookMgr
      ? window.appState.workbookMgr
      : new MonthWorkbookManager();

    const months = workbookMgr.getAllMonths();
    const month = this.selectedMonth;
    const year = this.selectedYear;

    const engineers = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getEngineers)
      ? MasterDataManager.getEngineers()
      : ((typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.ENGINEERS) ? MASTER_LISTS.ENGINEERS : []);

    const allEntries = this.getEntriesForMonth(month);
    const slideEntries = allEntries.filter(e => e.has_slide || e.slideObj || (e.amount && parseFloat(e.amount) > 0));
    const filteredEntries = this.activeFilterEngineer
      ? allEntries.filter(e => (e.engineer || '').includes(this.activeFilterEngineer))
      : allEntries;

    const engineerSum = this.getEngineerSum(month);
    const monthTotal = this.getMonthTotal(month);

    // Calculate YTD cumulative for the year
    let cumulativeYTD = 0;
    const monthlySummary = [];
    const monthCodes = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    monthCodes.forEach(code => {
      const mCode = `${code}-${year}`;
      const amt = (typeof CostSavingTracker !== 'undefined' && CostSavingTracker.getMonthSaving)
        ? CostSavingTracker.getMonthSaving(mCode, year)
        : 0;
      cumulativeYTD += amt;
      monthlySummary.push({
        code: mCode,
        short: code,
        amount: amt,
        isCurrent: mCode === month
      });
    });

    // Identify Top Contributing Engineer this month
    const engineerTotals = {};
    allEntries.forEach(e => {
      const eng = e.engineer || 'Unassigned';
      engineerTotals[eng] = (engineerTotals[eng] || 0) + (parseFloat(e.amount) || 0);
    });

    let topEngName = "None";
    let topEngAmount = 0;
    Object.entries(engineerTotals).forEach(([name, amt]) => {
      if (amt > topEngAmount) {
        topEngAmount = amt;
        topEngName = name;
      }
    });

    container.innerHTML = `
      <div class="space-y-6 animate-fade-in pb-12">

        <!-- Top Executive Header Banner -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/25 flex-shrink-0">
              💰
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                  FINANCIAL IMPACT HUB
                </span>
                <span class="text-xs font-mono font-bold text-slate-500">${month}</span>
              </div>
              <h2 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">Cost Savings &amp; Process Optimization</h2>
              <p class="text-xs text-slate-500 mt-0.5">Walton AC Process Development &bull; Track engineer-wise cost reductions, material optimizations &amp; annual fiscal impact.</p>
            </div>
          </div>

          <!-- Controls: Month & Year Selector & Action Buttons -->
          <div class="flex flex-wrap items-center gap-3">
            <!-- Month Selector -->
            <div>
              ${HELPERS.renderMonthSelectorUI(months, this.selectedMonth, 'CostSavingsView.handleMonthChange', 'MonthlyInputView.openAddMonthModal')}
            </div>

            <!-- Year Selector -->
            <div class="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl px-3 py-1.5 shadow-xs">
              <span class="text-xs font-bold text-slate-500">Year:</span>
              <select onchange="CostSavingsView.handleYearChange(this.value)" class="bg-transparent text-xs font-mono font-bold text-slate-800 focus:outline-none cursor-pointer">
                <option value="2026" ${year === 2026 ? 'selected' : ''}>2026</option>
                <option value="2025" ${year === 2025 ? 'selected' : ''}>2025</option>
                <option value="2027" ${year === 2027 ? 'selected' : ''}>2027</option>
              </select>
            </div>

            <!-- Add Cost Saving Slide Button -->
            <button onclick="CostSavingsView.openAddSlideModal()" class="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black shadow-md shadow-emerald-500/25 transition cursor-pointer">
              <span>📊</span>
              <span>Add Cost Saving Slide</span>
            </button>

            <!-- Add Entry Button -->
            <button onclick="CostSavingsView.openAddModal()" class="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/25 transition cursor-pointer">
              <span>➕</span>
              <span>Add Engineer Saving</span>
            </button>
          </div>
        </div>

        <!-- 4 Executive KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- KPI 1: Month Total -->
          <div class="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">${month} Savings</span>
              <span class="p-2 rounded-xl bg-emerald-50 text-emerald-600 text-sm">৳</span>
            </div>
            <div class="mt-3">
              <div class="text-2xl font-black text-slate-900 font-mono tracking-tight">৳ ${monthTotal.toLocaleString()}</div>
              <div class="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                <span>Sum of initiatives: ৳ ${engineerSum.toLocaleString()}</span>
                ${monthTotal !== engineerSum ? `
                  <button onclick="CostSavingsView.syncFromEngineerSum()" title="Sync total from initiatives" class="text-emerald-600 font-bold hover:underline">Sync</button>
                ` : '<span class="text-emerald-600 font-bold">✓ Synced</span>'}
              </div>
            </div>
          </div>

          <!-- KPI 2: Annual Cumulative YTD -->
          <div class="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">YTD Cumulative (${year})</span>
              <span class="p-2 rounded-xl bg-blue-50 text-blue-600 text-sm">📈</span>
            </div>
            <div class="mt-3">
              <div class="text-2xl font-black text-blue-600 font-mono tracking-tight">৳ ${cumulativeYTD.toLocaleString()}</div>
              <div class="text-[11px] text-slate-400 mt-1">Aggregated across all 12 calendar months</div>
            </div>
          </div>

          <!-- KPI 3: Top Performer -->
          <div class="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Top Contributing Engineer</span>
              <span class="p-2 rounded-xl bg-amber-50 text-amber-600 text-sm">🏆</span>
            </div>
            <div class="mt-3">
              <div class="text-lg font-black text-slate-800 truncate" title="${topEngName}">${topEngName}</div>
              <div class="text-[11px] font-mono font-bold text-emerald-600 mt-1">৳ ${topEngAmount.toLocaleString()} BDT impact</div>
            </div>
          </div>

          <!-- KPI 4: Total Initiatives -->
          <div class="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Recorded Initiatives</span>
              <span class="p-2 rounded-xl bg-purple-50 text-purple-600 text-sm">🎯</span>
            </div>
            <div class="mt-3">
              <div class="text-2xl font-black text-purple-600 font-mono tracking-tight">${allEntries.length}</div>
              <div class="text-[11px] text-slate-400 mt-1">
                ${allEntries.length > 0 ? `Avg. ৳ ${Math.round(monthTotal / allEntries.length).toLocaleString()} / initiative` : 'No initiatives recorded'}
              </div>
            </div>
          </div>
        </div>

        <!-- Month Total Direct Adjustment & Departmental Setting -->
        <div class="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="text-xl">⚙️</span>
            <div>
              <h4 class="text-xs font-bold text-slate-800">Monthly Departmental Saving Control (${month})</h4>
              <p class="text-[11px] text-slate-500">You can override or manually set the official departmental total for monthly slide reports, or auto-sync it with engineer submissions.</p>
            </div>
          </div>
          <form onsubmit="CostSavingsView.saveMonthTotalManual(event)" class="flex items-center gap-2 w-full sm:w-auto">
            <div class="relative flex-1 sm:w-48">
              <span class="absolute left-3 top-2 text-slate-400 text-xs font-bold">৳</span>
              <input type="number" id="manual-month-total-input" value="${monthTotal}" min="0" step="1"
                     class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-xs" />
            </div>
            <button type="submit" class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs">
              Save Total
            </button>
            <button type="button" onclick="CostSavingsView.syncFromEngineerSum()" title="Set as Sum of Engineer Initiatives" class="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition">
              Use Sum (৳ ${engineerSum.toLocaleString()})
            </button>
          </form>
        </div>

        <!-- AC PROCESS WORKSHOP COST SAVING REPORT (EXCEL INPUT & 16:9 SLIDE GENERATOR) - IMAGES 2 & 3 -->
        ${this.renderWorkshopCostingSection(month)}

        <!-- Cost Saving Presentation Slides Section (Requirement 9: live preview cards like monthly input) -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-sm shadow-sm">
                  📊
                </span>
                <h3 class="text-base font-bold text-slate-800">
                  Cost Saving Presentation Slides (${month})
                </h3>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ${slideEntries.length} ${slideEntries.length === 1 ? 'Slide' : 'Slides'}
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-1">
                High-impact financial presentation slides with Walton emerald styling and verified cost savings.
              </p>
            </div>
            
            <div class="flex items-center gap-2.5">
              <button onclick="CostSavingsView.openAddSlideModal()" 
                      class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer">
                <span>➕</span> <span>Add Cost Saving Slide</span>
              </button>
            </div>
          </div>

          ${slideEntries.length === 0 ? `
            <div class="py-10 border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50/20 flex flex-col items-center justify-center text-center p-6 my-4">
              <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mb-2.5 shadow-inner">
                💰
              </div>
              <div class="text-sm font-bold text-slate-800">No Cost Saving Presentation Slides for ${month}</div>
              <p class="text-xs text-slate-500 max-w-md mt-1">
                Create a dedicated 16:9 cost optimization slide with before/after photos and verified savings.
              </p>
              <button onclick="CostSavingsView.openAddSlideModal()" 
                      class="mt-3.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow">
                <span>➕</span> <span>Create Slide Now</span>
              </button>
            </div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-5">
              ${slideEntries.map((item, sIdx) => {
                const photo = item.slideObj?.photo_1 || item.slideObj?.photo || this.getSlidePhoto(item.task_id || item.id);
                const monthlyAmt = parseFloat(item.amount) || parseFloat(item.slideObj?.cost_saving_monthly) || 0;
                const yearlyAmt = parseFloat(item.yearly_amount) || parseFloat(item.slideObj?.cost_saving_yearly) || (monthlyAmt * 12);
                const onetimeAmt = parseFloat(item.onetime_amount) || parseFloat(item.slideObj?.cost_saving_onetime) || 0;
                const totYear1 = yearlyAmt + onetimeAmt;
                const descText = item.slideObj?.description || item.remarks || item.slideObj?.overview || 'Process development cost optimization initiative.';

                return `
                <div class="bg-gradient-to-b from-white to-slate-50/60 border-2 border-emerald-300/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
                  <div>
                    <!-- Header bar of card -->
                    <div class="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <span class="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                        Slide #${sIdx + 1} &bull; Cost Saving
                      </span>
                      <span class="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold text-xs">
                        ৳ ${monthlyAmt.toLocaleString()} / Mo
                      </span>
                    </div>

                    <!-- 16:9 Thumbnail / Photo Preview -->
                    <div class="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 my-3 border border-slate-200 shadow-inner flex items-center justify-center">
                      ${photo ? `
                        <img src="${photo}" alt="" class="absolute inset-0 w-full h-full object-cover filter blur-sm brightness-50 opacity-60" />
                        <img src="${photo}" alt="Slide Photo" class="relative z-10 max-w-full max-h-full object-contain" />
                      ` : `
                        <div class="flex flex-col items-center justify-center p-3 text-center text-slate-500">
                          <span class="text-3xl text-emerald-400 mb-1">💰</span>
                          <span class="text-[11px] font-bold text-slate-300">Walton Cost Optimization</span>
                          <span class="text-[9.5px] text-slate-500">16:9 Presentation Ready</span>
                        </div>
                      `}
                      <div class="absolute bottom-2 left-2 z-20 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold font-mono">
                        ${HELPERS.escapeHtml(item.engineer || 'Concern Engineer')}
                      </div>
                    </div>

                    <!-- Title & Category -->
                    <h4 class="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition line-clamp-2 leading-snug">
                      ${HELPERS.escapeHtml(item.title || item.slideObj?.slide_title || 'Untitled Initiative')}
                    </h4>
                    <div class="text-[11px] font-semibold text-emerald-700 mt-1">
                      ${HELPERS.escapeHtml(item.category || 'Cost Savings')}
                    </div>

                    <!-- Financial Summary Pill -->
                    <div class="mt-2.5 p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs">
                      <span class="text-slate-600 font-medium">Year 1 Total:</span>
                      <span class="font-mono font-extrabold text-emerald-800">৳ ${totYear1.toLocaleString()} BDT</span>
                    </div>

                    <!-- Description excerpt -->
                    <p class="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      ${HELPERS.escapeHtml(descText)}
                    </p>
                  </div>

                  <!-- Card Actions -->
                  <div class="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div class="flex items-center gap-1.5">
                      <button onclick="CostSavingsView.previewSlideEntry('${item.task_id || item.id}')"
                              class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer" title="Preview Slide">
                        <span>👁️</span> <span>Preview</span>
                      </button>
                      <button onclick="CostSavingsView.openFullscreenSlide('${item.task_id || item.id}')"
                              class="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer" title="Fullscreen Presentation Preview">
                        <span>⛶</span>
                      </button>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <button onclick="CostSavingsView.openAddSlideModal('${item.task_id || item.id}')"
                              class="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                        <span>✏️</span> <span>Edit</span>
                      </button>
                      <button onclick="CostSavingsView.deleteSlide('${item.task_id || item.id}')"
                              class="p-1.5 rounded-xl hover:bg-rose-50 text-rose-600 text-xs transition cursor-pointer" title="Delete Slide">
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Main Content Grid: Engineer Table & Contribution Visuals -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Column 1 & 2: Engineer Initiatives Table (2 cols) -->
          <div class="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <!-- Table Header & Filter Bar -->
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span>👨‍💼</span>
                    <span>Engineer-Wise Cost Saving Initiatives</span>
                  </h3>
                  <p class="text-xs text-slate-400 mt-0.5">Individual engineering contributions recorded for <span class="font-bold text-slate-600">${month}</span></p>
                </div>

                <!-- Engineer Filter -->
                <div class="flex items-center gap-2">
                  <span class="text-xs font-medium text-slate-400">Filter:</span>
                  <select onchange="CostSavingsView.handleEngineerFilter(this.value)" class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500">
                    <option value="">All Personnel (${allEntries.length})</option>
                    ${engineers.map(e => `
                      <option value="${e.name}" ${this.activeFilterEngineer === e.name ? 'selected' : ''}>
                        ${e.display}
                      </option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <!-- Table Container -->
              <div class="overflow-x-auto mt-4">
                <table class="w-full text-left text-xs text-slate-600">
                  <thead class="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th class="py-3 px-3 w-10 text-center">#</th>
                      <th class="py-3 px-3 min-w-[130px]">Engineer</th>
                      <th class="py-3 px-3 min-w-[200px]">Initiative Title &amp; Details</th>
                      <th class="py-3 px-3 min-w-[120px]">Category</th>
                      <th class="py-3 px-3 text-right min-w-[100px]">Impact (BDT)</th>
                      <th class="py-3 px-3 text-center w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${filteredEntries.length === 0 ? `
                      <tr>
                        <td colspan="6" class="py-12 text-center text-slate-400">
                          <div class="flex flex-col items-center justify-center">
                            <span class="text-3xl mb-2">💡</span>
                            <span class="font-medium">No engineer cost saving initiatives recorded for ${month}.</span>
                            <span class="text-[11px] text-slate-400 mt-0.5">Click "+ Add Engineer Saving" above to record individual achievements.</span>
                          </div>
                        </td>
                      </tr>
                    ` : filteredEntries.map((item, idx) => `
                      <tr class="hover:bg-slate-50/60 transition group">
                        <td class="py-3 px-3 text-center font-mono text-slate-400">${idx + 1}</td>
                        <td class="py-3 px-3 font-semibold text-slate-800">
                          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px]">
                            <span>👤</span>
                            <span>${HELPERS.escapeHtml(item.engineer || 'Unassigned')}</span>
                          </span>
                        </td>
                        <td class="py-3 px-3">
                          <div class="flex items-center gap-1.5">
                            <span class="font-bold text-slate-800">${HELPERS.escapeHtml(item.title || '')}</span>
                            ${(item.has_slide || item.task_id) ? `
                              <span class="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                📊 Deck Slide
                              </span>
                            ` : ''}
                          </div>
                          ${item.remarks ? `<div class="text-[11px] text-slate-400 mt-0.5 line-clamp-2">${HELPERS.escapeHtml(item.remarks)}</div>` : ''}
                        </td>
                        <td class="py-3 px-3">
                          <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ${HELPERS.escapeHtml(item.category || 'General')}
                          </span>
                        </td>
                        <td class="py-3 px-3 text-right font-mono font-bold text-emerald-600 text-sm">
                          ৳ ${(parseFloat(item.amount) || 0).toLocaleString()}
                        </td>
                        <td class="py-3 px-3 text-center">
                          <div class="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
                            ${(item.has_slide || item.task_id) ? `
                              <button onclick="CostSavingsView.openAddSlideModal('${item.task_id || item.id}')" title="Edit Presentation Slide" class="p-1 rounded-lg hover:bg-emerald-50 text-emerald-600 text-xs">
                                📊
                              </button>
                            ` : ''}
                            <button onclick="CostSavingsView.openAddModal('${item.id}')" title="Edit Initiative" class="p-1 rounded-lg hover:bg-slate-200 text-slate-600 text-xs">
                              ✏️
                            </button>
                            <button onclick="CostSavingsView.deleteEntry('${item.id}')" title="Delete Initiative" class="p-1 rounded-lg hover:bg-red-50 text-red-600 text-xs">
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Table Footer -->
            <div class="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Showing ${filteredEntries.length} initiative(s)</span>
              <span class="font-mono font-bold text-slate-700">Subtotal: ৳ ${filteredEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0).toLocaleString()} BDT</span>
            </div>
          </div>

          <!-- Column 3: Engineer Contribution Bars & Analytics (1 col) -->
          <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div class="pb-4 border-b border-slate-100">
                <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>📊</span>
                  <span>Contribution Breakdown</span>
                </h3>
                <p class="text-xs text-slate-400 mt-0.5">Share of monthly savings by engineer</p>
              </div>

              <div class="space-y-4 mt-5">
                ${Object.keys(engineerTotals).length === 0 ? `
                  <div class="py-12 text-center text-slate-400 text-xs">
                    No contributions recorded this month.
                  </div>
                ` : Object.entries(engineerTotals).sort((a, b) => b[1] - a[1]).map(([name, amt]) => {
                  const pct = monthTotal > 0 ? Math.round((amt / monthTotal) * 100) : 0;
                  return `
                    <div>
                      <div class="flex items-center justify-between text-xs font-semibold mb-1">
                        <span class="text-slate-700">${HELPERS.escapeHtml(name)}</span>
                        <span class="font-mono font-bold text-emerald-600">৳ ${amt.toLocaleString()} (${pct}%)</span>
                      </div>
                      <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-500" style="width: ${Math.min(pct, 100)}%"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Quick Tip Box -->
            <div class="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 text-xs">
              <div class="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                <span>💡</span> <span>Slide Integration</span>
              </div>
              <p class="text-[11px] text-slate-500 leading-relaxed">
                Cost saving figures are automatically injected into the Executive Management Presentation deck under Section 07 (Cost Saving).
              </p>
            </div>
          </div>

        </div>

        <!-- 12-Month Annual Fiscal Breakdown Grid -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>📅</span>
                <span>Annual Cost Saving Timeline (${year})</span>
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">Click any month to view or input engineer savings for that period</p>
            </div>
            <span class="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Total ${year}: ৳ ${cumulativeYTD.toLocaleString()}
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 mt-5">
            ${monthlySummary.map(m => `
              <div class="p-3.5 rounded-2xl border ${m.isCurrent ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-sm' : 'border-slate-200/90 bg-white hover:border-slate-300'} transition shadow-xs flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-black ${m.isCurrent ? 'text-emerald-800' : 'text-slate-800'}">${m.short}</span>
                    ${m.isCurrent ? '<span class="px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase bg-emerald-600 text-white">Active</span>' : ''}
                  </div>
                  <div class="space-y-1">
                    <label class="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Savings Value (BDT)</label>
                    <div class="relative">
                      <span class="absolute left-2.5 top-2 text-xs text-slate-400 font-mono font-bold">৳</span>
                      <input type="number" 
                             value="${m.amount || 0}" 
                             step="1000"
                             min="0"
                             placeholder="0"
                             onfocus="event.stopPropagation()"
                             onclick="event.stopPropagation()"
                             onchange="CostSavingsView.updateMonthValue('${m.code}', this.value)"
                             class="w-full pl-6 pr-2 py-1.5 bg-slate-50 hover:bg-white focus:bg-white text-xs font-mono font-black text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition shadow-2xs" />
                    </div>
                  </div>
                </div>
                <div class="mt-3 pt-2 border-t ${m.isCurrent ? 'border-emerald-200/60' : 'border-slate-100'} flex items-center justify-between text-[10px]">
                  <button type="button" onclick="CostSavingsView.handleMonthChange('${m.code}')" class="font-bold text-emerald-700 hover:text-emerald-900 transition flex items-center gap-1 cursor-pointer">
                    <span>View Month</span> <span>→</span>
                  </button>
                  <span class="text-slate-400 font-mono font-semibold">${(m.amount / 100000).toFixed(1)}L</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  },

  // =========================================================================
  // AC PROCESS WORKSHOP COST SAVING REPORT (EXCEL INPUT & 16:9 SLIDE ENGINE)
  // =========================================================================

  _workshopDraftItems: null,
  _workshopDraftMonth: null,

  getWorkshopItems(month) {
    const m = month || this.selectedMonth;
    if (this._workshopDraftItems && this._workshopDraftMonth === m) {
      return this._workshopDraftItems;
    }
    const data = (typeof WorkshopCostManager !== 'undefined') ? WorkshopCostManager.getWorkshopData(m) : { items: [] };
    this._workshopDraftMonth = m;
    this._workshopDraftItems = (data && Array.isArray(data.items)) ? [...data.items] : [];
    return this._workshopDraftItems;
  },

  renderWorkshopCostingSection(month) {
    const items = this.getWorkshopItems(month);
    const stats = (typeof WorkshopCostManager !== 'undefined')
      ? WorkshopCostManager.calculateStats(items, month)
      : { totalCostSaving: 0, totalWorks: 0, totalQty: 0, avgCostSaving: 0, top5Pct: "0%" };
    const monthDisplay = (typeof WorkshopCostManager !== 'undefined')
      ? WorkshopCostManager.formatMonthDisplayName(month)
      : month;

    return `
      <!-- DEDICATED WORKSHOP COST SAVING REPORT (EXCEL INPUT & 16:9 SLIDE GENERATOR) -->
      <div class="bg-white border-2 border-emerald-400/80 rounded-3xl p-6 shadow-xs space-y-5" id="workshop-costing-hub">
        
        <!-- Header banner -->
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-lg shadow-sm">
                🛠️
              </span>
              <h3 class="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                AC Process Workshop Cost Saving Report &bull; Excel Input &amp; 16:9 Slide Generator
              </h3>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                ${monthDisplay}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Input or paste monthly Excel data (Work Name, QTY, Per Price, Total Price, Category) to auto-generate the 16:9 landscape presentation slide (Image 2 format) positioned right before Top 5 Summary in the deck.
            </p>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center gap-2 flex-wrap">
            <button type="button" onclick="CostSavingsView.toggleWorkshopPasteBox()" class="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs">
              <span>📋</span> <span>Paste from Excel</span>
            </button>
            <button type="button" onclick="CostSavingsView.addWorkshopRow()" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
              <span>➕</span> <span>Add Row</span>
            </button>
            <button type="button" onclick="CostSavingsView.loadAugustSampleData()" class="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs" title="Load Reference August 2026 Excel Data">
              <span>✨</span> <span>Load Sample Data</span>
            </button>
            <button type="button" onclick="CostSavingsView.clearWorkshopData()" class="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition flex items-center gap-1 cursor-pointer" title="Clear all rows">
              <span>🗑️</span>
            </button>
            <button type="button" onclick="CostSavingsView.saveWorkshopData()" class="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black shadow-md shadow-emerald-500/25 transition flex items-center gap-1 cursor-pointer active:scale-95">
              <span>💾</span> <span>Save &amp; Generate Slide</span>
            </button>
          </div>
        </div>

        <!-- 5 Live Summary Badges -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-gradient-to-r from-emerald-50/50 via-slate-50 to-teal-50/50 p-3 rounded-2xl border border-slate-200">
          <div class="p-2">
            <div class="text-[10px] font-bold text-slate-500 uppercase">Total Saving</div>
            <div class="text-lg font-black text-emerald-700 font-mono">৳${stats.totalCostSaving.toLocaleString()}</div>
          </div>
          <div class="p-2">
            <div class="text-[10px] font-bold text-slate-500 uppercase">Amount of Work</div>
            <div class="text-lg font-black text-slate-800">${stats.totalWorks} Works</div>
          </div>
          <div class="p-2">
            <div class="text-[10px] font-bold text-slate-500 uppercase">Total Quantity</div>
            <div class="text-lg font-black text-orange-600">${stats.totalQty} Units</div>
          </div>
          <div class="p-2">
            <div class="text-[10px] font-bold text-slate-500 uppercase">Avg Saving / Work</div>
            <div class="text-lg font-black text-purple-700 font-mono">৳${stats.avgCostSaving.toLocaleString()}</div>
          </div>
          <div class="p-2">
            <div class="text-[10px] font-bold text-slate-500 uppercase">Top 5 Contribution</div>
            <div class="text-lg font-black text-blue-700 font-mono">${stats.top5Pct}</div>
          </div>
        </div>

        <!-- Collapsible Excel Raw Paste Box -->
        <div id="workshop-excel-paste-box" class="hidden p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2.5">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <span>📋</span> <span>Paste Excel Cells Directly Here (Tab-Separated or CSV):</span>
            </label>
            <span class="text-[10.5px] text-blue-700 font-mono">Columns: Work Name | QTY | Per Price | Total Price | Category</span>
          </div>
          <textarea id="workshop-raw-paste-input" rows="5" placeholder="Copy rows directly from Excel and paste here (Ctrl+V)...&#10;e.g.&#10;9J - 0101 Short Pcies &amp; Y Joint Brazing Fixture Development	1	1134	1134	Small Fixture&#10;Hole Development Tools For Capillary Tube &amp; Brash Distributor	1	486	486	Others Work"
                    class="w-full bg-white border border-blue-300 rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner leading-relaxed"></textarea>
          <div class="flex items-center justify-between">
            <button type="button" onclick="CostSavingsView.handlePasteClipboardButton()" class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-blue-300 text-blue-700 font-bold text-xs shadow-2xs cursor-pointer flex items-center gap-1">
              <span>📋</span> <span>Paste from Clipboard</span>
            </button>
            <div class="flex items-center gap-2">
              <button type="button" onclick="CostSavingsView.toggleWorkshopPasteBox(false)" class="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer">
                Cancel
              </button>
              <button type="button" onclick="CostSavingsView.importExcelPasteContent()" class="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow cursor-pointer flex items-center gap-1">
                <span>📥</span> <span>Import into Table</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Interactive Table Editor -->
        <div class="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div class="max-h-[380px] overflow-y-auto">
            <table class="w-full text-left text-xs text-slate-700 border-collapse" id="workshop-items-table">
              <thead class="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th class="py-2.5 px-3 w-10 text-center">#</th>
                  <th class="py-2.5 px-3 min-w-[280px]">Work Name / Initiative</th>
                  <th class="py-2.5 px-3 w-40">Category</th>
                  <th class="py-2.5 px-3 w-20 text-right">QTY</th>
                  <th class="py-2.5 px-3 w-28 text-right">Per Price (৳)</th>
                  <th class="py-2.5 px-3 w-28 text-right">Total Price (৳)</th>
                  <th class="py-2.5 px-3 w-16 text-center">Del</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white" id="workshop-table-body">
                ${items.length === 0 ? `
                  <tr>
                    <td colspan="7" class="py-10 text-center text-slate-400">
                      <div class="flex flex-col items-center justify-center">
                        <span class="text-3xl mb-1.5">📑</span>
                        <span class="font-bold text-slate-700">No Workshop Costing Items Recorded for ${monthDisplay}</span>
                        <span class="text-xs text-slate-400 mt-0.5">Click "Paste from Excel" or "Load Sample Data" above to generate the slide.</span>
                      </div>
                    </td>
                  </tr>
                ` : items.map((item, i) => `
                  <tr class="hover:bg-slate-50/80 transition">
                    <td class="py-1 px-2 text-center font-mono text-slate-400 font-bold">${i + 1}</td>
                    <td class="py-1 px-2">
                      <input type="text" value="${HELPERS.escapeHtml(item.work_name || '')}" oninput="CostSavingsView.updateWorkshopRowField(${i}, 'work_name', this.value)" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500" placeholder="Work name..." />
                    </td>
                    <td class="py-1 px-2">
                      <input type="text" list="workshop-cat-list" value="${HELPERS.escapeHtml(item.category || 'Others Work')}" oninput="CostSavingsView.updateWorkshopRowField(${i}, 'category', this.value)" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500" />
                    </td>
                    <td class="py-1 px-2 text-right">
                      <input type="number" min="1" step="1" value="${item.qty || 1}" oninput="CostSavingsView.updateWorkshopRowField(${i}, 'qty', this.value)" class="w-16 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500" />
                    </td>
                    <td class="py-1 px-2 text-right">
                      <input type="number" min="0" step="1" value="${item.per_price || 0}" oninput="CostSavingsView.updateWorkshopRowField(${i}, 'per_price', this.value)" class="w-24 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500" />
                    </td>
                    <td class="py-1 px-2 text-right">
                      <input type="number" min="0" step="1" value="${item.total_price || 0}" oninput="CostSavingsView.updateWorkshopRowField(${i}, 'total_price', this.value)" class="w-24 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-black text-emerald-700 focus:bg-white focus:outline-none focus:border-blue-500" />
                    </td>
                    <td class="py-1 px-2 text-center">
                      <button type="button" onclick="CostSavingsView.deleteWorkshopRow(${i})" class="p-1 rounded text-rose-500 hover:bg-rose-50 text-xs font-bold cursor-pointer" title="Delete Row">🗑️</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <datalist id="workshop-cat-list">
            <option value="Box">
            <option value="Assembly Support">
            <option value="Carton Section">
            <option value="Small Fixture">
            <option value="Trolley">
            <option value="Stand">
            <option value="Others Work">
            <option value="Chair">
            <option value="Table">
          </datalist>

          <div class="bg-slate-50 px-3 py-2 border-t border-slate-200 flex items-center justify-between text-xs">
            <button type="button" onclick="CostSavingsView.addWorkshopRow()" class="px-3 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer">
              <span>➕</span> <span>Add Item</span>
            </button>
            <div class="flex items-center gap-3 font-bold font-mono">
              <span>Total Qty: <strong class="text-orange-600">${stats.totalQty}</strong></span>
              <span>&bull;</span>
              <span>Grand Total: <strong class="text-emerald-700 text-sm">৳${stats.totalCostSaving.toLocaleString()} BDT</strong></span>
            </div>
          </div>
        </div>

        <!-- 16:9 Landscape Live Presentation Slide Preview Card -->
        <div class="bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                16:9 Landscape Presentation Slide Preview (Deck Sequence: Positioned Before Top 5 Summary)
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="CostSavingsView.previewWorkshopSlide()" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition flex items-center gap-1.5 cursor-pointer">
                <span>👁️</span> <span>Fullscreen Preview</span>
              </button>
              <button type="button" onclick="CostSavingsView.downloadWorkshopSlideImage()" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95">
                <span>📥</span> <span>Download Slide (PNG)</span>
              </button>
            </div>
          </div>

          <!-- Slide Container -->
          <div class="w-full flex items-center justify-center p-2 rounded-2xl bg-slate-950/60 overflow-hidden shadow-2xl">
            <div class="w-full max-w-[1100px] shadow-2xl rounded-xl overflow-hidden" id="workshop-slide-preview-wrapper">
              ${(typeof WorkshopCostManager !== 'undefined') ? WorkshopCostManager.renderSlideHtml(month, { items }) : ''}
            </div>
          </div>
        </div>

      </div>
    `;
  },

  toggleWorkshopPasteBox(force = null) {
    const box = document.getElementById('workshop-excel-paste-box');
    if (!box) return;
    if (force !== null) {
      if (force) box.classList.remove('hidden');
      else box.classList.add('hidden');
    } else {
      box.classList.toggle('hidden');
    }
  },

  async handlePasteClipboardButton() {
    try {
      const text = await navigator.clipboard.readText();
      const input = document.getElementById('workshop-raw-paste-input');
      if (input && text) {
        input.value = text;
        if (typeof window.showToast === 'function') window.showToast("Pasted from clipboard! Click 'Import into Table' to apply.", "info");
      }
    } catch (e) {
      alert("Clipboard access not available. Please press Ctrl+V directly into the text box.");
    }
  },

  importExcelPasteContent() {
    const input = document.getElementById('workshop-raw-paste-input');
    if (!input || !input.value.trim()) {
      alert("Please paste Excel data into the box first.");
      return;
    }

    if (typeof WorkshopCostManager === 'undefined') return;
    const parsed = WorkshopCostManager.parseExcelPaste(input.value);
    if (!parsed || parsed.length === 0) {
      alert("Could not parse any valid rows. Please ensure your Excel copy has Work Name and QTY/Price columns.");
      return;
    }

    this._workshopDraftItems = parsed;
    this._workshopDraftMonth = this.selectedMonth;
    WorkshopCostManager.saveWorkshopData(this.selectedMonth, { items: parsed });
    this.toggleWorkshopPasteBox(false);
    this.render();

    if (typeof window.showToast === 'function') {
      window.showToast(`📥 Successfully imported ${parsed.length} workshop items from Excel!`, "success");
    }
  },

  addWorkshopRow() {
    const items = this.getWorkshopItems(this.selectedMonth);
    items.push({
      work_name: "New Workshop Fixture/Development",
      qty: 1,
      per_price: 1000,
      total_price: 1000,
      category: "Small Fixture"
    });
    this._workshopDraftItems = items;
    this.render();
  },

  deleteWorkshopRow(idx) {
    const items = this.getWorkshopItems(this.selectedMonth);
    if (idx >= 0 && idx < items.length) {
      items.splice(idx, 1);
      this._workshopDraftItems = items;
      this.render();
    }
  },

  updateWorkshopRowField(idx, field, value) {
    const items = this.getWorkshopItems(this.selectedMonth);
    if (!items[idx]) return;

    if (field === 'qty') {
      const q = Math.max(1, parseFloat(value) || 1);
      items[idx].qty = q;
      items[idx].total_price = q * (items[idx].per_price || 0);
    } else if (field === 'per_price') {
      const p = Math.max(0, parseFloat(value) || 0);
      items[idx].per_price = p;
      items[idx].total_price = (items[idx].qty || 1) * p;
    } else if (field === 'total_price') {
      items[idx].total_price = Math.max(0, parseFloat(value) || 0);
    } else {
      items[idx][field] = value;
    }

    // Refresh live preview wrapper without tearing down input focus
    const previewWrapper = document.getElementById('workshop-slide-preview-wrapper');
    if (previewWrapper && typeof WorkshopCostManager !== 'undefined') {
      previewWrapper.innerHTML = WorkshopCostManager.renderSlideHtml(this.selectedMonth, { items });
    }
  },

  loadAugustSampleData() {
    if (typeof WorkshopCostManager === 'undefined') return;
    this._workshopDraftItems = [...WorkshopCostManager.AUGUST_2026_RAW_ITEMS];
    this._workshopDraftMonth = this.selectedMonth;
    WorkshopCostManager.saveWorkshopData(this.selectedMonth, { items: this._workshopDraftItems });
    this.render();
    if (typeof window.showToast === 'function') {
      window.showToast("✨ Loaded reference August 2026 workshop costing Excel dataset!", "success");
    }
  },

  clearWorkshopData() {
    if (!confirm("Are you sure you want to clear all workshop items for this month?")) return;
    this._workshopDraftItems = [];
    this._workshopDraftMonth = this.selectedMonth;
    if (typeof WorkshopCostManager !== 'undefined') {
      WorkshopCostManager.saveWorkshopData(this.selectedMonth, { items: [] });
    }
    this.render();
    if (typeof window.showToast === 'function') {
      window.showToast("🗑 Cleared workshop items.", "info");
    }
  },

  saveWorkshopData() {
    if (typeof WorkshopCostManager === 'undefined') return;
    const items = this.getWorkshopItems(this.selectedMonth);
    WorkshopCostManager.saveWorkshopData(this.selectedMonth, { items });
    this.render();
    if (typeof window.showToast === 'function') {
      window.showToast("💾 AC Process Workshop Cost Saving Report saved & 16:9 slide updated!", "success");
    }
  },

  previewWorkshopSlide() {
    const month = this.selectedMonth;
    const items = this.getWorkshopItems(month);
    const slideHtml = (typeof WorkshopCostManager !== 'undefined')
      ? WorkshopCostManager.renderSlideHtml(month, { items })
      : '<div>Slide unavailable</div>';

    if (typeof SlidePreviewModal !== 'undefined' && SlidePreviewModal.openCustomHtml) {
      SlidePreviewModal.openCustomHtml(slideHtml, `AC Process Workshop Cost Saving Report (${month})`);
    }
  },

  downloadWorkshopSlideImage() {
    if (typeof WorkshopCostManager !== 'undefined' && WorkshopCostManager.downloadSlideAsImage) {
      WorkshopCostManager.downloadSlideAsImage('workshop-slide-canvas', `AC_Process_Workshop_Cost_Saving_${this.selectedMonth}.png`);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CostSavingsView;
} else if (typeof window !== 'undefined') {
  window.CostSavingsView = CostSavingsView;
}
