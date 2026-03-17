---
name: tax-prep-21-sicilian
description: "Processes financial documents for the 21 Sicilian Walk property to generate a CPA-ready tax Excel workbook and a ZIP archive of source documents. Use for preparing tax documents for the '21 Sicilian Walk' property. Automatically detects the tax year from provided documents and applies the correct accounting treatment (Schedule E rental for 2024-2025, Schedule A primary residence for 2026+)."
---

# Tax Prep Skill for 21 Sicilian Walk

## Overview

Process raw financial documents (bank statements, 1098s, invoices, closing statements) for the 21 Sicilian Walk property. Determine the tax year from the documents and apply the correct accounting scenario. Produce two deliverables: a CPA-ready Excel workbook and a ZIP archive of source documents.

## Core Objective

Act as an expert CPA and forensic bookkeeper. Forensically audit the ledger so the Trial Balance reconciles exactly to $0.00 without artificial "plug" accounts.

## Step 1: Determine Tax Year & Scenario

Inspect the provided documents to identify the tax year, then apply the matching scenario:

| Tax Year | Scenario | Use | Tax Form |
|----------|----------|-----|----------|
| 2024-2025 | A — Rental Era | Rental Property | Schedule E |
| 2026+ | B — Primary Residence Era | Owner-Occupied | Schedule A |

## Scenario A: Tax Years 2024 & 2025 (Rental Era)

### Ownership & Rules

* **Ownership**: 50/50 Tenants in Common (TIC). 50% Shane & Jessica Young | 50% Greg & Arlynne Schwartz.
* **Accounting**: Cash Basis.
* **Capital Contribution Rule**: Capital contributions do NOT alter the 50/50 tax split. One partner may fund more capital, but all Schedule E income and expenses remain strictly 50/50.
* **Real Estate Professional Status (REPS)**: Shane Young qualifies as a designated Real Estate Professional. The Schwartz partners are strictly passive investors. Prominently flag this in CPA Notes so the tax preparer correctly categorizes the Youngs' losses as **non-passive** (not subject to passive activity loss limitations) and the Schwartzs' losses as **passive**.
* **OBBB Depreciation Rule**: Per OBBB regulations, any property, components, or capitalized improvements placed in service after January 19, 2025, must be designated for **100% bonus depreciation**. Calculate cost segregation/depreciation schedules accordingly for eligible 5-year and 15-year property.

### Required Excel Tab Structure

1. **Cover Page & CPA Notes** — Detail the 50/50 TIC structure, REPS designation for Shane Young, OBBB bonus depreciation methodology, and flag any unconfirmed items.
2. **Tax Forms Summary** — Consolidated 1098/1099 data.
3. **Sch E - Young** — 50% share of Schedule E income and deductions.
4. **Sch E - Schwartz** — 50% share of Schedule E income and deductions.
5. **P&L** — Full-year income statement with "Total" and side-by-side 50% columns.
6. **Balance Sheet** — Assets, Liabilities, Equity with "Total" and side-by-side 50% columns.
7. **Trial Balance** — Debit and credit columns summing to identical totals ($0.00 discrepancy).
8. **General Ledger** — Every transaction chronologically mapped to its account.
9. **Closing Costs** — Supporting schedule.
10. **Capitalized Dev Costs** — Supporting schedule.
11. **Property Taxes** — Supporting schedule.
12. **Insurance** — Supporting schedule.
13. **Mortgage Detail** — Supporting schedule.
14. **Repairs & Maintenance** — Supporting schedule.
15. **Capital Accounts** — Running equity ledger per partner.

### Required ZIP Folder Structure

* `Tax Forms/` — 1098s, 1099s, settlement statements.
* `Bank Statements/` — All relevant monthly statements.
* `Taxes & Insurance/` — Property tax bills and insurance declarations.
* `Invoices & Receipts/` — Capitalized dev/capex invoices and repair receipts.

## Scenario B: Tax Year 2026+ (Primary Residence Era)

### Ownership & Rules

* **Occupant**: Shane, Jess, and Cal — owner-occupied primary residence.
* **Tax Shift**: Halt all depreciation. Cease Schedule E rental income/expenses. Mortgage interest (1098) and property taxes go to Schedule A Itemized Deductions.
* **Household Payroll**: Track household employee/nanny payments for Schedule H.
* **Capital Improvements**: Track as additions to home's primary cost basis, not as capitalized assets for depreciation.

### Required Excel Tab Structure

1. **Cover Page & CPA Notes** — Detail primary residence status and transition from rental.
2. **Schedule A Prep** — Itemized tracking of deductible mortgage interest and property taxes.
3. **Schedule H Prep** — Household employment tax/payroll tracking.
4. **Home Basis Tracker** — Purchase price + past capitalized dev costs + new 2026+ capital improvements.
5. **Non-Deductible Expense Ledger** — Personal utilities, insurance, routine maintenance (no longer deductible).
6. **Trial Balance** — Debit and credit columns ensuring all personal outlays balance with personal equity/cash.
7. **General Ledger** — Every transaction chronologically mapped to its account.

### Required ZIP Folder Structure

* `Form 1098s & Property Tax Bills/`
* `Capital Improvement Receipts/`
* `Household Payroll/`

## Final Output

Output the finalized Excel file and the categorized ZIP file when complete.
