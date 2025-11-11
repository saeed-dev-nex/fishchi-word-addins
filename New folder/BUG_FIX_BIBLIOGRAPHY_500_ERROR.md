# Bug Fix: Bibliography Insert 500 Internal Server Error

## 🐛 Problem Description

**Symptom:** When attempting to insert bibliography into Word document, the following error appears in the console:

```
POST https://localhost:5000/api/v1/export/format-bibliography 500 (Internal Server Error)
Auto bibliography update failed: API Error: 500 Internal Server Error
```

**Impact:** Users cannot insert bibliographies into their Word documents. Citations can be inserted, but the bibliography generation fails.

---

## 🔍 Root Cause Analysis

The 500 error was caused by **missing authentication middleware** on the bibliography endpoint.

### The Issue Chain:

1. **Missing Authentication Middleware** (Line 26 in `export.routes.js`):
   ```javascript
   // ❌ BEFORE: No 'protect' middleware
   router.post("/format-bibliography", formatBibliographyForWord);
   ```

2. **Undefined User in Controller** (Line 356 in `export.controller.js`):
   ```javascript
   const userId = req.user._id; // ❌ req.user is undefined!
   ```
   Without the `protect` middleware, `req.user` is `undefined`, causing:
   ```
   TypeError: Cannot read property '_id' of undefined
   ```

3. **Database Query Fails**:
   The controller tries to find sources with `user: undefined`, which causes the 500 error.

### Why This Happened:

The `/format-bibliography` endpoint was likely created for testing without authentication and was never updated to include the `protect` middleware before deployment.

**Comparison with other endpoints:**
```javascript
router.post("/format-citation", protect, formatCitationForWord);  // ✅ Has protect
router.post("/format-bibliography", formatBibliographyForWord);   // ❌ Missing protect
router.post("/manage-vancouver-numbering", protect, manageVancouverNumbering); // ✅ Has protect
```

---

## ✅ Solutions Applied

### Fix #1: Add Authentication Middleware (CRITICAL)

**File:** `fishchi-app/server/src/routes/export.routes.js` (Line 26)

```javascript
// ✅ AFTER: Added 'protect' middleware
router.post("/format-bibliography", protect, formatBibliographyForWord);
```

**Why this works:** The `protect` middleware:
- Validates the JWT token from the Authorization header
- Fetches the user from the database
- Attaches the user object to `req.user`
- Ensures only authenticated users can access the endpoint

### Fix #2: Add User Validation in Controller

**File:** `fishchi-app/server/src/controllers/export.controller.js` (Lines 345-352)

```javascript
// ✅ Added user validation
if (!req.user || !req.user._id) {
  console.log("❌ No authenticated user found");
  return res
    .status(401)
    .json(new ApiResponse(401, null, "Authentication required"));
}
```

**Why this helps:** Even if middleware fails, we catch it early with a clear error message.

### Fix #3: Enhanced Error Logging (Frontend)

**Files Modified:**
- `Fishchi-addin/src/taskpane/services/api.ts`
- `Fishchi-addin/src/taskpane/components/MainWorkspace.tsx`

**Added comprehensive logging:**

1. **Request Logging** (Before API call):
   ```typescript
   console.log("📚 [apiFormatBibliography] Preparing request:", {
     sourceIds: sourceIds,
     sourceIdsCount: sourceIds.length,
     style: style,
     lang: lang,
   });
   ```

2. **Response Logging** (After API call):
   ```typescript
   console.log("✅ [apiFormatBibliography] Response received:", {
     hasData: !!data,
     hasHtml: !!data?.html,
     htmlLength: data?.html?.length,
   });
   ```

3. **Error Logging with Context**:
   ```typescript
   console.error("❌ [apiFormatBibliography] Request failed:", {
     error: error.message,
     sourceIds: sourceIds,
     style: style,
     lang: lang,
   });
   ```

4. **Enhanced Error Response Handling** (api.ts lines 84-117):
   - Now captures and logs full error response body from 500 errors
   - Extracts error messages from JSON or text responses
   - Provides detailed error context for debugging

---

## 🧪 How to Test the Fix

### 1. Restart the Backend Server

```bash
cd fishchi-app/server
npm start
# or
node index.js
```

**Important:** The route change requires a server restart to take effect.

### 2. Test Citation + Bibliography Flow

1. Open Word and launch the Fishchi add-in
2. Log in with your credentials
3. Select a project with sources
4. **Insert a citation:**
   - Click on a source
   - Click "درج استناد" button
   - ✅ Citation should insert successfully

5. **Insert bibliography:**
   - Click "درج کتاب‌نامه" button
   - ✅ Bibliography should insert at document end
   - ✅ No 500 error in console

### 3. Test Auto-Update Bibliography

1. Enable "به‌روزرسانی خودکار کتاب‌نامه" checkbox
2. Insert a citation
3. ✅ Bibliography should auto-update
4. ✅ No 500 errors in console

---

## 📊 Expected Console Output

### ✅ Success Pattern (After Fix):

**Frontend:**
```
📚 [apiFormatBibliography] Preparing request: {
  sourceIds: ["64abc123...", "64def456..."],
  sourceIdsCount: 2,
  style: "apa",
  lang: "fa-IR"
}
✅ [apiFormatBibliography] Response received: {
  hasData: true,
  hasHtml: true,
  htmlLength: 1234
}
✅ [updateBibliography] Bibliography HTML received, length: 1234
```

**Backend:**
```
=== FORMAT BIBLIOGRAPHY REQUEST ===
Request body: { sourceIds: [...], style: 'apa', lang: 'fa-IR' }
User ID: 64abc123def456789...
Auth header present: true
🔍 Looking for 2 sources for user: 64abc123def456789...
✅ Found 2 sources
✅ CSL mapping successful for all sources
📝 Formatting bibliography with style: apa, language: fa-IR
✅ Bibliography formatting successful
📄 Bibliography HTML length: 1234 characters
```

### ❌ Error Pattern (Before Fix):

**Frontend:**
```
POST https://localhost:5000/api/v1/export/format-bibliography 500 (Internal Server Error)
❌ [apiFormatBibliography] Request failed: API Error: 500 Internal Server Error
❌ [updateBibliography] Auto bibliography update failed: API Error: 500 Internal Server Error
```

**Backend:**
```
=== FORMAT BIBLIOGRAPHY REQUEST ===
Request body: { sourceIds: [...], style: 'apa', lang: 'fa-IR' }
User ID: undefined
❌ TypeError: Cannot read property '_id' of undefined
```

---

## 🔧 Troubleshooting Guide

### Issue 1: Still Getting 401 Unauthorized

**Symptoms:**
```
POST https://localhost:5000/api/v1/export/format-bibliography 401 (Unauthorized)
```

**Possible Causes:**
1. Token expired or invalid
2. Token not being sent in Authorization header

**Solutions:**
```typescript
// Check token in console
const token = await OfficeRuntime.storage.getItem("fishchi-token");
console.log("Token exists:", !!token);
console.log("Token length:", token?.length);

// Check Authorization header
// In authenticatedFetch, verify:
headers.append("Authorization", `Bearer ${token}`);
```

**Fix:** Log out and log in again to get a fresh token.

### Issue 2: Still Getting 500 Error

**Symptoms:**
```
POST https://localhost:5000/api/v1/export/format-bibliography 500 (Internal Server Error)
```

**Debugging Steps:**

1. **Check Backend Logs:**
   ```bash
   # Look for error stack traces in terminal
   ```

2. **Verify Middleware is Applied:**
   ```javascript
   // In export.routes.js, ensure:
   router.post("/format-bibliography", protect, formatBibliographyForWord);
   //                                   ^^^^^^^ This must be present
   ```

3. **Test Protect Middleware:**
   ```bash
   # Send a test request with curl
   curl -X POST https://localhost:5000/api/v1/export/format-bibliography \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -d '{"sourceIds":["64abc..."],"style":"apa","lang":"fa-IR"}'
   ```

4. **Check Source Data:**
   - Ensure sources exist in database
   - Verify sources have all required fields (authors, title, year)
   - Check CSL mapping doesn't fail

### Issue 3: "No matching sources found"

**Symptoms:**
```
❌ No matching sources found
```

**Possible Causes:**
1. Source IDs don't exist in database
2. Sources belong to a different user
3. Sources were deleted

**Solutions:**
1. Verify source IDs are correct:
   ```javascript
   console.log("Inserting citation for source:", sourceId);
   ```

2. Check database:
   ```javascript
   const source = await Source.findById(sourceId);
   console.log("Source exists:", !!source);
   console.log("Source owner:", source?.user);
   console.log("Current user:", req.user._id);
   ```

### Issue 4: CSL Mapping Fails

**Symptoms:**
```
❌ CSL mapping failed for source 64abc...: TypeError: Cannot read property 'map' of undefined
```

**Cause:** Source data is incomplete (e.g., missing `authors` array)

**Solution:** Ensure all sources have required fields:
```javascript
// In Source model, ensure:
authors: [{
  firstname: String,
  lastname: String
}]
```

---

## 📝 Files Modified

### Backend:

1. **`fishchi-app/server/src/routes/export.routes.js`** (Line 26)
   - Added `protect` middleware to `/format-bibliography` route

2. **`fishchi-app/server/src/controllers/export.controller.js`** (Lines 345-352)
   - Added user validation check
   - Enhanced logging

### Frontend:

3. **`Fishchi-addin/src/taskpane/services/api.ts`**
   - Enhanced `apiFormatBibliography` with detailed logging (Lines 379-420)
   - Improved error handling in `authenticatedFetch` (Lines 84-117)

4. **`Fishchi-addin/src/taskpane/components/MainWorkspace.tsx`**
   - Added logging in `updateBibliography` (Lines 591-617)
   - Added logging in `handleInsertBibliography` (Lines 707-733)
   - Fixed `finalLang` scope issue (Lines 692-693)

---

## 🎯 Verification Checklist

Before considering the bug fixed:

- [ ] Backend server restarted with updated routes
- [ ] Can log in successfully
- [ ] Can insert citations (proves authentication works)
- [ ] Can insert bibliography manually (click button)
- [ ] Can auto-update bibliography (checkbox enabled)
- [ ] No 500 errors in console
- [ ] No 401 errors in console
- [ ] Backend logs show successful requests
- [ ] Bibliography displays correctly in Word

---

## 🔐 Security Notes

### Why Authentication is Critical:

1. **Data Privacy:** Prevents users from accessing other users' sources
2. **Authorization:** Ensures users can only format bibliographies for their own sources
3. **Audit Trail:** Tracks who is using the API
4. **Rate Limiting:** Can implement per-user rate limits

### Best Practices Applied:

✅ All API endpoints use `protect` middleware
✅ User validation in controllers as secondary check
✅ Error messages don't leak sensitive information
✅ Tokens stored securely in Office storage

---

## 📚 Related Documentation

- [Express Middleware Documentation](https://expressjs.com/en/guide/using-middleware.html)
- [JWT Authentication Best Practices](https://jwt.io/introduction)
- [Office Add-in Authentication](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/auth-external-add-ins)

---

## ✨ Status

- [x] Issue identified (missing authentication middleware)
- [x] Root cause analyzed (req.user undefined)
- [x] Fix implemented (added protect middleware)
- [x] Enhanced logging added (frontend & backend)
- [x] Code compiles without errors
- [ ] Manual testing required
- [ ] User acceptance testing required

---

## 💡 Prevention Tips

To avoid similar issues in the future:

1. **Route Template:**
   ```javascript
   // Always use this pattern for authenticated routes:
   router.post("/endpoint-name", protect, controllerFunction);
   ```

2. **Controller Template:**
   ```javascript
   const myController = asyncHandler(async (req, res) => {
     // Always validate user first
     if (!req.user || !req.user._id) {
       return res.status(401).json(new ApiResponse(401, null, "Authentication required"));
     }
     
     // ... rest of logic
   });
   ```

3. **Testing Checklist:**
   - [ ] Test without token (should get 401)
   - [ ] Test with invalid token (should get 401)
   - [ ] Test with valid token (should work)
   - [ ] Test with another user's data (should get 404 or 403)

4. **Code Review:**
   - Always check that protected routes have `protect` middleware
   - Verify `req.user` is validated before use
   - Ensure error responses are clear and secure

---

## 👥 Credits

**Fixed by:** AI Assistant  
**Date:** 2024  
**Issue Reporter:** User (Saeed)  
**Severity:** High (P1) - Blocks bibliography feature completely

---

## 🎉 Expected Outcome

After applying these fixes:

✅ Users can insert citations  
✅ Users can insert bibliographies (manual)  
✅ Auto-update bibliography works  
✅ Clear error messages if something fails  
✅ Proper authentication enforced  
✅ Detailed logs for debugging  
✅ No 500 errors  
✅ Improved security and error handling