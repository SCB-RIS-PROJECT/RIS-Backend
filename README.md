# RIS (Radiology Information System) API

API backend untuk sistem informasi radiologi menggunakan Hono.js, Drizzle ORM, dan PostgreSQL.

## � Documentation

- **[PANDUAN_DEPLOYMENT_AMAN.md](PANDUAN_DEPLOYMENT_AMAN.md)** - 🛡️ Panduan deployment yang AMAN (tidak ganggu PM2 apps lain)
- **[SAFETY_CHECKLIST.md](SAFETY_CHECKLIST.md)** - ✅ Checklist keamanan sebelum deploy
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - 📖 Dokumentasi lengkap deployment & CI/CD

## �🔐 Authentication

Project ini menggunakan **JWT (JSON Web Token)** untuk authentication.

### Login Flow

1. Client mengirim `POST /api/auth/login` dengan email dan password
2. Server memvalidasi credentials dan mengembalikan JWT token
3. Client menyimpan token (localStorage/sessionStorage)
4. Untuk setiap request yang memerlukan auth, sertakan token di header:
   ```
   Authorization: Bearer {your-jwt-token}
   ```

### API Endpoints

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "User Name",
    "email": "user@example.com",
    "roles": ["admin"],
    "permissions": ["read", "write"]
  }
}
```

#### Get Current User
```http
GET /api/auth/current
Authorization: Bearer {token}
```

#### Logout
```http
DELETE /api/auth/logout
Authorization: Bearer {token}
```

> **Note**: Dengan JWT, logout dilakukan di client-side dengan menghapus token. Server hanya memberikan konfirmasi.

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL
- pnpm/npm/yarn

### Installation

1. Clone repository
```bash
git clone <repo-url>
cd ris-api
```

2. Install dependencies
```bash
npm install
```

3. Copy environment variables
```bash
cp .env.example .env
```

4. Configure `.env` file
```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/ris_db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
```

5. Run database migrations
```bash
npm run db:push
```

6. Seed database (optional)
```bash
npm run db:seed
```

7. Start development server
```bash
npm run dev
```

Server will run on `http://localhost:8001`

## 📚 API Documentation

Swagger/OpenAPI documentation tersedia di:
- `/docs` - Scalar API documentation
- `/documentation` - OpenAPI JSON spec

### Additional Documentation

- **[DIAGNOSIS-API-USAGE.md](docs/DIAGNOSIS-API-USAGE.md)** - 📋 Panduan lengkap penggunaan API diagnosis
- **[DIAGNOSIS-QUICK-REF.md](docs/DIAGNOSIS-QUICK-REF.md)** - ⚡ Quick reference untuk diagnosis API
- **[POSTMAN-UPDATE-ORDER.md](docs/POSTMAN-UPDATE-ORDER.md)** - 📝 Panduan update order di Postman
- **[POSTMAN-COMPLETE-ORDER.md](docs/POSTMAN-COMPLETE-ORDER.md)** - ✅ Complete order & send to Satu Sehat
- **[API-INTEGRATION-SIMRS.md](docs/API-INTEGRATION-SIMRS.md)** - 🔗 Integrasi dengan SIMRS

## 🔧 Environment Variables

Lihat file `.env.example` untuk daftar lengkap environment variables yang diperlukan.

### Critical Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Secret key untuk JWT signing | `your-super-secret-key` |
| `JWT_EXPIRES_IN` | Token expiration time | `7d`, `24h`, `1h` |

## 🏗️ Tech Stack

- **Framework**: Hono.js
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **API Docs**: Scalar/OpenAPI

## 📝 License

MIT
