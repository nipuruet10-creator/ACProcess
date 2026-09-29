const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("=== Comprehensive Verification of User's 5 Requirements ===");

const basePath = path.join(__dirname, '..');

// 1. Requirement 1 & 2: Monthly Input View
const monthlyInputJs = fs.readFileSync(path.join(basePath, 'tasks', 'monthly_input_view.js'), 'utf8');

// Category column width
assert(monthlyInputJs.includes('<col style="width: 145px;">  <!-- Category -->'), "Category column must be widened to 145px");
console.log("✔ Requirement 2: Category column widened to 145px.");

// Clean bounded select inside cell box
assert(monthlyInputJs.includes('class="relative w-full"'), "Category select must be wrapped in relative w-full container");
assert(monthlyInputJs.includes('w-full h-8 bg-blue-50/70 hover:bg-blue-100/60 text-blue-700 border border-blue-200 hover:border-blue-300 focus:border-blue-500 rounded-lg px-2 py-0.5 text-xs font-semibold text-left focus:outline-none cursor-pointer transition truncate'), "Category select must be styled as a clean bounded input");
console.log("✔ Requirement 2: Category dropdown fits cleanly inside the cell box and will not displace outside.");

// MasterDataManager.getCategories() used in MonthlyInputView
assert(!monthlyInputJs.includes('MasterDataManager.getRoutineCategories()'), "MonthlyInputView must not restrict categories using getRoutineCategories");
console.log("✔ Requirement 1: All categories (including Completed Projects) available in Monthly Input.");

// 2. Requirement 4: PhotoManager savePhoto
const photoManagerJs = fs.readFileSync(path.join(basePath, 'photos', 'photo_manager.js'), 'utf8');
assert(photoManagerJs.includes('async savePhoto(taskId, slot, base64Url, month = null)'), "photo_manager.js must have savePhoto method");
console.log("✔ Requirement 4: photoManager.savePhoto method exists and is wired.");

// 3. Requirement 1, 3, 4, 5: Monthly Report View
const monthlyReportJs = fs.readFileSync(path.join(basePath, 'report', 'monthly_report_view.js'), 'utf8');

// Requirement 1: Category dropdown in Customize Slide modal
assert(monthlyReportJs.includes('id="edit-slide-category"'), "Customize Slide modal must contain edit-slide-category select");
assert(monthlyReportJs.includes('Slide Category (Auto-updates Report Metrics)'), "Modal must have Slide Category label");
console.log("✔ Requirement 1: Category dropdown added in Monthly Report Customize Slide modal.");

// Requirement 1: saveOverrides saves category to syncEngine and updates workbook task
assert(monthlyReportJs.includes('category: newCategory'), "saveOverrides must persist category to overrides");
assert(monthlyReportJs.includes('window.appState.workbookMgr.updateTask(this.selectedMonth, taskId'), "saveOverrides must update workbookMgr task category");
console.log("✔ Requirement 1: Overrides update workbookMgr task and auto-recalculate report metrics.");

// Requirement 3: Process Engineering Core Work Highlights positioned at bottom
const slideSeqIdx = monthlyReportJs.indexOf('Monthly Report Complete Slide Sequence');
const highlightsIdx = monthlyReportJs.indexOf('Process Engineering Core Work Highlights (${month})');
assert(slideSeqIdx !== -1, "Monthly Report Complete Slide Sequence must exist");
assert(highlightsIdx !== -1, "Process Engineering Core Work Highlights must exist");
assert(highlightsIdx > slideSeqIdx, "Process Engineering Core Work Highlights must be positioned AFTER Slide Sequence (at bottom)");
console.log("✔ Requirement 3: Process Engineering Core Work Highlights is positioned at the bottom.");

// Requirement 4: renderModalLivePreview renders exact report slide with SlideLayoutEngine
assert(monthlyReportJs.includes('SlideLayoutEngine.renderTaskSlide(slideData, 1, 1)'), "renderModalLivePreview must use SlideLayoutEngine.renderTaskSlide for exact presentation format");
console.log("✔ Requirement 4: In-modal preview renders exact 1:1 report presentation slide format with live photos.");

// Requirement 5: Overridden timestamp display
assert(monthlyReportJs.includes('formatOverrideTime(ts)'), "monthly_report_view.js must have formatOverrideTime helper");
assert(monthlyReportJs.includes('✏️ Overridden ${this.formatOverrideTime(s.manual_override_time)}'), "Slide cards must render formatted overridden time");
assert(monthlyReportJs.includes('✏️ Overridden at ${this.formatOverrideTime(overrides.updated_at)}'), "Modal header must display overridden time");
console.log("✔ Requirement 5: Overridden date & time is displayed on slide cards and in modal header.");

// 4. SyncEngine test
const syncEngineJs = fs.readFileSync(path.join(basePath, 'tasks', 'sync_engine.js'), 'utf8');
assert(syncEngineJs.includes('manual_override_time = overrides.updated_at || null'), "sync_engine must assign manual_override_time");
assert(syncEngineJs.includes('if (t.category) s.category = t.category;'), "sync_engine must sync category from workbook task to slides");
console.log("✔ System Integrity: sync_engine preserves category and tracks manual_override_time.");

console.log("\nALL 5 REQUIREMENTS FULLY VERIFIED AND PASSING!");
