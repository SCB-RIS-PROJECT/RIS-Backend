# ✅ QUICK CHECKLIST - PACS Import Production

## 🎯 Pre-Flight Checklist
- [ ] SSH access ke production server ready
- [ ] Code sudah di-push dan verified
- [ ] Database production running
- [ ] PACS accessible dari server

---

## 🚀 Step-by-Step Commands

### 1. SSH & Navigate
```bash
ssh gufriends@45.80.181.4 -p 2221
cd ~/RIS-BE  # atau path yang sesuai
```

### 2. Pull Latest Code
```bash
git pull origin main
bun install
```

### 3. Test Connections
```bash
# Test PACS
bun run scripts/orthanc-get-studies.ts --limit=1

# Test Database
bun run scripts/check-modality.ts
```

### 4. Add Modalities (if needed)
```bash
bun run scripts/add-modalities.ts
```

### 5. Dry Run Test
```bash
bun run scripts/pacs-to-database.ts --dry-run --limit=5 --verbose
```

### 6. BACKUP Database! ⚠️
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 7. Small Batch Test
```bash
bun run scripts/pacs-to-database.ts --limit=10 --verbose
bun run scripts/check-import-result.ts
```

### 8. Delete Test Data
```bash
bun run scripts/delete-all-orders.ts
```

### 9. FULL IMPORT! 🎯
```bash
bun run scripts/pacs-to-database.ts
```

### 10. Verify Results
```bash
bun run scripts/check-import-result.ts
bun run scripts/verify-modality-mapping.ts
```

---

## ✅ Success Indicators

Cek hasil import:
```
Total Orders           : 515 ✅
With Modality Mapping  : 514 (99.81%) ✅
Order Status           : FINAL ✅
Failed                 : 0 ✅
```

---

## 🔄 One-Liner (After SSH)

```bash
cd ~/RIS-BE && git pull origin main && bun install && bun run scripts/pacs-to-database.ts
```

---

## 🚨 If Something Goes Wrong

### Rollback:
```bash
psql $DATABASE_URL < backup_TIMESTAMP.sql
```

### Re-run specific range:
```bash
bun run scripts/pacs-to-database.ts --limit=100
```

### Check errors:
```bash
bun run scripts/pacs-to-database.ts --verbose --limit=1
```

---

**Time Estimate**: 15-20 minutes total  
**Import Duration**: ~3 minutes for 515 studies
