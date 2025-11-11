# Fix Summary: Format Citation Endpoint 500 Error

**Date:** January 2025  
**Issue:** `POST /api/v1/export/format-citation` returning errors and incorrect response format  
**Status:** ✅ RESOLVED

---

## Problem Summary

The Word Add-in was experiencing multiple issues when calling the format citation endpoint:

1. **Initial Error:** `ERR_CONNECTION_REFUSED` - Server was not running
2. **Response Format Error:** Response didn't have expected `success` or `status` fields
3. **Double JSON Parsing:** Client code was trying to parse JSON twice

### Symptoms

```javascript
// Console output from Add-in
api.ts:97 API Response received: 
{
  success: undefined, 
  hasData: false, 
  message: undefined, 
  statusCode: undefined, 
  url: 'https://localhost:5000/api/v1/export/format-citation'
}

api.ts:146 Response doesn't have 'success' or 'status' field, 
            assuming direct data response
```

---

## Root Causes

### 1. Server Not Running
The most immediate issue was that the backend server wasn't running, causing `ERR_CONNECTION_REFUSED`.

**Solution:** Start the server with `npm run dev` in the `fishchi-app/server` directory.

---

### 2. Incorrect ApiResponse Implementation

**File:** `fishchi-app/server/src/utils/apiResponse.js`

**Problem:** The `ApiResponse` class only had static methods, but the controller was using it as a constructor:

```javascript
// Controller was doing this:
return res.status(200).json(
  new ApiResponse(200, responseData, "Citation formatted successfully")
);

// But ApiResponse only had static methods:
class ApiResponse {
  static success(res, data, message, statusCode = 200) { ... }
  static fail(res, data, statusCode = 400) { ... }
  static error(res, message, statusCode = 500) { ... }
}
```

**Result:** `new ApiResponse(...)` was creating an object with constructor parameters as properties, but wasn't returning the expected JSON structure with `success`, `status`, `data`, and `message` fields.

**Fix Applied:**

```javascript
// Added constructor to ApiResponse class
class ApiResponse {
  constructor(statusCode, data, message = "") {
    this.statusCode = statusCode;
    this.success = statusCode >= 200 && statusCode < 300;
    this.status = this.success
      ? "success"
      : statusCode >= 400 && statusCode < 500
        ? "fail"
        : "error";
    this.data = data;
    this.message = message;
  }
  
  // Static methods remain for backward compatibility
  static success(res, data, message = "", statusCode = 200) { ... }
  static fail(res, data, message = "Request failed", statusCode = 400) { ... }
  static error(res, message, statusCode = 500) { ... }
}
```

Now the response structure is consistent:
```json
{
  "statusCode": 200,
  "success": true,
  "status": "success",
  "data": {
    "sourceId": "...",
    "style": "apa",
    "inText": "(Doe, 2025)",
    "bibliography": "Doe, J. (2025). Title..."
  },
  "message": "Citation formatted successfully"
}
```

---

### 3. Double JSON Parsing in Client

**File:** `Fishchi-addin/src/taskpane/services/api.ts`

**Problem:** The `apiFormatCitation` function was calling `response.json()` on data that was already parsed by `authenticatedFetch`:

```typescript
// BEFORE (incorrect):
export async function apiFormatCitation(
  request: FormatCitationRequest
): Promise<FormattedCitation> {
  const response = await authenticatedFetch(
    `${API_V1_URL}/export/format-citation`,
    { method: "POST", body: JSON.stringify(request) }
  );
  
  // ❌ authenticatedFetch already returned unwrapped data,
  //    but we're trying to call .json() on it again
  const apiResponse: ApiResponse<FormattedCitation> = await response.json();
  
  if (apiResponse.success && apiResponse.data !== undefined) {
    return apiResponse.data;
  }
}
```

**Why This Failed:**
- `authenticatedFetch` internally calls `response.json()`, unwraps the `ApiResponse` wrapper, and returns just the `data` field
- Trying to call `.json()` on already-parsed data throws an error or returns undefined

**Fix Applied:**

```typescript
// AFTER (correct):
export async function apiFormatCitation(
  request: FormatCitationRequest
): Promise<FormattedCitation> {
  // authenticatedFetch already unwraps the ApiResponse and returns data directly
  const data = await authenticatedFetch(`${API_V1_URL}/export/format-citation`, {
    method: "POST",
    body: JSON.stringify(request),
  });
  
  // The data is already unwrapped, just return it
  return data as FormattedCitation;
}
```

---

## Response Flow

### Server Side (Correct Flow)

```javascript
// In export.controller.js
const responseData = {
  sourceId: sourceId,
  style: style,
  inText: inText,
  bibliography: bibliography,
};

// Creates proper ApiResponse structure
return res.status(200).json(
  new ApiResponse(200, responseData, "Citation formatted successfully")
);

// Sends to client:
{
  "statusCode": 200,
  "success": true,
  "status": "success",
  "data": { sourceId, style, inText, bibliography },
  "message": "Citation formatted successfully"
}
```

### Client Side (Correct Flow)

```typescript
// 1. authenticatedFetch receives response
const response = await fetch(url, options);

// 2. Parses JSON
const apiResponse = await response.json();
// apiResponse = { success: true, status: "success", data: {...}, ... }

// 3. Checks status/success field and unwraps data
if (apiResponse.success !== undefined) {
  return apiResponse.data; // Returns just the data object
}

// 4. apiFormatCitation receives unwrapped data
const data = await authenticatedFetch(...);
// data = { sourceId, style, inText, bibliography }

// 5. Returns to caller
return data as FormattedCitation;
```

---

## Files Modified

### 1. `fishchi-app/server/src/utils/apiResponse.js`
- ✅ Added constructor to support `new ApiResponse(statusCode, data, message)`
- ✅ Constructor sets `success`, `status`, `statusCode`, `data`, and `message` fields
- ✅ Maintains backward compatibility with static methods

### 2. `Fishchi-addin/src/taskpane/services/api.ts`
- ✅ Fixed `apiFormatCitation` to not double-parse JSON
- ✅ Now correctly handles already-unwrapped data from `authenticatedFetch`

---

## Testing

### Test with curl (Test Endpoint - No Auth Required)

```bash
curl -X POST https://localhost:5000/api/v1/export/format-citation-test \
  -H "Content-Type: application/json" \
  -d '{"sourceId":"YOUR_SOURCE_ID","style":"apa"}' \
  -k
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "status": "success",
  "data": {
    "sourceId": "...",
    "style": "apa",
    "inText": "(Author, Year)",
    "bibliography": "Author, A. (Year). Title..."
  },
  "message": "Citation formatted successfully (test)"
}
```

### Test with Authentication

```bash
curl -X POST https://localhost:5000/api/v1/export/format-citation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"sourceId":"YOUR_SOURCE_ID","style":"apa"}' \
  -k
```

### Test from Word Add-in

1. Ensure server is running: `cd fishchi-app/server && npm run dev`
2. Ensure Add-in is running: `cd Fishchi-addin && npm start`
3. Open Word and load the Add-in
4. Select a source and click "Insert Citation"
5. Citation should be inserted successfully

---

## Verification Checklist

- [x] Server starts without errors
- [x] ApiResponse constructor creates correct JSON structure
- [x] Response includes all required fields: `success`, `status`, `statusCode`, `data`, `message`
- [x] Client `authenticatedFetch` correctly parses and unwraps response
- [x] `apiFormatCitation` returns properly typed `FormattedCitation` object
- [x] Test endpoint works without authentication
- [x] Production endpoint works with authentication
- [x] No more "Response doesn't have 'success' or 'status' field" warnings

---

## Additional Improvements Made

### 1. Diagnostic Scripts

Created helpful debugging tools:

- **`fishchi-app/server/test-format-citation-addin.js`**  
  Simulates Add-in requests and shows detailed response analysis

- **`fishchi-app/server/test-list-sources.js`**  
  Lists all sources in database with test commands

- **`Fishchi-addin/diagnostic-connection.js`**  
  Tests connectivity from client side

### 2. Documentation

- **`Fishchi-addin/TROUBLESHOOTING-CONNECTION.md`**  
  Comprehensive guide for debugging connection issues

---

## Common Pitfalls to Avoid

1. **Don't call `.json()` on already-parsed data**
   - `authenticatedFetch` returns unwrapped data, not a Response object

2. **Ensure ApiResponse structure is consistent**
   - Always include: `success`, `status`, `statusCode`, `data`, `message`

3. **Check server is running before debugging client**
   - Use `curl -k https://localhost:5000/health` to verify

4. **Use test endpoints for quick debugging**
   - `/format-citation-test` doesn't require authentication

---

## Production Deployment Notes

Before deploying to production:

- ✅ Ensure all endpoints use proper authentication middleware
- ✅ Remove or protect test endpoints (e.g., `/format-citation-test`)
- ✅ Use HTTPS with valid SSL certificates (not self-signed)
- ✅ Update CORS settings to allow only production domains
- ✅ Set appropriate environment variables (`HTTP_MODE=false`, proper `CLIENT_URL`)

---

## Related Issues

This fix also resolves:
- Response structure inconsistencies across the API
- TypeScript type mismatches in client code
- Certificate trust issues documentation (see TROUBLESHOOTING-CONNECTION.md)

---

## Questions or Issues?

If you encounter problems:

1. **Check server logs** for detailed error messages
2. **Use diagnostic scripts** to isolate the issue
3. **Verify response structure** matches expected format
4. **Check authentication token** is valid and not expired

For certificate/connection issues, see: `TROUBLESHOOTING-CONNECTION.md`

---

**Status:** ✅ Issue Resolved  
**Next Steps:** Test in production environment with real user data