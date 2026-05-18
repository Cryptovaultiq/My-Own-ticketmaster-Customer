# 🔒 Security Configuration Guide

## Overview

The ticket submission system now includes **API key authentication** to prevent unauthorized access and block the Rahman admin panel from intercepting submissions.

---

## ⚠️ CRITICAL: Required Environment Variables

### On **Admin Panel** (My-Ticketmaster-admin)

Set these environment variables in your Vercel deployment:

```
GITHUB_TOKEN = "your_github_personal_access_token"
GITHUB_BRANCH = "main"
SUBMISSIONS_API_KEY = "your_secure_api_key_here"  ⭐ REQUIRED
```

**How to set in Vercel:**
1. Go to https://vercel.com/account/projects
2. Select **My-Ticketmaster-admin** project
3. Click **Settings** → **Environment Variables**
4. Add each variable above
5. Click **Save**

**To generate a secure API key:**
```bash
# On Mac/Linux:
openssl rand -base64 32

# On Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256})) | Out-String
```

Example secure key:
```
xK9mP2jL5qR8vN3wB7cF6dH4tJ1sY9uG2oE5iA8kM3nP7rL2qW9sT4vX6yZ1bC
```

---

### On **Customer Portal** (My-Own-ticketmaster-Customer)

No environment variables needed on customer portal. The API key is fetched dynamically from the admin panel's `/api/config` endpoint.

---

## 🔐 Security Features Implemented

### 1. **API Key Authentication** 🔑
- Customer portal fetches API key from admin `/api/config`
- All submissions must include `X-API-Key` header
- Requests without valid key are rejected with **401 Unauthorized**

### 2. **Strict CORS Restrictions** 🛡️
- **Admin submissions endpoint** only accepts:
  - `https://admin-tmaster.vercel.app` (your admin panel)
  - `http://localhost:8000` (local development)
  
- **Blocks completely:**
  - `https://admin-ticketmaaster.vercel.app/` (Rahman panel) ❌
  - Any other unauthorized origin
  - Returns **403 Forbidden**

### 3. **Request Method Validation** ✅
- Submissions endpoint ONLY accepts **POST** requests
- GET, DELETE, PATCH, etc. are blocked
- Prevents data exfiltration attempts

### 4. **Origin Validation** 🌍
- All requests must come from allowed domains
- Referrer header is checked
- Prevents cross-origin attacks

---

## 📊 Security Flow

```
Customer submits form (resell.html)
    ↓
Fetches API key from admin-tmaster.vercel.app/api/config
    ↓
Includes X-API-Key header in submission request
    ↓
Admin API validates:
  1. Origin is allowed (CORS check)
  2. Method is POST (Request method check)
  3. API Key matches (Authentication check)
    ↓
If all pass → Save to GitHub ✅
If any fail → Return 403/401 ❌
```

---

## 🚫 What Gets Blocked

| Request | From | Result | Reason |
|---------|------|--------|--------|
| POST /api/submissions | `admin-tmaster.vercel.app` with valid key | ✅ **ACCEPTED** | Authorized origin + valid key |
| POST /api/submissions | `admin-ticketmaaster.vercel.app` | ❌ **BLOCKED 403** | Unauthorized origin (Rahman) |
| POST /api/submissions | Any origin, no API key | ❌ **BLOCKED 401** | Missing authentication |
| POST /api/submissions | Any origin, wrong key | ❌ **BLOCKED 401** | Invalid authentication |
| GET /api/submissions | Any origin | ❌ **BLOCKED 405** | Wrong HTTP method |
| DELETE /api/submissions | Any origin | ❌ **BLOCKED 405** | Wrong HTTP method |

---

## 📝 Testing the Security

### Test 1: Valid Submission (Should work ✅)
```bash
curl -X POST https://admin-tmaster.vercel.app/api/submissions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_actual_api_key" \
  -d '{"email":"test@example.com","eventTitle":"Concert"}'
```

### Test 2: Missing API Key (Should fail ❌)
```bash
curl -X POST https://admin-tmaster.vercel.app/api/submissions \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","eventTitle":"Concert"}'
# Response: 401 Unauthorized
```

### Test 3: Wrong Origin (Should fail ❌)
```bash
# Request from admin-ticketmaaster.vercel.app
curl -X POST https://admin-tmaster.vercel.app/api/submissions \
  -H "Origin: https://admin-ticketmaaster.vercel.app" \
  -H "X-API-Key: valid_key" \
  -d '{"email":"test@example.com","eventTitle":"Concert"}'
# Response: 403 Forbidden
```

---

## 🔄 Deployment Checklist

- [ ] Set `SUBMISSIONS_API_KEY` on admin panel (Vercel)
- [ ] Set `GITHUB_TOKEN` on admin panel (Vercel)
- [ ] Verify customer portal loads (resell.html works)
- [ ] Test form submission in browser
- [ ] Check browser console for "Admin sync" messages
- [ ] Verify submissions appear ONLY in My-Ticketmaster-admin
- [ ] Verify Rahman panel cannot access submissions

---

## 🐛 Troubleshooting

### "Admin sync failed" message in console
**Cause:** API key not set or mismatch
**Fix:** 
1. Check Vercel environment variables
2. Verify `SUBMISSIONS_API_KEY` is set
3. Redeploy admin panel: `vercel --prod`

### Submissions not saving
**Cause:** API key validation failed
**Fix:**
1. Check browser console for error details
2. Verify origin is allowed
3. Check admin logs for security errors

### Rahman panel still showing submissions
**Cause:** Old API calls or cached responses
**Fix:**
1. Hard refresh Rahman panel (Ctrl+Shift+R)
2. Clear localStorage: `localStorage.clear()`
3. Check Rahman's code for independent GitHub sync

---

## 📚 Files Modified

| File | Changes | Purpose |
|------|---------|---------|
| `api/submissions.js` | +60 lines | Add API key, CORS, origin validation |
| `api/config.js` | +15 lines | Return API key to customer portal |
| `script.js` | +10 lines | Fetch and use API key in requests |

---

## 🛠️ For Development

### Local Testing
```bash
# Terminal 1: Admin panel (port 8000)
cd My-Ticketmaster-admin
python -m http.server 8000

# Terminal 2: Customer portal (port 8001)
cd ../
python -m http.server 8001

# Set environment variable for local testing
export SUBMISSIONS_API_KEY="test-key-12345"
```

---

## ✅ Verification

After deployment, verify security is working:

1. Open browser DevTools → Network tab
2. Go to `resell.html` and submit a form
3. Look for request to `https://admin-tmaster.vercel.app/api/submissions`
4. Check headers contain: `X-API-Key: [your-key]`
5. Check response is `200 Success`
6. Verify submission appears in My-Ticketmaster-admin
7. Verify submission DOES NOT appear in Rahman's panel

---

**Last Updated:** May 18, 2026
