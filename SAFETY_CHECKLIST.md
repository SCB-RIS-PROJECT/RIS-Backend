# ✅ Pre-Deployment Safety Checklist

## Sebelum Menjalankan Script

### 1. Cek PM2 Process yang Sudah Ada
```bash
# Login ke server
ssh root@dev

# Lihat semua process yang running
pm2 list

# Catat nama aplikasi yang sudah ada
# Pastikan tidak ada yang namanya "ris-api"
```

### 2. Cek Port yang Digunakan
```bash
# Cek port 8001 apakah sudah dipakai
netstat -tulpn | grep 8001

# Atau dengan ss
ss -tulpn | grep 8001

# Jika port 8001 sudah dipakai aplikasi lain,
# ubah PORT di .env ke port lain (misal 8002, 8003, dll)
```

### 3. Backup PM2 Process List (PENTING!)
```bash
# Backup current PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 ~/.pm2/dump.pm2.backup.$(date +%Y%m%d_%H%M%S)

# Lihat file backup
ls -la ~/.pm2/dump.pm2*
```

### 4. Test di Development Dulu
```bash
# Test build lokal dulu
cd /home/ris_2/RIS-Backend
bun install
bun run build

# Test run manual (tanpa PM2)
./dist/ris-api
# Ctrl+C untuk stop

# Jika sukses, baru pakai PM2
```

## ✅ Safe Commands yang Dipakai

Script ini HANYA menggunakan command safe berikut:

```bash
# START aplikasi baru (tidak affect app lain)
pm2 start dist/ris-api --name ris-api

# RESTART aplikasi ris-api saja
pm2 restart ris-api

# STOP aplikasi ris-api saja
pm2 stop ris-api

# DELETE aplikasi ris-api saja
pm2 delete ris-api

# SAVE list (tidak hapus app lain, hanya update)
pm2 save

# LIHAT status semua app
pm2 list
pm2 status

# LIHAT log ris-api saja
pm2 logs ris-api
```

## ❌ Command Berbahaya yang TIDAK Dipakai

Script ini **TIDAK** menggunakan command berbahaya seperti:

```bash
# JANGAN DIPAKAI!
pm2 delete all          # ❌ Hapus semua aplikasi
pm2 restart all         # ❌ Restart semua aplikasi
pm2 stop all            # ❌ Stop semua aplikasi
pm2 flush               # ❌ Hapus semua logs
pm2 kill                # ❌ Kill PM2 daemon
pm2 unstartup           # ❌ Remove startup script
pm2 startup systemd -y  # ❌ Override startup config
```

## 🔍 Verification Steps

### Setelah Deploy, Verifikasi:

```bash
# 1. Cek hanya ris-api yang baru/restart
pm2 list
# Lihat "restart" atau "uptime" - hanya ris-api yang berubah

# 2. Cek aplikasi lain masih running
pm2 list | grep -v "ris-api"
# Semua app lain status harus "online"

# 3. Cek log ris-api
pm2 logs ris-api --lines 50

# 4. Test endpoint
curl http://localhost:8001
```

## 🆘 Rollback Plan

Jika ada masalah:

```bash
# 1. Stop ris-api saja
pm2 stop ris-api

# 2. Restore backup (jika perlu)
cp ~/.pm2/dump.pm2.backup.YYYYMMDD_HHMMSS ~/.pm2/dump.pm2
pm2 resurrect

# 3. Cek semua app kembali normal
pm2 list
```

## 📋 Manual Safe Deployment

Jika tidak percaya script otomatis, deploy manual:

```bash
cd /home/ris_2/RIS-Backend

# 1. Build
bun install
bun run build

# 2. Test dulu
./dist/ris-api &
PID=$!
curl http://localhost:8001
kill $PID

# 3. Deploy dengan PM2
pm2 start dist/ris-api --name ris-api

# 4. Verify
pm2 list
pm2 logs ris-api

# 5. Save (opsional)
pm2 save
```

## 🔐 Port Conflict Prevention

```bash
# Before deploy, ensure port 8001 is free
if netstat -tulpn | grep -q 8001; then
    echo "⚠️  Port 8001 is already in use!"
    echo "Please change PORT in .env file"
    exit 1
fi
```

## 📞 Support

Jika ragu atau ada pertanyaan:
1. **JANGAN** jalankan script dulu
2. Hubungi admin/developer
3. Test di server development dulu
4. Baca dokumentasi lengkap

**Remember: Safety First! 🛡️**
