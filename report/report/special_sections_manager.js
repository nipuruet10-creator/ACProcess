/**
 * SpecialSectionsManager
 * Manages dedicated Monthly Presentation Executive Sections:
 * 1. Process Workshop Achievements (1st photo)
 * 2. BOM Findings Executive Nexus (2nd photo)
 * 3. Completed Projects Showcase (3rd photo)
 * 4. Cost Saving Initiatives (4th photo / custom)
 * Followed by Top 5 Works and Thank You Closing Slide.
 */
const SpecialSectionsManager = {
  _photoCache: {},

  SECTIONS: [
    {
      id: 'workshop',
      title: 'Process Workshop Achievements',
      shortTitle: 'Process Workshop',
      badge: 'PROCESS WORKSHOP',
      color: 'emerald',
      gradient: 'from-emerald-600 to-teal-700',
      border: 'border-emerald-200',
      bgLight: 'bg-emerald-50/60',
      textAccent: 'text-emerald-700',
      icon: '🛠️',
      defaultPhoto: 'uploads/workshop_slide_reference.jpg',
      description: 'Practical Development, In-house Fabrication & Cost Reduction'
    },
    {
      id: 'bom',
      title: 'BOM Findings Executive Nexus',
      shortTitle: 'BOM Findings',
      badge: 'BOM AUDIT & FINDINGS',
      color: 'cyan',
      gradient: 'from-cyan-600 to-blue-700',
      border: 'border-cyan-200',
      bgLight: 'bg-cyan-50/60',
      textAccent: 'text-cyan-800',
      icon: '🧩',
      defaultPhoto: 'uploads/bom_slide_reference.png',
      description: 'Discrepancy resolution, RAC vs CAC variance analysis & audit metrics'
    },
    {
      id: 'completed_project',
      title: 'Completed Projects Showcase',
      shortTitle: 'Completed Projects',
      badge: 'COMPLETED PROJECTS',
      color: 'blue',
      gradient: 'from-blue-600 to-indigo-700',
      border: 'border-blue-200',
      bgLight: 'bg-blue-50/60',
      textAccent: 'text-blue-800',
      icon: '🏆',
      defaultPhoto: 'uploads/completed_project_slide_reference.jpg',
      description: 'New Die Development, line automation & finalized strategic projects'
    },
    {
      id: 'cost_saving',
      title: 'Cost Saving Initiatives',
      shortTitle: 'Cost Savings',
      badge: 'COST SAVINGS',
      color: 'amber',
      gradient: 'from-amber-600 to-emerald-700',
      border: 'border-amber-200',
      bgLight: 'bg-amber-50/60',
      textAccent: 'text-amber-800',
      icon: '💰',
      defaultPhoto: null,
      description: 'Annual & monthly cost reduction milestones and Kaizen impact'
    }
  ],

  getSection(id) {
    return this.SECTIONS.find(s => s.id === id) || null;
  },

  getSectionPhoto(id, month = null) {
    const sec = this.getSection(id);
    if (!sec) return null;
    const m = (month || (typeof MonthlyReportView !== 'undefined' ? MonthlyReportView.selectedMonth : 'SEP-2026')).toUpperCase();
    
    // Check if explicitly marked deleted for this month
    try {
      if (typeof localStorage !== 'undefined') {
        const deleted = localStorage.getItem(`walton_special_deleted_${id}_${m}`);
        if (deleted === 'true') return null;
      }
    } catch(e) {}

    // Check month-specific saved photo
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(`walton_special_slide_${id}_${m}`);
        if (saved) return saved;
        const globalSaved = localStorage.getItem(`walton_special_slide_${id}`);
        if (globalSaved) return globalSaved;
      }
    } catch(e) {}

    // Check memory cache
    const memKey = `${id}_${m}`;
    if (this._photoCache[memKey]) return this._photoCache[memKey];

    // Default reference photo fallback
    return sec.defaultPhoto || null;
  },

  async saveSectionPhoto(id, fileOrUrl, month = null) {
    const sec = this.getSection(id);
    if (!sec) return;
    const m = (month || (typeof MonthlyReportView !== 'undefined' ? MonthlyReportView.selectedMonth : 'SEP-2026')).toUpperCase();

    let photoData = fileOrUrl;
    if (typeof fileOrUrl === 'object' && fileOrUrl instanceof File) {
      photoData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(fileOrUrl);
      });
    }

    if (!photoData) return;

    // Save locally
    const memKey = `${id}_${m}`;
    this._photoCache[memKey] = photoData;

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`walton_special_slide_${id}_${m}`, photoData);
        localStorage.removeItem(`walton_special_deleted_${id}_${m}`);
      }
    } catch(e) {
      console.warn("Storage quota warning for special slide photo:", e);
    }

    // Attempt Hostinger disk upload for cross-device persistence
    if (typeof photoManager !== 'undefined' && photoManager.uploadPhotoToServer) {
      try {
        const serverUrl = await photoManager.uploadPhotoToServer(`SPECIAL_${id.toUpperCase()}`, 'photo', photoData, m);
        if (serverUrl) {
          this._photoCache[memKey] = serverUrl;
          try {
            localStorage.setItem(`walton_special_slide_${id}_${m}`, serverUrl);
          } catch(e) {}
        }
      } catch(upErr) {
        console.warn(`Hostinger upload notice for special slide ${id}:`, upErr);
      }
    }

    // Sync to Firebase Realtime Database
    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected && FirebaseSyncService.isConnected()) {
      try {
        const cleanRef = FirebaseSyncService.db.ref(`walton_monthly_report/special_slides/${m}/${id}`);
        cleanRef.set({
          photo: photoData.startsWith('data:') ? 'base64_local' : photoData,
          updated_at: Date.now()
        }).catch(() => {});
      } catch(fbErr) {}
    }

    // Refresh UI
    if (typeof MonthlyReportView !== 'undefined' && typeof MonthlyReportView.renderBottomSpecialSlides === 'function') {
      MonthlyReportView.renderBottomSpecialSlides();
    } else if (typeof MonthlyReportView !== 'undefined' && typeof MonthlyReportView.render === 'function') {
      MonthlyReportView.render();
    }

    if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
      window.showToast(`📸 Slide photo updated for ${sec.title}!`, 'success');
    }
  },

  deleteSectionPhoto(id, month = null) {
    const sec = this.getSection(id);
    if (!sec) return;
    const m = (month || (typeof MonthlyReportView !== 'undefined' ? MonthlyReportView.selectedMonth : 'SEP-2026')).toUpperCase();

    if (!confirm(`Are you sure you want to remove the slide photo for ${sec.title}?`)) {
      return;
    }

    const memKey = `${id}_${m}`;
    delete this._photoCache[memKey];

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`walton_special_slide_${id}_${m}`);
        localStorage.setItem(`walton_special_deleted_${id}_${m}`, 'true');
      }
    } catch(e) {}

    // Sync deletion to Firebase
    if (typeof FirebaseSyncService !== 'undefined' && FirebaseSyncService.isConnected && FirebaseSyncService.isConnected()) {
      try {
        FirebaseSyncService.db.ref(`walton_monthly_report/special_slides/${m}/${id}`).remove().catch(() => {});
      } catch(fbErr) {}
    }

    // Refresh UI
    if (typeof MonthlyReportView !== 'undefined' && typeof MonthlyReportView.renderBottomSpecialSlides === 'function') {
      MonthlyReportView.renderBottomSpecialSlides();
    } else if (typeof MonthlyReportView !== 'undefined' && typeof MonthlyReportView.render === 'function') {
      MonthlyReportView.render();
    }

    if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
      window.showToast(`Photo removed for ${sec.title}`, 'info');
    }
  },

  async handleFileInput(input, id, month = null) {
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (!file.type || !file.type.startsWith('image/')) {
      alert("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }
    await this.saveSectionPhoto(id, file, month);
    input.value = "";
  },

  async handleDrop(event, id, month = null) {
    if (!event) return;
    event.preventDefault();
    event.stopPropagation();
    const dt = event.dataTransfer;
    if (!dt || !dt.files || dt.files.length === 0) return;
    const file = dt.files[0];
    if (!file.type || !file.type.startsWith('image/')) {
      alert("Please drop an image file (PNG, JPG, WEBP).");
      return;
    }
    await this.saveSectionPhoto(id, file, month);
  },

  async pasteFromClipboard(id, month = null) {
    const sec = this.getSection(id);
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        document.getElementById(`special-file-${id}`)?.click();
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], `${id}_clipboard_${Date.now()}.${imageType.split("/")[1] || "png"}`, { type: imageType });
          await this.saveSectionPhoto(id, file, month);
          return;
        }
      }
      alert("No image found in clipboard. Please copy an image (Ctrl+C / PrtScn) and try again.");
    } catch(err) {
      document.getElementById(`special-file-${id}`)?.click();
    }
  },

  triggerFileInput(id, month = null) {
    const input = document.getElementById(`special-file-${id}`);
    if (input) {
      input.click();
    }
  },

  previewSlide(id, month = null) {
    const sec = this.getSection(id);
    if (!sec) return;
    const m = (month || (typeof MonthlyReportView !== 'undefined' ? MonthlyReportView.selectedMonth : 'SEP-2026')).toUpperCase();
    const html = this.renderSlideHtml(id, m, 1, 1);
    if (typeof SlidePreviewModal !== 'undefined' && SlidePreviewModal.openCustomHtml) {
      SlidePreviewModal.openCustomHtml(html, `${sec.title} (${m})`);
    }
  },

  /**
   * Renders a pristine 16:9 Presentation Slide for the given Special Section.
   * If a custom graphic photo exists (e.g. Photo 1, 2, or 3), it renders full-screen 16:9.
   * If no photo exists yet (e.g. Cost Saving), renders an interactive drop zone.
   */
  renderSlideHtml(id, month = 'SEP-2026', slideNum = 1, totalSlides = 1) {
    const sec = this.getSection(id);
    if (!sec) return `<div>Section ${id} not found</div>`;
    const photoUrl = this.getSectionPhoto(id, month);

    if (photoUrl) {
      return `
      <div class="walton-task-slide walton-special-section-slide bg-[#020617] relative overflow-hidden rounded-xl shadow-2xl border border-slate-800 group"
           style="width: 100%; aspect-ratio: 16/9; font-family: 'Lexend', sans-serif; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
        
        <!-- Full-bleed 16:9 Graphic Presentation Image -->
        <img src="${photoUrl}" alt="${HELPERS ? HELPERS.escapeHtml(sec.title) : sec.title}" 
             style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: #020617; z-index: 1;" />
        
        <!-- Top Toolbar on Hover -->
        <div class="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition duration-200">
          <button onclick="SpecialSectionsManager.triggerFileInput('${id}', '${month}')" title="Replace Slide Image"
                  class="px-2.5 py-1 rounded-lg bg-black/80 hover:bg-black backdrop-blur-md text-white text-[10px] font-mono font-bold border border-white/20 shadow-md flex items-center gap-1 cursor-pointer">
            <span>📷</span><span>Replace Photo</span>
          </button>
        </div>

        <!-- Discrete Page Indicator -->
        <div class="absolute bottom-2.5 right-3.5 z-20 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white/80 font-mono text-[9px] font-bold pointer-events-none">
          Page ${slideNum} / ${totalSlides}
        </div>
      </div>
      `;
    }

    // Modern Walton High-Tech Slide with Interactive Dropzone (Fallback for Cost Saving)
    return `
    <div class="walton-task-slide walton-special-section-slide bg-white relative overflow-hidden rounded-xl shadow-2xl border border-slate-200"
         style="width: 100%; aspect-ratio: 16/9; font-family: 'Lexend', sans-serif; box-sizing: border-box; padding: 24px 32px 16px 32px; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- Top Header Bar -->
      <div class="flex items-center justify-between pb-2.5 border-b border-slate-100 flex-shrink-0">
        <div class="flex items-center gap-2.5">
          <img src="assets/img/walton_logo.png" alt="WALTON" class="h-8 w-auto object-contain flex-shrink-0" onerror="this.style.display='none'" />
          <div>
            <div style="font-size: 13.5px; font-weight: 800; color: #0F172A; text-transform: uppercase;">PROCESS DEVELOPMENT DEPARTMENT</div>
            <div style="font-size: 9px; font-weight: 700; color: #64748B; letter-spacing: 0.14em; text-transform: uppercase;">INNOVATE &bull; IMPROVE &bull; DELIVER</div>
          </div>
        </div>
        <div class="text-right">
          <div style="font-size: 9.5px; font-weight: 700; color: #64748B; text-transform: uppercase;">EXECUTIVE SECTION</div>
          <div style="font-size: 16px; font-weight: 900; color: #C5161D; text-transform: uppercase;">${sec.badge}</div>
        </div>
      </div>

      <!-- Main Stage Dropzone Area -->
      <div class="flex-1 my-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center p-6 text-center transition hover:border-emerald-500 hover:bg-emerald-50/20"
           ondragover="event.preventDefault(); this.classList.add('border-emerald-500', 'bg-emerald-50/30');"
           ondragleave="this.classList.remove('border-emerald-500', 'bg-emerald-50/30');"
           ondrop="this.classList.remove('border-emerald-500', 'bg-emerald-50/30'); SpecialSectionsManager.handleDrop(event, '${id}', '${month}');">
        <div class="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-3xl shadow-sm mb-3">
          ${sec.icon}
        </div>
        <h3 class="text-base font-extrabold text-slate-800 uppercase tracking-wide">
          ${sec.title}
        </h3>
        <p class="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
          ${sec.description}. Drag &amp; drop your full 16:9 presentation slide graphic here, or click below to upload.
        </p>
        <div class="flex items-center gap-2 mt-4">
          <button type="button" onclick="SpecialSectionsManager.triggerFileInput('${id}', '${month}')"
                  class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer">
            <span>📷</span> <span>Upload 16:9 Slide Photo</span>
          </button>
          <button type="button" onclick="SpecialSectionsManager.pasteFromClipboard('${id}', '${month}')"
                  class="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer">
            <span>📋</span> <span>Paste (Ctrl+V)</span>
          </button>
        </div>
      </div>

      <!-- Bottom Footer Bar -->
      <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold flex-shrink-0">
        <div class="text-slate-800 font-bold uppercase tracking-wider">⚙ WALTON PROCESS DEVELOPMENT</div>
        <div class="text-slate-500 font-mono text-[11px]">
          Page ${slideNum} / ${totalSlides} &bull; ${month}
        </div>
      </div>

    </div>
    `;
  },

  /**
   * Renders the interactive bottom card grid for the Monthly Report view
   * Allows direct image upload, paste, replace, delete, and slide preview.
   */
  renderBottomCardsHtml(month = 'SEP-2026', taskCount = 0) {
    const m = (month || 'SEP-2026').toUpperCase();
    const workshopSlideNum = taskCount + 4;
    const bomSlideNum = taskCount + 5;
    const completedProjSlideNum = taskCount + 6;
    const costSavingSlideNum = taskCount + 7;
    const top5SlideNum = taskCount + 8;
    const closingSlideNum = taskCount + 9;

    const renderCard = (sec, slideNum) => {
      const photoUrl = this.getSectionPhoto(sec.id, m);
      const hasPhoto = Boolean(photoUrl);

      return `
      <div class="relative rounded-2xl border ${sec.border} ${sec.bgLight} p-4 shadow-xs flex flex-col justify-between gap-3 group/card transition hover:shadow-md"
           ondragover="event.preventDefault(); this.classList.add('ring-2', 'ring-red-500', 'bg-white');"
           ondragleave="this.classList.remove('ring-2', 'ring-red-500', 'bg-white');"
           ondrop="this.classList.remove('ring-2', 'ring-red-500', 'bg-white'); SpecialSectionsManager.handleDrop(event, '${sec.id}', '${m}');">
        
        <!-- Header -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-8 h-8 rounded-xl bg-gradient-to-br ${sec.gradient} text-white font-mono font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
              #${slideNum}
            </span>
            <div class="truncate min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-white border ${sec.border} ${sec.textAccent} shadow-2xs">
                  ${sec.badge}
                </span>
                <span class="text-[10px] font-mono text-slate-500">16:9 Presentation</span>
              </div>
              <h4 class="text-xs font-black text-slate-900 mt-1 truncate" title="${sec.title}">
                ${sec.icon} ${sec.title}
              </h4>
            </div>
          </div>
        </div>

        <!-- 16:9 Thumbnail Image / Upload Dropzone -->
        <div class="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner flex items-center justify-center group/thumb">
          ${hasPhoto ? `
            <img src="${photoUrl}" alt="${sec.title}" loading="lazy" class="w-full h-full object-contain" />
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center gap-2 backdrop-blur-2xs">
              <button type="button" onclick="SpecialSectionsManager.previewSlide('${sec.id}', '${m}')" class="px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-slate-900 text-[10px] font-bold shadow-md transition cursor-pointer">
                👁️ Full View
              </button>
              <button type="button" onclick="SpecialSectionsManager.triggerFileInput('${sec.id}', '${m}')" class="px-2.5 py-1 rounded-lg bg-black/80 hover:bg-black text-white text-[10px] font-bold border border-white/20 shadow-md transition cursor-pointer">
                📁 Replace
              </button>
            </div>
            <div class="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white font-mono text-[8.5px] font-bold pointer-events-none">
              Active Photo
            </div>
          ` : `
            <div onclick="SpecialSectionsManager.triggerFileInput('${sec.id}', '${m}')" class="w-full h-full flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:bg-slate-800 transition">
              <span class="text-2xl mb-1">${sec.icon}</span>
              <span class="text-[11px] font-extrabold text-slate-200">Upload 16:9 Slide Photo</span>
              <span class="text-[9px] text-slate-400 mt-0.5">Drag & drop or click to upload</span>
            </div>
          `}
        </div>

        <!-- Action Controls -->
        <div class="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-200/60 flex-wrap">
          <div class="flex items-center gap-1">
            <button type="button" onclick="SpecialSectionsManager.triggerFileInput('${sec.id}', '${m}')" class="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-[10.5px] font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer" title="Upload or Replace image file">
              📁 ${hasPhoto ? 'Replace' : 'Upload'}
            </button>
            <button type="button" onclick="SpecialSectionsManager.pasteFromClipboard('${sec.id}', '${m}')" class="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[10.5px] font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer" title="Paste from clipboard (Ctrl+V / Screenshot)">
              📋 Paste
            </button>
            ${hasPhoto ? `
              <button type="button" onclick="SpecialSectionsManager.deleteSectionPhoto('${sec.id}', '${m}')" class="p-1 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 text-[10.5px] transition cursor-pointer" title="Remove custom photo">
                🗑️
              </button>
            ` : ''}
          </div>
          <button type="button" onclick="SpecialSectionsManager.previewSlide('${sec.id}', '${m}')" class="px-3 py-1 rounded-lg bg-slate-900 hover:bg-black text-white text-[10.5px] font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer ml-auto" title="Preview 16:9 Presentation Slide">
            👁️ Preview
          </button>
        </div>

        <input type="file" id="special-file-${sec.id}" accept="image/*" class="hidden" onchange="SpecialSectionsManager.handleFileInput(this, '${sec.id}', '${m}')" />
      </div>
      `;
    };

    return `
    <!-- 4. BOTTOM STRATEGIC SLIDES SECTION (Sequence: Tasks -> Workshop -> BOM -> Completed Project -> Cost Saving -> Top 5 -> Closing) -->
    <div id="monthly-report-bottom-special-slides" class="pt-6 border-t-2 border-slate-200 space-y-4">
      
      <!-- Section Header with Sequence Indicator -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-red-600 animate-pulse"></span>
            <h3 class="text-sm font-black uppercase tracking-wider text-slate-900">
              Strategic Executive Presentation Slides (${m})
            </h3>
          </div>
          <div class="flex items-center gap-2 text-xs text-slate-600 mt-1 font-medium flex-wrap">
            <span class="text-slate-400">Strict Sequence:</span>
            <span class="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] font-bold text-slate-800">1. Regular Tasks</span>
            <span>&rarr;</span>
            <span class="px-2 py-0.5 rounded bg-emerald-100 font-mono text-[11px] font-bold text-emerald-800">2. 🛠️ Workshop</span>
            <span>&rarr;</span>
            <span class="px-2 py-0.5 rounded bg-cyan-100 font-mono text-[11px] font-bold text-cyan-800">3. 🧩 BOM</span>
            <span>&rarr;</span>
            <span class="px-2 py-0.5 rounded bg-blue-100 font-mono text-[11px] font-bold text-blue-800">4. 🏆 Completed Project</span>
            <span>&rarr;</span>
            <span class="px-2 py-0.5 rounded bg-amber-100 font-mono text-[11px] font-bold text-amber-800">5. 💰 Cost Saving</span>
            <span>&rarr;</span>
            <span class="px-2 py-0.5 rounded bg-rose-100 font-mono text-[11px] font-bold text-rose-800">6. ⭐ Top 5</span>
            <span>&rarr;</span>
            <span class="px-2 py-0.5 rounded bg-slate-800 font-mono text-[11px] font-bold text-white">7. 🎯 Closing</span>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button type="button" onclick="MonthlyReportView.previewFullDeck(MonthlyReportView.selectedMonth)" class="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer">
            <span>📽️</span> <span>Preview Full 16:9 Deck</span>
          </button>
        </div>
      </div>

      <!-- 6-Card Grid for the Special Slides -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        <!-- Card 1: Process Workshop Achievements -->
        ${renderCard(this.getSection('workshop'), workshopSlideNum)}

        <!-- Card 2: BOM Findings Executive Nexus -->
        ${renderCard(this.getSection('bom'), bomSlideNum)}

        <!-- Card 3: Completed Projects Showcase -->
        ${renderCard(this.getSection('completed_project'), completedProjSlideNum)}

        <!-- Card 4: Cost Saving Initiatives -->
        ${renderCard(this.getSection('cost_saving'), costSavingSlideNum)}

        <!-- Card 5: Top 5 Works & Projects Summary -->
        <div class="relative rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-xs flex flex-col justify-between gap-3 group/card transition hover:shadow-md">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white font-mono font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                #${top5SlideNum}
              </span>
              <div class="truncate min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-white border border-rose-200 text-rose-800 shadow-2xs">
                    SUMMARY SLIDE
                  </span>
                  <span class="text-[10px] font-mono text-slate-500">16:9 Presentation</span>
                </div>
                <h4 class="text-xs font-black text-slate-900 mt-1 truncate" title="Top 5 Completed & Ongoing Works Summary">
                  ⭐ Top 5 Works &amp; Projects Summary
                </h4>
              </div>
            </div>
          </div>

          <div class="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner flex flex-col items-center justify-center p-3 text-center">
            <span class="text-2xl mb-1">🏆</span>
            <span class="text-[11px] font-extrabold text-white">Top 5 Strategic Projects</span>
            <span class="text-[9px] text-slate-300 mt-0.5">High-Impact Executive Milestones</span>
          </div>

          <div class="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-200/60 flex-wrap">
            <button type="button" onclick="MonthlyReportView.openTop5Modal()" class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-rose-700 border border-rose-300 text-[10.5px] font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer">
              <span>✏️</span> <span>Edit Top 5</span>
            </button>
            <button type="button" onclick="MonthlyReportView.previewTop5Slide()" class="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10.5px] font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer ml-auto">
              👁️ Preview
            </button>
          </div>
        </div>

        <!-- Card 6: Thank You / Closing Slide -->
        <div class="relative rounded-2xl border border-slate-700 bg-slate-900 text-white p-4 shadow-xs flex flex-col justify-between gap-3 group/card transition hover:shadow-md">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-mono font-black text-xs flex items-center justify-center flex-shrink-0">
                #${closingSlideNum}
              </span>
              <div class="truncate min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 border border-slate-700 text-slate-300">
                    CLOSING SLIDE
                  </span>
                  <span class="text-[10px] font-mono text-slate-400">Final Slide</span>
                </div>
                <h4 class="text-xs font-black text-white mt-1 truncate" title="Thank You &bull; Continuous Process Improvement">
                  🎯 Thank You / Closing Slide
                </h4>
              </div>
            </div>
          </div>

          <div class="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex flex-col items-center justify-center p-3 text-center">
            <span class="text-2xl mb-1">🤝</span>
            <span class="text-[11px] font-extrabold text-white">Thank You</span>
            <span class="text-[9px] text-slate-400 mt-0.5">Continuous Process Improvement</span>
          </div>

          <div class="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-800 flex-wrap">
            <button type="button" onclick="MonthlyReportView.previewClosingSlide()" class="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10.5px] font-bold transition flex items-center gap-1 border border-white/20 cursor-pointer">
              👁️ Preview
            </button>
          </div>
        </div>

      </div>
    </div>
    `;
  }
};

// Export to global scope
if (typeof window !== 'undefined') {
  window.SpecialSectionsManager = SpecialSectionsManager;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpecialSectionsManager;
}
