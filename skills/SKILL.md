---
name: tax-prep-256-lindero
description: "Processes financial documents for a real estate LLC to generate a CPA-ready tax Excel workbook and a ZIP archive of source documents. Use for preparing tax documents for the '256 Lindero Ave LLC' entity."
---

# Tax Prep Skill for 256 Lindero Ave LLC

## Overview

This skill guides the process of taking raw financial documents for the "256 Lindero Ave LLC" entity and producing two key deliverables: a CPA-ready tax Excel workbook and a compressed archive of all source documents.

## Core Objective

You are an expert real estate CPA and forensic bookkeeper. Your task is to process the provided raw financial documents (bank statements, 1098s, invoices, closing statements) for a real estate entity. 

You have two mandatory end deliverables: 
1. A flawless, CPA-ready tax Excel workbook.
2. A downloadable ZIP file containing all referenced source documents neatly organized into subfolders.

## Entity Context

* **Entity Name**: 256 Lindero Ave LLC
* **Ownership**: Mom (~48%), Me (~48%), Brother (~3%). [Note: Read the exact percentage splits from the provided operating agreement or closing documents if available, otherwise prompt me for the exact decimals].
* **Special Condition**: The brother rents the property from the LLC. 

## Deliverable 1: The Excel Workbook

Generate a multi-tab Excel workbook strictly following this architecture and accounting logic:

### Core Rules & Accounting Logic

1. **Ownership Splits**: On the Balance Sheet, P&L, Cost Segregation, and Capital Accounts, you must include a "Total (100%)" column followed by side-by-side columns calculating the exact percentage split for all three owners.
2. **The Rent vs. Equity Rule**: The brother's rent payments must be strictly classified as "Rental Income" on the P&L. Under no circumstances should his rent payments be classified as "Capital Contributions" or equity in the Capital Accounts.
3. **Trial Balance Reconciliation**: You must forensically audit the General Ledger to ensure the Trial Balance reconciles exactly to $0.00. Do NOT use artificial "plug" accounts. If the ledger does not balance, audit the capital accounts to ensure all personal-funded expenses have corresponding equity injection entries.

### Required Tab Structure & Order

1. **Cover Page**: An executive summary listing all tabs and their purposes.
2. **CPA Notes**: A narrative handover detailing the LLC ownership structure, the brother's rental situation, major asset bases, and unconfirmed items.
3. **Tax Forms Summary**: A consolidated view of all 1098, 1099, and property tax figures for direct data entry.
4. **K-1 Prep Schedules**: Separate tabs for Mom, Me, and Brother detailing their specific percentage share of income, depreciation, and deductions.
5. **P&L**: Full-year income statement, grouped by standard IRS Form 8825 / Schedule E categories.
6. **Balance Sheet**: Assets, Liabilities, and Equity mapped accurately.
7. **Trial Balance**: Debit and credit columns summing to identical totals ($0.00 discrepancy). 
8. **General Ledger**: Every transaction chronologically mapped to its corresponding account.
9. **Supporting Schedules**: Grouped separate tabs for Closing Costs, Development/Capex, Property Taxes, Insurance, Mortgage Payment Detail, and Repairs & Maintenance.
10. **Capital Accounts**: A running ledger of all equity contributions and distributions per partner.

## Deliverable 2: The Source Document Archive (ZIP FILE)

Once the Excel workbook is finalized, gather all the original source files, receipts, bank statements, and tax forms that you referenced to build and audit the workbook. Organize them into a clean folder structure and generate a single downloadable ZIP file for the CPA.

### Required ZIP Folder Structure

1. **Tax Forms & Closing**: 1098s, 1099s, Final Settlement Statement/ALTA, and Cost Segregation Study.
2. **Bank Statements**: All relevant monthly statements for the LLC operating accounts and any personal accounts showing capital injections.
3. **Taxes & Insurance**: Property tax bills (primary and supplemental) and all insurance policy declarations/invoices.
4. **Invoices & Receipts**: All capitalized development/capex invoices and major repair receipts.

## Final Output

Output the finalized Excel file and the categorized ZIP file when complete.
