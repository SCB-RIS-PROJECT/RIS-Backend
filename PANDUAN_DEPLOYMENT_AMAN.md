# 🛡️ PANDUAN DEPLOYMENT AMAN - RIS API

## ⚠️ PENTING: BACA INI DULU!

Script deployment ini **DIJAMIN AMAN** dan **TIDAK akan mengganggu** aplikasi PM2 lain yang sudah berjalan di server.

## ✅ Jaminan Keamanan

### Yang Script Ini Lakukan:
1. ✅ Hanya mengelola aplikasi **`ris-api`** saja
2. ✅ Restart/start hanya aplikasi `ris-api`
3. ✅ Tidak menyentuh aplikasi PM2 lainnya
4. ✅ `pm2 save` hanya update list, tidak delete app lain
5. ✅ Tidak override PM2 startup configuration

### Yang Script Ini TIDAK Lakukan:
1. ❌ TIDAK ada `pm2 restart all`
2. ❌ TIDAK ada `pm2 delete all`
3. ❌ TIDAK ada `pm2 stop all`
4. ❌ TIDAK ada `pm2 kill`
5. ❌ TIDAK override startup script PM2
6. ❌ TIDAK mengganggu port aplikasi lain
7. ❌ TIDAK modifikasi file .env aplikasi lain

## 📋 Langkah-Langkah Deployment (AMAN)

### Step 1: Verifikasi Keamanan Dulu
```bash
# Login ke server
ssh root@dev

# Masuk ke directory
cd /home/ris_2/RIS-Backend

# Jalankan pre-deployment check
chmod +x scripts/pre-deploy-check.sh
./scripts/pre-deploy-check.sh
```

Script ini akan cek:
- ✅ PM2 apps yang sudah ada (tidak akan diganggu)
- ✅ Port 8001 available atau tidak
- ✅ Database ready
- ✅ .env file ada
- ✅ Disk space cukup

### Step 2: Backup (Opsional tapi Disarankan)
```bash
# Backup PM2 process list
pm2 save
cp ~/.pm2/dump.pm2 ~/.pm2/dump.pm2.backup.$(date +%Y%m%d)

# Backup .env
cp .env .env.backup.$(date +%Y%m%d)

echo "✅ Backup selesai"
```

### Step 3: Setup Environment (Pertama Kali)
```bash
# Jika belum ada .env
cp .env.example .env

# Edit .env (PENTING!)
nano .env

# Minimal yang harus diisi:
# - DATABASE_URL
# - JWT_SECRET
# - SATU_SEHAT credentials
```

### Step 4: Build & Deploy
```bash
# Install dependencies
bun install

# Build aplikasi
bun run build

# Verifikasi build berhasil
ls -lh dist/ris-api

# Deploy dengan script aman
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Step 5: Verifikasi Deployment
```bash
# Cek status PM2 - lihat apakah app lain tetap online
pm2 list

# Cek log ris-api
pm2 logs ris-api --lines 50

# Test aplikasi
curl http://localhost:8001

# Cek dari luar server (jika firewall sudah setup)
curl http://your-server-ip:8001
```

## 🔍 Command Yang Dipakai (100% AMAN)

### Deploy Script (`scripts/deploy.sh`):
```bash
pm2 describe ris-api  # Cek app ada atau tidak (READ ONLY)
pm2 restart ris-api   # Restart HANYA ris-api
pm2 start ecosystem.config.cjs  # Start HANYA ris-api
pm2 save  # Save list (tidak hapus app lain)
pm2 status  # Show status (READ ONLY)
```

### GitHub Actions (`.github/workflows/deploy.yml`):
```bash
pm2 describe ris-api  # Cek app (READ ONLY)
pm2 restart ris-api   # Restart HANYA ris-api
pm2 start dist/ris-api --name ris-api  # Start HANYA ris-api
pm2 save  # Update list
```

## 🧪 Test Manual Sebelum Deploy

Jika masih ragu, test manual dulu:

```bash
cd /home/ris_2/RIS-Backend

# 1. Build
bun install
bun run build

# 2. Test run manual (tanpa PM2)
PORT=8099 ./dist/ris-api &
TEST_PID=$!

# 3. Test endpoint
sleep 2
curl http://localhost:8099

# 4. Kill test
kill $TEST_PID

# Jika sukses, baru deploy dengan PM2
```

## 🔐 Port Configuration

Default port: **8001**

Jika port 8001 sudah dipakai aplikasi lain:

```bash
# Edit .env
nano .env

# Ubah PORT ke yang available
PORT=8002  # atau 8003, 8004, dll

# Restart
pm2 restart ris-api
```

## 📊 Monitoring After Deploy

```bash
# Real-time logs
pm2 logs ris-api

# Monitor resource usage
pm2 monit

# Status semua apps
pm2 list

# Info detail ris-api
pm2 info ris-api

# Restart jika perlu
pm2 restart ris-api

# Stop jika perlu
pm2 stop ris-api
```

## 🆘 Rollback Plan

Jika terjadi masalah:

```bash
# 1. Stop ris-api saja
pm2 stop ris-api

# 2. Atau delete ris-api saja
pm2 delete ris-api

# 3. Restore backup PM2 list (jika perlu)
cp ~/.pm2/dump.pm2.backup.YYYYMMDD ~/.pm2/dump.pm2
pm2 resurrect

# 4. Restore .env
cp .env.backup.YYYYMMDD .env

# 5. Cek semua app normal
pm2 list
```

## ❓ FAQ

### Q: Apakah script ini akan restart aplikasi lain di PM2?
**A:** TIDAK. Script hanya restart aplikasi `ris-api` saja.

### Q: Apakah `pm2 save` akan menghapus aplikasi lain?
**A:** TIDAK. `pm2 save` hanya update list process, tidak delete yang sudah ada.

### Q: Bagaimana jika port 8001 sudah dipakai?
**A:** Pre-deployment check akan detect ini. Ubah PORT di .env ke port lain.

### Q: Apakah perlu stop aplikasi lain dulu?
**A:** TIDAK PERLU. Aplikasi lain tetap berjalan normal.

### Q: Apakah database akan di-reset?
**A:** TIDAK. Database existing tidak disentuh kecuali menjalankan migration.

### Q: Bagaimana cara uninstall ris-api?
**A:** Cukup jalankan `pm2 delete ris-api`. Aplikasi lain tidak terpengaruh.

## 📞 Troubleshooting

### Aplikasi tidak start:
```bash
# Cek error log
pm2 logs ris-api --err --lines 100

# Cek .env
cat .env | grep -E "DATABASE_URL|JWT_SECRET|PORT"

# Test manual
./dist/ris-api
```

### Port conflict:
```bash
# Cek port usage
netstat -tulpn | grep 8001

# Ubah port di .env
nano .env  # Ubah PORT=8002
pm2 restart ris-api
```

### Build gagal:
```bash
# Clear dan rebuild
rm -rf node_modules dist
bun install
bun run build
```

## 🎯 Summary

1. ✅ Script **AMAN** - tidak ganggu PM2 apps lain
2. ✅ Run **pre-deploy-check.sh** dulu
3. ✅ Backup PM2 list dan .env
4. ✅ Setup .env dengan credentials yang benar
5. ✅ Build dan deploy dengan **deploy.sh**
6. ✅ Verify dengan `pm2 list` dan `curl`
7. ✅ Monitor dengan `pm2 logs ris-api`

**Kalau masih ragu, tanya admin/developer dulu! Safety first! 🛡️**
