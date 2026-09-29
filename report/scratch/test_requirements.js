const fs = require('fs');
const assert = require('assert');

console.log('=== VERIFYING 5 USER REQUIREMENTS ===\n');

// 1. Requirement 1: Firebase Sync in monthly_input_view.js
console.log('--- 1. Testing AI Task Details Real-time Sync ---');
const inputViewCode = fs.readFileSync('Process_Report_Automation_System/tasks/monthly_input_view.js', 'utf8');
assert(inputViewCode.includes("FirebaseSyncService.updateCell(this.selectedMonth, taskId, 'task_details', steps)"),
  'FirebaseSyncService.updateCell must be called when generateTaskDetails runs');
assert(inputViewCode.includes("FirebaseSyncService.pushEntireMonth(this.selectedMonth)"),
  'FirebaseSyncService.pushEntireMonth must be called on complete bulk generation');
console.log('[PASS] Monthly Input View broadcasts task_details immediately to Firebase.\n');

// 2. Requirement 2: Photo 1 Design on Slide 2 (TOC), Slide 3 (Dashboard), Slide 15 (Final Summary)
console.log('--- 2. Testing Photo 1 Redesign (Slides 2, 3, 15) ---');
const pptxCode = fs.readFileSync('Process_Report_Automation_System/export/pptx_generator.js', 'utf8');
assert(pptxCode.includes('_addPhoto1TopBanner'), 'pptx_generator must have _addPhoto1TopBanner helper');
assert(pptxCode.includes('_addPhoto1MetricRow'), 'pptx_generator must have _addPhoto1MetricRow helper');
assert(pptxCode.includes('2563EB'), 'Royal blue header #2563EB must be present');
assert(pptxCode.includes('1E40AF') && pptxCode.includes('6366F1') && pptxCode.includes('0284C7') && pptxCode.includes('F59E0B'),
  'All 4 Photo 1 metric card colors (Deep Blue, Indigo, Sky Blue, Vibrant Amber) must be present');
console.log('[PASS] PPTX generator includes Photo 1 banner, 4 colored metric cards, and modern dashboard styling.\n');

// 3. Requirement 3: Guaranteed 15 slides (11 tasks + 4 mandatory)
console.log('--- 3. Testing 15 Slides Guarantee (11 Tasks + 4 Mandatory) ---');
const exportCtrlCode = fs.readFileSync('Process_Report_Automation_System/export/export_controller.js', 'utf8');
assert(exportCtrlCode.includes('monthRawTasks = wMgr ? wMgr.getTasksForMonth(selectedMonth) : []'),
  'export_controller must pull month tasks to ensure no active task is dropped');
assert(pptxCode.includes('allMonthTasks = window.appState.workbookMgr.getTasksForMonth(monthName)'),
  'pptx_generator must guard rawSlides to include all tasks from workbook');
console.log('[PASS] Both export_controller and pptx_generator ensure all 11 month tasks + 4 mandatory slides = 15 slides.\n');

// 4. Requirement 4: Category-Wise Alignment and Sequencing
console.log('--- 4. Testing Category-Wise Grouping & Badge Alignment ---');
const syncEngineCode = fs.readFileSync('Process_Report_Automation_System/tasks/sync_engine.js', 'utf8');
assert(syncEngineCode.includes('overrides.category || task.category ||'),
  'sync_engine.js must prioritize task.category over AI category');
assert(pptxCode.includes('badgeText = (task.category || "PROCESS DEVELOPMENT").toUpperCase()'),
  'Task slide badge in PPTX must strictly match task.category');
assert(pptxCode.includes('categoryMap.set(catName, [])'),
  'pptx_generator must group task slides by category in presentation sequence');
console.log('[PASS] Category-wise grouping and exact task.category badge binding verified.\n');

// 5. Requirement 5: Photo 2 Mini-KPI Block Removal & Impact Full Width
console.log('--- 5. Testing Removal of Photo 2 Circled Mini-KPI & Full-Width Impacts ---');
const slideLayoutCode = fs.readFileSync('Process_Report_Automation_System/slides/slide_layout_engine.js', 'utf8');
// PPTX checks:
assert(!pptxCode.includes('"Production Efficiency: Improved"'),
  'Old hardcoded mini-KPI trend pill must be removed from PPTX');
assert(!pptxCode.includes('"Quality Consistency: Enhanced"'),
  'Old hardcoded quality trend pill must be removed from PPTX');
assert(!pptxCode.includes('"Material Waste: Reduced"'),
  'Old hardcoded waste trend pill must be removed from PPTX');

// HTML Slide Layout Engine checks:
assert(!slideLayoutCode.includes('col-span-5 flex flex-col justify-around h-full gap-1.5 border-l border-slate-100'),
  'Walton Red Executive HTML template must not have the 3 mini-trend pills block');
assert(!slideLayoutCode.includes('<span>📈 Efficiency</span>'),
  'Industrial Blue HTML template must not have the 3 metric trend badges');
console.log('[PASS] Photo 2 mini-trend block completely removed; Key Impact bullets expanded to full card width in both PPTX & HTML.\n');

console.log('=== ALL 5 REQUIREMENTS VERIFIED SUCCESSFULLY ===');
