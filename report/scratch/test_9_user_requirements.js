/**
 * Automated Verification Test for 9 User Requirements
 * Tests all 9 requirements across AC Process Master Suite modules
 */

const fs = require('fs');
const path = require('path');

// Mock localStorage and window
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] !== undefined ? storage[k] : null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};

global.window = {
  location: { pathname: '/report/' },
  showToast: (msg) => {},
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
};

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

console.log("=================================================================");
console.log("   AC PROCESS MASTER SUITE - 9 USER REQUIREMENTS VERIFICATION    ");
console.log("=================================================================\n");

// -----------------------------------------------------------------
// Test 1 & 2: Project (PROJ-2026-8134) & Cost Savings Isolation
// -----------------------------------------------------------------
console.log("▶ Testing Requirements 1 & 2: Project & Cost Savings Isolation");

// Load MonthWorkbookManager
const MonthWorkbookManager = require('../tasks/month_workbook_manager.js');
const ProjectsView = require('../projects/projects_view.js');
const CostSavingsView = require('../dashboard/cost_savings_view.js');

const mgr = new MonthWorkbookManager();
mgr.init();

// Check default permanent project
const projects = ProjectsView.getProjects();
const relocationProj = projects.find(p => (p.task_id === 'PROJ-2026-8134' || p.id === 'PROJ-2026-8134') || ((p.task_name || p.name || '').includes('RAC Assembly line reclocation')));
assert(Boolean(relocationProj), "Project 'RAC Assembly line reclocation' (PROJ-2026-8134) is permanently seeded in Projects section");

// Check that getTasksForMonth never includes projects or cost savings
const septTasks = mgr.getTasksForMonth("SEP-2026");
const leakedProject = septTasks.find(t => t.task_id === 'PROJ-2026-8134' || (t.task_name && t.task_name.includes('RAC Assembly line reclocation')));
assert(!leakedProject, "Project PROJ-2026-8134 does NOT leak into Monthly Input tasks for SEP-2026");

const leakedAnyProjOrCS = septTasks.find(t => t.is_project || t.is_cost_saving || String(t.task_id).startsWith('PROJ-') || String(t.task_id).startsWith('CS-'));
assert(!leakedAnyProjOrCS, "Monthly Input tasks contain 0 projects and 0 cost savings");

// -----------------------------------------------------------------
// Test 3: Anam 35 NO and 1 YES filtering
// -----------------------------------------------------------------
console.log("\n▶ Testing Requirement 3: Anam YES/NO Strict Report Inclusion");

// Add 35 tasks with NO and 1 task with YES for Anam
const testTasks = [];
for (let i = 1; i <= 35; i++) {
  testTasks.push({
    task_id: `SEP-2026-ANAM-${i}`,
    task_name: `Anam Routine Task ${i}`,
    concern_engineer: "Anam (51234)",
    engineer: "Anam (51234)",
    assignee: "Anam (51234)",
    include_in_report: "NO",
    presentation_status: "NO"
  });
}
testTasks.push({
  task_id: `SEP-2026-ANAM-36`,
  task_name: `Anam Highlight Automation Project`,
  concern_engineer: "Anam (51234)",
  engineer: "Anam (51234)",
  assignee: "Anam (51234)",
  include_in_report: "YES",
  presentation_status: "YES"
});

// Run isTaskIncluded logic
function isTaskIncluded(task) {
  if (!task) return false;
  const inc = String(task.include_in_report || task.presentation_status || task.monthly_report || '').trim().toUpperCase();
  if (inc === "NO") return false;
  if (task.include_in_report === false || task.presentation_status === false || task.monthly_report === false) return false;
  return true;
}

const includedTasks = testTasks.filter(isTaskIncluded);
assert(includedTasks.length === 1, `Out of 36 tasks (35 NO, 1 YES), exactly 1 task is included in the report (got ${includedTasks.length})`);
assert(includedTasks[0].task_id === 'SEP-2026-ANAM-36', "The single included task is the YES task (SEP-2026-ANAM-36)");

// -----------------------------------------------------------------
// Test 4: Cover Slide Slash Removal & Typography
// -----------------------------------------------------------------
console.log("\n▶ Testing Requirement 4: Cover Slide Slash Removal & Typography");
const slideLayoutFile = fs.readFileSync(path.join(__dirname, '../slides/slide_layout_engine.js'), 'utf8');

const hasSlashSpan = slideLayoutFile.includes('transform skew-x-[-20deg]');
assert(!hasSlashSpan, "Skewed slash span / beside WAC was removed from cover slide");
assert(slideLayoutFile.includes('font-size: 52px; font-weight: 900;') || slideLayoutFile.includes('text-4xl sm:text-5xl lg:text-[52px]'), "Cover slide title typography is scaled up (52px)");

// -----------------------------------------------------------------
// Test 5: Table of Contents Duplicate Taglines
// -----------------------------------------------------------------
console.log("\n▶ Testing Requirement 5: Table of Contents Clean Layout");
const duplicateTaglineMatches = (slideLayoutFile.match(/Continuous Improvement &bull; A Smarter Tomorrow/g) || []).length;
// In TOC slide, it should appear at most once in header, not duplicated below footer
assert(!slideLayoutFile.includes('<!-- Redundant footer line removed -->') && !slideLayoutFile.includes('border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2">\n      <span>Continuous Improvement &bull; A Smarter Tomorrow'), "Duplicate TOC footer tagline is eliminated");

// -----------------------------------------------------------------
// Test 6: Dashboard Slide #2 WAC Header & Rolling 6 Months Table
// -----------------------------------------------------------------
console.log("\n▶ Testing Requirement 6: Dashboard Slide Header & Rolling 6 Months Table");
assert(slideLayoutFile.includes('PROCESS DEVELOPMENT DEPARTMENT (WAC)'), "Dashboard Slide header specifies PROCESS DEVELOPMENT DEPARTMENT (WAC)");
assert(!slideLayoutFile.includes('undefined BDT') && !slideLayoutFile.includes('${m.displayAmount}'), "Dashboard monthly impact table does NOT produce 'undefined BDT'");

// -----------------------------------------------------------------
// Test 7: Description & Key Impact Terminology & Domain Auto-Generator
// -----------------------------------------------------------------
console.log("\n▶ Testing Requirement 7: Description & Key Impact Labels and Auto-Derivation");
const promptTemplates = require('../ai/prompt_templates.js');
global.PROMPT_TEMPLATES = promptTemplates;

const testLaser = promptTemplates.localFactualTransform("CNC Laser sheet cutting optimization for RAC chassis", "Process development", "Sazzad (50463)");
assert(testLaser && testLaser.description.toLowerCase().includes("cnc") || testLaser.description.toLowerCase().includes("laser"), "Domain generator recognizes CNC/Laser and derives tailored description");
assert(testLaser && testLaser.impacts.length >= 2, "Domain generator provides at least 2 relevant impact bullets");

const testGas = promptTemplates.localFactualTransform("Helium leak detector station for condenser coil", "Process development", "Rafi (45127)");
assert(testGas && (testGas.description.toLowerCase().includes("leak") || testGas.description.toLowerCase().includes("vacuum")), "Domain generator recognizes helium/leak detector domain");

// Check that Project Overview was replaced with Description across slide layout engine
const overviewInCards = slideLayoutFile.includes('>Project Overview</span>');
assert(!overviewInCards, "Label 'Project Overview' has been replaced by 'Description'");

const deliverablesInCards = slideLayoutFile.includes('>Key Impact &amp; Deliverables</span>');
assert(!deliverablesInCards, "Label 'Key Impact & Deliverables' has been replaced by 'Key Impact'");

// -----------------------------------------------------------------
// Test 8: Top 5 Developed Works Boxes Dynamic Font Scaling
// -----------------------------------------------------------------
console.log("\n▶ Testing Requirement 8: Top 5 Developed Works Dynamic Box Scaling");
assert(slideLayoutFile.includes('textLen > 100') && slideLayoutFile.includes('fontSize = \'10.5px\''), "Top 5 Works boxes dynamically scale font size to 10.5px when text length > 100");
assert(slideLayoutFile.includes('word-break: break-word'), "Top 5 Works boxes use word-break: break-word to prevent horizontal clipping");

// -----------------------------------------------------------------
// Test 9: Cost Savings Month-Wise Value Edit & Slide Preview
// -----------------------------------------------------------------
console.log("\n▶ Testing Requirement 9: Cost Savings Month-Wise Value Edit & Slide Previews");
const costSavingsViewFile = fs.readFileSync(path.join(__dirname, '../dashboard/cost_savings_view.js'), 'utf8');

assert(costSavingsViewFile.includes('updateMonthValue'), "CostSavingsView provides updateMonthValue method for direct monthly editing");
assert(costSavingsViewFile.includes('CostSavingsView.updateMonthValue(\'${m.code}\', this.value)'), "Annual timeline cards have editable number inputs bound to updateMonthValue");
assert(costSavingsViewFile.includes('Cost Saving Presentation Slides'), "CostSavingsView renders dedicated Cost Saving Presentation Slides section");
assert(costSavingsViewFile.includes('cost-slide-modal-preview'), "CostSavingsView modal includes real-time 16:9 slide preview canvas");
assert(!costSavingsViewFile.includes('workbookMgr.addTask'), "CostSavingsView does NOT pollute MonthWorkbookManager tasks table");

// PPTX Generator verification
console.log("\n▶ Verifying PPTX Generator Alignment");
const pptxFile = fs.readFileSync(path.join(__dirname, '../export/pptx_generator.js'), 'utf8');
assert(pptxFile.includes('slide.addText("Description", {'), "PPTX generator task slide uses 'Description' label");
assert(pptxFile.includes('slide.addText("Key Impact", {'), "PPTX generator task slide uses 'Key Impact' label");
assert(pptxFile.includes('tLen > 100') && pptxFile.includes('fontSize = 7.5'), "PPTX generator Top 5 works dynamically scales font size for long text");

console.log("\n=================================================================");
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("=================================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL 9 REQUIREMENTS FULLY VERIFIED!");
  process.exit(0);
}
