# AI Breakdown Specification: Gemini 3.8 Flash Synthesis Engine

## 1. Objective & Purpose
The `AI BREAKDOWN` sheet/datastore is an automatically maintained, derived structure. It bridges the ultra-simple raw input (`Engineer | Task Name`) to the executive presentation format by leveraging **Google Gemini 3.8 Flash**.

Crucially:
* The original task name remains strictly intact.
* AI-generated fields are stored independently.
* AI factuality is guarded by conservative, zero-hallucination prompt engineering.
* Unnecessary API calls are eliminated through content hashing and intelligent local caching.

---

## 2. AI Breakdown Data Schema

For every task in a monthly input sheet, exactly one corresponding row exists in `AI BREAKDOWN`:

| Field | Type | Description |
| :--- | :--- | :--- |
| **`task_id`** | String | Immutable key matching the monthly input sheet (e.g., `SEP-2026-001`). |
| **`month`** | String | Operating month code (e.g., `SEP-2026`). |
| **`engineer`** | String | Concern engineer name (e.g., `Sazzad`, `Rafi`). |
| **`original_task_name`** | String | Verbatim task name entered by the engineer. Never mutated. |
| **`ai_report_title`** | String | Polished, professional executive presentation title (1 line). |
| **`ai_description`** | String | Concise technical description (2–3 sentences max). |
| **`ai_impact`** | Array[String] | 2 to 4 bullet points outlining operational/process benefits. |
| **`ai_category`** | String | Primary process category (e.g., `Process Development`, `Brazing & Automation`, `Quality Improvement`, `Tooling & Fixtures`). |
| **`ai_project_type`** | String | Classification (e.g., `Process Improvement`, `Ongoing Project`, `Automation`, `Cost Optimization`). |
| **`photo`** | String / Object | Attached photo ID / URL / local base64 identifier (optional). |
| **`slide_status`** | String | `READY` (complete with photo), `PHOTO PENDING` (text ready, photo optional), or `EXCLUDED`. |
| **`last_ai_update`** | ISO Timestamp | Timestamp of the most recent AI synthesis. |
| **`source_hash`** | String | SHA-256 / CRC32 hash of `original_task_name + engineer`. |

---

## 3. Gemini 3.8 Flash Prompt Engineering & Zero-Hallucination Guardrails

### Core System Directive
```text
You are an expert industrial engineering documentation specialist for Walton Hi-Tech Industries AC Process Development Department.
Your task is to take a raw, brief engineering task name and expand it into professional, clean presentation text for a monthly management report slide.

STRICT FACTUALITY AND ZERO-FABRICATION POLICY:
1. NEVER invent specific quantitative data: NO fabricated cost savings (BDT/USD), NO fabricated percentages (e.g., "reduced by 25%"), NO fabricated cycle times (e.g., "from 8 min to 5 min"), NO fabricated machine model numbers, NO fabricated test metrics, NO fabricated completion dates, and NO employee names unless explicitly present in the input.
2. If only a brief task name is given (e.g., "New Die Development"), produce a conservative, professional engineering summary based on standard industrial manufacturing principles.
3. Keep the description concise (1-3 sentences), clear, and suitable for plant management review.
4. Provide 2 to 3 realistic, conservative impact bullet points (e.g., "Enhanced manufacturing process flow", "Increased production tooling reliability").
5. Categorize into Walton standard categories: Process Development, Tooling & Fixtures, Automation, Quality & Testing, Cost Optimization, or Maintenance.

OUTPUT FORMAT (Valid JSON Only):
{
  "report_title": "Concise Executive Title",
  "description": "Professional 2-3 sentence technical description.",
  "impact": [
    "Impact point 1",
    "Impact point 2"
  ],
  "category": "Process Development",
  "project_type": "Process Improvement"
}
```

### Demonstration of Strict Compliance:

#### Scenario A: Minimal Raw Input
* **Input:** `"New Die Development"`
* **Valid Compliant Output:**
  * **Title:** New Die Development
  * **Description:** Designed and developed a new production die to support ongoing AC unit manufacturing requirements.
  * **Impact:**
    * • Improved tooling availability on the assembly line
    * • Enhanced process capability and fabrication support
  * **Category:** Tooling & Fixtures
  * **Project Type:** Process Improvement
* **Disallowed (Hallucinated) Output:**
  * ❌ *"Saved BDT 5,00,000 and reduced stamping cycle time by 40% with high carbon steel"* &rarr; **Violates Rule 1**.

#### Scenario B: Informative Raw Input
* **Input:** `"RAC Vacuum Station Optimized with Booster Pump to reduce cycle time from 8 min to 5 min"`
* **Valid Compliant Output:**
  * **Title:** RAC Vacuum Station Optimization with Booster Pump
  * **Description:** Optimized the vacuum station line by integrating a booster pump, successfully reducing vacuum cycle time from 8 minutes down to 5 minutes.
  * **Impact:**
    * • Vacuum cycle time reduced from 8 min to 5 min
    * • Increased line production capacity
    * • Improved evacuation consistency
  * **Category:** Process Development
  * **Project Type:** Ongoing Project

---

## 4. Hash Caching & Intelligent Regeneration Engine

To ensure peak performance and minimize unnecessary API calls:

1. **Source Hash Calculation:**
   $$\text{source\_hash} = \text{CRC32}(\text{engineer} + \text{"\_"} + \text{original\_task\_name})$$
2. **Evaluation Logic:**
   * If a task row exists in `AI BREAKDOWN` and its stored `source_hash` matches the current hash:
     &rarr; **Skip AI Generation**. Return cached breakdown instantly.
   * If `source_hash` differs (e.g., user updated the task name):
     &rarr; Invoke Gemini 3.8 Flash, update fields, timestamp `last_ai_update`, and update `source_hash`.
   * If user clicks **"✨ Regenerate AI"** explicitly:
     &rarr; Force API invocation, bypassing cache, and refresh slide presentation text.
3. **Offline / Fallback Guarantee:**
   If the Gemini API is unreachable or rate-limited, the system executes an automated deterministic rule-based local synthesizer that parses keywords (e.g., "Brazing", "Die", "Jig", "SOP", "Vacuum", "Cost", "Testing") and generates a clean factual baseline without blocking the user.
