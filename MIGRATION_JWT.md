# Migration Guide: Session-based to JWT Authentication

## ⚠️ Breaking Changes

Project ini telah diubah dari **Session-based authentication** menjadi **JWT-based authentication**.

## What Changed

### Backend Changes

1. **Authentication Method**
   - ❌ Before: Session stored in database + HTTP-only cookie
   - ✅ Now: JWT token in `Authorization: Bearer {token}` header

2. **Login Response**
   ```typescript
   // Before
   {
     "message": "Login successful",
     "user": { ... }
   }
   
   // Now
   {
     "message": "Login successful",
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": { ... }
   }
   ```

3. **Authentication Header**
   ```http
   # Before
   Cookie: session_id=encrypted-session-id
   
   # Now
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **Environment Variables**
   ```env
   # Removed
   SESSION_SECRET=...
   SESSION_COOKIE_NAME=...
   SESSION_LIFETIME_MS=...
   
   # Added
   JWT_SECRET=your-secret-key
   JWT_EXPIRES_IN=7d
   ```

### Files Modified

#### Added Files
- ✅ `src/lib/jwt.ts` - JWT utility functions
- ✅ `.env.example` - Environment variables template

#### Modified Files
- 📝 `src/service/auth.service.ts` - JWT token generation instead of session
- 📝 `src/middleware/auth.middleware.ts` - JWT verification instead of session check
- 📝 `src/controller/auth.controller.ts` - Updated API documentation
- 📝 `src/interface/auth.interface.ts` - Added token to login response
- 📝 `src/config/env.ts` - JWT config instead of session config
- 📝 `src/config/configure-open-api.ts` - Bearer auth instead of cookie auth

#### Deprecated Files (can be removed)
- ❌ `src/config/session.ts` - No longer used
- ❌ `src/database/schemas/schema-session.ts` - Session table (optional to keep)

## Migration Steps

### 1. Update Environment Variables

Add to your `.env` file:
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
```

Remove (no longer needed):
```env
SESSION_SECRET=...
SESSION_COOKIE_NAME=...
SESSION_LIFETIME_MS=...
```

### 2. Update Client/Frontend Code

#### Login
```typescript
// Before
const response = await fetch('/api/auth/login', {
  method: 'POST',
  credentials: 'include', // For cookies
  body: JSON.stringify({ email, password })
});
const { user } = await response.json();

// Now
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
const { token, user } = await response.json();
localStorage.setItem('token', token); // Store token
```

#### Authenticated Requests
```typescript
// Before
const response = await fetch('/api/protected', {
  credentials: 'include' // Send cookie automatically
});

// Now
const token = localStorage.getItem('token');
const response = await fetch('/api/protected', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

#### Logout
```typescript
// Before
await fetch('/api/auth/logout', {
  method: 'DELETE',
  credentials: 'include'
});

// Now
await fetch('/api/auth/logout', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
localStorage.removeItem('token'); // Remove token
```

### 3. Install New Dependencies

Already installed:
```bash
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

### 4. Database Cleanup (Optional)

The `sessions` table is no longer used. You can optionally drop it:

```sql
DROP TABLE IF EXISTS sessions;
```

Or keep it for audit/historical purposes.

## Benefits of JWT

✅ **Stateless** - No database lookups for every request  
✅ **Scalable** - Easy to scale horizontally  
✅ **Mobile-friendly** - Works better with mobile apps  
✅ **Cross-domain** - Easier CORS handling  
✅ **Microservices** - Token can be verified by multiple services

## Security Considerations

🔒 **Store JWT Securely**
- Use `httpOnly` cookies for web apps (most secure)
- Or localStorage (easier but vulnerable to XSS)
- Never store in plain text or expose in URL

🔒 **Token Expiration**
- Default: 7 days (`JWT_EXPIRES_IN=7d`)
- Adjust based on your security requirements
- Implement refresh tokens for longer sessions

🔒 **JWT_SECRET**
- Use a strong, random secret key
- Never commit to git
- Rotate periodically in production

## Testing

Test the new authentication:

```bash
# 1. Login
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Response: {"message":"Login successful","token":"eyJ...","user":{...}}

# 2. Use token
curl http://localhost:8001/api/auth/current \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 3. Logout
curl -X DELETE http://localhost:8001/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Rollback (if needed)

If you need to rollback to session-based auth:

```bash
git revert <commit-hash>
```

Or restore these files from git history:
- `src/config/session.ts`
- Previous versions of auth service/middleware/controller

## Questions?

Check the updated documentation in `/docs` endpoint or contact the development team.
