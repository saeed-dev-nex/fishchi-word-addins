# Troubleshooting Connection Issues - Fishchi Word Add-in

This guide helps you resolve `ERR_CONNECTION_REFUSED` and other connection issues between the Word Add-in and the backend server.

## Quick Diagnosis Checklist

Run through these checks in order:

- [ ] Is the server running?
- [ ] Can you access the server from your browser?
- [ ] Is there a certificate trust issue?
- [ ] Is the API_BASE_URL configured correctly?
- [ ] Is authentication working?

---

## Common Error Messages

### `ERR_CONNECTION_REFUSED`
**Cause:** The client cannot connect to the server at all.

**Solutions:**
1. Server is not running
2. Wrong URL/port
3. Certificate trust issues (HTTPS)
4. Firewall blocking the connection

### `net::ERR_CERT_AUTHORITY_INVALID`
**Cause:** The SSL certificate is not trusted.

**Solution:** See "Certificate Trust Issues" section below.

### `401 Unauthorized`
**Cause:** Missing or invalid authentication token.

**Solution:** See "Authentication Issues" section below.

---

## Step-by-Step Troubleshooting

### Step 1: Verify Server is Running

#### Check if server is running:
```bash
# From the project root
cd fishchi-app/server
npm run dev
```

You should see:
```
🚀 HTTPS Server (mkcert) is running on https://localhost:5000
```

#### Test from command line:
```bash
# Test HTTPS
curl -k https://localhost:5000/health

# Test HTTP
curl http://localhost:5000/health
```

**Expected Response:**
```json
{"status":"ok","timestamp":"..."}
```

---

### Step 2: Test from Browser

Open your browser and navigate to:
- `https://localhost:5000/health`

**If you see a certificate warning:**
- Click "Advanced" → "Proceed to localhost (unsafe)"
- This confirms the server is running but there's a certificate trust issue

**If the page doesn't load at all:**
- The server is not running or is on a different port
- Check server console for errors

---

### Step 3: Fix Certificate Trust Issues

Office Add-ins use the system's certificate store, which can be tricky with self-signed certificates.

#### Option A: Install mkcert CA (Recommended)

1. **Verify mkcert is installed:**
   ```bash
   mkcert -version
   ```

2. **Install the local CA:**
   ```bash
   # Run as Administrator on Windows
   mkcert -install
   ```

3. **Verify certificates exist:**
   ```bash
   cd fishchi-app/server
   ls localhost.pem localhost-key.pem
   ```

4. **Restart Word completely:**
   - Close all Word windows
   - Open Task Manager and end any `WINWORD.EXE` processes
   - Restart Word and reload the Add-in

#### Option B: Use HTTP Mode (Quick Fix for Development)

If certificate issues persist, use HTTP temporarily:

1. **Enable HTTP mode in server:**
   
   Create or edit `fishchi-app/server/.env`:
   ```env
   HTTP_MODE=true
   PORT=5000
   ```

2. **Restart the server:**
   ```bash
   cd fishchi-app/server
   npm run dev
   ```
   
   You should see:
   ```
   🚀 HTTP Server is running on http://localhost:5000
   ```

3. **Update Add-in API base URL:**
   
   Edit `Fishchi-addin/src/config/config.ts`:
   ```typescript
   export const API_BASE_URL = 'http://localhost:5000';
   ```

4. **Rebuild and reload the Add-in:**
   ```bash
   cd Fishchi-addin
   npm run build
   npm start
   ```

5. **Reload the Add-in in Word:**
   - Close the task pane
   - Reopen it from the ribbon

---

### Step 4: Verify API Configuration

#### Check the Add-in configuration:

**File:** `Fishchi-addin/src/config/config.ts`

Should have:
```typescript
export const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://localhost:5000';
```

#### Check environment variables:

**File:** `Fishchi-addin/.env.development`

Should have:
```env
VITE_API_BASE_URL=https://localhost:5000
```

Or for HTTP mode:
```env
VITE_API_BASE_URL=http://localhost:5000
```

---

### Step 5: Test with Diagnostic Script

Use the provided diagnostic script to test all connections:

1. **Run the diagnostic script:**
   ```bash
   cd Fishchi-addin
   node diagnostic-connection.js
   ```

2. **Or paste in browser console:**
   - Open the Add-in in Word
   - Press F12 to open Developer Tools
   - Go to Console tab
   - Copy and paste the contents of `diagnostic-connection.js`
   - Review the output for failures

---

### Step 6: Check CORS Configuration

If you can access the server from the browser but not from the Add-in:

**File:** `fishchi-app/server/src/app.js`

Verify CORS is configured to allow the Add-in origin:
```javascript
app.use(cors({
  origin: [
    'https://localhost:3000',  // Add-in dev server
    'https://localhost:5173',  // Vite dev server
    process.env.CLIENT_URL
  ],
  credentials: true
}));
```

---

### Step 7: Fix Authentication Issues

If you get `401 Unauthorized` errors:

#### Verify token is being sent:

**Check browser console:**
```javascript
// In Word Add-in console
console.log(localStorage.getItem('token'));
```

If no token exists, you need to log in first.

#### Test the endpoint with curl:

```bash
# Get a valid token from your Add-in or login endpoint
TOKEN="your_jwt_token_here"

# Test the endpoint
curl -X POST https://localhost:5000/api/v1/export/format-citation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"sourceId":"507f1f77bcf86cd799439011","citationStyle":"apa","locale":"en-US"}' \
  -k
```

#### Check if the endpoint requires authentication:

**File:** `fishchi-app/server/src/routes/export.routes.js`

The route should be protected:
```javascript
router.post('/format-citation', authenticate, formatCitationForWord);
```

---

## Testing Endpoints

### 1. Health Check (No Auth Required)
```bash
curl https://localhost:5000/health -k
```

### 2. Test Endpoint (No Auth Required - for debugging)
```bash
curl -X POST https://localhost:5000/api/v1/export/format-citation-test \
  -H "Content-Type: application/json" \
  -d '{"sourceId":"507f1f77bcf86cd799439011","citationStyle":"apa","locale":"en-US"}' \
  -k
```

### 3. Production Endpoint (Auth Required)
```bash
curl -X POST https://localhost:5000/api/v1/export/format-citation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"sourceId":"507f1f77bcf86cd799439011","citationStyle":"apa","locale":"en-US"}' \
  -k
```

---

## Common Scenarios & Solutions

### Scenario 1: "Server is running but Add-in can't connect"

**Problem:** Certificate trust issue with Office.

**Solution:**
1. Use HTTP mode (Option B in Step 3)
2. Or ensure mkcert CA is installed in Windows certificate store
3. Restart Word completely after installing certificates

### Scenario 2: "Works in browser but not in Word Add-in"

**Problem:** Office uses a different rendering engine and certificate store.

**Solution:**
1. Office Add-ins use Edge WebView2 or Internet Explorer engine
2. Ensure certificates are trusted at the OS level
3. Try running Word as Administrator once to see if it helps
4. Consider using HTTP mode for development

### Scenario 3: "Endpoint returns 401 Unauthorized"

**Problem:** Missing or invalid token.

**Solution:**
1. Verify token exists in localStorage
2. Verify token hasn't expired
3. Test the login endpoint first
4. Use the test endpoint (`/format-citation-test`) which doesn't require auth

### Scenario 4: "Getting 500 Internal Server Error"

**Problem:** Server-side error in the endpoint.

**Solution:**
1. Check server console logs for error stack trace
2. Verify MongoDB is running and connected
3. Verify the sourceId exists in the database
4. Check that all required dependencies are installed
5. Review the error in `fishchi-app/server/logs/` if logging is enabled

### Scenario 5: "Connection works sometimes but not others"

**Problem:** Server crashing or restarting.

**Solution:**
1. Check server logs for crashes
2. Ensure MongoDB is stable
3. Check for memory leaks or unhandled promise rejections
4. Use `nodemon` to auto-restart on crashes (already configured)

---

## Environment Variables Checklist

### Server (`fishchi-app/server/.env`)
```env
# Server Configuration
PORT=5000
HTTP_MODE=false    # Set to true for HTTP, false for HTTPS

# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/fishchi-db

# JWT
JWT_SECRET=your_secret_key_here

# CORS
CLIENT_URL=https://localhost:3000

# SSL Certificates (if HTTPS)
SSL_CERT_PATH=./localhost.pem
SSL_KEY_PATH=./localhost-key.pem
```

### Add-in (`Fishchi-addin/.env.development`)
```env
# API Configuration
VITE_API_BASE_URL=https://localhost:5000

# Or for HTTP mode:
# VITE_API_BASE_URL=http://localhost:5000
```

---

## Debugging Tips

### Enable Verbose Logging

Add logging to track requests:

**In Add-in (`api.ts`):**
```typescript
console.log('[API] Making request to:', url);
console.log('[API] Headers:', headers);
console.log('[API] Body:', body);
```

**In Server (`export.controller.js`):**
```javascript
console.log('[Export] Request received:', {
  sourceId: req.body.sourceId,
  userId: req.user?._id,
  citationStyle: req.body.citationStyle
});
```

### Use Browser DevTools

1. Open Word Add-in
2. Press F12 to open DevTools
3. Go to Network tab
4. Try the operation again
5. Look for failed requests
6. Check request/response details

### Check Windows Firewall

Ensure localhost is allowed:
```powershell
# Run PowerShell as Administrator
netsh advfirewall firewall add rule name="Node.js Dev Server" dir=in action=allow protocol=TCP localport=5000
```

---

## Still Having Issues?

If none of the above solutions work:

1. **Collect diagnostic information:**
   - Server console output
   - Browser console output (F12 in Word Add-in)
   - Network tab from DevTools
   - Output from diagnostic script

2. **Check these files:**
   - `fishchi-app/server/src/routes/export.routes.js`
   - `fishchi-app/server/src/controllers/export.controller.js`
   - `Fishchi-addin/src/services/api.ts`
   - `Fishchi-addin/src/config/config.ts`

3. **Verify versions:**
   ```bash
   node --version    # Should be 18+ or 20+
   npm --version
   ```

4. **Clean install:**
   ```bash
   # Server
   cd fishchi-app/server
   rm -rf node_modules package-lock.json
   npm install
   
   # Add-in
   cd ../../Fishchi-addin
   rm -rf node_modules package-lock.json
   npm install
   ```

---

## Production Deployment Notes

When deploying to production:

- ✅ Use HTTPS with a valid SSL certificate (not self-signed)
- ✅ Set `HTTP_MODE=false` or remove it entirely
- ✅ Update `VITE_API_BASE_URL` to your production domain
- ✅ Configure CORS to allow your production domain only
- ✅ Ensure all endpoints requiring auth have the `authenticate` middleware
- ✅ Remove or protect test endpoints like `/format-citation-test`

---

## Quick Reference Commands

```bash
# Start server (HTTPS)
cd fishchi-app/server && npm run dev

# Start server (HTTP mode)
HTTP_MODE=true npm run dev

# Start Add-in dev server
cd Fishchi-addin && npm start

# Test server health
curl -k https://localhost:5000/health

# Install mkcert CA (Windows - Run as Admin)
mkcert -install

# View server logs
cd fishchi-app/server && tail -f logs/combined.log

# Check if port is in use
netstat -ano | findstr :5000
```

---

**Last Updated:** 2025-01-XX
**Tested On:** Windows 11, Office 365, Node.js 20.x