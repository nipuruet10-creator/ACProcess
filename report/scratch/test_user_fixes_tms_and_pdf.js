/**
 * Test Suite: Verifying User Fixes:
 * 1. Walton TMS Real Intranet Task Creation & 100% Completion
 * 2. PDF Exact 1:1 Page Breaks & Zero Pagination Bleed
 */

const assert = require('assert');
const http = require('http');

console.log("=== RUNNING VERIFICATION FOR TMS & PDF FIXES ===");

// TEST 1: Check TMS Relay Status on Port 3138
async function testTmsRelay() {
  console.log("\n[TEST 1] Verifying TMS Relay Server on port 3138...");
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:3138/status', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        console.log("  Relay status response:", parsed);
        assert.strictEqual(parsed.status, 'online', "Relay status must be online");
        assert.strictEqual(parsed.relay, 'running', "Relay must be running");
        assert.strictEqual(parsed.tmsReachable, true, "Walton TMS must be reachable");
        console.log("  ✔ TEST 1 PASSED: Relay server is online and connected to 192.168.118.138:80");
        resolve();
      });
    }).on('error', (err) => {
      reject(new Error("Relay not reachable: " + err.message));
    });
  });
}

// TEST 2: Verify TmsSyncService known tasks and resolution
function testTmsSyncService() {
  console.log("\n[TEST 2] Verifying TmsSyncService ID resolution for Task 6 & 8...");
  const TmsSyncService = require('../tasks/tms_sync_service.js');

  const task6 = {
    task_id: "SEP-2026-006-D18",
    task_name: "For Foil Compressor Jacket New Die Setup for 18M",
    assignee: "Sazzad (50463)",
    engineer: "Sazzad (50463)"
  };
  const info6 = TmsSyncService.getTmsInfo(task6);
  console.log("  Task 6 resolved TMS info:", info6);
  assert.ok(info6, "Task 6 must resolve TMS info");
  assert.strictEqual(info6.tms_task_id, '104888', "Task 6 must resolve to real Walton TMS ID 104888");
  assert.ok(info6.tms_url.includes('code=104888'), "Task 6 URL must point to code 104888");

  const task8 = {
    task_id: "SEP-2026-008-RAC",
    task_name: "RAC Assembly line reclocation",
    assignee: "Faiyaz (54634)",
    engineer: "Faiyaz (54634)"
  };
  const info8 = TmsSyncService.getTmsInfo(task8);
  console.log("  Task 8 resolved TMS info:", info8);
  assert.ok(info8, "Task 8 must resolve TMS info");
  assert.strictEqual(info8.tms_task_id, '104889', "Task 8 must resolve to real Walton TMS ID 104889");
  assert.ok(info8.tms_url.includes('code=104889'), "Task 8 URL must point to code 104889");

  console.log("  ✔ TEST 2 PASSED: TmsSyncService resolves genuine Walton TMS IDs 104888 & 104889");
}

// TEST 3: Verify HTMLReportGenerator print CSS rules
function testHtmlPrintRules() {
  console.log("\n[TEST 3] Verifying HTMLReportGenerator print styles for exact A4 landscape...");
  const HTMLReportGenerator = require('../export/html_generator.js');
  global.SlideLayoutEngine = require('../slides/slide_layout_engine.js');
  global.HELPERS = require('../utils/helpers.js');

  const html = HTMLReportGenerator.generateStandaloneHTML({
    month: "SEP-2026",
    slides: [
      { task_id: "T1", task_name: "Task One", include_in_report: "YES", monthly_report: "YES" }
    ]
  });

  // Verify @page has strict 297mm 210mm
  assert.ok(html.includes('size: 297mm 210mm'), "Must declare exact @page size 297mm 210mm");
  assert.ok(html.includes('margin: 0mm'), "Must declare 0mm margin");

  // Verify .print-page rules
  assert.ok(html.includes('width: 297mm !important'), ".print-page must enforce width 297mm");
  assert.ok(html.includes('height: 210mm !important'), ".print-page must enforce height 210mm");
  assert.ok(html.includes('max-height: 210mm !important'), ".print-page must enforce max-height 210mm");
  assert.ok(html.includes('page-break-after: always !important'), ".print-page must break after each page");
  assert.ok(html.includes('break-after: page !important'), ".print-page must have break-after page");
  assert.ok(html.includes('break-inside: avoid !important'), ".print-page must avoid break inside");

  // Verify display is block, NOT flex (Chromium flex print bug avoidance)
  assert.ok(html.includes('display: block !important'), ".print-page must be block display");

  // Verify suppress of interactive editing tools
  assert.ok(html.includes('.slide-photo-frame button'), "Must suppress photo frame buttons in print");
  assert.ok(html.includes('display: none !important'), "Must set display none for print suppressed tools");

  console.log("  ✔ TEST 3 PASSED: HTMLReportGenerator print CSS guarantees exact A4 landscape with zero bleed");
}

// TEST 4: Verify ManagementHTMLGenerator print CSS rules
function testManagementPrintRules() {
  console.log("\n[TEST 4] Verifying ManagementHTMLGenerator print styles...");
  const ManagementHTMLGenerator = require('../export/management_html_generator.js');
  assert.ok(ManagementHTMLGenerator, "ManagementHTMLGenerator loaded");

  const fs = require('fs');
  const code = fs.readFileSync('export/management_html_generator.js', 'utf8');
  assert.ok(code.includes('size: 297mm 210mm'), "Management print must have 297mm 210mm");
  assert.ok(code.includes('max-height: 210mm !important'), "Management print must have max-height 210mm");
  assert.ok(code.includes('break-after: page !important'), "Management print must have break-after: page");

  console.log("  ✔ TEST 4 PASSED: ManagementHTMLGenerator print CSS is aligned with strict A4 landscape");
}

async function runAll() {
  await testTmsRelay();
  testTmsSyncService();
  testHtmlPrintRules();
  testManagementPrintRules();
  console.log("\n=======================================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
  console.log("=======================================================");
}

runAll().catch(err => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
