# Quick Test Guide - Format Citation Endpoint

**Status:** ✅ Issues Fixed - Ready to Test

---

## 🚀 Quick Start

### 1. Start the Server
```bash
cd fishchi-app/server
npm run dev
```

**Expected Output:**
```
🚀 HTTPS Server (mkcert) is running on https://localhost:5000
```

### 2. Start the Add-in
```bash
cd Fishchi-addin
npm start
```

### 3. Test in Word
- Open Microsoft Word
- Load the Fishchi Add-in
- Select a source
- Click "Insert Citation"
- ✅ Citation should insert successfully!

---

## 🧪 Quick Command-Line Tests

### Test 1: Health Check (Verify Server is Running)
```bash
curl -k https://localhost:5000/api/v1/health
```

### Test 2: Format Citation (No Auth - Test Endpoint)
```bash
curl -X POST https://localhost:5000/api/v1/export/format-citation-test \
  -H "Content-Type: application/json" \
  -d '{"sourceId":"YOUR_SOURCE_ID","style":"apa"}' \
  -k
```

### Test 3: Format Citation (With Auth - Production Endpoint)
```bash
curl -X POST https://localhost:5000/api/v1/export/format-citation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"sourceId":"YOUR_SOURCE_ID","style":"apa"}' \
  -k
```

---

## ✅ Expected Response Format

```json
{
  "statusCode": 200,
  "success": true,
  "status": "success",
  "data": {
    "sourceId": "67890abcdef...",
    "style": "apa",
    "inText": "(Doe, 2025)",
    "bibliography": "Doe, J. (2025). Article title. Journal Name."
  },
  "message": "Citation formatted successfully"
}
```

---

## 🔍 Response Field Checklist

When testing, verify these fields exist:
- ✅ `success` (boolean)
- ✅ `status` ("success", "fail", or "error")
- ✅ `statusCode` (number)
- ✅ `data` (object with citation data)
- ✅ `message` (string)

---

## 🐛 Common Issues & Quick Fixes

### Issue: `ERR_CONNECTION_REFUSED`
**Fix:** Server is not running
```bash
cd fishchi-app/server && npm run dev
```

### Issue: `401 Unauthorized`
**Fix:** Use test endpoint or provide valid token
```bash
# Use test endpoint (no auth required):
curl -X POST https://localhost:5000/api/v1/export/format-citation-test \
  -H "Content-Type: application/json" \
  -d '{"sourceId":"YOUR_ID","style":"apa"}' -k
```

### Issue: `404 Source not found`
**Fix:** Source ID doesn't exist in database
- Get a valid source ID from your database
- Or create a new source through the app first

### Issue: Certificate errors in Word Add-in
**Fix:** Trust the certificate or use HTTP mode
```bash
# Option 1: Trust certificate
mkcert -install

# Option 2: Use HTTP mode (add to server/.env)
HTTP_MODE=true
```

---

## 📋 Get a Valid Source ID

### Method 1: From MongoDB (if mongosh installed)
```bash
mongosh "mongodb://127.0.0.1:27017/fishchi-db" --quiet --eval \
  "db.sources.findOne({}, {_id: 1, title: 1})"
```

### Method 2: From the Add-in Console
```javascript
// In Word Add-in, press F12, then in console:
console.log(localStorage.getItem('sources'));
```

### Method 3: Use the test script
```bash
cd fishchi-app/server
node test-list-sources.js
```

---

## 🎯 Testing Workflow

1. **Verify Server Running**
   ```bash
   curl -k https://localhost:5000/health
   ```

2. **Get a Source ID** (use one of the methods above)

3. **Test Without Auth** (quick validation)
   ```bash
   curl -X POST https://localhost:5000/api/v1/export/format-citation-test \
     -H "Content-Type: application/json" \
     -d '{"sourceId":"YOUR_ID","style":"apa"}' -k
   ```

4. **Test in Word Add-in** (full integration test)
   - Open Word
   - Load Add-in
   - Select source
   - Insert citation

5. **Verify Citation in Document**
   - Check in-text citation inserted
   - Check formatting matches style (APA, MLA, etc.)

---

## 📞 Need Help?

- **Connection Issues:** See `TROUBLESHOOTING-CONNECTION.md`
- **Full Fix Details:** See `FIX-SUMMARY-FORMAT-CITATION.md`
- **Server Logs:** Check `fishchi-app/server/logs/` folder

---

## 🔧 Developer Console Debugging

### In Word Add-in (F12):

```javascript
// Check if token exists
console.log('Token:', localStorage.getItem('fishchi-token'));

// Test API call manually
fetch('https://localhost:5000/api/v1/export/format-citation-test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sourceId: 'YOUR_ID', style: 'apa' })
})
.then(r => r.json())
.then(d => console.log('Response:', d))
.catch(e => console.error('Error:', e));
```

---

## ✨ What Was Fixed

1. ✅ ApiResponse class now has a constructor
2. ✅ Response includes all required fields (success, status, etc.)
3. ✅ Client no longer double-parses JSON
4. ✅ Proper error handling and logging

---

**Last Updated:** January 2025  
**Status:** Ready for Testing ✅