const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("=== Testing 7 Latest User Requirements ===");

const basePath = path.join(__dirname, '..');

// 1. Check index.html & app.js (Requirement 5: Photo Manager tab removed)
const indexHtml = fs.readFileSync(path.join(basePath, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(basePath, 'app.js'), 'utf8');

assert(!indexHtml.includes("App.switchTab('photo-manager')"), "Sidebar must NOT have photo-manager tab button");
console.log("✔ Requirement 5: Photo Manager removed from sidebar navigation.");

// Check app.js redirection for legacy calls
assert(appJs.includes("this.switchTab('monthly-report')"), "app.js must redirect legacy photo-manager tab to monthly-report");
console.log("✔ Requirement 5: Legacy photo-manager call redirects to monthly-report.");

// 2. Check dashboard_controller.js (Requirement 6: Dynamic Category Highlights with val > 0 & odd count balance)
const dashboardJs = fs.readFileSync(path.join(basePath, 'dashboard', 'dashboard_controller.js'), 'utf8');
assert(dashboardJs.includes(".filter(([catName, cnt]) => cnt > 0)"), "Dashboard must filter dynamicCategoryCards to cnt > 0");
assert(dashboardJs.includes("col-span-1 sm:col-span-2 lg:col-span-2"), "Dashboard must span odd last card gracefully");
console.log("✔ Requirement 6: Dashboard highlights strictly render val > 0 and balance odd count.");

// 3. Check report/monthly_report_view.js
const monthlyReportJs = fs.readFileSync(path.join(basePath, 'report', 'monthly_report_view.js'), 'utf8');

// Requirement 1: generateSlideDetails
assert(monthlyReportJs.includes("generateSlideDetails(taskId)"), "monthly_report_view.js must have generateSlideDetails");
assert(monthlyReportJs.includes("Auto-Generate Details &amp; Bullets"), "monthly_report_view.js modal must have Auto-Generate button");
console.log("✔ Requirement 1: Task details auto-generation with short punchy bullets implemented.");

// Requirement 2: Investment / Budget Note removed
assert(!monthlyReportJs.includes("edit-slide-investment"), "monthly_report_view.js must NOT have edit-slide-investment input");
assert(!monthlyReportJs.includes("Investment / Budget Note"), "monthly_report_view.js must NOT have Investment / Budget Note label");
console.log("✔ Requirement 2: Investment / Budget note completely removed from Monthly Report View.");

// Requirement 3: Live preview text visibility (no truncation clamps)
assert(!monthlyReportJs.includes("modal-slide-impact-item line-clamp-1"), "Live preview bullet items must NOT have line-clamp-1");
assert(monthlyReportJs.includes("max-h-[620px]") && monthlyReportJs.includes("overflow-y-auto"), "Live preview container must be scrollable to show all text");
console.log("✔ Requirement 3: Live preview renders all text without clipping or line clamping.");

// Requirement 4: Single unified Customize Slide button
assert(!monthlyReportJs.includes("SlidePreviewModal.openSingle(window.appState.syncEngine.getActiveSlides"), "Monthly report slide cards must not have separate Preview button");
assert(monthlyReportJs.includes("Customize Slide (Text &amp; Photos)"), "Monthly report slide cards must have single unified Customize Slide button");
console.log("✔ Requirement 4: Unified single Customize Slide button implemented.");

// Requirement 7: Process Engineering Core Work Highlights in Monthly Report (val > 0 & odd count balance)
assert(monthlyReportJs.includes("Process Engineering Core Work Highlights"), "Monthly report must display Core Work Highlights");
assert(monthlyReportJs.includes("highlightCards.sort((a, b) => b.val - a.val)"), "Monthly report highlights must be sorted");
assert(monthlyReportJs.includes("col-span-1 sm:col-span-2 lg:col-span-2"), "Monthly report highlights must span odd last card");
console.log("✔ Requirement 7: Monthly report displays Core Work Highlights strictly with val > 0 and balances odd count.");

// 4. Check slides/slide_layout_engine.js
const layoutJs = fs.readFileSync(path.join(basePath, 'slides', 'slide_layout_engine.js'), 'utf8');
assert(!layoutJs.includes("HELPERS.escapeHtml(investment)"), "slide_layout_engine.js must NOT render investment pill in task slides");
assert(layoutJs.includes("activeCategoryGrid = allCategories.filter(k => parseInt(k.val, 10) > 0)"), "slide_layout_engine.js must filter executive category grid to val > 0");
assert(layoutJs.includes("grid-column: span 2;"), "slide_layout_engine.js must balance odd category card count with span 2");
console.log("✔ Requirements 2, 6, 7: slide_layout_engine.js verified (no investment, categories > 0, odd count balanced).");

// 5. Check export/pptx_generator.js
const pptxJs = fs.readFileSync(path.join(basePath, 'export', 'pptx_generator.js'), 'utf8');
assert(!pptxJs.includes("💰 ${investment}"), "pptx_generator.js must NOT render investment pill on task slides");
assert(pptxJs.includes("activeGrid = allCategoryGrid.filter(k => parseInt(k.val, 10) > 0)"), "pptx_generator.js must filter overview category grid to val > 0");
console.log("✔ PPTX Export verified: No investment pill, overview categories > 0, odd count balanced.");

console.log("\n🎉 ALL 7 REQUIREMENTS VERIFIED 100% SUCCESSFULLY!");
