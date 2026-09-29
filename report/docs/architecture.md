# System Architecture: Process Development Monthly Report Automation System

## 1. System Philosophy & Executive Objective
The **Process Development Monthly Report Automation System** is an engineering task management and monthly reporting automation platform designed specifically for the **AC Process Development Department, Walton Hi-Tech Industries PLC**.

### Core Tenet
> **ENGINEER ENTERS ONLY TASK NAME**  
> **&rarr; AI AUTOMATICALLY CREATES TASK BREAKDOWN**  
> **&rarr; SYSTEM CREATES ONE EDITABLE REPORT SLIDE (1 ROW = 1 SLIDE)**  
> **&rarr; USER ADDS PHOTO LATER**  
> **&rarr; USER MAKES FINAL EDITS**  
> **&rarr; EXPORT PPTX + PDF + HTML**

Engineers are never burdened with mandatory descriptions, categories, impacts, financial numbers, or presentation formatting. They enter only their name and task title. The platform derives, structures, and compiles everything downstream.

---

## 2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER WORKFLOW LAYERS                           │
├───────────────────────────────────┬─────────────────────────────────────┤
│        ENGINEER ENTRY LAYER       │        REPORT OWNER / ADMIN         │
│   • Select Month (JAN-2027...)    │   • Management Dashboard            │
│   • Select Engineer (Master Data) │   • AI Breakdown Review             │
│   • Enter "Task Name"             │   • Report Builder & 16:9 Preview   │
│   • Save (No dates, no forms)     │   • Photo Manager (Upload/Fit/Crop) │
│                                   │   • Final Report Editor (Overrides) │
│                                   │   • Export (PPTX, PDF, HTML)        │
└─────────────────┬─────────────────┴──────────────────┬──────────────────┘
                  │                                    │
                  ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      DATA STORAGE & SOVEREIGNTY                         │
├─────────────────────────────────────────────────────────────────────────┤
│  PRIMARY SOURCE OF TRUTH:                                               │
│  Month-Wise Worksheets: [ JAN-2027 | FEB-2027 | ... | SEP-2026 ]        │
│  Columns: Engineer | Task Name | Task ID | Include (YES/NO)             │
├─────────────────────────────────────────────────────────────────────────┤
│  DERIVED DATASHEET:                                                     │
│  [ AI BREAKDOWN ]                                                       │
│  Fields: Task ID | Month | Engineer | Original Task Name | AI Title |   │
│          AI Description | AI Impact | AI Category | AI Project Type |   │
│          Photo Refs | Slide Status | Last AI Update | Source Hash       │
├─────────────────────────────────────────────────────────────────────────┤
│  PHOTO REPOSITORY:                                                      │
│  IndexedDB Local Binary Blob Store + Google Drive Cloud Storage         │
│  Keys: task_id (e.g. SEP-2026-001)                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  REPORT ARCHIVES:                                                       │
│  [ REPORT HISTORY ]                                                     │
│  Versioned Snapshots: SEP-2026-v01, SEP-2026-v02, SEP-2026-FINAL        │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     CORE AUTOMATION ENGINES                             │
├─────────────────────────────────────────────────────────────────────────┤
│  1. SYNCHRONIZATION ENGINE (Idempotent 10-Step Pipeline)               │
│     • Delta detector, Task ID generator, Hash matching, Sync runner     │
├─────────────────────────────────────────────────────────────────────────┤
│  2. GEMINI 3.8 FLASH BREAKDOWN ENGINE                                   │
│     • Strict zero-hallucination prompt, Conservative technical analysis │
│     • Content-hash AI Cache (prevents duplicate API invocations)        │
├─────────────────────────────────────────────────────────────────────────┤
│  3. 1-ROW = 1-SLIDE COMPILATION ENGINE                                  │
│     • Enforces 1 Task = 1 Report Slide across all included tasks        │
│     • Authoritative visual styling inspired by Walton Reference Slide   │
├─────────────────────────────────────────────────────────────────────────┤
│  4. MULTI-CHANNEL EXPORT PIPELINE                                       │
│     • PPTX Engine: 100% Native Editable Shapes, Tables, Text & Images   │
│     • PDF Engine: High-resolution vector printable 16:9 deck            │
│     • HTML Engine: Single-file standalone responsive presentation       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key Architectural Boundaries & Invariants

### 1. Data Sovereignty & Single Source of Truth
* The **Month-Wise Input Sheet** is the sole authoritative source of primary task data.
* `AI BREAKDOWN` is **derived data**; it can always be reconstituted from the source tasks.
* The final presentation deck is **presentation output**; manual presentation overrides do not pollute or alter the original source tasks.

### 2. The "1 Row = 1 Slide" Invariant
* **Every active task row in a monthly input sheet generates exactly one dedicated report slide.**
* No grouping onto single consolidated slides.
* If an engineer has 10 tasks in September, exactly 10 individual slides are compiled for that engineer.

### 3. Non-Blocking Photo Architecture
* Uploading photos during initial task entry is **optional**.
* If a slide is compiled without a photo, the photo container is rendered as a clean, intentionally framed architectural placeholder without fake stock images or broken icons.
* Photos can be uploaded at any time in the Report Builder or Final Editor; the slide immediately absorbs the photo without regenerating AI text.

### 4. 100% Editable Presentation Artifacts
* The PowerPoint output strictly utilizes **native OpenXML shapes, text frames, tables, and image objects** via PptxGenJS.
* Slides are **never** rasterized into flat images. Executives must be able to click into any text box or table to adjust wording directly in Microsoft PowerPoint.

---

## 4. Technology Stack & Runtimes

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Front-End Application** | Single-Page Web Application (Vanilla ES6+ Modules) | Zero external server dependency; runs directly in Microsoft Edge / Chrome. |
| **Typography** | Lexend Font Family (Google Fonts) | Authoritative corporate typography matching reference slide hierarchy. |
| **Styling & Theme** | Modern Responsive CSS3 Variables & Flex/Grid | High performance, crisp 16:9 aspect ratio, Walton Corporate palette. |
| **AI Synthesis** | Google Gemini 3.8 Flash API | Ultra-fast latency, high technical precision, zero hallucination guardrails. |
| **Local Persistence** | IndexedDB (`ProcessReportDB`) + LocalStorage Cache | Instant offline readiness, handles binary photo storage up to hundreds of MBs. |
| **Cloud Persistence** | Google Apps Script Backend (`gas_backend/`) | Direct Google Sheets DB sync and Google Drive photo storage. |
| **PowerPoint Engine** | PptxGenJS v3.12+ | Generates native, 100% editable `.pptx` decks with exact 16:9 coordinates. |
| **PDF Engine** | Native Print CSS + Browser Vector PDF Engine | Clean vector printing without DPI loss. |
| **Standalone HTML** | Self-contained HTML/CSS presentation generator | Interactive keyboard-controlled slide presentation without software dependencies. |
