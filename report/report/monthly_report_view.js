/**
 * Process Development Monthly Report Automation System
 * Module: Monthly Report View (Slide Deck Sequence & Editorial Overrides Hub)
 * Requirement 3: Dedicated Monthly Report section displaying complete slide-by-slide sequence,
 * live editorial overrides/modifications, full deck preview, and 1-click export (PPTX, PDF, HTML).
 * WALTON Hi-Tech Industries PLC
 */

const REPORT_CATEGORY_META = {
  "process development": {
    label: "Process Developed",
    icon: "⚙️",
    note: "SOP & Method Engineering",
    bg: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
    border: "#60A5FA",
    valColor: "#1D4ED8",
    labelColor: "#1E3A8A",
    shadow: "rgba(59,130,246,0.16)"
  },
  "major developments - process": {
    label: "Process Developed",
    icon: "⚙️",
    note: "SOP & Method Engineering",
    bg: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
    border: "#60A5FA",
    valColor: "#1D4ED8",
    labelColor: "#1E3A8A",
    shadow: "rgba(59,130,246,0.16)"
  },
  "major developments - tools": {
    label: "Tools Developed",
    icon: "🔧",
    note: "Jigs, Dies & Fixtures",
    bg: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)",
    border: "#818CF8",
    valColor: "#4338CA",
    labelColor: "#312E81",
    shadow: "rgba(99,102,241,0.16)"
  },
  "major developments - parts": {
    label: "Parts Developed",
    icon: "🔩",
    note: "Components & Sheet Metal",
    bg: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
    border: "#34D399",
    valColor: "#047857",
    labelColor: "#064E3B",
    shadow: "rgba(16,185,129,0.16)"
  },
  "major developments - materials": {
    label: "Materials Development",
    icon: "🧪",
    note: "Raw Materials & Metallurgy",
    bg: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)",
    border: "#4ADE80",
    valColor: "#15803D",
    labelColor: "#14532D",
    shadow: "rgba(34,197,94,0.16)"
  },
  "major developments - chemical": {
    label: "Chemical Development",
    icon: "🔬",
    note: "SWAAT Trials & Chemicals",
    bg: "linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)",
    border: "#22D3EE",
    valColor: "#0E7490",
    labelColor: "#164E63",
    shadow: "rgba(6,182,212,0.16)"
  },
  "bom verification": {
    label: "BOM Verification",
    icon: "📋",
    note: "Physical Audit & Reconciliation",
    bg: "linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)",
    border: "#FB7185",
    valColor: "#BE123C",
    labelColor: "#881337",
    shadow: "rgba(244,63,94,0.16)"
  },
  "fg bom/ sfg": {
    label: "FG BOM / SFG",
    icon: "📦",
    note: "BOM Structure & Confirmations",
    bg: "linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)",
    border: "#F472B6",
    valColor: "#BE185D",
    labelColor: "#831843",
    shadow: "rgba(236,72,153,0.16)"
  },
  "cost saving": {
    label: "Cost Optimization",
    icon: "💰",
    note: "Financial & Yield Savings",
    bg: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
    border: "#FBBF24",
    valColor: "#B45309",
    labelColor: "#78350F",
    shadow: "rgba(245,158,11,0.16)"
  },
  "cost savings (local)": {
    label: "Cost Savings (Local)",
    icon: "🪙",
    note: "Domestic Plant Saving",
    bg: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
    border: "#FBBF24",
    valColor: "#B45309",
    labelColor: "#78350F",
    shadow: "rgba(245,158,11,0.16)"
  },
  "cost savings (ibu)": {
    label: "Cost Savings (IBU)",
    icon: "💵",
    note: "International Business Saving",
    bg: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
    border: "#FBBF24",
    valColor: "#B45309",
    labelColor: "#78350F",
    shadow: "rgba(245,158,11,0.16)"
  },
  "new model(local)": {
    label: "New Model (Local)",
    icon: "✨",
    note: "Model Introduction & Trial",
    bg: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)",
    border: "#A78BFA",
    valColor: "#6D28D9",
    labelColor: "#4C1D95",
    shadow: "rgba(139,92,246,0.16)"
  },
  "process optimization": {
    label: "Process Optimization",
    icon: "👥",
    note: "Line Balancing & Efficiency",
    bg: "linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)",
    border: "#C084FC",
    valColor: "#7E22CE",
    labelColor: "#581C87",
    shadow: "rgba(168,85,247,0.16)"
  },
  "process extension": {
    label: "Process Extension",
    icon: "🏗️",
    note: "Plant Capacity & Line Expansion",
    bg: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)",
    border: "#38BDF8",
    valColor: "#0369A1",
    labelColor: "#0C4A6E",
    shadow: "rgba(14,165,233,0.16)"
  }
};

const MonthlyReportView = {
  selectedMonth: "SEP-2026",
  filterEngineer: "",
  filterCategory: "",
  searchQuery: "",

  handleMonthSelect(month) {
    this.selectedMonth = month;
    if (typeof FinalEditorView !== 'undefined') FinalEditorView.selectedMonth = month;
    if (typeof MonthlyInputView !== 'undefined') MonthlyInputView.selectedMonth = month;
    this.render();
  },

  applyFiltersLocally() {
    const q = (this.searchQuery || "").trim().toLowerCase();
    const engFilter = (this.filterEngineer || "").trim().toLowerCase();
    const engFirst = engFilter ? engFilter.split(/[\s(]/)[0] : "";
    const catFilter = (this.filterCategory || "").trim().toLowerCase().replace(/–/g, '-');

    const cards = document.querySelectorAll('.task-slide-card');
    if (cards.length === 0) {
      this.render();
      return;
    }

    let visibleCount = 0;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const cardEng = (card.dataset.engineer || "").toLowerCase();
      const cardCat = (card.dataset.category || "").toLowerCase().replace(/–/g, '-');
      const isProject = card.dataset.isProject === 'true';
      const cardStatus = (card.dataset.status || "").toLowerCase();

      // 1. Check engineer match
      let engMatch = true;
      if (engFilter) {
        const filterTokens = engFilter.match(/[a-z0-9]+/g) || [];
        const cardTokens = cardEng.match(/[a-z0-9]+/g) || [];
        engMatch = cardEng.includes(engFilter) || engFilter.includes(cardEng);
        if (!engMatch && filterTokens.length > 0) {
          engMatch = filterTokens.some(tok => tok.length >= 3 && cardTokens.includes(tok));
        }
      }

      if (!engMatch) {
        if (card.style.display !== 'none') card.style.display = 'none';
        continue;
      }

      // 2. Check category match
      let catMatch = true;
      if (catFilter) {
        if (catFilter.includes('complete') && (isProject || cardCat.includes('project'))) {
          catMatch = cardStatus === 'completed' || cardCat.includes('complete');
        } else if (catFilter.includes('ongoing') && (isProject || cardCat.includes('project'))) {
          catMatch = cardStatus !== 'completed' && !cardCat.includes('complete');
        } else {
          catMatch = cardCat.includes(catFilter) || cardCat === catFilter;
        }
      }

      if (!catMatch) {
        if (card.style.display !== 'none') card.style.display = 'none';
        continue;
      }

      // 3. Check search query match (only if q is provided)
      let searchMatch = true;
      if (q) {
        const searchData = card.dataset.searchText || '';
        searchMatch = searchData ? searchData.includes(q) : card.textContent.toLowerCase().includes(q);
      }

      if (!searchMatch) {
        if (card.style.display !== 'none') card.style.display = 'none';
        continue;
      }

      if (card.style.display !== '') card.style.display = '';
      visibleCount++;
    }

    // Update filter counter
    const counter = document.getElementById('monthly-report-filtered-counter');
    if (counter) {
      counter.textContent = `${visibleCount} slides`;
    }

    // Update empty state placeholder
    const emptyState = document.getElementById('monthly-report-no-slides-msg');
    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? '' : 'none';
    }
  },

  handleEngineerFilter(eng) {
    this.filterEngineer = eng || "";
    // Instant DOM button styling update - 0ms lag!
    const filterContainer = document.getElementById('monthly-report-engineer-filters');
    if (filterContainer) {
      filterContainer.querySelectorAll('.engineer-filter-btn').forEach(btn => {
        const btnEng = btn.dataset.engineer || "";
        const isSel = (this.filterEngineer.toLowerCase() === btnEng.toLowerCase());
        const countBadge = btn.querySelector('.engineer-count-badge');
        if (isSel) {
          btn.className = "engineer-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold transition border flex-shrink-0 flex items-center gap-1.5 bg-blue-600 text-white border-blue-600 shadow-2xs";
          if (countBadge) countBadge.className = "engineer-count-badge px-1.5 py-0.2 rounded-full text-[10.5px] font-mono font-black bg-white/25 text-white";
        } else {
          btn.className = "engineer-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold transition border flex-shrink-0 flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border-slate-200";
          if (countBadge) countBadge.className = "engineer-count-badge px-1.5 py-0.2 rounded-full text-[10.5px] font-mono font-black bg-blue-50 text-blue-700";
        }
      });
      const allBtn = document.getElementById('monthly-report-all-engineers-btn');
      if (allBtn) {
        const isAll = !this.filterEngineer;
        const countBadge = allBtn.querySelector('.engineer-count-badge');
        if (isAll) {
          allBtn.className = "px-3 py-1.5 rounded-xl text-xs font-bold transition border flex-shrink-0 flex items-center gap-1.5 bg-slate-900 text-white border-slate-900 shadow-2xs";
          if (countBadge) countBadge.className = "engineer-count-badge px-1.5 py-0.2 rounded-full text-[10.5px] font-mono font-black bg-white/20 text-white";
        } else {
          allBtn.className = "px-3 py-1.5 rounded-xl text-xs font-bold transition border flex-shrink-0 flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200";
          if (countBadge) countBadge.className = "engineer-count-badge px-1.5 py-0.2 rounded-full text-[10.5px] font-mono font-black bg-slate-200 text-slate-800";
        }
      }
    }
    this.applyFiltersLocally();
  },

  handleCategoryFilter(cat) {
    if (this.filterCategory === (cat || "")) {
      this.filterCategory = "";
    } else {
      this.filterCategory = cat || "";
    }
    this.render();
  },

  handleSearch(query) {
    this.searchQuery = (query || "").trim().toLowerCase();
    this.applyFiltersLocally();
  },

  renderContainer() {
    let container = document.getElementById('monthly-report-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'monthly-report-modal-container';
      document.body.appendChild(container);
    }
    return container;
  },

  /**
   * Intelligently auto-generates engineering narrative sentences and deliverables tailored to the task title
   * Requirement 3: "2nd photo, ekhane description and impact auto generate hoye thakbe title onujayi."
   */
  generateDetailsFromTitle(taskName, category = '') {
    if (!taskName) {
      return {
        desc: "Developed and implemented specialized process engineering mechanism. The system was designed, fabricated, calibrated, and commissioned for regular active production use.",
        bullets: [
          "Process cycle time reduced and standardized across shifts",
          "Eliminates manual operator strain and operational defect risks",
          "Increases active line throughput and ensures zero defect quality"
        ]
      };
    }

    const raw = String(taskName || '').trim();
    const lower = raw.toLowerCase();
    let desc = "";
    let bullets = [];

    // 1. Digital / Software / TMS / Task Management / Portal / Web System Automation
    if (lower.includes("task management") || lower.includes("tms") || lower.includes("portal") || lower.includes("software") || lower.includes("dashboard") || lower.includes("database") || lower.includes("report automation") || (lower.includes("automation") && (lower.includes("system") || lower.includes("data") || lower.includes("management") || lower.includes("excel")))) {
      desc = `Engineered and deployed digital process automation for ${raw.toLowerCase()}. Standardized task milestones, real-time logging, and transparent performance tracking across engineering operations.`;
      bullets = [
        `Automated task milestone tracking & digital logging`,
        `Eliminated manual coordination delays & paperwork bottlenecks`,
        `Real-time operational visibility & performance tracking`,
        `Validated multi-user system deployment across plant teams`
      ];
    }
    // 2. Vacuum / Evacuation / Charging / Refrigerant / Leakage
    else if (lower.includes("vacuum") || lower.includes("evacuation") || lower.includes("charging") || lower.includes("refrigerant") || lower.includes("leakage") || lower.includes("brazing") || lower.includes("helium") || lower.includes("suction")) {
      desc = `Conducted vacuum evacuation optimization and process observation for ${raw.toLowerCase()}. Streamlined station flow parameters to reduce cycle time while ensuring stringent vacuum micron limits and refrigeration integrity.`;
      bullets = [
        `Vacuum drawdown cycle time analyzed & optimized across active stations`,
        `Identified station process bottlenecks and eliminated evacuation delays`,
        `Maintained stringent vacuum hold level & moisture-free quality standards`,
        `Improved line throughput and cycle synchronization with production pacing`
      ];
    }
    // 3. Conveyor / R&I / Material Transfer / Handover / Rework Line
    else if (lower.includes("conveyor") || lower.includes("roller") || lower.includes("r&i") || lower.includes("rework") || lower.includes("transfer") || lower.includes("handover") || lower.includes("trolley") || lower.includes("handling")) {
      desc = `Engineered and coordinated conveyor transfer mechanism for ${raw.toLowerCase()}. Streamlined unit transit between stations, eliminated manual carrying fatigue, and ensured smooth production flow.`;
      bullets = [
        `Established dedicated conveyor transfer routing between production zones`,
        `Minimized manual handling fatigue & reduced unit transit damage risks`,
        `Synchronized line handover speed with continuous assembly pace`,
        `Standardized safe handling and conveyor transfer operating procedure`
      ];
    }
    // 4. Die / Fixture / Tooling / Mold / Cutter / Stamping / Jacket / Forming
    else if (lower.includes("die") || lower.includes("fixture") || lower.includes("jig") || lower.includes("cutter") || lower.includes("mold") || lower.includes("tool") || lower.includes("stamping") || lower.includes("jacket") || lower.includes("punch") || lower.includes("forming")) {
      desc = `Designed, fabricated, and validated modified tooling fixture for ${raw.toLowerCase()}. Verified fitment tolerances, dimensional precision, and completed line trial handover.`;
      bullets = [
        `Tooling design & precision fabrication completed to engineering specs`,
        `Verified fitment tolerance, clearance, and component forming accuracy`,
        `Reduced tooling changeover time and minimized production deviation`,
        `Successful trial validation and handover for regular line production`
      ];
    }
    // 5. BOM Verification / Material Audit / Store / SFG / Inspection
    else if (lower.includes("bom") || lower.includes("audit") || lower.includes("sfg") || lower.includes("verification") || lower.includes("inspection") || lower.includes("store") || lower.includes("sheet") || lower.includes("coil") || lower.includes("rm") || lower.includes("raw material") || lower.includes("reconciliation")) {
      desc = `Conducted physical component audit and technical verification for ${raw.toLowerCase()}. Reconciled material usage and verified specifications against approved engineering drawings.`;
      bullets = [
        `Physical line observation & part count verified on active lines`,
        `Verified material specifications & tolerance compliance against drawings`,
        `Eliminated defective processing & storage scrap risks across shifts`,
        `Audit sign-off completed for active production lines`
      ];
    }
    // 6. Chemical / Coating / SWAAT / Corrosion / Metallurgy / Acid
    else if (lower.includes("chemical") || lower.includes("corrosion") || lower.includes("acid") || lower.includes("coating") || lower.includes("swaat") || lower.includes("paint") || lower.includes("treatment")) {
      desc = `Executed chemical treatment and surface corrosion resistance trial for ${raw.toLowerCase()}. Verified coating adhesion and durability compliance against Walton AC engineering standards.`;
      bullets = [
        `Superior corrosion and environmental degradation resistance verified`,
        `Standardized chemical bath parameters and immersion cycle timings`,
        `Strict adherence to Walton metallurgical & reliability benchmarks`,
        `Zero chemical defect deviation confirmed on production trial`
      ];
    }
    // 7. Cost Savings / Kaizen / Scrap / Wastage / Yield
    else if (lower.includes("cost") || lower.includes("saving") || lower.includes("wastage") || lower.includes("scrap") || lower.includes("yield") || lower.includes("kaizen")) {
      desc = `Conducted material audit and process yield optimization for ${raw.toLowerCase()}. Streamlined material consumption and eliminated trim waste to maximize production value.`;
      bullets = [
        `Eliminated process scrap generation & trim material loss`,
        `Direct optimization of production consumables and unit cost`,
        `Improved material yield and workflow sequence across lines`,
        `Validated sustainable resource utilization for active production`
      ];
    }
    // 8. Hardware Robotics / Motor / Turret / Machine Automation
    else if (lower.includes("robot") || lower.includes("motor") || lower.includes("sensor") || lower.includes("turret") || lower.includes("press") || lower.includes("pneumatic") || lower.includes("interlock") || lower.includes("automation")) {
      desc = `Engineered and integrated automated control mechanism for ${raw.toLowerCase()}. Successfully tested safety interlocks, optimized cycle parameters, and commissioned on the active line.`;
      bullets = [
        `Automated repetitive manual handling and loading operations`,
        `Increased continuous line throughput & machine cycle repeatability`,
        `Enhanced operator safety interlocks and handling ergonomics`,
        `Commissioned on active manufacturing line with validated reliability`
      ];
    }
    // 9. New Model / Pilot Trial / Line Balancing / Sample
    else if (lower.includes("model") || lower.includes("trial") || lower.includes("pilot") || lower.includes("sample") || lower.includes("balancing")) {
      desc = `Executed pilot production trial, line balancing, and assembly verification for ${raw.toLowerCase()}. Addressed station bottlenecks and confirmed commercial production readiness.`;
      bullets = [
        `Component readiness & line tooling verified before trial`,
        `Pilot assembly completed with balanced station cycle times`,
        `Handled station bottlenecks and confirmed ergonomic workflow`,
        `Approved for commercial mass manufacturing handover`
      ];
    }
    // 10. General Engineering Development (Intelligent terms extraction from title)
    else {
      const cleanWords = raw.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
      const subject = cleanWords.slice(0, 4).join(' ') || raw;
      desc = `Engineered, verified, and standardized operational workflow for ${raw.toLowerCase()}. Optimized process parameters and commissioned for regular daily manufacturing use.`;
      bullets = [
        `Process layout & technical analysis finalized for ${subject}`,
        `Implemented standardized operating mechanism on production line`,
        `Eliminated manual bottlenecks & stabilized operational cycle time`,
        `Production trial validation and operator handover completed`
      ];
    }

    return { desc, bullets };
  },

  /**
   * Auto-generates concise narrative overview and deliverables derived from task name
   */
  generateSlideDetails(taskId) {
    const titleInput = document.getElementById('edit-slide-title');
    const catInput = document.getElementById('edit-slide-category');
    const taskName = (titleInput ? titleInput.value.trim() : '') || taskId;
    const category = (catInput ? catInput.value.trim() : '') || 'Process development';
    if (!taskName) {
      if (typeof window.showToast === 'function') {
        window.showToast("Please enter a slide title or task name first.", "warning");
      }
      return;
    }

    const { desc, bullets } = this.generateDetailsFromTitle(taskName, category);

    const descEl = document.getElementById('edit-slide-desc');
    const impactEl = document.getElementById('edit-slide-impact');
    if (descEl) descEl.value = desc;
    if (impactEl) impactEl.value = bullets.join("\n");

    this.renderModalLivePreview(taskId);
    if (typeof window.showToast === 'function') {
      window.showToast(`✨ Generated narrative description & deliverables for "${taskName}"!`, "success");
    }
  },

  _activeModalTaskId: null,
  _activePhotoSlot: 'after_photo',

  setActivePhotoSlot(slot) {
    this._activePhotoSlot = 'after_photo';
  },

  /**
   * Renders the Single photo management slot inside the unified modal
   * Requirement 4: "Image er option 2 ta theke ekta thakbe only in monthly report."
   */
  renderModalPhotoSlots(taskId) {
    const container = document.getElementById('modal-photos-slot-container');
    if (!container) return;

    let photo = null;
    if (typeof photoManager !== 'undefined') {
      const p = photoManager.getTaskPhotos(taskId, this.selectedMonth);
      if (p) {
        photo = p.after_photo || p.photo_1 || p.photo_2 || p.before_photo || null;
      }
    }

    this._activePhotoSlot = 'after_photo';

    container.innerHTML = `
      <!-- Single Unified Photo Slot for Monthly Report -->
      <div id="modal-slot-photo" class="bg-white border ${photo ? 'border-slate-200' : 'border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/20'} rounded-xl p-2 flex flex-col justify-between shadow-2xs transition group"
           ondragover="event.preventDefault(); this.classList.add('ring-2', 'ring-blue-500');"
           ondragleave="this.classList.remove('ring-2', 'ring-blue-500');"
           ondrop="event.preventDefault(); this.classList.remove('ring-2', 'ring-blue-500'); MonthlyReportView.handleSlotDrop(event, '${taskId}', 'after_photo');">
        
        <div class="relative w-full h-20 sm:h-22 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-200">
          ${photo ? `
            <div class="photo-fit-wrapper photo-fit-blur relative w-full h-full overflow-hidden flex items-center justify-center bg-slate-950">
              <img src="${photo}" alt="" class="photo-blur-bg absolute inset-[-12%] w-[124%] h-[124%] object-cover pointer-events-none select-none" style="filter: blur(14px) brightness(0.65); opacity: 0.65;" />
              <img src="${photo}" class="photo-main-img relative z-10 w-full h-full object-contain drop-shadow-md" alt="Slide Photo" />
            </div>
            <div class="absolute inset-0 z-20 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition backdrop-blur-[1px]">
              <button type="button" onclick="event.stopPropagation(); MonthlyReportView.pasteFromClipboard('${taskId}', 'after_photo')" class="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold shadow transition cursor-pointer">
                📋 Paste Ctrl+V
              </button>
              <label for="modal-photo-file-single" onclick="event.stopPropagation()" class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-bold cursor-pointer shadow transition">
                🔄 Replace
              </label>
              <button type="button" onclick="event.stopPropagation(); MonthlyReportView.deleteModalPhoto('${taskId}', 'after_photo')" class="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow transition cursor-pointer">
                🗑 Delete
              </button>
            </div>
          ` : `
            <div class="cursor-pointer flex items-center justify-center gap-2 p-1.5 text-center w-full h-full hover:bg-blue-50/40 transition"
                 onclick="MonthlyReportView.pasteFromClipboard('${taskId}', 'after_photo')">
              <span class="text-xl text-blue-500">📋</span>
              <div class="text-left">
                <span class="text-xs font-bold text-slate-800 block">Paste Photo (Ctrl+V)</span>
                <span class="text-[9.5px] text-slate-500">Click to paste or browse</span>
              </div>
              <div class="ml-2 flex items-center gap-1.5" onclick="event.stopPropagation()">
                <label for="modal-photo-file-single" class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9.5px] font-bold cursor-pointer transition border border-slate-200">
                  📁 Browse
                </label>
              </div>
            </div>
          `}
          <input type="file" id="modal-photo-file-single" accept="image/*" class="hidden" onchange="MonthlyReportView.uploadModalPhoto(event, '${taskId}', 'after_photo')" />
        </div>

        <div class="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9.5px]">
          <span class="text-slate-400 font-mono">16:9 Presentation Slot</span>
          <div class="flex items-center gap-1.5">
            <button type="button" onclick="event.stopPropagation(); MonthlyReportView.pasteFromClipboard('${taskId}', 'after_photo')" 
                    class="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition flex items-center gap-1 cursor-pointer">
              <span>📋</span> <span>Paste (Ctrl+V)</span>
            </button>
            <label for="modal-photo-file-single" onclick="event.stopPropagation()" class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition">
              ${photo ? '🔄 Replace' : '📁 Upload'}
            </label>
            ${photo ? `
              <button type="button" onclick="event.stopPropagation(); MonthlyReportView.deleteModalPhoto('${taskId}', 'after_photo')" class="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition cursor-pointer">
                🗑 Remove
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  setPhotoFitMode(mode, taskId) {
    const targetMode = (mode === 'cover' || mode === 'fill') ? 'cover' : 'blur';
    this._activeModalPhotoFit = targetMode;
    const input = document.getElementById('edit-slide-photo-fit');
    if (input) input.value = targetMode;

    const blurBtn = document.getElementById('btn-photo-fit-blur');
    const coverBtn = document.getElementById('btn-photo-fit-cover');
    if (blurBtn && coverBtn) {
      if (targetMode === 'blur') {
        blurBtn.className = "px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer bg-white text-blue-700 shadow-xs";
        coverBtn.className = "px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer text-slate-600 hover:text-slate-900";
      } else {
        blurBtn.className = "px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer text-slate-600 hover:text-slate-900";
        coverBtn.className = "px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer bg-white text-blue-700 shadow-xs";
      }
    }

    try {
      localStorage.setItem('walton_photo_fit_' + taskId, targetMode);
    } catch(e) {}

    // Live update in-modal preview
    this.renderModalLivePreview(taskId);
  },

  handleSlotDrop(event, taskId, slot) {
    if (!event || !event.dataTransfer) return;
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name || ''))) {
      this.uploadPhotoFromBlob(file, taskId, slot);
    }
  },

  _selectedCardTaskId: null,
  selectSlideCard(taskId) {
    if (!taskId) return;
    this._selectedCardTaskId = taskId;
    // Highlight the card in monthly report section
    document.querySelectorAll('.task-slide-card').forEach(c => {
      c.classList.remove('ring-2', 'ring-blue-500', 'border-blue-500', 'bg-blue-50/20');
    });
    const card = document.getElementById(`slide-card-${taskId}`);
    if (card) {
      card.classList.add('ring-2', 'ring-blue-500', 'border-blue-500', 'bg-blue-50/20');
    }
  },

  getFirstVisibleTaskId() {
    const firstCard = document.querySelector('.task-slide-card:not([style*="display: none"])');
    if (firstCard && firstCard.dataset && firstCard.dataset.taskId) {
      return firstCard.dataset.taskId;
    }
    return null;
  },

  async pasteFromClipboard(taskId, slot = 'after_photo') {
    if (!taskId) return;
    this._activePhotoSlot = slot;
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              await this.uploadPhotoFromBlob(blob, taskId, slot);
              return;
            }
          }
        }
      }
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = (await navigator.clipboard.readText() || '').trim();
        if (text.startsWith('data:image/') || /^https?:\/\/.*\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(text)) {
          await this.uploadPhotoFromBlob(text, taskId, slot);
          return;
        }
      }
      if (typeof window.showToast === 'function') {
        window.showToast("No image found in clipboard! Copy a photo first (Ctrl+C).", "warning");
      }
    } catch (err) {
      if (typeof window.showToast === 'function') {
        window.showToast("Press Ctrl+V on your keyboard to paste the photo.", "info");
      }
    }
  },

  showUploadProgress(taskId, percent = 0, statusText = "Uploading photo...") {
    if (!taskId) return;
    const card = document.getElementById(`slide-card-${taskId}`);
    if (card) {
      const container = card.querySelector('.slide-card-photo-container');
      if (container) {
        let overlay = container.querySelector('.slide-upload-progress-overlay');
        if (!overlay) {
          container.style.position = 'relative';
          overlay = document.createElement('div');
          overlay.className = 'slide-upload-progress-overlay absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center p-3 text-white transition-opacity duration-200';
          overlay.innerHTML = `
            <div class="w-full max-w-[85%] space-y-2 text-center pointer-events-none">
              <div class="flex items-center justify-between text-[11px] font-mono font-bold">
                <span class="upload-status-text text-blue-300 truncate mr-2">⚡ Uploading...</span>
                <span class="upload-percent-text text-white font-black">0%</span>
              </div>
              <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div class="upload-progress-bar h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-150" style="width: 0%;"></div>
              </div>
              <div class="text-[9.5px] text-slate-400 font-mono">Hostinger Server Permanent SSD</div>
            </div>
          `;
          container.appendChild(overlay);
        }
        const pctEl = overlay.querySelector('.upload-percent-text');
        const barEl = overlay.querySelector('.upload-progress-bar');
        const stEl = overlay.querySelector('.upload-status-text');
        if (pctEl) pctEl.textContent = `${percent}%`;
        if (barEl) barEl.style.width = `${percent}%`;
        if (stEl && statusText) stEl.textContent = statusText;
      }
    }

    // Also update Customize Modal slot if open
    const modalSlot = document.getElementById('modal-slot-photo');
    if (modalSlot && this._activeModalTaskId === taskId) {
      let modalOverlay = modalSlot.querySelector('.modal-upload-progress-overlay');
      if (!modalOverlay) {
        modalSlot.style.position = 'relative';
        modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-upload-progress-overlay absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center p-3 text-white transition-opacity duration-200';
        modalOverlay.innerHTML = `
          <div class="w-full max-w-[85%] space-y-2 text-center pointer-events-none">
            <div class="flex items-center justify-between text-[11px] font-mono font-bold">
              <span class="upload-status-text text-blue-300 truncate mr-2">⚡ Uploading...</span>
              <span class="upload-percent-text text-white font-black">0%</span>
            </div>
            <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div class="upload-progress-bar h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 rounded-full transition-all duration-150" style="width: 0%;"></div>
            </div>
            <div class="text-[9.5px] text-slate-400 font-mono">Hostinger Server Permanent SSD</div>
          </div>
        `;
        modalSlot.appendChild(modalOverlay);
      }
      const pctEl = modalOverlay.querySelector('.upload-percent-text');
      const barEl = modalOverlay.querySelector('.upload-progress-bar');
      const stEl = modalOverlay.querySelector('.upload-status-text');
      if (pctEl) pctEl.textContent = `${percent}%`;
      if (barEl) barEl.style.width = `${percent}%`;
      if (stEl && statusText) stEl.textContent = statusText;
    }
  },

  hideUploadProgress(taskId) {
    if (!taskId) return;
    const card = document.getElementById(`slide-card-${taskId}`);
    if (card) {
      const overlay = card.querySelector('.slide-upload-progress-overlay');
      if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);
      }
    }
    const modalSlot = document.getElementById('modal-slot-photo');
    if (modalSlot) {
      const modalOverlay = modalSlot.querySelector('.modal-upload-progress-overlay');
      if (modalOverlay) {
        modalOverlay.style.opacity = '0';
        setTimeout(() => modalOverlay.remove(), 200);
      }
    }
  },

  updateSlideCardPhoto(taskId, forcedPhotoUrl = null) {
    if (!taskId) return;
    let card = document.getElementById(`slide-card-${taskId}`);
    if (!card) {
      const lowerId = String(taskId).toLowerCase();
      card = document.querySelector(`[data-task-id="${taskId}"]`) ||
             document.querySelector(`[data-task-id="${lowerId}"]`);
    }
    if (!card) return;
    const month = this.selectedMonth;
    let photos = null;
    if (typeof photoManager !== 'undefined') {
      photos = photoManager.getTaskPhotos(taskId, month);
    }
    const photoBefore = photos ? (photos.before_photo || null) : null;
    const photoAfter = photos ? (photos.after_photo || null) : null;
    let photoSingle = forcedPhotoUrl || photoAfter || photoBefore;
    const hasPhoto = Boolean(photoSingle);

    // Format server photo with cache-buster timestamp so browser repaints immediately
    let displaySrc = photoSingle;
    if (typeof photoManager !== 'undefined' && photoManager.formatPhotoUrl) {
      displaySrc = photoManager.formatPhotoUrl(displaySrc);
    } else if (displaySrc && (displaySrc.startsWith('uploads/') || displaySrc.startsWith('/uploads/'))) {
      const rel = displaySrc.startsWith('/') ? displaySrc.slice(1) : displaySrc;
      displaySrc = 'https://acprocess.com/report/' + rel;
    }
    if (displaySrc && (displaySrc.startsWith('http') || displaySrc.startsWith('uploads/') || displaySrc.startsWith('/uploads/'))) {
      const cleanUrl = displaySrc.split('?')[0];
      displaySrc = `${cleanUrl}?t=${Date.now()}`;
    }

    const overrides = (window.appState && window.appState.syncEngine)
      ? window.appState.syncEngine.getManualOverride(taskId)
      : null;
    let savedFit = overrides && overrides.photo_fit;
    if (!savedFit && typeof window !== 'undefined') {
      try { savedFit = localStorage.getItem('walton_photo_fit_' + taskId); } catch(e) {}
    }
    const isCover = (savedFit === 'cover' || savedFit === 'fill');

    const pill = card.querySelector('.photo-status-pill');
    if (pill) {
      pill.className = `text-[10px] font-mono photo-status-pill ${hasPhoto ? 'text-emerald-600 font-bold' : 'text-slate-400'}`;
      pill.textContent = hasPhoto ? '📷 Photo Added' : '📷 No Photo';
    }

    const previewContainer = card.querySelector('.slide-card-photo-container');
    if (previewContainer) {
      if (hasPhoto) {
        const existingMainImg = previewContainer.querySelector('.photo-main-img');
        const existingBlurImg = previewContainer.querySelector('.photo-blur-bg');
        const existingWrapper = previewContainer.querySelector('.photo-fit-wrapper');

        // ZERO BLINK: If image elements already exist, smoothly update src without tearing down DOM!
        if (existingMainImg && existingWrapper) {
          existingMainImg.src = displaySrc;
          if (existingBlurImg) existingBlurImg.src = displaySrc;
          if (isCover) {
            existingWrapper.classList.remove('photo-fit-blur');
            existingWrapper.classList.add('photo-fit-cover');
            if (existingBlurImg) existingBlurImg.style.display = 'none';
          } else {
            existingWrapper.classList.remove('photo-fit-cover');
            existingWrapper.classList.add('photo-fit-blur');
            if (existingBlurImg) existingBlurImg.style.display = '';
          }
          return;
        }

        previewContainer.innerHTML = `
          <div class="photo-fit-wrapper ${isCover ? 'photo-fit-cover' : 'photo-fit-blur'} relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-200">
            <img src="${displaySrc}" alt="" class="photo-blur-bg absolute inset-[-12%] w-[124%] h-[124%] object-cover pointer-events-none select-none" style="filter: blur(14px) brightness(0.65); opacity: 0.65; ${isCover ? 'display: none;' : ''}" onerror="this.style.display='none';" />
            <img src="${displaySrc}" class="photo-main-img ${isCover ? 'w-full h-full object-cover absolute inset-0' : 'relative z-10 w-full h-full object-contain'} drop-shadow-sm transition-all" alt="Slide Photo" onerror="MonthlyReportView.handlePhotoImgError(this, '${taskId}', '${photoAfter ? 'after_photo' : 'before_photo'}');" />
            <div class="absolute bottom-1.5 left-1.5 z-20 flex items-center gap-1">
              <span class="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/70 text-white backdrop-blur-xs">
                ${photoAfter && photoBefore ? 'Dual Photo' : (photoAfter ? 'After Photo' : 'Before Photo')}
              </span>
            </div>
            <div class="absolute top-1.5 right-1.5 z-20 flex items-center gap-1 opacity-90 hover:opacity-100">
              <button type="button" onclick="event.stopPropagation(); MonthlyReportView.selectSlideCard('${taskId}'); MonthlyReportView.pasteFromClipboard('${taskId}', 'after_photo')" title="Replace via Clipboard (Ctrl+V)"
                      class="px-2 py-0.5 rounded bg-black/60 hover:bg-black/80 text-white text-[9px] font-bold backdrop-blur-xs transition cursor-pointer">
                📋 Paste
              </button>
              <button type="button" onclick="event.stopPropagation(); MonthlyReportView.selectSlideCard('${taskId}'); document.getElementById('card-file-${taskId}')?.click();" title="Replace from file / camera"
                      class="px-2 py-0.5 rounded bg-black/60 hover:bg-black/80 text-white text-[9px] font-bold backdrop-blur-xs transition cursor-pointer">
                📁 Replace
              </button>
              <button type="button" onclick="event.stopPropagation(); MonthlyReportView.deleteCardPhoto('${taskId}');" title="Remove Photo"
                      class="px-2 py-0.5 rounded bg-rose-600/80 hover:bg-rose-600 text-white text-[9px] font-bold backdrop-blur-xs transition cursor-pointer">
                🗑 Remove
              </button>
            </div>
            <input type="file" id="card-file-${taskId}" accept="image/*" class="hidden" onchange="MonthlyReportView.handleCardFileInput(this, '${taskId}', 'after_photo')" />
          </div>
        `;
      } else {
        const existingNoPhoto = previewContainer.querySelector('.no-photo-placeholder');
        if (existingNoPhoto) return; // already in no-photo state, don't recreate

        previewContainer.innerHTML = `
          <div class="no-photo-placeholder w-full aspect-video rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-3 text-center group-hover:border-blue-400 transition"
               ondragover="event.preventDefault(); this.classList.add('border-blue-500', 'bg-blue-50/50');"
               ondragleave="this.classList.remove('border-blue-500', 'bg-blue-50/50');"
               ondrop="this.classList.remove('border-blue-500', 'bg-blue-50/50'); MonthlyReportView.handleSlotDrop(event, '${taskId}', 'after_photo');">
            <span class="text-2xl mb-1 text-slate-300">📷</span>
            <span class="text-[11px] font-bold text-slate-500">No Photo Attached</span>
            <div class="flex items-center gap-1.5 mt-2">
              <button type="button" onclick="event.stopPropagation(); MonthlyReportView.selectSlideCard('${taskId}'); MonthlyReportView.pasteFromClipboard('${taskId}', 'after_photo')" title="Paste image from clipboard (Ctrl+V)"
                      class="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 transition shadow-2xs cursor-pointer">
                📋 Paste (Ctrl+V)
              </button>
              <button type="button" onclick="event.stopPropagation(); MonthlyReportView.selectSlideCard('${taskId}'); document.getElementById('card-file-${taskId}')?.click();" title="Upload from file or camera"
                      class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition cursor-pointer border border-slate-200">
                📁 Upload / Camera
              </button>
            </div>
            <input type="file" id="card-file-${taskId}" accept="image/*" class="hidden" onchange="MonthlyReportView.handleCardFileInput(this, '${taskId}', 'after_photo')" />
          </div>
        `;
      }
    }
  },

  _livePreviewTimer: null,
  debouncedLivePreview(taskId) {
    if (this._livePreviewTimer) clearTimeout(this._livePreviewTimer);
    this._livePreviewTimer = setTimeout(() => {
      this.renderModalLivePreview(taskId);
    }, 50);
  },

  async uploadPhotoFromBlob(blobOrFile, taskId, slot = 'after_photo') {
    if (!blobOrFile || !taskId) return;
    this._uploadLock = this._uploadLock || {};
    if (this._uploadLock[taskId]) {
      console.warn(`[MonthlyReportView] Upload already in progress for task ${taskId}`);
      return;
    }
    this._uploadLock[taskId] = true;

    // Immediately show progress overlay on slide card & modal
    this.showUploadProgress(taskId, 10, "⚡ Optimizing image...");

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

      if (!base64Url) {
        this.hideUploadProgress(taskId);
        return;
      }

      // 0ms Optimistic preview: Show immediately on card & modal before network
      if (typeof photoManager !== 'undefined' && photoManager.photoMap) {
        if (!photoManager.photoMap[taskId]) photoManager.photoMap[taskId] = {};
        const isBefore = (slot === 'before_photo' || slot === 'photo_1');
        if (isBefore) {
          photoManager.photoMap[taskId].before_photo = base64Url;
          photoManager.photoMap[taskId].photo_1 = base64Url;
        } else {
          photoManager.photoMap[taskId].after_photo = base64Url;
          photoManager.photoMap[taskId].photo_2 = base64Url;
          photoManager.photoMap[taskId].photo = base64Url;
        }
        const mKey = `${this.selectedMonth}_${taskId}`;
        if (!photoManager.photoMap[mKey]) photoManager.photoMap[mKey] = {};
        if (isBefore) {
          photoManager.photoMap[mKey].before_photo = base64Url;
          photoManager.photoMap[mKey].photo_1 = base64Url;
        } else {
          photoManager.photoMap[mKey].after_photo = base64Url;
          photoManager.photoMap[mKey].photo_2 = base64Url;
          photoManager.photoMap[mKey].photo = base64Url;
        }
      }
      this.updateSlideCardPhoto(taskId, base64Url);
      if (this._activeModalTaskId === taskId) {
        this.renderModalPhotoSlots(taskId);
        this.renderModalLivePreview(taskId);
      }

      this.showUploadProgress(taskId, 25, "Uploading to Hostinger SSD...");

      // Save to photoManager and push to Hostinger server with live percentage tracking!
      let serverUrl = null;
      if (typeof photoManager !== 'undefined') {
        const onProgress = (pct, msg) => {
          this.showUploadProgress(taskId, pct, msg || `Uploading... ${pct}%`);
        };
        if (photoManager.setTaskPhoto) {
          serverUrl = await photoManager.setTaskPhoto(taskId, slot, base64Url, null, this.selectedMonth, onProgress);
        } else if (photoManager.savePhoto) {
          serverUrl = await photoManager.savePhoto(taskId, slot, base64Url, this.selectedMonth, onProgress);
        }
      }

      this.showUploadProgress(taskId, 100, "Permanent Hostinger SSD Saved!");

      // Refresh modal slots & live preview or card in grid
      if (this._activeModalTaskId === taskId) {
        this.renderModalPhotoSlots(taskId);
        this.renderModalLivePreview(taskId);
      }
      this.updateSlideCardPhoto(taskId);

      setTimeout(() => {
        this.hideUploadProgress(taskId);
      }, 400);

      if (typeof window.showToast === 'function') {
        window.showToast(`📸 Photo stored permanently on Hostinger server for Task ${taskId}!`, "success");
      }
    } catch (err) {
      console.error("Paste/Upload photo error:", err);
      this.hideUploadProgress(taskId);
      if (typeof window.showToast === 'function') {
        window.showToast("Failed to save photo. Please try again.", "error");
      }
    } finally {
      delete this._uploadLock[taskId];
    }
  },

  async uploadModalPhoto(event, taskId, slot) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    await this.uploadPhotoFromBlob(file, taskId, slot);
  },

  async deleteModalPhoto(taskId, slot) {
    if (!taskId) return;
    // 0ms Optimistic local wipe
    if (typeof photoManager !== 'undefined' && photoManager.purgeTaskPhotosMemory) {
      photoManager.purgeTaskPhotosMemory(taskId);
    }
    this.renderModalPhotoSlots(taskId);
    this.renderModalLivePreview(taskId);
    this.updateSlideCardPhoto(taskId);

    // Asynchronous backend and peer PC broadcast
    if (typeof photoManager !== 'undefined' && photoManager.removePhoto) {
      await photoManager.removePhoto(taskId, 'all', this.selectedMonth);
    }
    this.renderModalPhotoSlots(taskId);
    this.renderModalLivePreview(taskId);
    this.updateSlideCardPhoto(taskId);
    if (typeof window.showToast === 'function') {
      window.showToast("🗑 Photo deleted permanently & synced across all PCs.", "info");
    }
  },

  async deleteCardPhoto(taskId) {
    if (!taskId) return;
    // 0ms Optimistic local wipe
    if (typeof photoManager !== 'undefined' && photoManager.purgeTaskPhotosMemory) {
      photoManager.purgeTaskPhotosMemory(taskId);
    }
    this.updateSlideCardPhoto(taskId);
    if (this._activeModalTaskId === taskId) {
      this.renderModalPhotoSlots(taskId);
      this.renderModalLivePreview(taskId);
    }

    if (typeof photoManager !== 'undefined' && photoManager.removePhoto) {
      await photoManager.removePhoto(taskId, 'all', this.selectedMonth);
    }
    this.updateSlideCardPhoto(taskId);
    if (this._activeModalTaskId === taskId) {
      this.renderModalPhotoSlots(taskId);
      this.renderModalLivePreview(taskId);
    }
    if (typeof window.showToast === 'function') {
      window.showToast(`🗑 Photo removed for task ${taskId}.`, "info");
    }
  },

  async handleCardFileInput(input, taskId, slot = 'after_photo') {
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];
    await this.uploadPhotoFromBlob(file, taskId, slot);
    input.value = "";
  },

  handlePhotoImgError(imgEl, taskId, slot = 'after_photo') {
    if (!imgEl || imgEl._failed) return;
    imgEl._failed = true;
    imgEl.onerror = null; // Kill listener immediately to prevent recursive loop

    // 1. Try to recover from in-memory photoManager
    let fallback = null;
    if (typeof photoManager !== 'undefined') {
      const photos = photoManager.getTaskPhotos(taskId, this.selectedMonth);
      if (photos) {
        fallback = (slot === 'before_photo' || slot === 'photo_1')
          ? (photos.before_photo || photos.photo_1)
          : (photos.after_photo || photos.photo_2 || photos.photo);
      }
    }

    // 2. If fallback is base64, self-heal immediately!
    if (fallback && fallback.startsWith('data:image/')) {
      imgEl.src = fallback;
      const parentWrapper = imgEl.closest('.photo-fit-wrapper');
      if (parentWrapper) {
        const blurBg = parentWrapper.querySelector('.photo-blur-bg');
        if (blurBg) blurBg.src = fallback;
      }
      return;
    }

    // 3. Replace broken image with clean "No Photo Attached" upload/paste box
    this._renderPhotoFallbackPlaceholder(imgEl, taskId, slot);
  },

  _renderPhotoFallbackPlaceholder(imgEl, taskId, slot = 'after_photo') {
    const container = imgEl.closest('.slide-card-photo-container') || imgEl.closest('.photo-fit-wrapper') || imgEl.parentElement;
    if (!container) return;

    container.innerHTML = `
      <div class="relative w-full aspect-video rounded-xl border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/30 flex flex-col items-center justify-center p-2.5 text-center transition group/drop cursor-pointer"
           onclick="event.stopPropagation(); MonthlyReportView.selectSlideCard('${taskId}'); MonthlyReportView.pasteFromClipboard('${taskId}', '${slot}');"
           ondragover="event.preventDefault(); this.classList.add('border-blue-500', 'bg-blue-50');"
           ondragleave="this.classList.remove('border-blue-500', 'bg-blue-50');"
           ondrop="event.preventDefault(); this.classList.remove('border-blue-500', 'bg-blue-50'); MonthlyReportView.handleSlotDrop(event, '${taskId}', '${slot}');">
        <span class="text-xl text-slate-400 group-hover/drop:scale-110 group-hover/drop:text-blue-600 transition">📷</span>
        <span class="text-[11px] font-bold text-slate-700 mt-0.5">Paste or Upload Photo</span>
        <div class="flex items-center gap-1.5 mt-1" onclick="event.stopPropagation()">
          <button type="button" onclick="event.stopPropagation(); MonthlyReportView.selectSlideCard('${taskId}'); MonthlyReportView.pasteFromClipboard('${taskId}', '${slot}')" title="Paste image from clipboard (Ctrl+V)"
                  class="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[9.5px] font-bold border border-blue-200 transition shadow-2xs cursor-pointer">
            📋 Paste
          </button>
          <button type="button" onclick="event.stopPropagation(); MonthlyReportView.selectSlideCard('${taskId}'); document.getElementById('card-file-${taskId}')?.click();" title="Upload from file"
                  class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9.5px] font-bold border border-slate-200 transition shadow-2xs cursor-pointer">
            📁 Upload
          </button>
        </div>
        <input type="file" id="card-file-${taskId}" accept="image/*" class="hidden" onchange="MonthlyReportView.handleCardFileInput(this, '${taskId}', '${slot}')" />
      </div>
    `;
  },

  /**
   * Format compact override timestamp (Requirement 5)
   */
  formatOverrideTime(ts) {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts).slice(0, 16);
      const day = String(d.getDate()).padStart(2, '0');
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mon = monthNames[d.getMonth()];
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day} ${mon} ${hours}:${mins}`;
    } catch (e) {
      return "";
    }
  },

  /**
   * Opens the slide override editor for a specific task slide with live in-modal preview
   * Requirement 4: Unified single modal for text edit, photo upload, and live preview
   */
  openModal(taskId) {
    if (!taskId) return;
    this._activeModalTaskId = taskId;
    this._activePhotoSlot = 'after_photo';

    const breakdown = window.appState && window.appState.breakdownSheet
      ? window.appState.breakdownSheet.getBreakdown(taskId)
      : null;
    const overrides = window.appState && window.appState.syncEngine
      ? window.appState.syncEngine.getManualOverride(taskId) || {}
      : {};
    let task = window.appState && window.appState.workbookMgr
      ? window.appState.workbookMgr.getTask(this.selectedMonth, taskId)
      : null;
    if (!task && window.appState && window.appState.workbookMgr && window.appState.workbookMgr.workbooks) {
      for (const m of Object.keys(window.appState.workbookMgr.workbooks)) {
        const found = (window.appState.workbookMgr.workbooks[m] || []).find(t => t && t.task_id === taskId);
        if (found) { task = found; break; }
      }
    }
    const allSlides = window.appState && window.appState.syncEngine
      ? window.appState.syncEngine.getActiveSlides(this.selectedMonth)
      : [];
    const currentSlide = allSlides.find(s => s && s.task_id === taskId) || null;

    // Bulletproof Title Resolution: Guarantee genuine task name populates
    let currentTitle = "";
    if (overrides && overrides.slide_title && overrides.slide_title.trim()) {
      currentTitle = overrides.slide_title.trim();
    } else if (task && (task.task_name || task.title || task.name || task.task)) {
      currentTitle = (task.task_name || task.title || task.name || task.task).trim();
    } else if (currentSlide && (currentSlide.slide_title || currentSlide.raw_task_name)) {
      currentTitle = (currentSlide.slide_title || currentSlide.raw_task_name).trim();
    } else if (breakdown && (breakdown.ai_report_title || breakdown.original_task_name)) {
      currentTitle = (breakdown.ai_report_title || breakdown.original_task_name).trim();
    }

    if (!currentTitle || currentTitle.toLowerCase() === `task ${taskId.toLowerCase()}`) {
      if (window.appState && window.appState.workbookMgr) {
        const rawList = window.appState.workbookMgr.getTasksForMonth ? window.appState.workbookMgr.getTasksForMonth(this.selectedMonth) : [];
        const match = rawList.find(t => t && t.task_id === taskId);
        if (match && match.task_name) currentTitle = match.task_name.trim();
      }
      if (!currentTitle) {
        try {
          const cached = JSON.parse(localStorage.getItem(`walton_pd_active_slides_${this.selectedMonth}`) || '[]');
          const cs = cached.find(s => s && s.task_id === taskId);
          if (cs && cs.slide_title) currentTitle = cs.slide_title.trim();
        } catch(e) {}
      }
      if (!currentTitle) {
        try {
          const syncedMap = JSON.parse(localStorage.getItem('walton_tms_synced_records') || '{}');
          if (syncedMap[taskId] && syncedMap[taskId].task_name) currentTitle = syncedMap[taskId].task_name.trim();
        } catch(e) {}
      }
    }
    if (!currentTitle) currentTitle = `Process Development - ${taskId}`;

    const currentCategory = overrides.category || (task ? task.category : null) || (currentSlide ? currentSlide.category : null) || (breakdown ? breakdown.ai_category : "Process development");

    let currentPhotoFit = (overrides && overrides.photo_fit) || (task && task.photo_fit) || (currentSlide && currentSlide.photo_fit);
    if (!currentPhotoFit && typeof window !== 'undefined') {
      try { currentPhotoFit = localStorage.getItem('walton_photo_fit_' + taskId); } catch (e) {}
    }
    if (!currentPhotoFit) currentPhotoFit = 'blur';
    this._activeModalPhotoFit = currentPhotoFit;

    // Requirement: Description and impact auto generate tailored to title
    const generated = this.generateDetailsFromTitle(currentTitle, currentCategory);

    let currentDesc = overrides.description || (task ? (task.task_details || task.description) : "") || (currentSlide ? currentSlide.description : "") || "";
    if (!currentDesc || currentDesc.trim() === '') {
      currentDesc = generated.desc;
    }

    // Auto-generate project impact & outcomes only if empty
    let currentImpact = "";
    if (overrides.impact !== undefined && overrides.impact !== null && overrides.impact !== "") {
      currentImpact = Array.isArray(overrides.impact) ? overrides.impact.join("\n") : String(overrides.impact);
    } else if (task && task.impact) {
      currentImpact = Array.isArray(task.impact) ? task.impact.join("\n") : String(task.impact);
    } else if (currentSlide && currentSlide.impact) {
      currentImpact = Array.isArray(currentSlide.impact) ? currentSlide.impact.join("\n") : String(currentSlide.impact);
    } else if (breakdown && Array.isArray(breakdown.ai_impact) && breakdown.ai_impact.length > 0) {
      currentImpact = breakdown.ai_impact.join("\n");
    }

    if (!currentImpact || currentImpact.trim() === '') {
      currentImpact = generated.bullets.join("\n");
    }

    const currentEngineer = overrides.engineer || (task ? (task.concern_engineer || task.assignee || task.engineer) : null) || (breakdown ? breakdown.engineer : "Concern Engineer");

    // All engineers for dropdown
    const allEngineersList = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getEngineers)
      ? MasterDataManager.getEngineers().map(e => e.display || e.name || e).filter(Boolean)
      : ((typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.ENGINEERS) ? MASTER_LISTS.ENGINEERS.map(e => e.display || e.name || e).filter(Boolean) : [
          "Faiyaz (54634)", "Sazzad (50463)", "Rafi (45127)", "Abdullah (58102)", "Emon (58279)", "Al-Amin (59092)", "Hasibul (59239)"
        ]);
    if (!allEngineersList.some(e => e.toLowerCase() === String(currentEngineer).toLowerCase()) && currentEngineer && currentEngineer !== "Concern Engineer") {
      allEngineersList.unshift(currentEngineer);
    }

    const allCategories = (typeof MasterDataManager !== 'undefined' && MasterDataManager.getCategories)
      ? MasterDataManager.getCategories()
      : ((typeof MASTER_LISTS !== 'undefined' && MASTER_LISTS.CATEGORIES) ? MASTER_LISTS.CATEGORIES : ["Process development", "Completed Projects", "Ongoing Projects"]);

    const container = this.renderContainer();
    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-slate-950/85 backdrop-blur-md">
        <div class="relative w-full max-w-[96vw] 2xl:max-w-[1550px] max-h-[95vh] h-[95vh] xl:h-[90vh] bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 sm:p-4 text-slate-800 flex flex-col overflow-y-auto xl:overflow-hidden">
          
          <!-- Top Header -->
          <div class="flex items-center justify-between pb-2 border-b border-slate-100 flex-shrink-0">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                🎨
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    SLIDE STUDIO &amp; EDITORIAL
                  </span>
                  <span class="text-xs font-mono text-slate-400 font-bold">ID: ${taskId}</span>
                  ${(overrides && overrides.updated_at) ? `
                    <span class="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300">
                      ✏️ Overridden at ${this.formatOverrideTime(overrides.updated_at)}
                    </span>
                  ` : ''}
                </div>
                <h3 class="text-sm font-black text-slate-900 mt-0.5">Customize Slide Content, Photo &amp; Live In-Modal Preview</h3>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="MonthlyReportView.saveOverridesFromHeader('${taskId}')" 
                      class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-xs font-black text-white shadow-md shadow-blue-500/25 transition cursor-pointer flex items-center gap-1 active:scale-95">
                <span>💾</span> <span>Save Slide Overrides</span>
              </button>
              <button onclick="MonthlyReportView.closeModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition font-bold text-base cursor-pointer" title="Close Studio">&times;</button>
            </div>
          </div>

          <!-- Body: Split 2-Column (Controls on Left: 5 cols, Real-Time Preview on Right: 7 cols) -->
          <div class="grid grid-cols-1 xl:grid-cols-12 gap-3 pt-2 flex-1 min-h-0 items-stretch overflow-visible xl:overflow-hidden">
            
            <!-- Left: Unified Editorial & Photo Form (5 Columns) -->
            <form id="slide-override-form" onsubmit="MonthlyReportView.saveOverrides(event, '${taskId}')" class="xl:col-span-5 flex flex-col justify-between overflow-visible xl:overflow-y-auto space-y-1.5 pr-1 min-h-0 text-xs">
              <input type="hidden" id="edit-slide-photo-fit" value="${currentPhotoFit}" />
              
              <!-- Slide Title -->
              <div>
                <div class="flex items-center justify-between mb-0.5">
                  <label class="block font-bold text-slate-700 text-xs">Slide Title (Headline) <span class="text-red-500">*</span></label>
                  <span class="text-[9.5px] text-slate-400 font-mono">Live updates →</span>
                </div>
                <input type="text" id="edit-slide-title" value="${HELPERS.escapeHtml(currentTitle)}" 
                       oninput="MonthlyReportView.debouncedLivePreview('${taskId}')"
                       class="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-bold shadow-2xs" required />
              </div>

              <!-- Project Overview / Description (Auto-generated narrative sentence format) -->
              <div>
                <div class="flex items-center justify-between mb-0.5">
                  <label class="block font-bold text-slate-700 text-xs">Project Overview / Description <span class="font-normal text-slate-400">(Narrative)</span></label>
                  <button type="button" onclick="MonthlyReportView.generateSlideDetails('${taskId}')"
                          title="Auto-generate concise narrative overview and deliverables based on task name"
                          class="px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[9.5px] font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer">
                    <span>✨</span> <span>Auto-Generate</span>
                  </button>
                </div>
                <textarea id="edit-slide-desc" rows="2" style="min-height: 48px; max-height: 60px;"
                          oninput="MonthlyReportView.debouncedLivePreview('${taskId}')"
                          placeholder="e.g. Developed and fabricated precision automated mechanism for active assembly line."
                          class="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 leading-snug font-sans shadow-2xs resize-y">${HELPERS.escapeHtml(currentDesc)}</textarea>
              </div>

              <!-- Key Outcomes (Short bullets) -->
              <div>
                <div class="flex items-center justify-between mb-0.5">
                  <label class="block font-bold text-slate-700 text-xs">Project Impact &amp; Outcomes (Bullets)</label>
                  <span class="text-[9.5px] text-slate-400 font-mono">1 bullet / line</span>
                </div>
                <textarea id="edit-slide-impact" rows="3" style="min-height: 65px; max-height: 85px;"
                          oninput="MonthlyReportView.debouncedLivePreview('${taskId}')"
                          placeholder="One key outcome or deliverable per line..."
                          class="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 font-sans shadow-2xs resize-y leading-snug">${HELPERS.escapeHtml(currentImpact)}</textarea>
              </div>

              <!-- Category & Concern Engineer in 2 Columns Side-by-Side -->
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block font-bold text-slate-700 mb-0.5 text-[11px]">Slide Category</label>
                  <select id="edit-slide-category" 
                          onchange="MonthlyReportView.renderModalLivePreview('${taskId}')"
                          class="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 font-bold shadow-2xs cursor-pointer">
                    ${allCategories.map(c => `<option value="${c}" ${c === currentCategory ? 'selected' : ''}>${c}</option>`).join('')}
                  </select>
                </div>

                <div>
                  <label class="block font-bold text-slate-700 mb-0.5 text-[11px]">Concern Engineer</label>
                  <select id="edit-slide-engineer" 
                          onchange="MonthlyReportView.renderModalLivePreview('${taskId}')"
                          class="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 font-bold shadow-2xs cursor-pointer">
                    ${allEngineersList.map(eng => `<option value="${HELPERS.escapeHtml(eng)}" ${eng.trim().toLowerCase() === String(currentEngineer).trim().toLowerCase() ? 'selected' : ''}>${HELPERS.escapeHtml(eng)}</option>`).join('')}
                  </select>
                </div>
              </div>

              <!-- PHOTO MANAGEMENT SECTION (Single Image Option in Monthly Report with Direct Paste) -->
              <div class="bg-slate-50/90 border border-slate-200 rounded-xl p-2 space-y-1">
                <div class="flex items-center justify-between flex-wrap gap-1">
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs">📷</span>
                    <span class="font-bold text-slate-800 text-[11px]">Slide Photo</span>
                  </div>
                  
                  <div class="flex items-center gap-1.5">
                    <!-- Photo Fit Mode Selector (Requirement: Blur vs Crop toggle & save) -->
                    <div class="flex items-center gap-0.5 bg-slate-200/90 p-0.5 rounded-lg border border-slate-300">
                      <button type="button" onclick="MonthlyReportView.setPhotoFitMode('blur', '${taskId}')"
                              id="btn-photo-fit-blur" title="Fit whole photo with blurred ambient sides"
                              class="px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${currentPhotoFit === 'blur' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
                        📐 Fit (Blur)
                      </button>
                      <button type="button" onclick="MonthlyReportView.setPhotoFitMode('cover', '${taskId}')"
                              id="btn-photo-fit-cover" title="Fill entire 16:9 canvas (crop edges)"
                              class="px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${currentPhotoFit === 'cover' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
                        ↔ Fill (Crop)
                      </button>
                    </div>
                    <button type="button" onclick="MonthlyReportView.pasteFromClipboard('${taskId}', 'after_photo')"
                            class="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9.5px] shadow-2xs flex items-center gap-1 cursor-pointer">
                      <span>📋</span> <span>Paste (Ctrl+V)</span>
                    </button>
                  </div>
                </div>
                
                <div class="w-full" id="modal-photos-slot-container">
                  <!-- Rendered dynamically via renderModalPhotoSlots -->
                </div>
              </div>

              <!-- Actions -->
              <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button type="button" onclick="MonthlyReportView.resetOverrides('${taskId}')" class="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold transition cursor-pointer">
                  Reset AI Defaults
                </button>
                <div class="flex items-center gap-2">
                  <button type="button" onclick="MonthlyReportView.closeModal()" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-xs font-black text-white shadow-sm shadow-blue-500/20 transition cursor-pointer flex items-center gap-1">
                    <span>💾</span> <span>Save Slide Overrides</span>
                  </button>
                </div>
              </div>
            </form>

            <!-- Right: Real-Time In-Modal Live Preview (7 Columns, Large Presentation Display) -->
            <div class="xl:col-span-7 bg-slate-900 rounded-2xl p-3 sm:p-4 flex flex-col justify-between border border-slate-800 shadow-2xl xl:sticky xl:top-0 min-h-0 overflow-hidden">
              <div class="flex items-center justify-between pb-2 border-b border-slate-800 mb-2 flex-shrink-0">
                <div class="flex items-center gap-2">
                  <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span class="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">Exact Presentation Slide Preview (16:9 Scale)</span>
                </div>
                <button type="button" onclick="MonthlyReportView.openModalFullScreenPreview('${taskId}')" 
                        class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700 transition flex items-center gap-1 cursor-pointer">
                  <span>👁️</span> <span>Full Screen</span>
                </button>
              </div>

              <!-- Presentation Stage inside Modal (Responsive 16:9 Presentation Slide Canvas) -->
              <div id="modal-slide-live-preview" class="w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden my-auto rounded-xl shadow-2xl">
                <!-- Injected via renderModalLivePreview -->
              </div>

              <div class="pt-2 text-[10px] text-slate-400 flex items-center justify-between font-mono flex-shrink-0">
                <span>Walton Executive Theme &bull; 16:9 Widescreen Presentation Canvas</span>
                <span class="text-emerald-400 font-bold">✨ Real-time synced</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    `;

    // Render photo slots and live preview
    this.renderModalPhotoSlots(taskId);
    this.renderModalLivePreview(taskId);
  },

  /**
   * Real-time in-modal 16:9 live slide preview renderer
   * Requirement 4: Authentic report slide layout with live photos
   * Requirement 2: Investment/Budget note completely removed
   */
  renderModalLivePreview(taskId) {
    const previewEl = document.getElementById('modal-slide-live-preview');
    if (!previewEl) return;

    // Attach dynamic ResizeObserver so preview recalculates scale instantly on modal resize
    if (typeof window !== 'undefined' && window.ResizeObserver && !previewEl._mrvResizeObsAttached) {
      previewEl._mrvResizeObsAttached = true;
      const ro = new ResizeObserver(() => {
        if (MonthlyReportView._activeModalTaskId) {
          MonthlyReportView.renderModalLivePreview(MonthlyReportView._activeModalTaskId);
        }
      });
      ro.observe(previewEl);
    }

    const titleEl = document.getElementById('edit-slide-title');
    const descEl = document.getElementById('edit-slide-desc');
    const impactEl = document.getElementById('edit-slide-impact');
    const engineerEl = document.getElementById('edit-slide-engineer');
    const catEl = document.getElementById('edit-slide-category');

    const title = titleEl ? titleEl.value.trim() : `Task ${taskId}`;
    const desc = descEl ? descEl.value.trim() : "Standard operating procedure execution and engineering development.";
    const impactLines = impactEl ? impactEl.value.trim().split("\n").filter(l => l.trim().length > 0) : [];
    const engineer = engineerEl ? engineerEl.value.trim() : "Concern Engineer";
    const category = catEl ? catEl.value.trim() : "Process development";

    // Fetch photos
    let photoBefore = null;
    let photoAfter = null;
    if (typeof photoManager !== 'undefined') {
      const p = photoManager.getTaskPhotos(taskId, this.selectedMonth);
      if (p) {
        photoBefore = p.before_photo || p.photo_1 || null;
        photoAfter = p.after_photo || p.photo_2 || null;
      }
    }

    const isCompleted = (category === 'Completed Projects' || category.toLowerCase().includes('completed project'));
    const isProj = Boolean(category && category.toLowerCase().includes('project'));

    const fitEl = document.getElementById('edit-slide-photo-fit');
    const photoFit = fitEl ? fitEl.value.trim() : (this._activeModalPhotoFit || 'blur');

    const slideData = {
      task_id: taskId,
      month: this.selectedMonth,
      slide_title: title,
      raw_task_name: title,
      description: desc,
      impact: impactLines,
      engineer: engineer,
      category: category,
      photo_fit: photoFit,
      status: isCompleted ? "Completed" : (isProj ? "Ongoing" : "Completed"),
      is_project: isProj,
      photo_before: photoBefore,
      photo_after: photoAfter,
      photo: photoBefore || photoAfter,
      has_dual_photo: Boolean(photoBefore && photoAfter),
      has_manual_override: true,
      project_type: isProj ? (isCompleted ? "Strategic Project • Completed" : "Strategic Project • Ongoing") : category
    };

    if (typeof SlideLayoutEngine !== 'undefined') {
      const stageW = previewEl.clientWidth || 740;
      const stageH = previewEl.clientHeight || 450;
      const refW = 1040;
      const refH = 585; // 16:9 widescreen presentation reference
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

  /**
   * Pop-out full screen 16:9 preview for the draft slide currently in the modal
   */
  openModalFullScreenPreview(taskId) {
    const titleEl = document.getElementById('edit-slide-title');
    const descEl = document.getElementById('edit-slide-desc');
    const impactEl = document.getElementById('edit-slide-impact');
    const engineerEl = document.getElementById('edit-slide-engineer');
    const catEl = document.getElementById('edit-slide-category');
    const fitEl = document.getElementById('edit-slide-photo-fit');
    const photoFit = fitEl ? fitEl.value.trim() : (this._activeModalPhotoFit || 'blur');

    let photoBefore = null;
    let photoAfter = null;
    if (typeof photoManager !== 'undefined') {
      const p = photoManager.getTaskPhotos(taskId, this.selectedMonth);
      if (p) {
        photoBefore = p.before_photo || null;
        photoAfter = p.after_photo || null;
      }
    }

    const category = catEl ? catEl.value.trim() : "Process development";
    const isCompleted = (category === 'Completed Projects' || category.toLowerCase().includes('completed project'));
    const isProj = Boolean(category && category.toLowerCase().includes('project'));

    const draftSlide = {
      task_id: taskId,
      month: this.selectedMonth,
      slide_title: titleEl ? titleEl.value.trim() : `Task ${taskId}`,
      raw_task_name: titleEl ? titleEl.value.trim() : `Task ${taskId}`,
      description: descEl ? descEl.value.trim() : "",
      impact: impactEl ? impactEl.value.trim().split("\n").filter(l => l.trim().length > 0) : [],
      engineer: engineerEl ? engineerEl.value.trim() : "Concern Engineer",
      category: category,
      photo_fit: photoFit,
      status: isCompleted ? "Completed" : (isProj ? "Ongoing" : "Completed"),
      is_project: isProj,
      photo_before: photoBefore,
      photo_after: photoAfter,
      photo: photoBefore || photoAfter,
      has_dual_photo: Boolean(photoBefore && photoAfter),
      has_manual_override: true,
      project_type: isProj ? (isCompleted ? "Strategic Project • Completed" : "Strategic Project • Ongoing") : category
    };

    if (typeof SlidePreviewModal !== 'undefined' && SlidePreviewModal.openSingle) {
      SlidePreviewModal.openSingle(draftSlide);
    }
  },

  closeModal() {
    this._activeModalTaskId = null;
    const container = document.getElementById('monthly-report-modal-container');
    if (container) container.innerHTML = '';
  },

  saveOverridesFromHeader(taskId) {
    const form = document.getElementById('slide-override-form');
    if (form) {
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }
  },

  saveOverrides(event, taskId) {
    if (event) event.preventDefault();

    const titleEl = document.getElementById('edit-slide-title');
    const descEl = document.getElementById('edit-slide-desc');
    const impactEl = document.getElementById('edit-slide-impact');
    const engineerEl = document.getElementById('edit-slide-engineer');
    const catEl = document.getElementById('edit-slide-category');

    const newCategory = catEl ? catEl.value.trim() : null;
    const newTitle = titleEl ? titleEl.value.trim() : "";
    const newDesc = descEl ? descEl.value.trim() : "";
    const newEngineer = engineerEl ? engineerEl.value.trim() : "";
    const newImpact = impactEl ? impactEl.value.trim().split("\n").filter(l => l.trim().length > 0) : [];
    const fitEl = document.getElementById('edit-slide-photo-fit');
    const photoFit = fitEl ? fitEl.value.trim() : (this._activeModalPhotoFit || 'blur');

    const overrides = {
      slide_title: newTitle,
      description: newDesc,
      impact: newImpact,
      engineer: newEngineer,
      photo_fit: photoFit,
      ...(newCategory ? { category: newCategory } : {})
    };

    // 1. Save to SyncEngine overrides map
    if (window.appState && window.appState.syncEngine) {
      if (typeof window.appState.syncEngine.saveManualOverride === 'function') {
        window.appState.syncEngine.saveManualOverride(taskId, overrides);
      } else if (typeof window.appState.syncEngine.setManualOverride === 'function') {
        window.appState.syncEngine.setManualOverride(taskId, overrides);
      }
    }

    // 2. Permanently sync changes to underlying workbook task
    const now = Date.now();
    const taskPatch = {
      last_updated: new Date().toISOString(),
      user_edited: true,
      _lastTextEditTime: now,
      photo_fit: photoFit
    };
    if (newCategory) taskPatch.category = newCategory;
    if (newTitle) taskPatch.task_name = newTitle;
    if (newDesc) {
      taskPatch.task_details = newDesc;
      taskPatch.description = newDesc;
    }
    if (newImpact && newImpact.length > 0) {
      taskPatch.impact = newImpact;
    }
    if (newEngineer) {
      taskPatch.assignee = newEngineer;
      taskPatch.engineer = newEngineer;
      taskPatch.concern_engineer = newEngineer;
    }

    if (window.appState && window.appState.workbookMgr) {
      window.appState.workbookMgr.updateTask(this.selectedMonth, taskId, taskPatch);
      window.appState.workbookMgr.save();
    }

    // 3. Real-time Firebase broadcast if online
    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected()) {
      if (newCategory) FirebaseSyncService.updateCell(this.selectedMonth, taskId, 'category', newCategory);
      if (newTitle) FirebaseSyncService.updateCell(this.selectedMonth, taskId, 'task_name', newTitle);
      if (newDesc) {
        FirebaseSyncService.updateCell(this.selectedMonth, taskId, 'task_details', newDesc);
        FirebaseSyncService.updateCell(this.selectedMonth, taskId, 'description', newDesc);
      }
      if (newImpact && newImpact.length > 0) {
        FirebaseSyncService.updateCell(this.selectedMonth, taskId, 'impact', newImpact);
      }
      FirebaseSyncService.updateCell(this.selectedMonth, taskId, 'user_edited', true);
      FirebaseSyncService.updateCell(this.selectedMonth, taskId, '_lastTextEditTime', now);
      if (photoFit) FirebaseSyncService.updateCell(this.selectedMonth, taskId, 'photo_fit', photoFit);
      if (newEngineer) {
        FirebaseSyncService.updateCell(this.selectedMonth, taskId, 'assignee', newEngineer);
        FirebaseSyncService.updateCell(this.selectedMonth, taskId, 'engineer', newEngineer);
      }
      if (FirebaseSyncService.db) {
        FirebaseSyncService.db.ref(`walton_monthly_report/slide_overrides/${this.selectedMonth}/${taskId}`).set({
          ...overrides,
          user_edited: true,
          updated_at: new Date().toISOString()
        }).catch(() => {});
      }
      const fullTask = window.appState && window.appState.workbookMgr ? window.appState.workbookMgr.getTask(this.selectedMonth, taskId) : null;
      if (fullTask) {
        FirebaseSyncService.pushTask(this.selectedMonth, fullTask);
      }
    }

    // 4. Queue Google Sheets sync if available
    if (typeof GoogleSheetsSync !== 'undefined' && GoogleSheetsSync.queueFullSync) {
      GoogleSheetsSync.queueFullSync();
    }

    // 5. Direct cache synchronization for instant presentation reload
    try {
      localStorage.setItem('walton_photo_fit_' + taskId, photoFit);
      const cacheKey = `walton_pd_active_slides_${this.selectedMonth}`;
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        const cachedSlides = JSON.parse(saved);
        const idx = cachedSlides.findIndex(s => s && s.task_id === taskId);
        if (idx !== -1) {
          cachedSlides[idx] = {
            ...cachedSlides[idx],
            ...overrides,
            photo_fit: photoFit,
            has_manual_override: true,
            manual_override_time: new Date().toISOString()
          };
          localStorage.setItem(cacheKey, JSON.stringify(cachedSlides));
        }
      }
    } catch (e) {
      console.warn("Could not patch local active slides cache:", e);
    }

    // 6. Push overrides to Hostinger Server Storage API for permanent cross-device sync
    try {
      fetch('api/sync_overrides.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: taskId,
          month: this.selectedMonth,
          overrides: overrides
        })
      }).catch(err => console.warn("[Hostinger Overrides Sync] Notice:", err));
    } catch(e) {}

    this.closeModal();
    this.render();

    // 6. Refresh MonthlyInputView so that engineer change moves task to their concern tab immediately
    if (typeof MonthlyInputView !== 'undefined' && MonthlyInputView.render) {
      MonthlyInputView.render();
    }

    // 7. Automatically refresh Dashboard metrics and category counts
    if (typeof DashboardController !== 'undefined' && DashboardController.render) {
      DashboardController.render(this.selectedMonth);
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`✨ Slide overrides saved for task ${taskId}! Presentation preview and concern assignment updated.`, "success");
    }
  },

  resetOverrides(taskId) {
    if (window.appState && window.appState.syncEngine) {
      if (typeof window.appState.syncEngine.removeManualOverride === 'function') {
        window.appState.syncEngine.removeManualOverride(taskId);
      }
    }
    this.closeModal();
    this.render();
    if (typeof window.showToast === 'function') {
      window.showToast(`Reset task ${taskId} to original AI defaults.`, "info");
    }
  },

  previewFullDeck(slideIndex = 0) {
    const month = this.selectedMonth;
    const allTasks = window.appState && window.appState.workbookMgr ? window.appState.workbookMgr.getTasksForMonth(month) : [];
    let activeSlides = window.appState && window.appState.syncEngine
      ? window.appState.syncEngine.getActiveSlides(month)
      : [];
    if (allTasks && allTasks.length > 0) {
      activeSlides = activeSlides.filter(s => {
        if (!s || !s.task_id) return false;
        const sId = String(s.task_id).toLowerCase();
        const t = allTasks.find(x => {
          if (!x || !x.task_id) return false;
          const xId = String(x.task_id).toLowerCase();
          return xId === sId || xId.startsWith(sId + '-') || sId.startsWith(xId + '-');
        });
        if (!t) return false;
        const rep = String(t.include_in_report || t.presentation_status || t.monthly_report || 'YES').toUpperCase().trim();
        return rep !== "NO";
      });
    }
    if (typeof photoManager !== 'undefined') {
      activeSlides.forEach(s => {
        const p = photoManager.getTaskPhotos(s.task_id, month);
        s.photo_before = p ? (p.before_photo || null) : null;
        s.photo_after = p ? (p.after_photo || null) : null;
        s.photo = p ? (p.before_photo || p.after_photo || null) : null;
        s.has_dual_photo = Boolean(s.photo_before && s.photo_after);
      });
    }

    if (typeof SlidePreviewModal !== 'undefined' && SlidePreviewModal.openFullDeck) {
      SlidePreviewModal.openFullDeck({ month, slides: activeSlides }, null, slideIndex);
      if (slideIndex > 0 && typeof SlidePreviewModal.goToSlide === 'function') {
        SlidePreviewModal.goToSlide(slideIndex);
      }
    } else if (typeof ReportBuilderView !== 'undefined' && ReportBuilderView.previewFullDeck) {
      ReportBuilderView.previewFullDeck(month);
    } else {
      ExportController.exportHTML(month);
    }
  },

  previewCoverSlide() {
    this.previewFullDeck(0);
  },

  previewDashboardSlide() {
    this.previewFullDeck(2);
  },

  previewWorkshopCostSlide() {
    const month = this.selectedMonth;
    const rawData = (typeof WorkshopCostManager !== 'undefined') ? WorkshopCostManager.getWorkshopData(month) : null;
    const slideHtml = (typeof SlideLayoutEngine !== 'undefined')
      ? SlideLayoutEngine.renderWorkshopCostSavingSlide(month, rawData)
      : '<div class="p-8">Workshop Cost Saving Slide</div>';

    if (typeof SlidePreviewModal !== 'undefined' && SlidePreviewModal.openCustomHtml) {
      SlidePreviewModal.openCustomHtml(slideHtml, `AC Process Workshop Cost Saving Report (${month})`);
    } else if (typeof SlidePreviewModal !== 'undefined' && SlidePreviewModal.openSingle) {
      SlidePreviewModal.openSingle({
        raw_html: slideHtml,
        slide_title: `AC Process Workshop Cost Saving Report - ${month}`
      });
    }
  },

  previewTop5Slide() {
    if (typeof SlidePreviewModal !== 'undefined' && SlidePreviewModal.deckHtmlList && SlidePreviewModal.deckHtmlList.length >= 2) {
      this.previewFullDeck(SlidePreviewModal.deckHtmlList.length - 2);
    } else {
      const month = this.selectedMonth;
      const allTasks = window.appState && window.appState.workbookMgr ? window.appState.workbookMgr.getTasksForMonth(month) : [];
      let activeSlides = window.appState && window.appState.syncEngine
        ? window.appState.syncEngine.getActiveSlides(month)
        : [];
      if (allTasks && allTasks.length > 0) {
        activeSlides = activeSlides.filter(s => {
          if (!s || !s.task_id) return false;
          const sId = String(s.task_id).toLowerCase();
          const t = allTasks.find(x => {
            if (!x || !x.task_id) return false;
            const xId = String(x.task_id).toLowerCase();
            return xId === sId || xId.startsWith(sId + '-') || sId.startsWith(xId + '-');
          });
          if (!t) return false;
          const rep = String(t.include_in_report || t.presentation_status || t.monthly_report || 'YES').toUpperCase().trim();
          return rep !== "NO";
        });
      }
      this.previewFullDeck(activeSlides.length + 3);
    }
  },

  previewClosingSlide() {
    if (typeof SlidePreviewModal !== 'undefined' && SlidePreviewModal.deckHtmlList && SlidePreviewModal.deckHtmlList.length > 0) {
      this.previewFullDeck(SlidePreviewModal.deckHtmlList.length - 1);
    } else {
      const month = this.selectedMonth;
      const allTasks = window.appState && window.appState.workbookMgr ? window.appState.workbookMgr.getTasksForMonth(month) : [];
      let activeSlides = window.appState && window.appState.syncEngine
        ? window.appState.syncEngine.getActiveSlides(month)
        : [];
      if (allTasks && allTasks.length > 0) {
        activeSlides = activeSlides.filter(s => {
          if (!s || !s.task_id) return false;
          const sId = String(s.task_id).toLowerCase();
          const t = allTasks.find(x => {
            if (!x || !x.task_id) return false;
            const xId = String(x.task_id).toLowerCase();
            return xId === sId || xId.startsWith(sId + '-') || sId.startsWith(xId + '-');
          });
          if (!t) return false;
          const rep = String(t.include_in_report || t.presentation_status || t.monthly_report || 'YES').toUpperCase().trim();
          return rep !== "NO";
        });
      }
      this.previewFullDeck(activeSlides.length + 4);
    }
  },

  openTop5Modal(month = this.selectedMonth) {
    if (typeof FinalEditorView !== 'undefined' && FinalEditorView.openTop5Modal) {
      FinalEditorView.openTop5Modal(month);
    } else {
      App.switchTab('top5-summary');
    }
  },

  render() {
    const container = document.getElementById('monthly-report-view-container');
    if (!container) return;

    const month = this.selectedMonth;
    const workbookMgr = window.appState && window.appState.workbookMgr
      ? window.appState.workbookMgr
      : (typeof MonthWorkbookManager !== 'undefined' ? new MonthWorkbookManager() : null);

    const months = workbookMgr ? workbookMgr.getAllMonths() : ["SEP-2026"];
    const allTasks = workbookMgr ? workbookMgr.getTasksForMonth(month) : [];

    // Get active slides using SyncEngine or fallback
    let activeSlides = (window.appState && window.appState.syncEngine)
      ? window.appState.syncEngine.getActiveSlides(month)
      : [];

    // 1-to-1 Mapping Guarantee: Active slides must correspond exclusively to registered monthly tasks marked YES (Requirement 3: Anam 35 NO, 1 YES -> Only 1 slide)
    if (allTasks && allTasks.length > 0) {
      activeSlides = activeSlides.filter(s => {
        if (!s || !s.task_id) return false;
        const sId = String(s.task_id).toLowerCase();
        const t = allTasks.find(x => {
          if (!x || !x.task_id) return false;
          const xId = String(x.task_id).toLowerCase();
          return xId === sId || xId.startsWith(sId + '-') || sId.startsWith(xId + '-');
        });
        if (!t) return false;
        const rep = String(t.include_in_report || t.presentation_status || t.monthly_report || 'YES').toUpperCase().trim();
        return rep !== "NO";
      });
    }

    if (activeSlides.length === 0 && allTasks.length > 0) {
      activeSlides = allTasks.filter(t => {
        const rep = String(t.include_in_report || t.presentation_status || t.monthly_report || '').toUpperCase().trim();
        return rep !== "NO";
      }).map((t, idx) => ({
        task_id: t.task_id || `${month}-${idx + 1}`,
        slide_title: t.task_name || `Task ${idx + 1}`,
        description: t.task_details || "Standard operating procedure execution and engineering development.",
        impact: ["Zero defect manufacturing", "Enhanced line balancing and cycle efficiency"],
        engineer: t.concern_engineer || t.engineer || t.assignee || "Concern Engineer",
        category: t.category || "Process Development",
        status: t.status || "Completed",
        photo_before: t.photo_before || t.photo || null,
        photo_after: t.photo_after || null,
        has_manual_override: false
      }));
    }

    // Dynamic Photo & Fit Binding: Always pull 100% current fresh photos and fit mode from photoManager/overrides
    if (typeof photoManager !== 'undefined') {
      activeSlides.forEach(s => {
        const p = photoManager.getTaskPhotos(s.task_id, month);
        const pBefore = (p && p.before_photo) ? p.before_photo : (s.photo_before || null);
        const pAfter = (p && p.after_photo) ? p.after_photo : (s.photo_after || null);
        s.photo_before = pBefore;
        s.photo_after = pAfter;
        s.photo = pAfter || pBefore || s.photo || null;
        s.has_dual_photo = Boolean(s.photo_before && s.photo_after);

        const overrides = (window.appState && window.appState.syncEngine)
          ? window.appState.syncEngine.getManualOverride(s.task_id)
          : null;
        let savedFit = (overrides && overrides.photo_fit) || s.photo_fit;
        if (!savedFit && typeof window !== 'undefined') {
          try { savedFit = localStorage.getItem('walton_photo_fit_' + s.task_id); } catch(e) {}
        }
        s.photo_fit = (savedFit === 'cover' || savedFit === 'fill') ? 'cover' : 'blur';
      });
    }

    // Filter by engineer if selected
    const norm = s => (s || '').trim().toLowerCase();
    const filterNorm = norm(this.filterEngineer);
    const filterFirst = filterNorm.split(/[\s(]/)[0];
    const isEngMatch = eng => {
      if (!filterNorm) return true;
      const e = norm(eng);
      if (e.includes(filterNorm)) return true;
      const eFirst = e.split(/[\s(]/)[0];
      return Boolean(eFirst && filterFirst && eFirst === filterFirst);
    };

    // Dynamic Category Highlights (Requirement 6 & 7: Only categories with tasks > 0)
    const reportCategoryCounts = {};
    let reportCompletedProjects = 0;
    let reportOngoingProjects = 0;

    activeSlides.forEach(s => {
      const cat = (s.category || 'Process Development').trim();
      const normCat = cat.replace(/–/g, '-').trim();
      const lowerCat = normCat.toLowerCase();
      
      if (s.is_project || lowerCat.includes('project')) {
        if ((s.status || '').toLowerCase() === 'completed' || lowerCat.includes('complete')) {
          reportCompletedProjects++;
        } else {
          reportOngoingProjects++;
        }
      } else {
        reportCategoryCounts[normCat] = (reportCategoryCounts[normCat] || 0) + 1;
      }
    });

    const highlightCards = [];
    Object.entries(reportCategoryCounts).forEach(([catName, cnt]) => {
      if (cnt <= 0) return;
      const normKey = catName.toLowerCase().replace(/–/g, '-').trim();
      const meta = (typeof REPORT_CATEGORY_META !== 'undefined' && (REPORT_CATEGORY_META[normKey] || REPORT_CATEGORY_META[catName.toLowerCase()])) || {
        label: catName,
        icon: "⚙️",
        note: "Process Report Task",
        bg: "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)",
        border: "#94A3B8",
        valColor: "#334155",
        labelColor: "#1E293B",
        shadow: "rgba(100,116,139,0.16)"
      };
      highlightCards.push({
        id: `cat_${normKey.replace(/[^a-z0-9]/g, '_')}`,
        val: cnt,
        label: meta.label,
        icon: meta.icon,
        note: meta.note,
        bg: meta.bg,
        border: meta.border,
        valColor: meta.valColor,
        labelColor: meta.labelColor,
        shadow: meta.shadow,
        filterCategory: catName
      });
    });

    if (reportCompletedProjects > 0) {
      highlightCards.push({
        id: "comp_proj",
        val: reportCompletedProjects,
        label: "Completed Projects",
        icon: "🏆",
        note: "Shop-Floor Commissioned",
        bg: "linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)",
        border: "#F87171",
        valColor: "#B91C1C",
        labelColor: "#7F1D1D",
        shadow: "rgba(239,68,68,0.16)",
        filterCategory: "Completed Projects"
      });
    }

    if (reportOngoingProjects > 0) {
      highlightCards.push({
        id: "ongoing_proj",
        val: reportOngoingProjects,
        label: "New Projects / Ongoing",
        icon: "🚀",
        note: "Active Line Trials",
        bg: "linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)",
        border: "#22D3EE",
        valColor: "#0E7490",
        labelColor: "#164E63",
        shadow: "rgba(6,182,212,0.16)",
        filterCategory: "Ongoing Projects"
      });
    }

    highlightCards.sort((a, b) => b.val - a.val);

    const isCatMatch = (cat, s) => {
      if (!this.filterCategory) return true;
      const fCat = this.filterCategory.toLowerCase().replace(/–/g, '-').trim();
      const sCat = (cat || '').toLowerCase().replace(/–/g, '-');
      if (fCat.includes('complete') && (s.is_project || sCat.includes('project'))) {
        return (s.status || '').toLowerCase() === 'completed' || sCat.includes('complete');
      }
      if (fCat.includes('ongoing') && (s.is_project || sCat.includes('project'))) {
        return (s.status || '').toLowerCase() !== 'completed' && !sCat.includes('complete');
      }
      return sCat.includes(fCat) || sCat === fCat;
    };

    let displayedSlides = this.filterEngineer
      ? activeSlides.filter(s => isEngMatch(s.engineer))
      : activeSlides;

    if (this.filterCategory) {
      displayedSlides = displayedSlides.filter(s => isCatMatch(s.category, s));
    }

    // Unique engineers for filter pills and task count calculation
    const engineerCounts = {};
    activeSlides.forEach(s => {
      const raw = (s.engineer || 'Unassigned').split('(')[0].trim();
      engineerCounts[raw] = (engineerCounts[raw] || 0) + 1;
    });

    const uniqueEngineers = Array.from(new Set(activeSlides.map(s => {
      const raw = s.engineer || 'Unassigned';
      return raw.split('(')[0].trim();
    }))).filter(Boolean);
    uniqueEngineers.sort((a, b) => (engineerCounts[b] || 0) - (engineerCounts[a] || 0));

    // Total sequence slide count calculation: Cover(1) + Agenda(2) + Dashboard(3) + Tasks(N) + Workshop(N+4) + Top 5(N+5) + Closing(N+6)
    const hasWorkshopSlide = (typeof WorkshopCostManager !== 'undefined' && WorkshopCostManager.hasWorkshopData && WorkshopCostManager.hasWorkshopData(this.selectedMonth));
    const totalPresentationSlides = activeSlides.length + (hasWorkshopSlide ? 6 : 5);

    container.innerHTML = `
      <!-- Single Unified Executive Container for Monthly Report (Immediate slide edit visibility) -->
      <div class="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-xs space-y-2.5">
        
        <!-- 1. COMPACT TOP CONTROL BAR (One sleek executive row) -->
        <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          
          <!-- Left: Brand + Title + Month Selector + Stats -->
          <div class="flex items-center gap-2.5 flex-wrap">
            <img src="assets/img/walton_logo.png" alt="WALTON" class="h-6 w-auto object-contain flex-shrink-0 drop-shadow-2xs">
            <div class="flex items-center gap-1.5 flex-wrap">
              <h2 class="text-sm sm:text-base font-black text-slate-900 tracking-tight">Monthly Report Presentation Hub</h2>
              <span class="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                ${month}
              </span>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap">
              ${HELPERS.renderMonthSelectorUI(months, this.selectedMonth, 'MonthlyReportView.handleMonthSelect')}
              <span class="px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-mono font-bold">
                📑 Total Deck: <strong>${totalPresentationSlides} Slides</strong>
              </span>
              <span class="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-mono font-bold">
                ⚙️ Task Slides: <strong>${activeSlides.length}</strong>
              </span>
            </div>
          </div>

          <!-- Right: Export & Presentation Buttons -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <button onclick="MonthlyReportView.previewFullDeck()" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 border border-slate-300 transition flex items-center gap-1.5 shadow-2xs cursor-pointer">
              <span>👁️</span> <span>Preview Full Deck</span>
            </button>
            <button onclick="ExportController.exportPPTX('${month}')" title="100% Native Editable PPTX" class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-xs font-black text-white shadow-xs transition flex items-center gap-1 cursor-pointer">
              <span>📊</span> <span>Download PPTX</span>
            </button>
            <button onclick="ExportController.exportPDF('${month}')" class="px-2 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 transition flex items-center gap-1 shadow-2xs cursor-pointer">
              <span>🖨️</span> <span>PDF</span>
            </button>
          </div>
        </div>

        <!-- 2. ESSENTIAL PRESENTATION DECK PAGES (Kept neatly separate in compact strip) -->
        <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl px-3 py-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 shadow-xs border border-slate-700/80">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider flex-shrink-0">
              📑 Essential Deck Slides:
            </span>
            <div class="flex items-center gap-1.5 flex-wrap">
              <button onclick="MonthlyReportView.previewCoverSlide()" title="Slide #1: Opening Cover Presentation"
                      class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer">
                <span>#1 Cover Page</span> <span class="text-[10px]">👁️</span>
              </button>
              <button onclick="MonthlyReportView.previewDashboardSlide()" title="Slide #2: Executive Performance Matrix & Points"
                      class="px-2.5 py-1 rounded-lg bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 hover:text-white border border-indigo-700 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer">
                <span>#2 Dashboard Slide</span> <span class="text-[10px]">👁️</span>
              </button>
              <button onclick="MonthlyReportView.openTop5Modal()" title="Edit Top 5 Completed &amp; Ongoing Summary"
                      class="px-2.5 py-1 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-200 hover:text-white border border-rose-700 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer">
                <span>🏆 Top 5 Projects Summary</span> <span class="text-[10px]">✏️</span>
              </button>
              <button onclick="MonthlyReportView.previewTop5Slide()" title="Preview Slide #Summary: Top 5 Completed &amp; Ongoing Summary"
                      class="px-2 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-800 text-rose-300 hover:text-white border border-rose-800 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer">
                <span>👁️</span>
              </button>
              <button onclick="MonthlyReportView.previewClosingSlide()" title="Slide #Closing: Thank You &amp; Conclusion"
                      class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer">
                <span>#Closing Slide</span> <span class="text-[10px]">👁️</span>
              </button>
            </div>
          </div>

          <!-- Search Box & Slide Counter -->
          <div class="flex items-center gap-2 w-full md:w-auto">
            <div class="relative flex-1 md:w-60">
              <input type="text" oninput="MonthlyReportView.handleSearch(this.value)" placeholder="Search slides, engineer..." 
                     class="w-full bg-slate-800/90 border border-slate-600 rounded-lg pl-7 pr-2.5 py-1 text-xs text-white placeholder-slate-400 focus:bg-slate-900 focus:outline-none focus:border-blue-400 font-medium shadow-2xs" />
              <span class="absolute left-2 top-1.5 text-slate-400 text-xs">🔍</span>
            </div>
            <span id="monthly-report-filtered-counter" class="text-[11px] font-mono text-slate-400 whitespace-nowrap">
              ${displayedSlides.length} slides
            </span>
          </div>
        </div>

        <!-- 3. SINGLE DEDICATED ROW FOR ENGINEER NAMES WITH (TASK QTY) -->
        <div id="monthly-report-engineer-filters" class="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin text-xs">
          <span class="text-[10.5px] font-mono font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">Engineers:</span>
          <button id="monthly-report-all-engineers-btn" onclick="MonthlyReportView.handleEngineerFilter('')" 
                  class="px-3 py-1.5 rounded-xl text-xs font-bold transition border flex-shrink-0 flex items-center gap-1.5 ${!this.filterEngineer ? 'bg-slate-900 text-white border-slate-900 shadow-2xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}">
            <span>All Engineers</span>
            <span class="engineer-count-badge px-1.5 py-0.2 rounded-full text-[10.5px] font-mono font-black ${!this.filterEngineer ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'}">(${activeSlides.length})</span>
          </button>
          ${uniqueEngineers.map(eng => {
            const isSel = (this.filterEngineer.toLowerCase() === eng.toLowerCase());
            const count = engineerCounts[eng] || 0;
            return `
              <button data-engineer="${HELPERS.escapeHtml(eng)}" onclick="MonthlyReportView.handleEngineerFilter('${HELPERS.escapeHtml(eng)}')" 
                      class="engineer-filter-btn px-3 py-1.5 rounded-xl text-xs font-bold transition border flex-shrink-0 flex items-center gap-1.5 ${isSel ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}">
                <span>👤 ${HELPERS.escapeHtml(eng)}</span>
                <span class="engineer-count-badge px-1.5 py-0.2 rounded-full text-[10.5px] font-mono font-black ${isSel ? 'bg-white/25 text-white' : 'bg-blue-50 text-blue-700'}">(${count})</span>
              </button>
            `;
          }).join('')}
          ${this.filterCategory ? `
            <button onclick="MonthlyReportView.handleCategoryFilter('')" class="ml-auto px-2.5 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold border border-red-200 transition flex items-center gap-1 cursor-pointer flex-shrink-0">
              <span>✕</span> <span>Reset ${HELPERS.escapeHtml(this.filterCategory)}</span>
            </button>
          ` : ''}
        </div>
      </div>

        <!-- 3. TASK PRESENTATION SLIDES GRID (Starts IMMEDIATELY right at top, Requirement 1) -->
        <div id="monthly-report-cards-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          <div id="monthly-report-no-slides-msg" style="${displayedSlides.length === 0 ? '' : 'display: none;'}" class="col-span-full py-12 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 text-xs font-mono">
            No active slides match the current filter in ${month}.
          </div>
          ${activeSlides.map((s, idx) => {
            const initialEngMatch = !this.filterEngineer || isEngMatch(s.engineer);
            const initialCatMatch = isCatMatch(s.category, s);
            const initialVisible = initialEngMatch && initialCatMatch;
            const searchText = `${s.task_name || ''} ${s.description || ''} ${s.engineer || ''} ${s.category || ''} ${s.task_id || ''}`.toLowerCase();
            const hasPhoto = Boolean(s.photo_before || s.photo_after || s.photo);
            const isOverridden = Boolean(s.has_manual_override);
            const photoDisplay = s.photo_after || s.photo_before || s.photo;
            let photoDisplaySrc = photoDisplay;
            if (typeof photoManager !== 'undefined' && photoManager.formatPhotoUrl) {
              photoDisplaySrc = photoManager.formatPhotoUrl(photoDisplaySrc);
            } else if (photoDisplaySrc && (photoDisplaySrc.startsWith('uploads/') || photoDisplaySrc.startsWith('/uploads/'))) {
              const rel = photoDisplaySrc.startsWith('/') ? photoDisplaySrc.slice(1) : photoDisplaySrc;
              photoDisplaySrc = 'https://acprocess.com/report/' + rel;
            }
            if (photoDisplaySrc && (photoDisplaySrc.startsWith('http') || photoDisplaySrc.startsWith('uploads/') || photoDisplaySrc.startsWith('/uploads/'))) {
              const cleanUrl = photoDisplaySrc.split('?')[0];
              photoDisplaySrc = `${cleanUrl}?t=${Date.now()}`;
            }
            const isSelected = (this._selectedCardTaskId === s.task_id);
            const isCover = (s.photo_fit === 'cover' || s.photo_fit === 'fill');

            return `
              <div id="slide-card-${s.task_id}" 
                   data-task-id="${s.task_id}" 
                   data-engineer="${HELPERS.escapeHtml(s.engineer || '')}"
                   data-category="${HELPERS.escapeHtml(s.category || '')}"
                   data-is-project="${Boolean(s.is_project)}"
                   data-status="${HELPERS.escapeHtml(s.status || '')}"
                   data-search-text="${HELPERS.escapeHtml(searchText)}"
                   style="${initialVisible ? '' : 'display: none;'}"
                   onclick="MonthlyReportView.selectSlideCard('${s.task_id}')"
                   onmouseenter="MonthlyReportView.selectSlideCard('${s.task_id}')"
                   class="task-slide-card bg-white border ${isSelected ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/15' : (isOverridden ? 'border-amber-400 bg-amber-50/10' : 'border-slate-200')} rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:border-blue-300 hover:shadow-sm transition space-y-3 cursor-pointer">
                <div>
                  <!-- Slide Top Indicator -->
                  <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span class="text-[10px] font-mono font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                      Slide #${idx + 3}
                    </span>
                    <div class="flex items-center gap-1.5">
                      ${s.is_project ? `
                        <span class="text-[9px] font-mono font-bold ${s.status === 'Completed' ? 'text-emerald-700 bg-emerald-100' : 'text-purple-700 bg-purple-100'} px-1.5 py-0.2 rounded" title="Strategic Project Slide appended at end">
                          ${s.status === 'Completed' ? '✔ Completed Project' : '🚀 Ongoing Project'}
                        </span>
                      ` : ''}
                      ${isOverridden ? `
                        <span class="text-[9px] font-mono font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded shadow-xs" title="Slide content edited manually at ${s.manual_override_time || ''}">
                          ✏️ Overridden ${this.formatOverrideTime(s.manual_override_time)}
                        </span>
                      ` : ''}
                      <span class="text-[10px] font-mono text-slate-400 font-bold">${s.task_id}</span>
                    </div>
                  </div>

                  <!-- Title & Meta -->
                  <h4 class="text-xs font-bold text-slate-900 mt-2 line-clamp-2 leading-snug" title="${HELPERS.escapeHtml(s.slide_title)}">
                    ${HELPERS.escapeHtml(s.slide_title)}
                  </h4>
                  
                  <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span class="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      👤 ${HELPERS.escapeHtml(s.engineer)}
                    </span>
                    <span class="text-[10px] text-slate-500 font-medium">
                      ⚙️ ${HELPERS.escapeHtml(s.category || 'Process')}
                    </span>
                    <span class="text-[10px] font-mono photo-status-pill ${hasPhoto ? 'text-emerald-600 font-bold' : 'text-slate-400'}">
                      ${hasPhoto ? '📷 Photo Added' : '📷 No Photo'}
                    </span>
                  </div>

                  <!-- Photo Preview / Quick Drop Zone (Direct photo paste in monthly report section) -->
                  <div class="slide-card-photo-container mt-2.5">
                    ${hasPhoto ? `
                      <div class="photo-fit-wrapper ${isCover ? 'photo-fit-cover' : 'photo-fit-blur'} relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-200 shadow-2xs group/img">
                        <img src="${photoDisplaySrc}" alt="" class="photo-blur-bg absolute inset-[-12%] w-[124%] h-[124%] object-cover pointer-events-none select-none" style="filter: blur(14px) brightness(0.65); opacity: 0.65; ${isCover ? 'display: none;' : ''}" onerror="this.style.display='none';" />
                        <img src="${photoDisplaySrc}" class="photo-main-img ${isCover ? 'w-full h-full object-cover absolute inset-0' : 'relative z-10 w-full h-full object-contain'} drop-shadow-sm transition-all" alt="Slide Photo" onerror="MonthlyReportView.handlePhotoImgError(this, '${s.task_id}', '${s.photo_after ? 'after_photo' : 'before_photo'}');" />
                        <div class="absolute bottom-1.5 left-1.5 z-20 flex items-center gap-1">
                          <span class="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/70 text-white backdrop-blur-xs">
                            ${s.photo_after && s.photo_before ? 'Dual Photo' : (s.photo_after ? 'After Photo' : 'Before Photo')}
                          </span>
                        </div>
                        <div class="absolute top-1.5 right-1.5 z-20 flex items-center gap-1 opacity-90 hover:opacity-100">
                          <button type="button" onclick="event.stopPropagation(); MonthlyReportView.selectSlideCard('${s.task_id}'); MonthlyReportView.pasteFromClipboard('${s.task_id}', 'after_photo')" title="Replace from Clipboard (Ctrl+V)"
                                  class="px-2 py-0.5 rounded bg-black/70 hover:bg-black/90 text-white text-[9px] font-bold backdrop-blur-xs transition cursor-pointer">
                            📋 Paste
                          </button>
                          <button type="button" onclick="event.stopPropagation(); MonthlyReportView.selectSlideCard('${s.task_id}'); document.getElementById('card-file-${s.task_id}')?.click();" title="Replace from file"
                                  class="px-2 py-0.5 rounded bg-black/70 hover:bg-black/90 text-white text-[9px] font-bold backdrop-blur-xs transition cursor-pointer">
                            📁 Replace
                          </button>
                          <button type="button" onclick="event.stopPropagation(); MonthlyReportView.deleteCardPhoto('${s.task_id}');" title="Remove Photo"
                                  class="px-2 py-0.5 rounded bg-rose-600/80 hover:bg-rose-600 text-white text-[9px] font-bold backdrop-blur-xs transition cursor-pointer">
                            🗑 Remove
                          </button>
                        </div>
                        <input type="file" id="card-file-${s.task_id}" accept="image/*" class="hidden" onchange="MonthlyReportView.handleCardFileInput(this, '${s.task_id}', 'after_photo')" />
                      </div>
                    ` : `
                      <div class="relative w-full aspect-video rounded-xl border border-dashed border-slate-300 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/30 flex flex-col items-center justify-center p-2.5 text-center transition group/drop cursor-pointer"
                           onclick="event.stopPropagation(); MonthlyReportView.selectSlideCard('${s.task_id}'); MonthlyReportView.pasteFromClipboard('${s.task_id}', 'after_photo');"
                           ondragover="event.preventDefault(); this.classList.add('border-blue-500', 'bg-blue-50');"
                           ondragleave="this.classList.remove('border-blue-500', 'bg-blue-50');"
                           ondrop="event.preventDefault(); this.classList.remove('border-blue-500', 'bg-blue-50'); MonthlyReportView.handleSlotDrop(event, '${s.task_id}', 'after_photo');">
                        <span class="text-xl text-slate-400 group-hover/drop:scale-110 group-hover/drop:text-blue-600 transition">📷</span>
                        <span class="text-[11px] font-bold text-slate-700 mt-0.5">Paste or Upload Photo</span>
                        <div class="flex items-center gap-1.5 mt-1" onclick="event.stopPropagation()">
                          <button type="button" onclick="MonthlyReportView.selectSlideCard('${s.task_id}'); MonthlyReportView.pasteFromClipboard('${s.task_id}', 'after_photo')" 
                                  class="px-2 py-0.8 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 transition shadow-2xs cursor-pointer">
                            📋 Paste (Ctrl+V)
                          </button>
                          <button type="button" onclick="MonthlyReportView.selectSlideCard('${s.task_id}'); document.getElementById('card-file-${s.task_id}')?.click();" 
                                  class="px-2.5 py-0.8 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition cursor-pointer border border-slate-200">
                            📁 Upload / Camera
                          </button>
                        </div>
                        <input type="file" id="card-file-${s.task_id}" accept="image/*" class="hidden" onchange="MonthlyReportView.handleCardFileInput(this, '${s.task_id}', 'after_photo')" />
                      </div>
                    `}
                  </div>

                  <!-- Description Preview (Sentence format) -->
                  <p class="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    ${HELPERS.escapeHtml(s.description || 'No milestone description')}
                  </p>
                </div>

                <!-- Slide Card Actions -->
                <div class="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button type="button" onclick="event.stopPropagation(); MonthlyReportView.selectSlideCard('${s.task_id}'); MonthlyReportView.pasteFromClipboard('${s.task_id}', 'after_photo')" 
                          title="Paste photo directly from clipboard (Ctrl+C then Ctrl+V)"
                          class="px-2.5 sm:px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                    <span>📋</span> <span class="hidden xs:inline">Paste</span>
                  </button>
                  <button type="button" onclick="event.stopPropagation(); MonthlyReportView.selectSlideCard('${s.task_id}'); document.getElementById('card-file-${s.task_id}')?.click();"
                          title="Upload photo from camera or file"
                          class="px-2.5 sm:px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition flex items-center gap-1 cursor-pointer">
                    <span>📷</span> <span class="hidden xs:inline">Photo</span>
                  </button>
                  <button onclick="MonthlyReportView.openModal('${s.task_id}')" class="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-xs font-black text-white shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer">
                    <span>🎨</span> <span>Customize</span>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- 4. BOTTOM SPECIAL SLIDES CARDS (Summary & Concluding Deck Slides) -->
        <div class="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
          
          <!-- Slide N+1: AC Process Workshop Cost Saving Report Card (Immediately before Top 5 Summary) -->
          <div class="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="w-9 h-9 rounded-xl bg-emerald-600 text-white font-mono font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                #${activeSlides.length + 4}
              </span>
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-600 text-white">WORKSHOP COSTING</span>
                  <span class="text-[11px] font-mono text-emerald-700">16:9 Landscape</span>
                </div>
                <h4 class="text-xs font-black text-slate-900 mt-0.5">AC Process Workshop Cost Saving Report</h4>
              </div>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button onclick="App.switchTab('cost-savings')" class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-200 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer" title="Manage Excel Data & Initiatives">
                <span>📊</span> <span>Excel</span>
              </button>
              <button onclick="MonthlyReportView.previewWorkshopCostSlide()" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer" title="Preview 16:9 Landscape Presentation Slide">
                <span>👁️</span> <span>Preview</span>
              </button>
            </div>
          </div>

          <!-- Slide N+2: Top 5 Summary Card -->
          <div class="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="w-9 h-9 rounded-xl bg-red-600 text-white font-mono font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                #${activeSlides.length + 5}
              </span>
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-red-600 text-white">SUMMARY SLIDE</span>
                  <span class="text-[11px] font-mono text-red-700">Strategic Milestones</span>
                </div>
                <h4 class="text-xs font-black text-slate-900 mt-0.5">Top 5 Completed &amp; Ongoing Works Summary</h4>
              </div>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button onclick="MonthlyReportView.openTop5Modal()" class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-red-700 border border-red-200 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer">
                <span>✏️</span> <span>Edit</span>
              </button>
              <button onclick="MonthlyReportView.previewTop5Slide()" class="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer">
                <span>👁️</span> <span>Preview</span>
              </button>
            </div>
          </div>

          <!-- Slide N+3: Concluding Slide Card -->
          <div class="bg-slate-900 text-white rounded-2xl p-4 border border-slate-700 shadow-2xs flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-mono font-black text-xs flex items-center justify-center flex-shrink-0">
                #${activeSlides.length + 6}
              </span>
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-slate-700 text-white">CLOSING SLIDE</span>
                  <span class="text-[11px] font-mono text-slate-400">Final Slide</span>
                </div>
                <h4 class="text-xs font-black text-white mt-0.5">Thank You &bull; Continuous Process Improvement</h4>
              </div>
            </div>
            <button onclick="MonthlyReportView.previewClosingSlide()" class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1 flex-shrink-0 border border-white/20 cursor-pointer">
              <span>👁️</span> <span>Preview</span>
            </button>
          </div>
        </div>

        <!-- 5. PROCESS ENGINEERING CORE WORK HIGHLIGHTS (Inside the single container at bottom) -->
        <div class="pt-4 border-t border-slate-100 space-y-3">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-base">⚙️</span>
              <h3 class="text-xs sm:text-sm font-black text-slate-900">
                Process Engineering Core Work Highlights (${month})
              </h3>
              <span class="text-[11px] font-mono text-slate-500">
                (${highlightCards.length} Categories)
              </span>
            </div>
            ${this.filterCategory ? `
              <button onclick="MonthlyReportView.handleCategoryFilter('')" class="px-3 py-1 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold border border-red-200 transition flex items-center gap-1 cursor-pointer">
                <span>✕</span> <span>Reset Filter (${HELPERS.escapeHtml(this.filterCategory)})</span>
              </button>
            ` : ''}
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            ${highlightCards.length === 0 ? `
              <div class="col-span-full py-4 text-center text-xs font-mono text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                No active categories with tasks found for ${month}.
              </div>
            ` : highlightCards.map(c => {
              const isSelected = (this.filterCategory && this.filterCategory.toLowerCase() === c.filterCategory.toLowerCase());
              return `
                <div onclick="MonthlyReportView.handleCategoryFilter('${HELPERS.escapeHtml(c.filterCategory)}')"
                     class="cursor-pointer rounded-xl p-3 transition hover:scale-[1.02] hover:shadow-md relative overflow-hidden flex flex-col justify-between ${isSelected ? 'ring-2 ring-blue-600 shadow-sm' : ''}"
                     style="background: ${c.bg}; border: 1.5px solid ${c.border}; box-shadow: 0 2px 8px ${c.shadow};"
                     title="Click to filter slide sequence by ${HELPERS.escapeHtml(c.filterCategory)}">
                  <div class="flex items-center justify-between">
                    <div class="text-2xl font-black font-mono tracking-tight" style="color: ${c.valColor};">
                      ${c.val}
                    </div>
                    <span class="text-lg">${c.icon}</span>
                  </div>
                  <div class="mt-1.5">
                    <div class="text-xs font-black leading-tight line-clamp-1" style="color: ${c.labelColor};">
                      ${c.label}
                    </div>
                    <div class="text-[9.5px] font-bold mt-0.5 inline-block px-1.5 py-0.2 rounded bg-white/80 border border-black/5" style="color: ${c.valColor};">
                      ${c.note}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MonthlyReportView;
} else if (typeof window !== 'undefined') {
  window.MonthlyReportView = MonthlyReportView;
}

// Global Clipboard Paste Listener for Photos (Ctrl+C / Ctrl+V - Requirements 1 & 2)
if (typeof window !== 'undefined' && !window._mrvPhotoPasteBound) {
  window._mrvPhotoPasteBound = true;

  function extractImageFromClipboard(event) {
    const cbd = event.clipboardData || window.clipboardData;
    if (!cbd) return null;

    // 1. Direct file support (Windows Explorer Ctrl+C or file drag/paste)
    if (cbd.files && cbd.files.length > 0) {
      for (let i = 0; i < cbd.files.length; i++) {
        const file = cbd.files[i];
        if (file && ((file.type && file.type.startsWith('image/')) || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name || ''))) {
          return file;
        }
      }
    }

    // 2. Clipboard item bitmap support (Snipping Tool, browser Copy Image)
    if (cbd.items && cbd.items.length > 0) {
      for (let i = 0; i < cbd.items.length; i++) {
        const item = cbd.items[i];
        if (item && item.type && item.type.indexOf('image') !== -1) {
          return item.getAsFile();
        }
      }
    }
    // 3. Data URL text support
    try {
      const text = cbd.getData('text/plain') || cbd.getData('text');
      if (text && (text.startsWith('data:image/') || /^https?:\/\/.*\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(text.trim()))) {
        return text.trim();
      }
    } catch (e) {}

    return null;
  }

  window.addEventListener('paste', async (event) => {
    if (typeof MonthlyReportView === 'undefined') return;

    // Check if an image is present on clipboard
    const file = extractImageFromClipboard(event);
    if (!file) return;

    // Scenario A: Customize Studio Modal is currently open
    if (MonthlyReportView._activeModalTaskId) {
      event.preventDefault();
      const slot = MonthlyReportView._activePhotoSlot || 'after_photo';
      await MonthlyReportView.uploadPhotoFromBlob(file, MonthlyReportView._activeModalTaskId, slot);
      return;
    }

    // Scenario B: Monthly Report Section view (Requirement 1: "monthly report er section e")
    const activeTab = (window.appState && window.appState.activeTab) || (typeof App !== 'undefined' ? App.currentTab : '');
    if (activeTab === 'monthly-report' || activeTab === 'monthly-report-view' || activeTab === 'report') {
      const targetTaskId = MonthlyReportView._selectedCardTaskId;
      if (targetTaskId) {
        event.preventDefault();
        await MonthlyReportView.uploadPhotoFromBlob(file, targetTaskId, 'after_photo');
        if (typeof window.showToast === 'function') {
          window.showToast(`📋 Photo pasted directly to Task ${targetTaskId}!`, "success");
        }
      } else {
        if (typeof window.showToast === 'function') {
          window.showToast("👆 Please click a slide card first to select it, then press Ctrl+V to paste!", "info");
        }
      }
    }
  });
}
