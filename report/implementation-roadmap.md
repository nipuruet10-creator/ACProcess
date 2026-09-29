# Implementation Roadmap: 14-Phase Production Plan

## 1. Overview & Phasing Strategy
This roadmap defines the step-by-step implementation of the revised **Process Development Monthly Report Automation System**, structured strictly around the **"1 Row = 1 Slide"** model, Walton reference slide visual fidelity, ultra-simple engineer entry (`Engineer | Task Name`), and 100% editable multi-channel exports.

---

## 2. Phase Breakdown & Deliverables

### Phase 1: Inspection, Baseline Analysis & Specification [COMPLETED]
* Inspect existing `Process Task management entry 2025_2026.xlsx` sheets, structure, and 16,478 shared strings.
* Inspect 78-slide structure and metrics of `Monthly Report August, 2026.pptx`.
* Inspect authoritative visual reference slide (`media_1789013397250.png`) and extract layout, badges, radial donut, impact pills, and colors.
* Create core specifications: `architecture.md`, `input-workbook-spec.md`, `ai-breakdown-spec.md`, `slide-design-spec.md`, `sync-logic.md`, and `implementation-roadmap.md`.

### Phase 2: Month-Wise Input Workbook Structure
* Build month-selector and multi-month worksheet manager (`JAN-2026` through `DEC-2027`).
* Implement the ultra-simple task input interface: only `Engineer` (dropdown) and `Task Name` (text).
* Automatic Task ID generation engine: `MMM-YYYY-NNN` (e.g., `SEP-2026-001`).
* Implement direct `Include in Monthly Report` (YES/NO) switch per row.

### Phase 3: Task Database & Synchronization Layer
* Implement the 10-step synchronization engine (`sync_engine.js`) triggered by the **"⚡ SYNC INPUT DATA"** button.
* Hash-based differential delta detection (detect added, modified, deleted tasks).
* Idempotency guarantee: multiple sync runs produce identical, stable state with zero duplicate slides.
* Full integration with IndexedDB (`ProcessReportDB`) and Google Sheets synchronization.

### Phase 4: Gemini 3.8 Flash AI Breakdown Engine
* Update prompt templates with strict zero-hallucination and zero-fabrication guardrails.
* Implement conservative synthesis producing `AI Report Title`, `AI Description`, `AI Impact Points`, `Category`, and `Project Type`.
* Implement CRC32/SHA-256 `source_hash` caching to prevent redundant API calls.
* Implement the deterministic local rule-based fallback synthesizer for offline readiness.

### Phase 5: Standard 16:9 Walton Reference Slide Template
* Re-architect the slide layout generator to enforce **1 Row = 1 Slide**.
* Recreate the exact layout from the reference slide:
  * Top badges: *Ongoing Project* (orange ribbon) + *Process Improvement* (slate ribbon).
  * Bold headline with highlighted orange action verb.
  * Gears icon and *"Continuous Improvement for Better Production"* slogan with orange swoosh.
  * Left status column: *"Present Status"* hexagon, *"Completed"* solid blue circle, *"Small Changes Big Impact"* navy ribbon.
  * Center photo area: Split comparison (*Present Condition* vs. *Proposed Project*) or panorama with clean empty state.
  * Bottom-left: *Summary* container + *Investment* box.
  * Bottom-center: Radial donut progress gauge (`100% Completed`).
  * Bottom-right: *Project Impact* container with 4 colored pill rows and status capsules.
  * Footer corporate credit in Lexend.

### Phase 6: Report Builder & Live 16:9 Slide Preview
* Build the updated Report Builder screen filtered by month.
* Task roster with inline indicators: `Task`, `Engineer`, `AI Title`, `Photo Status`, `Slide Status`.
* Action toolbar per task: *Open*, *Edit*, *Regenerate AI*, *Upload Photo*, *Include/Exclude*, *Preview Slide*.
* Interactive 16:9 modal slide preview with live updates and responsive canvas rendering.

### Phase 7: Photo Management System
* Implement Photo Upload, Replace, Remove, and Fit/Crop modal.
* Map photos strictly by `task_id`.
* Support dual photos for *Present Condition* (Before) and *Proposed Project* (After).
* Non-blocking workflow: empty photo region renders an elegant architectural frame without fake images or "No Photo" labels.

### Phase 8: Executive Management Dashboard
* Multi-card KPI dashboard: Total Tasks, Total Engineers, Completed/Active, Projects, Report Slides, Photos Pending.
* Savings tracker (Cumulative FY 26-27 impact ৳ 28,12,151, Monthly ৳ 2,34,200).
* BOM Verification tracker (356 observations) and Strategic Project progress.
* Ensure all metrics derive strictly from source data without fabrication.

### Phase 9: 100% Editable PowerPoint (PPTX) Generation
* Update `pptx_generator.js` to compile the Walton reference layout with native shapes, text frames, tables, and images.
* Slides are 100% editable in Microsoft PowerPoint (no flattened PNG screenshots).
* Generates `Monthly_Report_<MONTH>_<YEAR>.pptx`.

### Phase 10: Executive PDF Export
* High-resolution vector printable 16:9 PDF export utilizing vector graphics and print stylesheets.

### Phase 11: Standalone Responsive HTML Export
* Generate a self-contained, single-file HTML presentation with embedded CSS, slides, and keyboard navigation.

### Phase 12: Report Versioning & History
* Maintain `REPORT HISTORY` table (`Report ID`, `Month`, `Version`, `Generated At`, `Slide Count`, file links).
* Immutable historical version archiving (`SEP-2026-v01`, `SEP-2026-v02`, `SEP-2026-FINAL`).

### Phase 13: End-to-End Automated Testing
* Expand test suite in `tests/run_tests.html` to cover the 17 test cases specified by the user:
  1. Add 1 task &rarr; confirm 1 slide.
  2. Add second task &rarr; confirm 2 slides.
  3. Change task name &rarr; confirm same task_id updates.
  4. Upload photo later &rarr; confirm photo appears in correct slide.
  5. Remove report inclusion &rarr; confirm slide disappears on sync.
  6. Add 20 tasks &rarr; confirm 20 slides.
  7. Check editable PPTX, PDF, HTML.
  8. Confirm no duplicate slides after repeated sync.
  9. Confirm zero hallucination / no fabricated numbers.
* Execute suite in headless Microsoft Edge.

### Phase 14: UI Polish & User Acceptance Verification
* Refine navigation: Dashboard, Monthly Input, AI Breakdown, Report Builder, Photo Manager, Final Report, Report History, Master Data, Settings.
* Ensure seamless responsiveness and instant interactions.
