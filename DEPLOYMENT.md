# 🚀 Deployment Guide - RIS API

## ⚠️ IMPORTANT - Script Safety

**Script ini AMAN dan TIDAK akan mengganggu project lain di PM2!**

✅ Yang dilakukan script:
- Hanya mengelola aplikasi `ris-api` saja
- Tidak restart/stop aplikasi PM2 lain
- Tidak override PM2 startup configuration
- `pm2 save` hanya update list, tidak hapus app lain

❌ Yang TIDAK dilakukan:
- Tidak ada `pm2 delete all` atau `pm2 restart all`
- Tidak override PM2 startup script
- Tidak mengganggu port aplikasi lain
- Tidak modifikasi .env aplikasi lain

## Prerequisites di Server

Server Anda sudah memiliki project di `/home/ris_2/RIS-Backend`. Berikut yang perlu di-setup:

### 1. Install Bun (Runtime)
```bash
# Login sebagai root
ssh root@dev

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Reload shell
source ~/.bashrc

# Verifikasi instalasi
bun --version
```

### 2. Install PM2 (Process Manager)
```bash
# Install PM2 global menggunakan Bun
bun install -g pm2

# Verifikasi instalasi
pm2 --version
```

### 3. Setup Database PostgreSQL
```bash
# Install PostgreSQL jika belum ada
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# Buat database dan user
sudo -u postgres psql

# Di dalam psql console:
CREATE DATABASE ris_db;
CREATE USER ris_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE ris_db TO ris_user;
\q
```

### 4. Setup Environment Variables
```bash
cd /home/ris_2/RIS-Backend

# Copy dari example dan edit
cp .env.example .env
nano .env
```

**File `.env` minimal yang harus diisi:**
```env
NODE_ENV=production
PORT=8001
ALLOWED_ORIGINS=http://your-frontend-domain.com

# Database - Sesuaikan dengan setup PostgreSQL Anda
DATABASE_URL=postgresql://ris_user:your_secure_password@localhost:5432/ris_db

# JWT - Generate secret yang kuat
JWT_SECRET=generate-your-own-strong-secret-key-here
JWT_EXPIRES_IN=7d

# Rate Limit
RATE_LIMIT_KEY_GENERATOR=ip
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000

# Mail (sesuaikan dengan provider Anda)
MAIL_HOST=smtp.your-provider.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_FROM=noreply@yourdomain.com

# Satu Sehat - Isi dengan credentials dari Kemkes
SATU_SEHAT_AUTH_URL=https://api-satusehat-stg.dto.kemkes.go.id/oauth2/v1
SATU_SEHAT_BASE_URL=https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1
SATU_SEHAT_STAGING_URL=https://api-satusehat-stg.dto.kemkes.go.id
SATU_SEHAT_ORGANIZATION_ID=your_org_id
SATU_SEHAT_CLIENT_ID=your_client_id
SATU_SEHAT_CLIENT_SECRET=your_client_secret
SATU_SEHAT_LOCATION_ID=your_location_id
SATU_SEHAT_LOCATION_NAME=Your Hospital Name
SATU_SEHAT_ORGANIZATION_IHS_NUMBER=your_ihs_number

# Orthanc (PACS)
ORTHANC_URL=http://localhost
ORTHANC_HTTP_PORT=8042
ORTHANC_DICOM_PORT=4242
ORTHANC_USERNAME=orthanc
ORTHANC_PASSWORD=orthanc
```

### 5. Setup Database Migration
```bash
cd /home/ris_2/RIS-Backend

# Install dependencies jika belum
bun install

# Run migrations
bun run db:push

# Optional: Seed initial data
bun run db:seed
```

## 🎯 Manual Deployment (Pertama Kali)

### 1. Build Application
```bash
cd /home/ris_2/RIS-Backend

# Install dependencies
bun install

# Build binary
bun run build

# Binary akan ada di dist/ris-api
```

### 2. Setup PM2
```bash
# Buat direktori untuk logs
mkdir -p logs

# Start application dengan PM2
pm2 start ecosystem.config.cjs

# Atau langsung
pm2 start dist/ris-api --name ris-api

# Check status
pm2 status

# View logs
pm2 logs ris-api

# Monitor
pm2 monit
```

### 3. Setup PM2 Startup (Auto-restart saat reboot)
```bash
# Generate startup script
pm2 startup systemd -u root --hp /root

# Save current process list
pm2 save

# Test restart
sudo systemctl restart pm2-root
pm2 status
```

### 4. Verifikasi Aplikasi Berjalan
```bash
# Test dari server
curl http://localhost:8001

# Check logs
pm2 logs ris-api --lines 50
```

## 🔄 CI/CD Setup dengan GitHub Actions

### 1. Setup SSH Keys di GitHub

Di GitHub repository Anda, buka **Settings** → **Secrets and variables** → **Actions**, tambahkan secrets berikut:

| Secret Name | Value | Keterangan |
|-------------|-------|------------|
| `SSH_HOST` | `dev` atau IP server | Hostname/IP server Anda |
| `SSH_USER` | `root` | Username SSH |
| `SSH_PRIVATE_KEY` | Private key SSH | Private key untuk akses server |
| `SSH_PORT` | `22` | Port SSH (default 22) |

**Generate SSH Key (jika belum punya):**
```bash
# Di komputer lokal
ssh-keygen -t ed25519 -C "github-actions"

# Copy public key ke server
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@dev

# Copy private key untuk GitHub Secret
cat ~/.ssh/id_ed25519
# Copy output dan paste ke SSH_PRIVATE_KEY secret
```

### 2. Workflow Sudah Dibuat

File [.github/workflows/deploy.yml](.github/workflows/deploy.yml) sudah dibuat dan akan:
- ✅ Build aplikasi saat push ke branch `main`
- ✅ Run linting dengan Biome
- ✅ Build binary dengan Bun
- ✅ Deploy ke server via SSH
- ✅ Restart aplikasi dengan PM2

### 3. Trigger Deployment

```bash
# Push ke main branch
git add .
git commit -m "feat: setup CI/CD"
git push origin main
```

Atau trigger manual dari GitHub Actions UI.

## 📊 Monitoring & Maintenance

### PM2 Commands
```bash
# Status aplikasi
pm2 status

# Restart aplikasi
pm2 restart ris-api

# Stop aplikasi
pm2 stop ris-api

# View logs
pm2 logs ris-api

# Real-time monitoring
pm2 monit

# Flush logs
pm2 flush

# Reload (zero-downtime restart)
pm2 reload ris-api
```

### Check Port Usage
```bash
# Check apakah port 8001 listening
netstat -tulpn | grep 8001

# Atau dengan ss
ss -tulpn | grep 8001

# Test connection
curl http://localhost:8001
```

### Database Backup
```bash
# Backup database
pg_dump -U ris_user -d ris_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
psql -U ris_user -d ris_db < backup_20251225_120000.sql
```

## 🔥 Firewall Setup (Opsional)

Jika menggunakan UFW:
```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow aplikasi (port 8001)
sudo ufw allow 8001/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## 🐛 Troubleshooting

### Aplikasi tidak bisa diakses dari luar
```bash
# Check apakah app listening di 0.0.0.0 atau 127.0.0.1
netstat -tulpn | grep 8001

# Pastikan di env.ts bind ke 0.0.0.0 bukan localhost
# Edit src/index.ts jika perlu
```

### PM2 tidak auto-restart setelah reboot
```bash
# Setup ulang startup script
pm2 unstartup systemd
pm2 startup systemd -u root --hp /root
pm2 save
```

### Database connection error
```bash
# Check PostgreSQL service
sudo systemctl status postgresql

# Test connection
psql -U ris_user -d ris_db -h localhost

# Check .env DATABASE_URL
cat .env | grep DATABASE_URL
```

### Build gagal
```bash
# Clear cache dan rebuild
rm -rf node_modules dist
bun install
bun run build
```

## 📝 Notes

- ✅ Aplikasi berjalan di port **8001** tanpa nginx
- ✅ PM2 mengelola process dan auto-restart
- ✅ Binary yang di-build bisa langsung dijalankan
- ✅ Logs ada di `/home/ris_2/RIS-Backend/logs/`
- ✅ Environment variables diload dari `.env`

## 🆘 Support

Jika ada masalah:
1. Check logs: `pm2 logs ris-api`
2. Check status: `pm2 status`
3. Check port: `netstat -tulpn | grep 8001`
4. Check .env file: `cat .env`
5. Manual restart: `pm2 restart ris-api`
