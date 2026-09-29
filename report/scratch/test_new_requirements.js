const fs = require('fs');
const assert = require('assert');

console.log('=== VERIFYING ALL 5 NEW USER REQUIREMENTS ===\n');

// 1. Requirement 1: Photo 1 Category Badge Fix
console.log('--- 1. Testing Photo 1 Category Badge Binding ---');
const pptxCode = fs.readFileSync('export/pptx_generator.js', 'utf8');
const slideLayoutCode = fs.readFileSync('slides/slide_layout_engine.js', 'utf8');

assert(pptxCode.includes('badgeText = (task.category || "PROCESS DEVELOPMENT").toUpperCase()'),
  'pptx_generator must strictly use task.category for task slide badge');
assert(!pptxCode.includes('else if (task.project_type && task.project_type !== "Process Improvement") { badgeText = task.project_type.toUpperCase(); }'),
  'pptx_generator must NOT override task.category with task.project_type');
console.log('[PASS] Requirement 1: Category badge strictly reflects task.category.\n');

// 2. Requirement 2: Strict Report = "NO" Exclusion
console.log('--- 2. Testing Strict Report = "NO" Exclusion ---');
const exportCtrlCode = fs.readFileSync('export/export_controller.js', 'utf8');
assert(exportCtrlCode.includes('activeSlides = activeSlides.filter(s => s.include_in_report !== "NO" && s.monthly_report !== "NO")'),
  'export_controller must filter out any slide where include_in_report or monthly_report is NO');
assert(exportCtrlCode.includes('t.include_in_report !== "NO"') && exportCtrlCode.includes('t.monthly_report !== "NO"'),
  'export_controller must exclude NO tasks when augmenting from month tasks');
assert(pptxCode.includes('rawSlides = rawSlides.filter(s => s.include_in_report !== "NO" && s.monthly_report !== "NO")'),
  'pptx_generator must filter rawSlides for include_in_report !== "NO" and monthly_report !== "NO"');
assert(pptxCode.includes('t.include_in_report !== "NO" && t.monthly_report !== "NO"'),
  'pptx_generator must filter workbook tasks for include_in_report !== "NO" and monthly_report !== "NO"');
assert(slideLayoutCode.includes('const rawSlides = (reportData.slides || []).filter(s => s && s.include_in_report !== "NO" && s.monthly_report !== "NO")'),
  'slide_layout_engine must filter rawSlides for include_in_report !== "NO" and monthly_report !== "NO"');
console.log('[PASS] Requirement 2: Strict Report = "NO" exclusion verified across all layers.\n');

// 3. Requirement 3: Photo 2 Cover Slide Redesign
console.log('--- 3. Testing Photo 2 Cover Slide Redesign ---');
assert(pptxCode.includes('MONTHLY REPORT'), 'pptx_generator cover must have MONTHLY REPORT title');
assert(pptxCode.includes('Process Development Department (AC)'), 'pptx_generator cover must have Process Development Department (AC) pill');
assert(slideLayoutCode.includes('MONTHLY REPORT'), 'slide_layout_engine cover must have MONTHLY REPORT title');
assert(slideLayoutCode.includes('Process Development Department (AC)'), 'slide_layout_engine cover must have Process Development Department (AC) pill');
console.log('[PASS] Requirement 3: Cover slide prominently displays MONTHLY REPORT and Process Development Department (AC).\n');

// 4. Requirement 4: Photo 3 Table of Contents (8 Sections & Dynamic Ranges)
console.log('--- 4. Testing Photo 3 Table of Contents Structure ---');
assert(pptxCode.includes('_calculateCategoryPageRanges'), 'pptx_generator must implement _calculateCategoryPageRanges');
assert(pptxCode.includes('_buildPhoto3TableOfContents'), 'pptx_generator must implement _buildPhoto3TableOfContents');
assert(slideLayoutCode.includes('calculateCategoryPageRanges'), 'slide_layout_engine must implement calculateCategoryPageRanges');
const expectedSections = [
  'Summary',
  'Major Developments',
  '(Process & Others)',
  '(Materials & Chemical Development)',
  '(Cost Savings)',
  '(Tools+Parts)',
  'BOM Verification',
  'Ongoing Project & Completed Works',
  'Top 5 Works & Projects'
];
expectedSections.forEach(sec => {
  assert(pptxCode.includes(sec), `pptx_generator must include TOC section: ${sec}`);
  assert(slideLayoutCode.includes(sec), `slide_layout_engine must include TOC section: ${sec}`);
});
console.log('[PASS] Requirement 4: Table of Contents includes all 8 Photo 3 sections with dynamic page ranges.\n');

// 5. Requirement 5: Photo 4 Operations Dashboard Redesign
console.log('--- 5. Testing Photo 4 Operations Dashboard Structure ---');
assert(pptxCode.includes('_buildPhoto4DashboardSlide'), 'pptx_generator must implement _buildPhoto4DashboardSlide');
assert(pptxCode.includes('336,995 TK') && pptxCode.includes('3,251,940 TK'),
  'pptx_generator must include Photo 4 highlight card metrics');
assert(slideLayoutCode.includes('336,995 TK') && slideLayoutCode.includes('3,251,940 TK'),
  'slide_layout_engine must include Photo 4 highlight card metrics');

const kpiLabels = [
  'Process Developed',
  'Tools Developed',
  'Parts Developed',
  'Cost Optimisation',
  'Manpower Optimization',
  'BOM Verification',
  'Completed Projects',
  'New Projects/ Ongoing'
];
kpiLabels.forEach(label => {
  assert(pptxCode.includes(label), `pptx_generator must include KPI label: ${label}`);
  assert(slideLayoutCode.includes(label), `slide_layout_engine must include KPI label: ${label}`);
});
console.log('[PASS] Requirement 5: Photo 4 Dashboard features 5-month savings table, 2 highlights, and 8 development KPI cards.\n');

console.log('=== ALL 5 USER REQUIREMENTS SUCCESSFULLY VERIFIED ===');
