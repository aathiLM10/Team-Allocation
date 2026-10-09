# Employee Team Allocation and Shuffle Application

A web application designed for event and organizational management teams to automatically distribute employees from the **Guindy** and **Vandaloor** offices into four balanced teams:

- **White Team**
- **Red Team**
- **Blue Team**
- **Grey Team**

Built with Next.js (App Router), TypeScript, and Tailwind CSS.

---

## 🌟 Key Features

1. **Flexible Employee File Ingestion (`.xlsx`, `.xls`, `.csv`)**
   - **Single File Mode:** One combined file containing employees with Office Location.
   - **Separate File Mode:** Individual uploads for Guindy and Vandaloor offices.
   - **Automatic Column Detection & Mapping:** Detects `Employee Name`, `Gender`, and `Office Location` headers, with a visual remapping selector.
   - **Sample Dataset & Template Downloads:** 1-click loading of a realistic 56-employee demo roster + downloadable Excel templates.

2. **Strict Pre-Allocation Validation & Inline Editor**
   - Flags missing names, unrecognized gender values, and invalid office locations.
   - Flags duplicate employee records with warnings.
   - Does **not** make assumptions about gender based on names. Unrecognized genders must be corrected or explicitly classified as `Unspecified`.
   - Organizers can edit records inline (Name, Gender, Office), remove records, or apply quick fixes before allocation.
   - Critical errors block team generation to guarantee integrity.

3. **Constrained Balanced Allocation Algorithm**
   - **Priority 1:** Assign every valid employee exactly once and balance team sizes ($\Delta \le 1$).
   - **Priority 2:** Balance Guindy and Vandaloor representation ($\Delta \le 1$).
   - **Priority 3:** Jointly optimize gender parity across offices via multi-criteria scoring and local hill-climbing swaps.
   - **Priority 4:** Fair seeded randomization (supports reproducible seed or random shuffle).
   - Handles edge cases like small employee counts (< 4) and skewed office/gender ratios.

4. **Interactive Dashboard & Audit Summary**
   - 4 Team Cards (White, Red, Blue, Grey) with individual office and gender statistics, plus searchable rosters and clipboard copy.
   - Team Balance Comparison Matrix with delta calculations.
   - Allocation Audit Report explaining mathematical remainder limitations transparently.
   - **Shuffle Again with Movement Log:** Visual diff of which employees changed teams and which stayed.
   - **Approval & Lock Protection:** Prevents accidental overwriting of confirmed allocations without explicit confirmation.

5. **Styled Multi-Sheet Master Excel Export & CSVs**
   - **Excel Export (`.xlsx`):** Generated via `ExcelJS` featuring:
     1. `Master Allocation`: Alphabetical list with team color-badged cells.
     2. `White Team`: Dedicated sheet with Platinum/Silver styled column header (`#E2E8F0`).
     3. `Red Team`: Dedicated sheet with Crimson Red styled column header (`#DC2626`).
     4. `Blue Team`: Dedicated sheet with Royal Blue styled column header (`#2563EB`).
     5. `Grey Team`: Dedicated sheet with Charcoal Slate styled column header (`#475569`).
     6. `Summary Matrix`: Balance audit matrix across all teams.
   - **CSV Export:** RFC 4180 UTF-8 with BOM for 100% Excel compatibility.

6. **Privacy & In-Memory Architecture**
   - **Client-Side Processing:** All employee data parsing, validation, and team balancing are executed directly in browser memory.
   - **Zero Data Leakage:** No employee records are sent to external databases or stored on remote servers.
   - *Note:* Because data is held in browser memory, roster allocations do not persist across separate browser sessions unless exported as Excel/CSV.

---

## 🚀 Deployment on Render

This repository includes a [`render.yaml`](render.yaml) blueprint for 1-click deployment on Render:

1. Connect your GitHub repository (`employee-team-allocation`) in the **Render Dashboard**.
2. Select **New Web Service** (or use the Blueprint).
3. Configuration settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Branch:** `main`
4. Render will build and deploy the Next.js application with automatic HTTPS.

---

## 🛠️ Local Development & Testing

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Run unit & integration test suite (21 tests)
npm run test

# Build production bundle
npm run build

# Start production server
npm start
```

│   ├── page.tsx                  # Root entry point
│   ├── globals.css               # Tailwind CSS styles
│   └── teams/
│       └── page.tsx              # Main interactive allocation workflow
├── components/
│   ├── upload/
│   │   ├── employee-upload.tsx    # Drag-and-drop file uploader (single/dual modes)
│   │   ├── column-mapper.tsx      # Column header remapping interface
│   │   ├── data-preview-table.tsx # Pre-allocation preview, metrics & inline editor
│   │   └── sample-data.ts         # Realistic sample datasets & template generators
│   └── teams/
│       ├── team-card.tsx          # Accessible team card with roster search
│       ├── team-summary.tsx       # Balance comparison matrix
│       ├── validation-summary.tsx # Audit & mathematical limitation notes
│       └── allocation-diff-modal.tsx # Reshuffle movement log modal
├── lib/
│   ├── import/
│   │   └── employee-parser.ts     # Excel (.xlsx, .xls) and CSV parsing
│   ├── validation/
│   │   └── employee-validation.ts # Data normalization, validation rules & metrics
│   ├── allocation/
│   │   ├── team-allocation.ts     # Seeded constrained allocation algorithm & diff
│   │   └── allocation-metrics.ts  # Delta calculations & audit verification
│   └── export/
│       └── team-export.ts         # 6-sheet Excel workbook export service
├── tests/
│   ├── allocation.test.ts         # Unit tests for algorithm, small datasets & balance
│   ├── validation.test.ts         # Unit tests for validation & normalization
│   └── export.test.ts             # Unit tests for Excel workbook generation
└── types/
    └── employee.ts                # TypeScript domain models and interfaces
```

---

## 🚀 Running the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Tests
```bash
npm run test
```

### 3. Run Linter
```bash
npm run lint
```

### 4. Build for Production
```bash
npm run build
```

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the active port reported by Next.js) in your browser.
