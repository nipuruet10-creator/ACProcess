/**
 * Process Development Monthly Report Automation System
 * Module: Dedicated Projects View (Ongoing & Completed Projects)
 * Manages Multi-Month Strategic Projects (4-5 months deadline)
 * Supports Month-to-Month Carryover Synchronization & Task Entry
 * WALTON Hi-Tech Industries PLC
 */

const ProjectsView = {
  selectedMonth: "SEP-2026",
  activeFilter: "all", // 'all', 'ongoing', 'completed'
  STORAGE_KEY: "walton_strategic_projects_permanent_v1",

  getDefaultSeedProjects() {
    return [
      {
        task_id: "PROJ-2026-8134",
        task_name: "RAC Assembly line reclocation",
        category: "Ongoing Projects",
        status: "Ongoing",
        project_status: "Ongoing",
        deadline: "4-5 Months",
        overview: "Line layout CAD design, machine relocation & alignment, air piping, electrical wiring and pilot trial balancing for RAC indoor assembly.",
        description: "Line layout CAD design, machine relocation & alignment, air piping, electrical wiring and pilot trial balancing for RAC indoor assembly.",
        task_details: "• Line layout CAD design • Machine relocation & alignment • Air piping & electrical wiring • Pilot trial run & takt time balancing • Handover to production",
        assignee: "Kamrul (44819)",
        engineer: "Kamrul (44819)",
        photo_1: "",
        photo: "",
        before_photo: "",
        is_project: true,
        created_at: "2026-10-01T14:51:00.000Z",
        last_updated: new Date().toISOString()
      }
    ];
  },

  getProjects() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      let parsed = [];
      if (raw) {
        try {
          parsed = JSON.parse(raw);
        } catch(e) {}
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        parsed = this.getDefaultSeedProjects();
        this.saveProjects(parsed);
        return parsed;
      }

      // Strictly filter out any legacy dummy seed projects
      const dummyIds = new Set(['PROJ-2026-001', 'PROJ-2026-002', 'PROJ-2026-003', 'PROJ-2026-004', 'PROJ-2026-005']);
      parsed = parsed.filter(p => {
        if (!p || !p.task_id) return false;
        if (dummyIds.has(p.task_id)) return false;
        const nm = (p.task_name || '').toLowerCase();
        if (nm.includes('powder coating booth with cyclone') ||
            nm.includes('cac condenser & evaporator bending') ||
            nm.includes('cnc turret punch machine automation') ||
            nm.includes('automated robotic braze joint quality') ||
            nm.includes('booster pump cycle time reduced by 37.5%')) {
          return false;
        }
        return true;
      });

      // Ensure RAC Assembly line relocation project is permanently present and visible (Requirement 1)
      if (!parsed.some(p => (p.task_name || '').toLowerCase().includes('rac assembly line'))) {
        parsed.push(this.getDefaultSeedProjects()[0]);
      }

      // Cleanse any legacy reference to inactive personnel
      parsed.forEach(p => {
        const assLower = String(p.assignee || '').toLowerCase();
        const engLower = String(p.engineer || '').toLowerCase();
        if (assLower.includes('mahmud') || assLower.includes('51020') || engLower.includes('mahmud') || engLower.includes('51020')) {
          p.assignee = "Sazzad (50463)";
          p.engineer = "Sazzad (50463)";
        }
      });
      this.saveProjects(parsed);
      return parsed;
    } catch (e) {
      console.warn("Could not read strategic projects storage:", e);
    }
    return this.getDefaultSeedProjects();
  },

  saveProjects(projects) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));
      if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.broadcastProjectUpdate) {
        FirebaseSyncService.broadcastProjectUpdate(projects);
      }
    } catch (e) {
      console.error("Failed to save strategic projects:", e);
    }
  },

  getProject(taskId) {
    const list = this.getProjects();
    return list.find(p => p.task_id === taskId) || null;
  },

  async handleMonthSelect(month) {
    this.selectedMonth = month;
    if (window.appState && window.appState.workbookMgr) {
      window.appState.workbookMgr.activeMonth = month;
    }
    await this.render();
  },

  viewMode: 'table', // 'table' or 'slides'

  setViewMode(mode) {
    this.viewMode = mode;
    this.render();
  },

  setFilter(filter) {
    this.activeFilter = filter;
    this.render();
  },

  previewProjectSlide(taskId, openFullscreen = false) {
    const proj = this.getProject(taskId);
    if (!proj) {
      if (typeof window.showToast === 'function') window.showToast("Project task not found", "error");
      return;
    }

    const photo = this.getProjectPhoto(taskId) || proj.photo_1 || proj.photo || proj.after_photo || "";
    const isCompleted = (proj.status === 'Completed' || proj.category === 'Completed Projects' || proj.project_status === 'Completed');
    const slideData = {
      task_id: proj.task_id,
      task_name: proj.task_name,
      slide_title: proj.task_name,
      raw_task_name: proj.task_name,
      category: isCompleted ? "Completed Projects" : "Ongoing Projects",
      status: isCompleted ? "Completed" : (proj.project_status || proj.status || "Ongoing"),
      project_status: isCompleted ? "Completed" : (proj.project_status || proj.status || "Ongoing"),
      deadline: proj.deadline || "4-5 Months",
      overview: proj.overview || proj.description || "",
      description: proj.overview || proj.description || "",
      task_details: proj.task_details || "",
      assignee: proj.assignee || proj.engineer || "Department Engineer",
      engineer: proj.engineer || proj.assignee || "Department Engineer",
      photo: photo,
      photo_1: photo,
      photo_2: photo,
      after_photo: photo,
      photo_after: photo,
      is_project: true,
      is_strategic_project: true,
      month: this.selectedMonth,
      status_details: proj.status_details || proj.project_status_details || "",
      impact: (proj.task_details && proj.task_details.trim())
        ? proj.task_details.split('\n').map(s => s.trim()).filter(Boolean)
        : (proj.status_details ? [proj.status_details] : null)
    };

    if (typeof SlidePreviewModal !== 'undefined' && SlidePreviewModal.openSingle) {
      SlidePreviewModal.currentMonth = this.selectedMonth;
      SlidePreviewModal.openSingle(slideData);
      if (openFullscreen && typeof SlidePreviewModal.toggleFullscreen === 'function') {
        setTimeout(() => SlidePreviewModal.toggleFullscreen(), 60);
      }
    } else {
      if (typeof window.showToast === 'function') window.showToast("Preview modal not available", "warning");
    }
  },

  previewAllProjectSlides(initialTaskId = null) {
    const list = this.getProjects();
    let targetProjects = list;
    if (this.activeFilter === 'ongoing') {
      targetProjects = list.filter(t => !String(t.status || t.project_status || '').toLowerCase().includes('complete') && !String(t.category || '').toLowerCase().includes('completed'));
    } else if (this.activeFilter === 'completed') {
      targetProjects = list.filter(t => String(t.status || t.project_status || '').toLowerCase().includes('complete') || String(t.category || '').toLowerCase().includes('completed'));
    }

    if (targetProjects.length === 0) {
      if (typeof window.showToast === 'function') window.showToast("No project slides to preview in this filter.", "info");
      return;
    }

    const formattedSlides = targetProjects.map(proj => {
      const photo = this.getProjectPhoto(proj.task_id) || proj.photo_1 || proj.photo || proj.after_photo || "";
      const isCompleted = (proj.status === 'Completed' || proj.category === 'Completed Projects' || proj.project_status === 'Completed');
      return {
        task_id: proj.task_id,
        task_name: proj.task_name,
        slide_title: proj.task_name,
        raw_task_name: proj.task_name,
        category: isCompleted ? "Completed Projects" : "Ongoing Projects",
        status: isCompleted ? "Completed" : (proj.project_status || proj.status || "Ongoing"),
        project_status: isCompleted ? "Completed" : (proj.project_status || proj.status || "Ongoing"),
        deadline: proj.deadline || "4-5 Months",
        overview: proj.overview || proj.description || "",
        description: proj.overview || proj.description || "",
        task_details: proj.task_details || "",
        assignee: proj.assignee || proj.engineer || "Department Engineer",
        engineer: proj.engineer || proj.assignee || "Department Engineer",
        photo: photo,
        photo_1: photo,
        photo_2: photo,
        after_photo: photo,
        photo_after: photo,
        is_project: true,
        is_strategic_project: true,
        month: this.selectedMonth,
        status_details: proj.status_details || proj.project_status_details || "",
        impact: (proj.task_details && proj.task_details.trim())
          ? proj.task_details.split('\n').map(s => s.trim()).filter(Boolean)
          : (proj.status_details ? [proj.status_details] : null)
      };
    });

    if (typeof SlidePreviewModal !== 'undefined' && SlidePreviewModal.open) {
      SlidePreviewModal.currentMonth = this.selectedMonth;
      SlidePreviewModal.open(formattedSlides, initialTaskId);
    } else {
      if (typeof window.showToast === 'function') window.showToast("Preview modal not available", "warning");
    }
  },

  renderSlideCard(p, idx) {
    const photoUrl = this.getProjectPhoto(p.task_id) || p.photo_1 || p.photo || p.after_photo || "";
    const isCompleted = (p.status === 'Completed' || p.category === 'Completed Projects' || p.project_status === 'Completed');
    const desc = p.overview || p.description || p.task_details || 'Strategic manufacturing process optimization.';
    const details = p.status_details || p.project_status_details || '';

    return `
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col group hover:-translate-y-0.5">
        <!-- 16:9 Slide Card Header with Walton Style Gradient -->
        <div class="bg-gradient-to-r ${isCompleted ? 'from-emerald-950 via-teal-900 to-slate-900' : 'from-slate-950 via-indigo-950 to-slate-900'} text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
          <div class="flex items-center gap-2 min-w-0">
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isCompleted ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'}">
              SLIDE ${idx + 1}
            </span>
            <span class="text-xs font-black truncate text-slate-100">${HELPERS.escapeHtml(p.task_name)}</span>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${isCompleted ? 'bg-emerald-500 text-white shadow-xs' : 'bg-sky-500 text-white shadow-xs'}">
            ${isCompleted ? '✅ Completed' : '⏳ Ongoing'}
          </span>
        </div>

        <!-- Slide Preview Body (16:9 presentation preview box) -->
        <div class="p-4 flex-1 flex flex-col justify-between bg-slate-50/40">
          <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-3">
            <!-- 16:9 Thumbnail Photo or Visual Placeholder -->
            <div class="sm:col-span-5 h-36 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 relative group/img cursor-pointer" onclick="ProjectsView.previewProjectSlide('${p.task_id}')">
              ${photoUrl ? `
                <div class="w-full h-full relative overflow-hidden flex items-center justify-center">
                  <img src="${photoUrl}" alt="" class="absolute inset-[-12%] w-[124%] h-[124%] object-cover pointer-events-none select-none" style="filter: blur(10px) brightness(0.65); opacity: 0.6;" />
                  <img src="${photoUrl}" class="relative z-10 max-w-full max-h-full object-contain drop-shadow" alt="Project Photo" />
                  <div class="absolute inset-0 z-20 bg-black/45 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition">
                    <span class="px-2.5 py-1 rounded-lg bg-white text-slate-900 font-bold text-[11px] shadow">👁️ View Slide</span>
                  </div>
                </div>
              ` : `
                <div class="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center bg-slate-900/90">
                  <span class="text-2xl mb-1">🖼️</span>
                  <span class="text-[10px] font-mono text-slate-300 font-bold">16:9 Slide Frame</span>
                  <span class="text-[9px] text-slate-400 mt-0.5">Click to preview slide</span>
                </div>
              `}
            </div>

            <!-- Slide Content Info -->
            <div class="sm:col-span-7 flex flex-col justify-between">
              <div>
                <div class="flex items-center gap-1.5 mb-1 text-[11px]">
                  <span class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Assignee:</span>
                  <span class="font-bold text-slate-800">${HELPERS.escapeHtml(p.assignee || p.engineer || 'Department Engineer')}</span>
                </div>
                <div class="flex items-center gap-1.5 mb-2 text-[11px]">
                  <span class="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Deadline:</span>
                  <span class="font-mono text-slate-800 font-bold">${HELPERS.escapeHtml(p.deadline || '4-5 Months')}</span>
                </div>
                <div class="text-[11px] text-slate-600 line-clamp-3 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs leading-relaxed">
                  ${HELPERS.escapeHtml(desc)}
                </div>
              </div>
              ${details ? `
                <div class="mt-2 text-[10px] font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 line-clamp-1">
                  <strong>Status:</strong> ${HELPERS.escapeHtml(details)}
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Slide Action Buttons Footer -->
          <div class="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2 mt-auto">
            <div class="flex items-center gap-1.5">
              <button onclick="ProjectsView.previewProjectSlide('${p.task_id}')" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer">
                <span>👁️</span> <span>Slide Preview</span>
              </button>
              <button onclick="ProjectsView.previewProjectSlide('${p.task_id}', true)" title="Fullscreen Slide Preview" class="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1 cursor-pointer shadow-2xs">
                <span>⛶</span> <span>Fullscreen</span>
              </button>
            </div>
            <div class="flex items-center gap-1">
              <button onclick="ProjectsView.openEditProjectModal('${p.task_id}')" title="Edit Project" class="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition">
                ✏️
              </button>
              <button onclick="ProjectsView.toggleProjectStatus('${p.task_id}')" title="${isCompleted ? 'Reopen as Ongoing' : 'Mark Completed'}" class="p-1.5 rounded-lg ${isCompleted ? 'hover:bg-sky-50 text-sky-600' : 'hover:bg-emerald-50 text-emerald-600'} transition">
                ${isCompleted ? '🔄' : '✅'}
              </button>
              <button onclick="ProjectsView.deleteProject('${p.task_id}')" title="Delete Project" class="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async handleSyncFromPreviousMonth() {
    if (!window.appState || !window.appState.workbookMgr) return;
    if (this.selectedMonth === 'SEP-2026') {
      if (typeof window.showToast === 'function') {
        window.showToast("SEP-2026 is locked against historical sync to preserve genuine manual entries.", "info");
      }
      return;
    }
    const res = window.appState.workbookMgr.syncOngoingProjectsFromPreviousMonth(this.selectedMonth);
    
    if (res.added > 0) {
      if (window.appState.syncEngine) {
        await window.appState.syncEngine.syncMonth(this.selectedMonth);
      }
      if (typeof window.showToast === 'function') {
        window.showToast(`\u{1F504} Carried forward ${res.added} ongoing project(s) from ${res.prevMonth}!`, "success");
      } else {
        alert(res.message);
      }
    } else {
      if (typeof window.showToast === 'function') {
        window.showToast(`No new ongoing projects to carry forward from ${res.prevMonth || 'previous month'}.`, "info");
      } else {
        alert("No new ongoing projects to carry forward.");
      }
    }
    await this.render();
  },

  async toggleProjectStatus(taskId) {
    const list = this.getProjects();
    const proj = list.find(p => p.task_id === taskId);
    if (!proj) return;

    const isCurrentlyCompleted = proj.status === 'Completed' || proj.category === 'Completed Projects' || proj.project_status === 'Completed';
    proj.status = isCurrentlyCompleted ? 'Ongoing' : 'Completed';
    proj.project_status = proj.status;
    proj.category = isCurrentlyCompleted ? 'Ongoing Projects' : 'Completed Projects';
    proj.last_updated = new Date().toISOString();

    this.saveProjects(list);

    // Also update in workbook manager if exists
    if (window.appState && window.appState.workbookMgr) {
      window.appState.workbookMgr.updateTask(this.selectedMonth, taskId, {
        status: proj.status,
        project_status: proj.status,
        category: proj.category,
        last_updated: proj.last_updated
      });
    }

    if (window.appState && window.appState.syncEngine) {
      await window.appState.syncEngine.syncMonth(this.selectedMonth);
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`Project marked as ${proj.status}!`, "success");
    }
    await this.render();
  },

  async deleteProject(taskId) {
    if (confirm(`Are you sure you want to delete this strategic project (${taskId})?`)) {
      let list = this.getProjects();
      list = list.filter(p => p.task_id !== taskId);
      this.saveProjects(list);

      if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.deleteTask) {
        try {
          FirebaseSyncService.deleteTask(this.selectedMonth, taskId);
        } catch (e) {
          console.warn("Firebase deleteProject notice:", e);
        }
      }
      if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.deleteTask) {
        GoogleSheetsSync.deleteTask(taskId, this.selectedMonth).catch(e => console.warn("Google Sheets deleteProject notice:", e));
      }
      if (window.appState && window.appState.syncEngine) {
        await window.appState.syncEngine.syncMonth(this.selectedMonth);
      }
      if (typeof window.showToast === 'function') {
        window.showToast(`Deleted strategic project ${taskId}`, "info");
      }
      await this.render();
    }
  },

  generateAiDescription(event) {
    if (event && event.preventDefault) event.preventDefault();
    const nameInput = document.getElementById('proj-name');
    const overviewArea = document.getElementById('proj-overview');
    const categorySelect = document.getElementById('proj-category');
    if (!nameInput || !overviewArea) return;

    const taskName = nameInput.value.trim();
    if (!taskName) {
      if (typeof window.showToast === 'function') {
        window.showToast("Please enter a Project Name first to generate AI description!", "warning");
      } else {
        alert("Please enter a Project Name first!");
      }
      nameInput.focus();
      return;
    }

    const category = categorySelect ? categorySelect.value : "Ongoing Projects";
    let desc = "";
    if (typeof PROMPT_TEMPLATES !== 'undefined' && typeof PROMPT_TEMPLATES.localFactualTransform === 'function') {
      const res = PROMPT_TEMPLATES.localFactualTransform(taskName, category);
      desc = res.ai_description || "";
    }
    if (!desc) {
      desc = `Strategic engineering project focused on ${taskName}. Designed to optimize manufacturing workflow, eliminate station bottlenecks, improve operational reliability, and elevate production capability across Walton AC lines.`;
    }

    overviewArea.value = desc;
    if (typeof window.showToast === 'function') {
      window.showToast("✨ AI generated strategic project description!", "success");
    }
  },

  isBackMonthDeadline(val) {
    if (!val || typeof val !== 'string') return false;
    const trimmed = val.trim();
    if (!trimmed) return false;

    let refYear = 2026;
    let refMonth = 9; // September (1-indexed)
    if (this.selectedMonth && this.selectedMonth.includes('-')) {
      const [mStr, yStr] = this.selectedMonth.split('-');
      const monthMap = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
      if (monthMap[mStr.toUpperCase()]) refMonth = monthMap[mStr.toUpperCase()];
      const y = parseInt(yStr, 10);
      if (!isNaN(y)) refYear = y;
    }

    const monthMap = {
      january: 1, jan: 1,
      february: 2, feb: 2,
      march: 3, mar: 3,
      april: 4, apr: 4,
      may: 5,
      june: 6, jun: 6,
      july: 7, jul: 7,
      august: 8, aug: 8,
      september: 9, sep: 9, sept: 9,
      october: 10, oct: 10,
      november: 11, nov: 11,
      december: 12, dec: 12
    };

    const lower = trimmed.toLowerCase();
    const yearMatch = lower.match(/(20\d{2})/);
    const explicitYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

    if (explicitYear && explicitYear < refYear) return true;

    const isoMatch = trimmed.match(/(\d{4})[-\/](\d{1,2})/);
    if (isoMatch) {
      const yr = parseInt(isoMatch[1], 10);
      const mo = parseInt(isoMatch[2], 10);
      if (yr < refYear || (yr === refYear && mo < refMonth)) return true;
    }

    const dmyMatch = trimmed.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (dmyMatch) {
      const yr = parseInt(dmyMatch[3], 10);
      const mo = parseInt(dmyMatch[2], 10);
      if (yr < refYear || (yr === refYear && mo < refMonth)) return true;
    }

    for (const [mName, mNum] of Object.entries(monthMap)) {
      const regex = new RegExp('(?:^|[^a-z])' + mName + '(?:[^a-z]|$)', 'i');
      if (regex.test(lower)) {
        const yr = explicitYear || refYear;
        if (yr < refYear || (yr === refYear && mNum < refMonth)) {
          return true;
        }
      }
    }

    return false;
  },

  validateDeadline(input) {
    if (!input) return;
    const isBack = this.isBackMonthDeadline(input.value);
    let hintElem = document.getElementById('proj-deadline-warning');
    if (isBack) {
      input.classList.remove('bg-slate-50', 'border-slate-200', 'text-slate-700', 'focus:border-sky-500', 'focus:border-amber-500');
      input.classList.add('bg-red-50', 'border-red-500', 'text-red-700', 'ring-2', 'ring-red-400', 'focus:border-red-600', 'focus:ring-red-500');
      if (!hintElem) {
        hintElem = document.createElement('p');
        hintElem.id = 'proj-deadline-warning';
        hintElem.className = 'text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1';
        hintElem.innerHTML = '<span>⚠️</span> <span>Warning: Deadline belongs to a past / back month!</span>';
        input.parentNode.appendChild(hintElem);
      }
    } else {
      input.classList.remove('bg-red-50', 'border-red-500', 'text-red-700', 'ring-2', 'ring-red-400', 'focus:border-red-600', 'focus:ring-red-500');
      input.classList.add('bg-slate-50', 'border-slate-200', 'text-slate-700');
      if (hintElem) hintElem.remove();
    }
  },

  generateAiDetails(event) {
    if (event && event.preventDefault) event.preventDefault();
    const nameInput = document.getElementById('proj-name');
    const detailsArea = document.getElementById('proj-details');
    const categorySelect = document.getElementById('proj-category');
    if (!nameInput || !detailsArea) return;

    const taskName = nameInput.value.trim();
    if (!taskName) {
      if (typeof window.showToast === 'function') {
        window.showToast("Please enter a Project Name first to generate AI details!", "warning");
      } else {
        alert("Please enter a Project Name first!");
      }
      nameInput.focus();
      return;
    }

    const category = categorySelect ? categorySelect.value : "Ongoing Projects";
    let steps = "";
    if (typeof PROMPT_TEMPLATES !== 'undefined' && typeof PROMPT_TEMPLATES.localFactualTransform === 'function') {
      const res = PROMPT_TEMPLATES.localFactualTransform(taskName, category);
      if (Array.isArray(res.ai_impact) && res.ai_impact.length > 0) {
        steps = res.ai_impact.map((imp, i) => `${i + 1}. ${imp}`).join(' • ');
      }
    }
    if (!steps) {
      steps = `1. Conduct engineering feasibility & design study for ${taskName}. 2. Procure tooling & fabricate pilot components. 3. Execute trial run & validate process parameters. 4. Complete quality sign-off and SOP documentation.`;
    }

    detailsArea.value = steps;
    if (typeof window.showToast === 'function') {
      window.showToast("✨ AI generated tailored milestone details!", "success");
    }
  },

  _stagedPhotos: {},

  getProjectPhoto(taskId) {
    if (this._stagedPhotos[taskId]) {
      return this._stagedPhotos[taskId];
    }
    if (typeof photoManager !== 'undefined' && photoManager.getTaskPhotos) {
      const p = photoManager.getTaskPhotos(taskId, this.selectedMonth);
      if (p) {
        const found = p.after_photo || p.photo_1 || p.photo_2 || p.before_photo;
        if (found) return found;
      }
    }
    const proj = this.getProject(taskId);
    if (proj && (proj.photo_1 || proj.photo || proj.before_photo || proj.after_photo)) {
      return proj.photo_1 || proj.photo || proj.before_photo || proj.after_photo;
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

      if (typeof photoManager !== 'undefined') {
        if (photoManager.setTaskPhoto) {
          await photoManager.setTaskPhoto(taskId, 'before_photo', base64Url, null, this.selectedMonth);
          await photoManager.setTaskPhoto(taskId, 'photo_1', base64Url, null, this.selectedMonth);
        } else if (photoManager.savePhoto) {
          await photoManager.savePhoto(taskId, 'before_photo', base64Url, this.selectedMonth);
        }
      }

      this.renderModalPhotoSlot(taskId);

      if (typeof window.showToast === 'function') {
        window.showToast("📷 Project photo attached successfully!", "success");
      }
    } catch (err) {
      console.error("Project photo upload error:", err);
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
        window.showToast("No image in clipboard! Copy a photo first (Ctrl+C).", "warning");
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
      } catch (e) {}
    }
    this.renderModalPhotoSlot(taskId);
    if (typeof window.showToast === 'function') {
      window.showToast("Project photo removed.", "info");
    }
  },

  renderModalPhotoSlot(taskId) {
    const container = document.getElementById('proj-photo-slot-container');
    if (!container) return;
    const photo = this.getProjectPhoto(taskId);

    container.innerHTML = `
      <div id="proj-slot-photo" class="bg-white border ${photo ? 'border-slate-200' : 'border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/20'} rounded-2xl p-3 flex flex-col justify-between shadow-2xs transition group"
           ondragover="event.preventDefault(); this.classList.add('ring-2', 'ring-sky-500');"
           ondragleave="this.classList.remove('ring-2', 'ring-sky-500');"
           ondrop="ProjectsView.handleModalPhotoDrop(event, '${taskId}')">
        
        <div class="relative w-full h-36 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-200">
          ${photo ? `
            <div class="relative w-full h-full overflow-hidden flex items-center justify-center bg-slate-950">
              <img src="${photo}" alt="" class="absolute inset-[-12%] w-[124%] h-[124%] object-cover pointer-events-none select-none" style="filter: blur(14px) brightness(0.65); opacity: 0.65;" />
              <img src="${photo}" class="relative z-10 max-w-full max-h-full object-contain drop-shadow-md" alt="Project Photo" />
            </div>
            <div class="absolute inset-0 z-20 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition backdrop-blur-[1px]">
              <button type="button" onclick="event.stopPropagation(); ProjectsView.pasteFromClipboard('${taskId}')" class="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold shadow transition cursor-pointer">
                📋 Paste Ctrl+V
              </button>
              <label for="proj-photo-file-input" onclick="event.stopPropagation()" class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-bold cursor-pointer shadow transition">
                🔄 Replace
              </label>
              <button type="button" onclick="event.stopPropagation(); ProjectsView.deleteModalPhoto('${taskId}')" class="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow transition cursor-pointer">
                🗑 Delete
              </button>
            </div>
          ` : `
            <div class="cursor-pointer flex flex-col items-center justify-center p-3 text-center w-full h-full hover:bg-sky-50/40 transition"
                 onclick="ProjectsView.pasteFromClipboard('${taskId}')">
              <span class="text-3xl text-sky-500 mb-1 group-hover:scale-110 transition">📋</span>
              <span class="text-xs font-bold text-slate-800">Paste Photo (Ctrl+V)</span>
              <span class="text-[10px] text-slate-500 mt-0.5">Click to paste image from clipboard, or drag & drop</span>
              <div class="mt-2 flex items-center gap-2" onclick="event.stopPropagation()">
                <label for="proj-photo-file-input" class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer shadow-xs transition">
                  📁 Browse File
                </label>
              </div>
            </div>
          `}
          <input type="file" id="proj-photo-file-input" accept="image/*" class="hidden" onchange="ProjectsView.uploadModalPhoto(event, '${taskId}')" />
        </div>

        <div class="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
          <span class="text-slate-400 font-mono">16:9 Project Presentation Frame</span>
          <div class="flex items-center gap-1.5">
            <button type="button" onclick="event.stopPropagation(); ProjectsView.pasteFromClipboard('${taskId}')" 
                    class="px-2 py-0.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold transition flex items-center gap-1 cursor-pointer">
              <span>📋</span> <span>Paste (Ctrl+V)</span>
            </button>
            <label for="proj-photo-file-input" onclick="event.stopPropagation()" class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition">
              ${photo ? '🔄 Replace' : '📁 Upload'}
            </label>
            ${photo ? `
              <button type="button" onclick="event.stopPropagation(); ProjectsView.deleteModalPhoto('${taskId}')" class="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition cursor-pointer">
                🗑 Remove
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  previewPhoto(photoUrl, title) {
    if (!photoUrl) return;
    let prevModal = document.getElementById('project-photo-preview-modal');
    if (!prevModal) {
      prevModal = document.createElement('div');
      prevModal.id = 'project-photo-preview-modal';
      document.body.appendChild(prevModal);
    }
    prevModal.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" onclick="document.getElementById('project-photo-preview-modal').innerHTML = ''">
        <div class="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl p-4 shadow-2xl flex flex-col items-center" onclick="event.stopPropagation()">
          <div class="w-full flex items-center justify-between pb-3 border-b border-slate-800">
            <h4 class="text-sm font-bold text-white truncate">${HELPERS.escapeHtml(title || 'Project Photo Preview')}</h4>
            <button onclick="document.getElementById('project-photo-preview-modal').innerHTML = ''" class="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm flex items-center justify-center">&times;</button>
          </div>
          <div class="my-3 max-h-[75vh] overflow-hidden rounded-2xl flex items-center justify-center bg-black">
            <img src="${photoUrl}" alt="Project Photo" class="max-h-[75vh] w-auto object-contain rounded-xl" />
          </div>
          <div class="text-[11px] text-slate-400 font-mono">Process Development Strategic Project Photo</div>
        </div>
      </div>
    `;
  },

  openNewProjectModal() {
    let modal = document.getElementById('project-entry-modal-container');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'project-entry-modal-container';
      document.body.appendChild(modal);
    }

    const engineers = (typeof MasterDataManager !== 'undefined') ? MasterDataManager.getEngineers() : [];
    const defaultEng = engineers[0] ? engineers[0].display : "Sazzad (50463)";
    const tempTaskId = `PROJ-2026-${Date.now().toString().slice(-4)}`;

    modal.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800 flex flex-col font-sans max-h-[92vh] overflow-y-auto">
          
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center text-xl shadow-sm">
                🚀
              </div>
              <div>
                <h3 class="text-lg font-black text-slate-900">Add Strategic Automation Project</h3>
                <p class="text-xs text-slate-400">Target Month: <strong class="text-slate-700">${this.selectedMonth}</strong> &bull; Multi-month carryover enabled</p>
              </div>
            </div>
            <button onclick="ProjectsView.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 text-sm flex items-center justify-center transition">&times;</button>
          </div>

          <form id="project-entry-form" onsubmit="ProjectsView.saveProjectEntry(event)" class="mt-5 space-y-4 text-xs">
            <input type="hidden" id="proj-edit-task-id" value="${tempTaskId}" />
            <input type="hidden" id="proj-is-new" value="true" />
            
            <!-- Project Name -->
            <div>
              <label class="block font-bold text-slate-700 mb-1">Project Name <span class="text-red-500">*</span></label>
              <input type="text" id="proj-name" required placeholder="e.g. CNC Turret Punch Machine Automation & Setup"
                     class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-sky-500 focus:bg-white shadow-sm" />
            </div>

            <!-- Category & Deadline (2 columns, NO Project Status dropdown) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Project Category / Type</label>
                <select id="proj-category" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-500">
                  <option value="Ongoing Projects" selected>New / Ongoing Project (In Progress)</option>
                  <option value="Completed Projects">Completed Project</option>
                </select>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Deadline <span class="text-red-500">*</span></label>
                <input type="text" id="proj-deadline" required placeholder="e.g. 2026-12-31 or Dec, 2026 (4-5 Months)"
                       oninput="ProjectsView.validateDeadline(this)"
                       onchange="ProjectsView.validateDeadline(this)"
                       class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-sky-500 transition" />
              </div>
            </div>

            <!-- Concern Engineer -->
            <div>
              <label class="block font-bold text-slate-700 mb-1">Assignee / Concern Engineer <span class="text-red-500">*</span></label>
              <select id="proj-assignee" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-500">
                ${engineers.map(e => `<option value="${e.display}" ${e.display === defaultEng ? 'selected' : ''}>${e.display}</option>`).join('')}
              </select>
            </div>

            <!-- Photo Upload Dropzone (Same as Monthly Tasks) -->
            <div>
              <label class="block font-bold text-slate-700 mb-1">Project Photo (Drag &amp; Drop, Browse or Paste Ctrl+V)</label>
              <div id="proj-photo-slot-container"></div>
            </div>

            <!-- Description Box with AI Generate Button -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block font-bold text-slate-700">Description <span class="text-red-500">*</span></label>
                <button type="button" onclick="ProjectsView.generateAiDescription(event)" class="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded-lg transition shadow-xs cursor-pointer">
                  <span>✨</span> <span>AI Generate Description</span>
                </button>
              </div>
              <textarea id="proj-overview" rows="3" required placeholder="Provide an executive description of the automation project, engineering objectives, methodology, and scope..."
                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500 resize-none shadow-xs"></textarea>
            </div>

            <!-- Milestone Details / Action Steps with AI Generate Button -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block font-bold text-slate-700">Milestone Details / Action Steps</label>
                <button type="button" onclick="ProjectsView.generateAiDetails(event)" class="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded-lg transition shadow-xs cursor-pointer">
                  <span>✨</span> <span>AI Generate Details</span>
                </button>
              </div>
              <textarea id="proj-details" rows="3" placeholder="1. Technical study & punch matrix 2. Fabrication trial 3. Safety inspection..."
                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-sky-500 resize-none"></textarea>
            </div>

            <!-- Project Status Details Box (Requirement 5: Bottom box, mandatory, NO AI GENERATE BUTTON) -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block font-bold text-slate-700">Project Status Details <span class="text-red-500">*</span></label>
                <span class="text-[10px] text-slate-400 font-semibold">(Mandatory &bull; Manual entry only &bull; Cannot be empty)</span>
              </div>
              <textarea id="proj-status-details" rows="2" required placeholder="Enter current progress status, active milestones, blockers, or next actions (mandatory)..."
                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500 resize-none shadow-xs"></textarea>
            </div>

            <div class="flex items-center justify-between pt-4 border-t border-slate-100">
              <span class="text-[11px] text-slate-400">Project tasks are automatically scheduled at the end of monthly report decks.</span>
              <div class="flex items-center gap-2">
                <button type="button" onclick="ProjectsView.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition">Cancel</button>
                <button type="submit" class="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black shadow-md shadow-sky-200/50 transition flex items-center gap-1.5 cursor-pointer">
                  <span>💾</span> <span>Save Project</span>
                </button>
              </div>
            </div>
          </form>

        </div>
      </div>
    `;

    setTimeout(() => this.renderModalPhotoSlot(tempTaskId), 10);
  },

  openEditProjectModal(taskId) {
    const task = this.getProject(taskId) || (window.appState && window.appState.workbookMgr ? window.appState.workbookMgr.getTask(this.selectedMonth, taskId) : null);
    if (!task) {
      if (typeof window.showToast === 'function') window.showToast("Project task not found", "error");
      return;
    }

    let modal = document.getElementById('project-entry-modal-container');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'project-entry-modal-container';
      document.body.appendChild(modal);
    }

    const engineers = (typeof MasterDataManager !== 'undefined') ? MasterDataManager.getEngineers() : [];
    const isCompleted = (task.status === 'Completed' || task.category === 'Completed Projects' || task.project_status === 'Completed');
    const currentEng = task.assignee || task.engineer || (engineers[0] ? engineers[0].display : "Sazzad (50463)");
    const currentStatusDetails = task.status_details || task.project_status_details || task.project_status || task.status || '';

    modal.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div class="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-800 flex flex-col font-sans max-h-[92vh] overflow-y-auto">
          
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-xl shadow-sm">
                ✏️
              </div>
              <div>
                <h3 class="text-lg font-black text-slate-900">Edit Strategic Automation Project</h3>
                <p class="text-xs text-slate-400">Target Month: <strong class="text-slate-700">${this.selectedMonth}</strong> &bull; Task ID: <strong class="text-slate-700 font-mono">${task.task_id}</strong></p>
              </div>
            </div>
            <button onclick="ProjectsView.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 text-sm flex items-center justify-center transition">&times;</button>
          </div>

          <form id="project-entry-form" onsubmit="ProjectsView.saveProjectEntry(event)" class="mt-5 space-y-4 text-xs">
            <input type="hidden" id="proj-edit-task-id" value="${task.task_id}" />
            <input type="hidden" id="proj-is-new" value="false" />

            <!-- Project Name -->
            <div>
              <label class="block font-bold text-slate-700 mb-1">Project Name <span class="text-red-500">*</span></label>
              <input type="text" id="proj-name" required value="${HELPERS.escapeHtml(task.task_name || '')}" placeholder="e.g. CNC Turret Punch Machine Automation & Setup"
                     class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-amber-500 focus:bg-white shadow-sm" />
            </div>

            <!-- Category & Deadline (2 columns, NO Project Status dropdown) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Project Category / Type</label>
                <select id="proj-category" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-amber-500">
                  <option value="Ongoing Projects" ${!isCompleted ? 'selected' : ''}>New / Ongoing Project (In Progress)</option>
                  <option value="Completed Projects" ${isCompleted ? 'selected' : ''}>Completed Project</option>
                </select>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Deadline <span class="text-red-500">*</span></label>
                <input type="text" id="proj-deadline" required value="${HELPERS.escapeHtml(task.deadline || '4-5 Months')}" placeholder="e.g. 2026-12-31 or Dec, 2026 (4-5 Months)"
                       oninput="ProjectsView.validateDeadline(this)"
                       onchange="ProjectsView.validateDeadline(this)"
                       class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-amber-500 transition" />
              </div>
            </div>

            <!-- Concern Engineer -->
            <div>
              <label class="block font-bold text-slate-700 mb-1">Assignee / Concern Engineer <span class="text-red-500">*</span></label>
              <select id="proj-assignee" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-amber-500">
                ${engineers.map(e => `<option value="${e.display}" ${e.display === currentEng || e.name === currentEng ? 'selected' : ''}>${e.display}</option>`).join('')}
              </select>
            </div>

            <!-- Photo Upload Dropzone (Same as Monthly Tasks) -->
            <div>
              <label class="block font-bold text-slate-700 mb-1">Project Photo (Drag &amp; Drop, Browse or Paste Ctrl+V)</label>
              <div id="proj-photo-slot-container"></div>
            </div>

            <!-- Description Box with AI Generate Button -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block font-bold text-slate-700">Description <span class="text-red-500">*</span></label>
                <button type="button" onclick="ProjectsView.generateAiDescription(event)" class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg transition shadow-xs cursor-pointer">
                  <span>✨</span> <span>AI Generate Description</span>
                </button>
              </div>
              <textarea id="proj-overview" rows="3" required placeholder="Provide an executive description of the automation project, engineering objectives, methodology, and scope..."
                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500 resize-none shadow-xs">${HELPERS.escapeHtml(task.overview || task.description || '')}</textarea>
            </div>

            <!-- Milestone Details / Action Steps with AI Generate Button -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block font-bold text-slate-700">Milestone Details / Action Steps</label>
                <button type="button" onclick="ProjectsView.generateAiDetails(event)" class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg transition shadow-xs cursor-pointer">
                  <span>✨</span> <span>AI Generate Details</span>
                </button>
              </div>
              <textarea id="proj-details" rows="3" placeholder="1. Technical study & punch matrix 2. Fabrication trial 3. Safety inspection..."
                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:border-amber-500 resize-none">${HELPERS.escapeHtml(task.task_details || '')}</textarea>
            </div>

            <!-- Project Status Details Box (Requirement 5: Bottom box, mandatory, NO AI GENERATE BUTTON) -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block font-bold text-slate-700">Project Status Details <span class="text-red-500">*</span></label>
                <span class="text-[10px] text-slate-400 font-semibold">(Mandatory &bull; Manual entry only &bull; Cannot be empty)</span>
              </div>
              <textarea id="proj-status-details" rows="2" required placeholder="Enter current progress status, active milestones, blockers, or next actions (mandatory)..."
                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500 resize-none shadow-xs">${HELPERS.escapeHtml(currentStatusDetails)}</textarea>
            </div>

            <div class="flex items-center justify-between pt-4 border-t border-slate-100">
              <span class="text-[11px] text-slate-400">All modifications are preserved and synced.</span>
              <div class="flex items-center gap-2">
                <button type="button" onclick="ProjectsView.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition">Cancel</button>
                <button type="submit" class="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black shadow-md shadow-amber-200/50 transition flex items-center gap-1.5 cursor-pointer">
                  <span>💾</span> <span>Update Project Details</span>
                </button>
              </div>
            </div>
          </form>

        </div>
      </div>
    `;

    setTimeout(() => {
      this.renderModalPhotoSlot(task.task_id);
      const dl = document.getElementById('proj-deadline');
      if (dl) this.validateDeadline(dl);
    }, 20);
  },

  closeModal() {
    const modal = document.getElementById('project-entry-modal-container');
    if (modal) modal.innerHTML = '';
  },

  async saveProjectEntry(event) {
    if (event && event.preventDefault) event.preventDefault();
    const nameInput = document.getElementById('proj-name');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      if (typeof window.showToast === 'function') window.showToast("Please enter a Project Name", "warning");
      if (nameInput) nameInput.focus();
      return;
    }

    const editTaskIdElem = document.getElementById('proj-edit-task-id');
    const isNewElem = document.getElementById('proj-is-new');
    const isNew = isNewElem ? (isNewElem.value === 'true') : false;
    const targetTaskId = editTaskIdElem ? editTaskIdElem.value.trim() : `PROJ-2026-${Date.now().toString().slice(-4)}`;

    const categoryElem = document.getElementById('proj-category');
    const category = categoryElem ? categoryElem.value : "Ongoing Projects";

    // Validate Deadline (Requirement 5: Required, cannot be empty)
    const deadlineInput = document.getElementById('proj-deadline');
    const deadline = deadlineInput ? deadlineInput.value.trim() : '';
    if (!deadline) {
      if (typeof window.showToast === 'function') {
        window.showToast("⚠️ Deadline is required! Please enter a valid deadline.", "warning");
      } else {
        alert("Deadline is required! Please enter a valid deadline.");
      }
      if (deadlineInput) {
        deadlineInput.focus();
        deadlineInput.classList.add('ring-2', 'ring-red-400', 'border-red-500');
      }
      return;
    }

    // Validate Status Details (Requirement 5: Bottom box, mandatory, cannot be empty)
    const statusDetailsInput = document.getElementById('proj-status-details');
    const statusDetails = statusDetailsInput ? statusDetailsInput.value.trim() : '';
    if (!statusDetails) {
      if (typeof window.showToast === 'function') {
        window.showToast("⚠️ Project Status Details is required! This field cannot be left empty.", "warning");
      } else {
        alert("Project Status Details is required! This field cannot be left empty.");
      }
      if (statusDetailsInput) {
        statusDetailsInput.focus();
        statusDetailsInput.classList.add('ring-2', 'ring-red-400', 'border-red-500');
      }
      return;
    }

    const assignee = document.getElementById('proj-assignee').value;
    const overviewArea = document.getElementById('proj-overview');
    const overview = overviewArea ? overviewArea.value.trim() : '';
    if (!overview) {
      if (typeof window.showToast === 'function') {
        window.showToast("⚠️ Project Description is required!", "warning");
      }
      if (overviewArea) overviewArea.focus();
      return;
    }
    const details = document.getElementById('proj-details').value.trim();

    const isCompleted = (category === 'Completed Projects');
    const projectStatus = isCompleted ? 'Completed' : 'Ongoing';
    const photoUrl = this.getProjectPhoto(targetTaskId) || "";

    const list = this.getProjects();

    if (!isNew) {
      // UPDATE EXISTING PROJECT IN PERMANENT STORE
      const existing = list.find(p => p.task_id === targetTaskId);
      if (existing) {
        existing.task_name = name;
        existing.category = category;
        existing.status = projectStatus;
        existing.project_status = projectStatus;
        existing.status_details = statusDetails;
        existing.project_status_details = statusDetails;
        existing.deadline = deadline;
        existing.overview = overview;
        existing.description = overview;
        existing.task_details = details;
        existing.assignee = assignee;
        existing.engineer = assignee;
        if (photoUrl) {
          existing.photo_1 = photoUrl;
          existing.photo = photoUrl;
          existing.before_photo = photoUrl;
        }
        existing.last_updated = new Date().toISOString();
      }
      this.saveProjects(list);

      // Ensure strategic project never pollutes monthly tasks (Requirement 1 & 2)
      if (window.appState && window.appState.workbookMgr) {
        window.appState.workbookMgr.deleteTask(this.selectedMonth, targetTaskId);
      }

      this.closeModal();
      if (typeof window.showToast === 'function') {
        window.showToast(`Updated strategic project: ${name}`, "success");
      }
    } else {
      // ADD NEW STRATEGIC PROJECT IN PERMANENT STORE
      const newProj = {
        task_id: targetTaskId,
        task_name: name,
        category: category,
        status: projectStatus,
        project_status: projectStatus,
        status_details: statusDetails,
        project_status_details: statusDetails,
        deadline: deadline,
        overview: overview,
        description: overview,
        task_details: details,
        assignee: assignee,
        engineer: assignee,
        photo_1: photoUrl,
        photo: photoUrl,
        before_photo: photoUrl,
        is_project: true,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };
      list.push(newProj);
      this.saveProjects(list);

      // Ensure strategic project never pollutes monthly tasks (Requirement 1 & 2)
      if (window.appState && window.appState.workbookMgr) {
        window.appState.workbookMgr.deleteTask(this.selectedMonth, targetTaskId);
      }

      this.closeModal();
      if (typeof window.showToast === 'function') {
        window.showToast(`🚀 Added strategic project: ${name}`, "success");
      }
    }

    if (window.appState && window.appState.syncEngine) {
      await window.appState.syncEngine.syncMonth(this.selectedMonth);
    }

    await this.render();
  },

  async render(containerId = 'projects-view-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const workbookMgr = window.appState && window.appState.workbookMgr
      ? window.appState.workbookMgr
      : new MonthWorkbookManager();

    const month = this.selectedMonth;
    const months = workbookMgr.getAllMonths();

    // Load permanently preserved strategic projects
    const projectTasks = this.getProjects();

    const ongoingProjects = projectTasks.filter(t => {
      const status = (t.status || t.project_status || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      return !status.includes('complete') && !cat.includes('completed project');
    });

    const completedProjects = projectTasks.filter(t => {
      const status = (t.status || t.project_status || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      return status.includes('complete') || cat.includes('completed project');
    });

    const prevMonth = workbookMgr.getPreviousMonth(month);

    const renderStatusBadge = (p) => {
      const st = p.project_status || p.status || 'Ongoing';
      const details = p.status_details || p.project_status_details || '';
      let badge = '';
      if (st === 'Completed') {
        badge = `<span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs"><span>✅</span> <span>Completed</span></span>`;
      } else if (st === 'Under Trial') {
        badge = `<span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs"><span>🔬</span> <span>Under Trial</span></span>`;
      } else if (st === 'Planning') {
        badge = `<span class="px-2.5 py-1 rounded-full bg-purple-100 text-purple-900 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs"><span>📝</span> <span>Planning</span></span>`;
      } else {
        badge = `<span class="px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs"><span>⏳</span> <span>Ongoing</span></span>`;
      }
      return `${badge}${details ? `<div class="text-[10px] text-slate-600 mt-1.5 font-medium line-clamp-2 px-1 max-w-[150px] mx-auto text-center" title="${HELPERS.escapeHtml(details)}">${HELPERS.escapeHtml(details)}</div>` : ''}`;
    };

    container.innerHTML = `
      <div class="space-y-6 font-sans">
        
        <!-- Header Bar with Walton Branding, Month Navigation & Actions -->
        <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div class="flex items-center gap-4">
              <img src="assets/img/walton_logo.png" alt="WALTON" class="h-12 w-auto object-contain flex-shrink-0 drop-shadow-sm">
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200">
                    STRATEGIC AUTOMATION
                  </span>
                  <span class="text-xs text-slate-400 font-mono">Multi-Month Project Management</span>
                </div>
                <h2 class="text-2xl font-black text-slate-800 mt-1">Department Projects: ${month}</h2>
                <p class="text-xs text-slate-400 mt-0.5">
                  Track multi-month engineering projects. Ongoing projects automatically carry forward month-to-month and appear at the end of report decks.
                </p>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-wrap items-center gap-2.5">
              ${(prevMonth && month !== 'SEP-2026') ? `
                <button onclick="ProjectsView.handleSyncFromPreviousMonth()" title="Carry forward active ongoing projects from ${prevMonth} into ${month}"
                        class="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                  <span>🔄</span> <span>Sync from ${prevMonth}</span>
                </button>
              ` : ''}

              <button onclick="ProjectsView.previewAllProjectSlides()" title="Preview Executive 16:9 Presentation Slides of Strategic Projects"
                      class="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white font-black text-xs shadow-md shadow-indigo-200/50 transition flex items-center gap-1.5 cursor-pointer">
                <span>👁️</span> <span>Slide Preview (${projectTasks.length})</span>
              </button>

              <button onclick="ProjectsView.openNewProjectModal()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-black text-xs shadow-md shadow-sky-200/50 transition flex items-center gap-1.5 cursor-pointer">
                <span>➕</span> <span>New Project Task</span>
              </button>
            </div>
          </div>

          <!-- Controls: Month Selector + Filter Tabs + View Mode Switcher -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
            ${HELPERS.renderMonthSelectorUI(months, this.selectedMonth, 'ProjectsView.handleMonthSelect', 'MonthlyInputView.openAddMonthModal')}

            <div class="flex flex-wrap items-center gap-2.5">
              <!-- View Mode Switcher -->
              <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                <button onclick="ProjectsView.setViewMode('table')" class="px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${this.viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                  <span>📋</span> <span>Table View</span>
                </button>
                <button onclick="ProjectsView.setViewMode('slides')" class="px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${this.viewMode === 'slides' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                  <span>🖼️</span> <span>Slide Cards</span>
                </button>
              </div>

              <!-- Filter Pills -->
              <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button onclick="ProjectsView.setFilter('all')" class="px-3 py-1 rounded-lg text-xs font-bold transition ${this.activeFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                  All (${projectTasks.length})
                </button>
                <button onclick="ProjectsView.setFilter('ongoing')" class="px-3 py-1 rounded-lg text-xs font-bold transition ${this.activeFilter === 'ongoing' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                  Ongoing (${ongoingProjects.length})
                </button>
                <button onclick="ProjectsView.setFilter('completed')" class="px-3 py-1 rounded-lg text-xs font-bold transition ${this.activeFilter === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                  Completed (${completedProjects.length})
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- KPI SUMMARY CARDS -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- Card 1: New / Ongoing Projects -->
          <div class="bg-gradient-to-br from-sky-500/10 to-blue-500/5 border border-sky-200 rounded-3xl p-6 shadow-sm flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-sky-500 shadow-sm shadow-sky-200"></span>
                <span class="text-xs font-mono font-bold uppercase tracking-wider text-sky-800">New Projects / Ongoing</span>
              </div>
              <div class="text-4xl font-black text-sky-900 font-mono mt-2">${ongoingProjects.length}</div>
              <p class="text-xs text-slate-600 mt-1 font-medium">Strategic automation tasks currently active in ${month}</p>
              <div class="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 text-sky-800 text-[11px] font-semibold">
                <span>⏱️</span> <span>Typical duration: 4-5 months &bull; Auto-carries over</span>
              </div>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-sky-100 border border-sky-200 flex items-center justify-center text-2xl flex-shrink-0 text-sky-600">
              🚀
            </div>
          </div>

          <!-- Card 2: Completed Projects -->
          <div class="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-200 rounded-3xl p-6 shadow-sm flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></span>
                <span class="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800">Completed Projects</span>
              </div>
              <div class="text-4xl font-black text-emerald-900 font-mono mt-2">${completedProjects.length}</div>
              <p class="text-xs text-slate-600 mt-1 font-medium">Fully verified & implemented milestone completions</p>
              <div class="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-[11px] font-semibold">
                <span>✅</span> <span>Milestone verification finished</span>
              </div>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-2xl flex-shrink-0 text-emerald-600">
              🏆
            </div>
          </div>
        </div>

        <!-- SECTION 1: ONGOING PROJECTS -->
        ${(this.activeFilter === 'all' || this.activeFilter === 'ongoing') ? `
          <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center text-lg shadow-sm">
                  ⏳
                </div>
                <div>
                  <h3 class="text-base font-black text-slate-800">Active Ongoing Projects (${ongoingProjects.length})</h3>
                  <p class="text-xs text-slate-400">These tasks carry forward across months until marked as Completed</p>
                </div>
              </div>

              ${ongoingProjects.length > 0 ? `
                <button onclick="ProjectsView.previewAllProjectSlides()" class="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                  <span>👁️</span> <span>Preview Slides (${ongoingProjects.length})</span>
                </button>
              ` : ''}
            </div>

            ${ongoingProjects.length === 0 ? `
              <div class="py-12 text-center text-slate-400 font-mono text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                No active ongoing projects recorded for ${month}.<br>
                ${(prevMonth && month !== 'SEP-2026') ? `
                  <button onclick="ProjectsView.handleSyncFromPreviousMonth()" class="mt-3 px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs inline-flex items-center gap-1.5 transition">
                    <span>🔄</span> <span>Carry forward ongoing projects from ${prevMonth}</span>
                  </button>
                ` : `
                  <button onclick="ProjectsView.openNewProjectModal()" class="mt-3 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition">
                    <span>➕</span> <span>Add First Project</span>
                  </button>
                `}
              </div>
            ` : (this.viewMode === 'slides' ? `
              <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                ${ongoingProjects.map((p, idx) => this.renderSlideCard(p, idx)).join('')}
              </div>
            ` : `
              <div class="overflow-x-auto rounded-2xl border border-slate-200">
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-sky-50 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th class="py-3 px-3 w-12 text-center border-r border-slate-200">SL</th>
                      <th class="py-3 px-3 w-20 text-center border-r border-slate-200">Photo</th>
                      <th class="py-3 px-4 border-r border-slate-200 w-60">Project Name</th>
                      <th class="py-3 px-4 border-r border-slate-200">Project Overview &amp; Milestones</th>
                      <th class="py-3 px-3 border-r border-slate-200 w-36">Deadline</th>
                      <th class="py-3 px-3 border-r border-slate-200 w-36">Assignee</th>
                      <th class="py-3 px-3 text-center border-r border-slate-200 w-32">Project Status</th>
                      <th class="py-3 px-3 text-center w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 bg-white">
                    ${ongoingProjects.map((p, idx) => {
                      const photoUrl = this.getProjectPhoto(p.task_id);
                      const desc = p.overview || p.description || p.task_details || '—';
                      return `
                        <tr class="hover:bg-slate-50/80 transition">
                          <td class="py-3 px-3 text-center font-mono font-bold text-slate-500 border-r border-slate-100">${idx + 1}</td>
                          <td class="py-3 px-2 text-center border-r border-slate-100">
                            ${photoUrl ? `
                              <img src="${photoUrl}" alt="Photo" class="w-14 h-9 object-cover rounded-lg border border-slate-200 shadow-2xs mx-auto cursor-pointer hover:scale-105 transition" onclick="ProjectsView.previewPhoto('${photoUrl}', '${HELPERS.escapeHtml(p.task_name)}')" />
                            ` : `
                              <div class="w-14 h-9 rounded-lg bg-slate-100 border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400 mx-auto">
                                📷 No Img
                              </div>
                            `}
                          </td>
                          <td class="py-3 px-4 font-black text-slate-800 border-r border-slate-100">${HELPERS.escapeHtml(p.task_name)}</td>
                          <td class="py-3 px-4 text-slate-600 border-r border-slate-100">
                            <div class="line-clamp-2">${HELPERS.escapeHtml(desc)}</div>
                          </td>
                          <td class="py-3 px-3 font-mono text-slate-600 border-r border-slate-100">${HELPERS.escapeHtml(p.deadline || '4-5 Months')}</td>
                          <td class="py-3 px-3 font-bold text-slate-800 border-r border-slate-100">${HELPERS.escapeHtml(p.assignee || p.engineer || '—')}</td>
                          <td class="py-3 px-3 text-center border-r border-slate-100">
                            ${renderStatusBadge(p)}
                          </td>
                          <td class="py-3 px-3 text-center">
                            <div class="flex items-center justify-center gap-1.5">
                              <button onclick="ProjectsView.previewProjectSlide('${p.task_id}')" title="Preview 16:9 Presentation Slide" class="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition">
                                👁️
                              </button>
                              <button onclick="ProjectsView.openEditProjectModal('${p.task_id}')" title="Edit Project Details" class="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition">
                                ✏️
                              </button>
                              <button onclick="ProjectsView.toggleProjectStatus('${p.task_id}')" title="Mark Completed" class="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition">
                                ✅
                              </button>
                              <button onclick="ProjectsView.deleteProject('${p.task_id}')" title="Delete Project" class="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition">
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `)}
          </div>
        ` : ''}

        <!-- SECTION 2: COMPLETED PROJECTS -->
        ${(this.activeFilter === 'all' || this.activeFilter === 'completed') ? `
          <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-lg shadow-sm">
                  🏆
                </div>
                <div>
                  <h3 class="text-base font-black text-slate-800">Completed Projects (${completedProjects.length})</h3>
                  <p class="text-xs text-slate-400">Finished automation milestones documented with verified outcomes</p>
                </div>
              </div>

              ${completedProjects.length > 0 ? `
                <button onclick="ProjectsView.previewAllProjectSlides()" class="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                  <span>👁️</span> <span>Preview Slides (${completedProjects.length})</span>
                </button>
              ` : ''}
            </div>

            ${completedProjects.length === 0 ? `
              <div class="py-12 text-center text-slate-400 font-mono text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                No completed projects recorded for ${month}. When an ongoing project finishes, change its status to Completed.
              </div>
            ` : (this.viewMode === 'slides' ? `
              <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                ${completedProjects.map((p, idx) => this.renderSlideCard(p, ongoingProjects.length + idx)).join('')}
              </div>
            ` : `
              <div class="overflow-x-auto rounded-2xl border border-slate-200">
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-emerald-50 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th class="py-3 px-3 w-12 text-center border-r border-slate-200">SL</th>
                      <th class="py-3 px-3 w-20 text-center border-r border-slate-200">Photo</th>
                      <th class="py-3 px-4 border-r border-slate-200 w-60">Project Name</th>
                      <th class="py-3 px-4 border-r border-slate-200">Project Overview &amp; Outcomes</th>
                      <th class="py-3 px-3 border-r border-slate-200 w-36">Deadline</th>
                      <th class="py-3 px-3 border-r border-slate-200 w-36">Assignee</th>
                      <th class="py-3 px-3 text-center border-r border-slate-200 w-32">Project Status</th>
                      <th class="py-3 px-3 text-center w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 bg-white">
                    ${completedProjects.map((p, idx) => {
                      const photoUrl = this.getProjectPhoto(p.task_id);
                      const desc = p.overview || p.description || p.task_details || '—';
                      return `
                        <tr class="hover:bg-slate-50/80 transition">
                          <td class="py-3 px-3 text-center font-mono font-bold text-slate-500 border-r border-slate-100">${idx + 1}</td>
                          <td class="py-3 px-2 text-center border-r border-slate-100">
                            ${photoUrl ? `
                              <img src="${photoUrl}" alt="Photo" class="w-14 h-9 object-cover rounded-lg border border-slate-200 shadow-2xs mx-auto cursor-pointer hover:scale-105 transition" onclick="ProjectsView.previewPhoto('${photoUrl}', '${HELPERS.escapeHtml(p.task_name)}')" />
                            ` : `
                              <div class="w-14 h-9 rounded-lg bg-slate-100 border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400 mx-auto">
                                📷 No Img
                              </div>
                            `}
                          </td>
                          <td class="py-3 px-4 font-black text-slate-800 border-r border-slate-100">${HELPERS.escapeHtml(p.task_name)}</td>
                          <td class="py-3 px-4 text-slate-600 border-r border-slate-100">
                            <div class="line-clamp-2">${HELPERS.escapeHtml(desc)}</div>
                          </td>
                          <td class="py-3 px-3 font-mono text-slate-600 border-r border-slate-100">${HELPERS.escapeHtml(p.deadline || 'Completed')}</td>
                          <td class="py-3 px-3 font-bold text-slate-800 border-r border-slate-100">${HELPERS.escapeHtml(p.assignee || p.engineer || '—')}</td>
                          <td class="py-3 px-3 text-center border-r border-slate-100">
                            ${renderStatusBadge(p)}
                          </td>
                          <td class="py-3 px-3 text-center">
                            <div class="flex items-center justify-center gap-1.5">
                              <button onclick="ProjectsView.previewProjectSlide('${p.task_id}')" title="Preview 16:9 Presentation Slide" class="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition">
                                👁️
                              </button>
                              <button onclick="ProjectsView.openEditProjectModal('${p.task_id}')" title="Edit Project Details" class="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition">
                                ✏️
                              </button>
                              <button onclick="ProjectsView.toggleProjectStatus('${p.task_id}')" title="Reopen as Ongoing" class="p-1.5 rounded-lg hover:bg-sky-50 text-sky-600 transition">
                                🔄
                              </button>
                              <button onclick="ProjectsView.deleteProject('${p.task_id}')" title="Delete Project" class="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition">
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `)}
          </div>
        ` : ''}

      </div>
    `;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProjectsView;
} else if (typeof window !== 'undefined') {
  window.ProjectsView = ProjectsView;
}