# Permission Management API

API untuk mengelola permissions dan roles secara dinamis tanpa perlu akses database langsung.

## 🔐 Authentication & Authorization

Semua endpoint memerlukan:
- **Authentication**: Bearer token
- **Authorization**: Permission `read:permission` (untuk GET) atau `write:permission` (untuk POST/DELETE)

---

## 📋 Endpoints

### 1. **GET /api/permissions**
Mendapatkan semua permission yang tersedia

**Response:**
```json
{
  "content": {
    "data": [
      {
        "id": "uuid-1",
        "name": "read:order",
        "description": "Read order data"
      },
      {
        "id": "uuid-2",
        "name": "create:order",
        "description": "Create new order"
      }
    ]
  },
  "message": "Successfully retrieved permissions",
  "errors": []
}
```

---

### 2. **GET /api/roles**
Mendapatkan semua role yang tersedia

**Response:**
```json
{
  "content": {
    "data": [
      {
        "id": "uuid-1",
        "name": "SIMRS",
        "description": "Role untuk integrasi SIMRS"
      },
      {
        "id": "uuid-2",
        "name": "ADMIN",
        "description": "Administrator role"
      }
    ]
  },
  "message": "Successfully retrieved roles",
  "errors": []
}
```

---

### 3. **GET /api/roles/{roleId}**
Mendapatkan detail role dengan semua permissionnya

**Response:**
```json
{
  "content": {
    "data": {
      "id": "uuid-role-simrs",
      "name": "SIMRS",
      "description": "Role untuk integrasi SIMRS",
      "permissions": [
        {
          "id": "uuid-perm-1",
          "name": "read:order",
          "description": "Read order data"
        },
        {
          "id": "uuid-perm-2",
          "name": "create:order",
          "description": "Create new order"
        }
      ]
    }
  },
  "message": "Successfully retrieved role",
  "errors": []
}
```

---

### 4. **GET /api/users/{userId}/permissions**
Mendapatkan semua permission user (dari roles + direct permissions)

**Response:**
```json
{
  "content": {
    "data": {
      "user_id": "uuid-user",
      "user_email": "simrs@verd.net.id",
      "user_name": "SIMRS User",
      "roles": [
        {
          "id": "uuid-role",
          "name": "SIMRS",
          "description": "Role untuk integrasi SIMRS",
          "permissions": [
            {
              "id": "uuid-perm-1",
              "name": "read:order",
              "description": "Read order data"
            }
          ]
        }
      ],
      "direct_permissions": [
        {
          "id": "uuid-perm-3",
          "name": "read:patient",
          "description": "Read patient data"
        }
      ]
    }
  },
  "message": "Successfully retrieved user permissions",
  "errors": []
}
```

---

### 5. **POST /api/roles/{roleId}/permissions**
Assign permissions ke role

**Request Body:**
```json
{
  "permission_ids": [
    "uuid-permission-1",
    "uuid-permission-2"
  ]
}
```

**Response:**
```json
{
  "content": {
    "data": {
      "message": "Successfully assigned 2 permission(s) to role SIMRS"
    }
  },
  "message": "Successfully assigned permissions to role",
  "errors": []
}
```

---

### 6. **DELETE /api/roles/{roleId}/permissions**
Revoke permissions dari role

**Request Body:**
```json
{
  "permission_ids": [
    "uuid-permission-1"
  ]
}
```

**Response:**
```json
{
  "content": {
    "data": {
      "message": "Successfully revoked 1 permission(s) from role SIMRS"
    }
  },
  "message": "Successfully revoked permissions from role",
  "errors": []
}
```

---

### 7. **POST /api/users/{userId}/permissions**
Assign permissions langsung ke user (tanpa melalui role)

**Request Body:**
```json
{
  "permission_ids": [
    "uuid-permission-1",
    "uuid-permission-2"
  ]
}
```

**Response:**
```json
{
  "content": {
    "data": {
      "message": "Successfully assigned 2 permission(s) to user simrs@verd.net.id"
    }
  },
  "message": "Successfully assigned permissions to user",
  "errors": []
}
```

---

### 8. **DELETE /api/users/{userId}/permissions**
Revoke permissions langsung dari user

**Request Body:**
```json
{
  "permission_ids": [
    "uuid-permission-1"
  ]
}
```

---

### 9. **POST /api/users/{userId}/roles**
Assign roles ke user

**Request Body:**
```json
{
  "role_ids": [
    "uuid-role-1",
    "uuid-role-2"
  ]
}
```

**Response:**
```json
{
  "content": {
    "data": {
      "message": "Successfully assigned 2 role(s) to user simrs@verd.net.id"
    }
  },
  "message": "Successfully assigned roles to user",
  "errors": []
}
```

---

### 10. **DELETE /api/users/{userId}/roles**
Revoke roles dari user

**Request Body:**
```json
{
  "role_ids": [
    "uuid-role-1"
  ]
}
```

---

## 🚀 Use Case: Setup Permission untuk Akun SIMRS

### Step 1: Get All Permissions
```bash
curl -X GET http://dev.verd.net.id:8001/api/permissions \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Dari response, catat ID untuk `read:order` dan `create:order`.

### Step 2: Get All Roles
```bash
curl -X GET http://dev.verd.net.id:8001/api/roles \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Catat ID role `SIMRS` (atau buat dulu jika belum ada).

### Step 3: Assign Permissions ke Role SIMRS
```bash
curl -X POST http://dev.verd.net.id:8001/api/roles/{ROLE_SIMRS_ID}/permissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "permission_ids": [
      "uuid-read-order-permission",
      "uuid-create-order-permission"
    ]
  }'
```

### Step 4: Assign Role SIMRS ke User
Ambil user ID dari database atau dari login response, kemudian:

```bash
curl -X POST http://dev.verd.net.id:8001/api/users/{USER_ID}/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "role_ids": [
      "uuid-role-simrs"
    ]
  }'
```

### Step 5: Verify Permissions
```bash
curl -X GET http://dev.verd.net.id:8001/api/users/{USER_ID}/permissions \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 🔄 Alternative: Direct Permission Assignment

Jika tidak ingin menggunakan role, Anda bisa assign permission langsung ke user:

```bash
curl -X POST http://dev.verd.net.id:8001/api/users/{USER_ID}/permissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "permission_ids": [
      "uuid-read-order-permission",
      "uuid-create-order-permission"
    ]
  }'
```

---

## ⚠️ Important Notes

1. **Permission Format**: Permission names menggunakan format `{action}:{resource}`
   - Contoh: `read:order`, `create:order`, `update:order`, `delete:order`

2. **Role vs Direct Permission**:
   - **Role**: Lebih terstruktur, mudah manage group permissions
   - **Direct Permission**: Lebih fleksibel untuk kasus khusus

3. **Permission Hierarchy**:
   - User bisa punya permissions dari **roles** + **direct permissions**
   - Semua permissions digabung saat authorization check

4. **Required Admin Permission**:
   - Untuk menggunakan API ini, user admin harus punya:
     - `read:permission` - untuk GET endpoints
     - `write:permission` - untuk POST/DELETE endpoints

---

## 📝 Common Permissions

| Permission | Description |
|------------|-------------|
| `read:order` | View orders |
| `create:order` | Create new orders |
| `update:order` | Update existing orders |
| `delete:order` | Delete orders |
| `read:patient` | View patients |
| `create:patient` | Create new patients |
| `read:permission` | View permissions/roles |
| `write:permission` | Manage permissions/roles |

---

## 🔧 Troubleshooting

### Error: "Permission denied"
- Pastikan token Anda valid
- Pastikan user Anda punya permission `read:permission` atau `write:permission`

### Error: "Role not found"
- Verify role ID dengan endpoint `GET /api/roles`

### Error: "One or more permissions not found"
- Verify permission IDs dengan endpoint `GET /api/permissions`
