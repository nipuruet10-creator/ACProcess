# Synchronization Engine Specification & Idempotency Logic

## 1. Objective & Core Mission
The **Synchronization Engine** is the central orchestrator of the system. Triggered by the **"⚡ SYNC INPUT DATA"** button or automated upon worksheet modifications, it ensures that:

1. Changes in the primary month-wise input sheet propagate downstream cleanly.
2. The derived `AI BREAKDOWN` stays synchronized without redundant Gemini calls.
3. The report slide deck updates accurately (creating new slides, updating modified slides, removing excluded slides).
4. All user-uploaded photos and final manual editorial overrides are strictly preserved.
5. The entire process is **100% idempotent**: executing sync 10 times consecutively produces identical, deterministic results with zero duplicate slides.

---

## 2. The 10-Step Synchronization Pipeline

```
[ Step 1: Ingest Month-Wise Input Sheet ]
                   │
                   ▼
[ Step 2: Extract & Validate Task IDs ]
                   │
                   ▼
[ Step 3: Compute Source Hashes ]
                   │
                   ▼
[ Step 4: Detect Added, Modified & Deleted Rows ]
                   │
                   ▼
[ Step 5: Execute AI Synthesis (Incremental Delta Only) ]
                   │
                   ▼
[ Step 6: Synchronize AI Breakdown Sheet ]
                   │
                   ▼
[ Step 7: Reconcile Report Slides (1 Row = 1 Slide) ]
                   │
                   ▼
[ Step 8: Apply Exclusion Filtering (Include == YES/NO) ]
                   │
                   ▼
[ Step 9: Bind Preserved Photos & Manual User Overrides ]
                   │
                   ▼
[ Step 10: Commit Idempotent Presentation State & Audit ]
```

---

## 3. Detailed Step-by-Step Logic

### Step 1: Ingest Selected Month's Input Sheet
* Reads all active rows from the target month worksheet (e.g., `SEP-2026`).
* Extracts `[Task ID, Engineer, Task Name, Include in Report]`.

### Step 2: Validate & Generate Task IDs
* Ensures every row has an immutable key `MMM-YYYY-NNN`.
* If an engineer added a new row without an ID, the synchronizer generates the next sequential ID for that month (e.g., `SEP-2026-006`) and assigns it permanently to the row.

### Step 3: Compute Source Hashes
* For each task row $i$, compute:
  $$\text{hash}_i = \text{CRC32}(\text{row.Engineer} + \text{"\|"} + \text{row.TaskName})$$

### Step 4: Differential Delta Analysis
* Compare current task IDs against existing IDs in `AI BREAKDOWN`:
  * **New IDs:** Flagged for initial AI synthesis.
  * **Existing IDs with Matching Hash:** Marked `UNCHANGED`. Re-use cached AI breakdown.
  * **Existing IDs with Different Hash:** Task name was modified. Flagged for AI re-synthesis.
  * **Missing IDs (Removed from Input Sheet):** Flagged for retirement.

### Step 5: Incremental AI Synthesis (Gemini 3.8 Flash)
* Only tasks marked `NEW` or `HASH_CHANGED` invoke Gemini 3.8 Flash.
* If user previously applied manual edits to this task and set a "Lock Edits" flag, manual text is preserved and AI changes are queued as suggestions.
* If offline or API unavailable, the deterministic factual fallback synthesizer executes immediately.

### Step 6: Synchronize `AI BREAKDOWN` Sheet
* Derived table is updated with synthesized titles, descriptions, impacts, categories, and timestamps.
* `source_hash` is recorded to prevent repeat synthesis.

### Step 7: Reconcile Report Slides (1 Row = 1 Slide Invariant)
* For each task, check existing presentation slide matching `task_id`.
* If no slide exists &rarr; instantiate a new slide object conforming to the Walton 16:9 Master Template.
* If slide exists &rarr; update slide data model with updated fields while retaining slide sequence and manual overrides.

### Step 8: Handle Inclusions & Exclusions (`Include in Report`)
* If `Include in Report == YES` &rarr; Slide is active and present in the deck.
* If `Include in Report == NO` &rarr; Slide is deactivated from the monthly presentation queue.
* The underlying task and its AI breakdown remain stored and safe; only the presentation slide is omitted.

### Step 9: Preserve Uploaded Photos & Manual Editorial Overrides
* Photos are indexed strictly by `task_id` in the local blob store and Google Drive.
* Re-syncing input sheets or regenerating AI text **never disconnects or deletes an uploaded photo**.
* Manual text adjustments made in the Final Report Editor are stored in a dedicated `manual_overrides` map keyed by `task_id` and re-applied over the base slide.

### Step 10: Idempotent Commit & Audit Log
* Presentation state is committed to memory and persistent storage.
* Audit log registers: `SYNC_EXECUTED { month: 'SEP-2026', total: 42, added: 2, updated: 1, excluded: 3 }`.
* Running synchronization again with no input changes results in: `0 added, 0 updated, 0 deleted` in `<10ms`.
