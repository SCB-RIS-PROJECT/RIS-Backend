# Migration 0010: Make id_loinc Nullable

**Date:** 2025-12-25

## Problem
Foreign key constraint `tb_detail_order_id_loinc_tb_loinc_id_fk` caused errors when creating orders from SIMRS integration because SIMRS sends LOINC data inline (in `service_request` object) rather than referencing RIS master LOINC table.

Error:
```
insert or update on table "tb_detail_order" violates foreign key constraint "tb_detail_order_id_loinc_tb_loinc_id_fk"
```

## Solution
Made `id_loinc` column **nullable** in `tb_detail_order` table to support two scenarios:

### Scenario 1: RIS Internal Orders
- `id_loinc` = UUID reference to `tb_loinc` table
- LOINC data pulled from RIS master data
- Modality, requirements, etc. from master

### Scenario 2: SIMRS Integration Orders
- `id_loinc` = NULL
- LOINC data stored in separate fields:
  - `loinc_code_alt`
  - `loinc_display_alt`
  - `kptl_code`
  - `kptl_display`
  - `code_text`
  - `modality_code`
  - `ae_title`
  - etc.
- Original SIMRS data preserved in `service_request_json`

## Changes

### Database Schema
```sql
ALTER TABLE "tb_detail_order" 
ALTER COLUMN "id_loinc" DROP NOT NULL;
```

### TypeScript Schema
- Updated `detailOrderTable` schema to allow null
- Added comment explaining nullable behavior

### Service Layer
- Updated `createOrder` to handle optional `id_loinc`
- Skip LOINC lookup if `id_loinc` is null
- Use SIMRS data from `service_request` as primary source
- Fallback to master LOINC data if available

### Interface
- Changed `createDetailOrderItemSchema.id_loinc` from required to optional
- Updated description to explain SIMRS usage

## Benefits
1. **Flexible Integration:** Supports both RIS internal and SIMRS external orders
2. **No Data Loss:** All SIMRS data preserved in flat fields + JSON
3. **Better Compatibility:** No need to sync LOINC master data between systems
4. **Backwards Compatible:** Existing RIS internal orders still work with FK reference

## Migration Script
`scripts/run-migration-0010.ts` - Can be run safely multiple times (idempotent)
