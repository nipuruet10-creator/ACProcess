# Slide Design Specification: Walton Corporate 16:9 Master Template

## 1. Design Overview & Authoritative Reference
This visual specification is directly derived from the official Walton AC Process Development presentation reference (`media_1789013397250.png`).
All generated slides (HTML live preview, PDF vector export, and PPTX presentation) strictly adhere to this standardized master template.

### Invariant Design Rules:
1. **Aspect Ratio:** 16:9 Widescreen (`13.333 inches × 7.500 inches` / `1920 × 1080 px`).
2. **Typography:** **Lexend** across all slide titles, badges, cards, metrics, and body text.
3. **Core Rule:** **1 Input Row = 1 Report Slide**. (If an engineer has 10 tasks, 10 distinct, beautifully formatted slides are generated).
4. **Master Template Consistency:** All task slides share this authoritative structure; slides do not vary arbitrarily.

---

## 2. Walton Corporate Color Palette

```
┌───────────────────────────────────┬───────────┬──────────────────────────────────────────┐
│ Token                             │ Hex Value │ Role & Application                       │
├───────────────────────────────────┼───────────┼──────────────────────────────────────────┤
│ `--bg-slide`                      │ `#FFFFFF` │ Canvas background (clean, bright)        │
│ `--navy-primary`                  │ `#0B2038` │ Main headline text, corporate headers    │
│ `--navy-dark`                     │ `#07172B` │ Left sidebar bottom banner               │
│ `--blue-corporate`                │ `#0284C7` │ Primary accents, Proposed pill, buttons  │
│ `--orange-accent`                 │ `#FF6B00` │ Action title keywords, Present pill      │
│ `--orange-vibrant`                │ `#F97316` │ Project badge, swoosh underlines         │
│ `--green-success`                 │ `#10B981` │ Radial completion ring, savings pill     │
│ `--card-bg-blue`                  │ `#F0F9FF` │ Summary panel soft container             │
│ `--card-border-blue`              │ `#BAE6FD` │ Summary panel border                     │
│ `--pill-productivity`             │ `#E0F2FE` │ Impact pill 1 background                 │
│ `--pill-quality`                  │ `#FEF3C7` │ Impact pill 2 background                 │
│ `--pill-capacity`                 │ `#F1F5F9` │ Impact pill 3 background                 │
│ `--pill-savings`                  │ `#DCFCE7` │ Impact pill 4 background                 │
│ `--text-muted`                    │ `#64748B` │ Metadata, subtitles, footer              │
└───────────────────────────────────┴───────────┴──────────────────────────────────────────┘
```

---

## 3. Visual Layout Architecture (16:9 Grid)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [BADGES]    RAC Vacuum Station Optimized with Booster Pump            [ GEARS LOGO & SLOGAN ]   │
│ (Ongoing)                                                             Continuous Improvement...  │
├─────────┬────────────────────────────────────────────────────────────────────────────────────────┤
│ [STATUS │                     MAIN VISUAL / PHOTO WORKSPACE                                      │
│  COLUMN]│   ┌───────────────────────────┐   ┌───┐   ┌───────────────────────────┐                │
│         │   │  Present Condition (ORANGE)│   │ > │   │  Proposed Project (BLUE)  │                │
│ Present │   │                           │   └───┘   │                           │                │
│ Status  │   │  [ Photo 1 / Before ]     │           │  [ Photo 2 / After ]      │                │
│  (HEX)  │   │                           │           │                           │                │
│         │   └───────────────────────────┘           └───────────────────────────┘                │
│ Check   ├───────────────────────────┬───────────────────────────┬────────────────────────────────┤
│ Completed│  SUMMARY & INVESTMENT     │     RADIAL PROGRESS       │       PROJECT IMPACT           │
│         │  ┌─────────────────────┐  │      ┌─────────────┐      │  ┌──────────────────────────┐  │
│ Small   │  │ Summary (AI Desc)   │  │     │   ( 100% )   │      │  │ ⚙ Productivity Increase  │  │
│ Changes │  │                     │  │     │  Completed   │      │  │ ★ Quality Improvement    │  │
│  Big    │  ├─────────────────────┤  │      └─────────────┘      │  │ 📊 Capacity Increase      │  │
│ Impact  │  │ 💰 Investment       │  │                           │  │ 💵 Yearly Cost Saving    │  │
│ (NAVY)  │  └─────────────────────┘  │                           │  └──────────────────────────┘  │
└─────────┴───────────────────────────┴───────────────────────────┴────────────────────────────────┘
                                  Process Development, Air Conditioner, Walton Hi-Tech Industries PLC
```

---

## 4. Component-by-Component Specifications

### A. Top Header Area
* **Left Project Badges:**
  * Badge 1: Orange shield/ribbon (`#FF6B00`) with Gear icon &rarr; *"Ongoing Project"* (or *"Completed Project"*).
  * Badge 2: Soft slate/blue shield (`#E2E8F0`) with Chart icon &rarr; *"Process Improvement"* (or AI Category).
* **Main Headline:**
  * Large, authoritative title (22–26pt Lexend, Bold, `#0B2038`).
  * Contains a dynamic orange accent on the key action verb (e.g., *"RAC Vacuum Station **Optimized** with Booster Pump"*).
* **Top-Right Department Branding:**
  * Two interlocking blue gears icon (`#0284C7`).
  * Text: *"Continuous Improvement for Better Production"* with an orange curved swoosh underline.

### B. Left Vertical Status Column (The Walton Signature Stripe)
* Width: ~8–9% of slide width.
* **Top Element:** Clean hexagonal outline with blue clipboard icon &rarr; *"Present Status"*.
* **Middle Element:** Solid bright blue badge with white circular checkmark &rarr; *"Completed"* (or *"In Progress"*).
* **Bottom Element:** Deep navy banner (`#07172B`) with crisp script typography &rarr; *"Small Changes, Big Impact"* with an energetic orange underline swoosh.

### C. Center Photo Area (Flexible 2-Up Split or 1-Up Panorama)
* Supports Before/After (`Present Condition` vs. `Proposed Project`) or a unified large engineering photo card.
* Headers:
  * Left Card Header: Rounded orange pill (`#FF6B00`, white bold text: *"Present Condition"*).
  * Right Card Header: Rounded blue pill (`#0284C7`, white bold text: *"Proposed Project"*).
  * Connector: Vertical dashed line with a circular chevron arrow (`>`).
* **Empty Photo State (No Photo Uploaded Yet):**
  * Strictly **no stock photos, no fake machines, no text saying "No Photo"**.
  * The photo container renders an architectural, lightly shaded framing card (`#F8FAFC`) with subtle geometric grid marks, maintaining complete visual balance until the engineer attaches real photos.

### D. Bottom-Left Card: Summary & Investment
* Light blue rounded container (`#F0F9FF`, border `#BAE6FD`).
* Blue circular icon with document/pencil.
* AI Description text: 2–3 concise sentences synthesized by Gemini 3.8 Flash.
* Sub-card: Investment / Cost box with coin stack icon (e.g., *"Investment: 2000 USD"* or *"In-house Development"*).

### E. Bottom-Center: Radial Donut Completion Gauge
* Circular SVG/Vector radial progress gauge.
* Bright emerald green stroke (`#10B981`) on soft track (`#E2E8F0`).
* Center metric: Large bold percentage (e.g. `100%`) + label (`Completed` / `In Progress`).

### F. Bottom-Right Card: Project Impact Pill Stack
* Card Header: Solid dark blue header pill (`#0284C7`) with bar chart icon &rarr; *"Project Impact"*.
* Stacked rounded pills, each with a colored icon and soft pastel background:
  1. **Blue Pill (`#E0F2FE`):** Gear Icon &rarr; *Productivity Increase* (or AI Impact point 1).
  2. **Yellow/Orange Pill (`#FEF3C7`):** Star Icon &rarr; *Vacuum Quality improve* (or AI Impact point 2).
  3. **Grey/Slate Pill (`#F1F5F9`):** Chart Icon &rarr; *Capacity Increase* (or AI Impact point 3).
  4. **Green Pill (`#DCFCE7`):** Cash Icon &rarr; *Approximate Yearly Saving - BDT ...* (or operational saving).
* Right edge: Matching vertical capsule status indicators.

### G. Footer
* Subtle corporate credit on bottom-right:
  *Italic, 9pt Lexend, `#64748B`:* `Process Development, Air Conditioner, Walton Hi-Tech Industries PLC`.
