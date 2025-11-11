# Debugging Login Issues - Fishchi Word Add-in

This guide will help you debug login and authentication issues, particularly the error:
**"AuthProvider: Login process failed. API request failed but reported success"**

## Table of Contents
1. [Understanding the Error](#understanding-the-error)
2. [Quick Diagnostics](#quick-diagnostics)
3. [Step-by-Step Debugging](#step-by-step-debugging)
4. [Common Issues & Solutions](#common-issues--solutions)
5. [Server-Side Checklist](#server-side-checklist)
6. [Network Debugging](#network-debugging)

---

## Understanding the Error

The error "API request failed but reported success" occurs when:
- The API returns `success: true` but the `data` field is `undefined` or `null`
- The API response doesn't match the expected `ApiResponse<T>` structure
- The server returns an unexpected response format

### Expected API Response Format

Your server should return responses in this format:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User profile retrieved successfully",
  "data": {
    "_id": "user123",
    "username": "john_doe",
    "email": "john@example.com",
    "avatar": "/uploads/avatars/user123.jpg"
  }
}
```

### What the Code Does

1. User clicks "Login" → Opens dialog → Gets token
2. Token is stored in `OfficeRuntime.storage`
3. Code calls `apiGetSelfProfile(token)` with the new token
4. The function tries two endpoints:
   - Primary: `GET /api/v1/users/me`
   - Fallback: `GET /api/v1/users/profile`
5. Response is unwrapped and validated
6. Profile is saved to React state

---

## Quick Diagnostics

### Open Browser Console

In Word:
1. Open the task pane
2. Right-click inside the task pane → **Inspect**
3. Go to the **Console** tab

### Check What You See

Look for these log messages:

```
✅ GOOD - Working Flow:
AuthProvider: Step 1 - Opening login dialog...
AuthProvider: Step 1 - Token received: Yes (length: 147)
AuthProvider: Step 2 - Storing token...
AuthProvider: Step 2 - Token stored successfully
AuthProvider: Step 3 - Fetching user profile...
Attempting to fetch profile from /users/me
API Response received: {success: true, hasData: true, ...}
Profile response from /users/me: {_id: "...", username: "...", ...}
AuthProvider: Step 3 - Profile received: {_id: "...", ...}
AuthProvider: Login successful! john_doe

❌ BAD - Error Flow:
AuthProvider: Step 3 - Fetching user profile...
Attempting to fetch profile from /users/me
API Response received: {success: true, hasData: false, ...}
API returned success=true but no data for: https://localhost:5000/api/v1/users/me
AuthProvider: Login process failed.
Error message: Profile is null or undefined
```

---

## Step-by-Step Debugging

### Step 1: Verify API Endpoint URLs

Check `src/taskpane/services/api.ts`:

```typescript
const API_V1_URL = "https://localhost:5000/api/v1";
```

**Action:** Make sure this matches your actual backend server URL.

### Step 2: Test API Endpoint Manually

Use Postman or curl to test the endpoint:

```bash
# Replace YOUR_TOKEN with an actual JWT token from your app
curl -X GET "https://localhost:5000/api/v1/users/me" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "...",
  "data": {
    "_id": "...",
    "username": "...",
    "email": "..."
  }
}
```

### Step 3: Check Token in Browser

In the browser console, check if token is stored:

```javascript
// Check if token exists
OfficeRuntime.storage.getItem("fishchi-token").then(token => {
  console.log("Stored token:", token ? "EXISTS" : "NOT FOUND");
  if (token) {
    console.log("Token length:", token.length);
    console.log("Token preview:", token.substring(0, 20) + "...");
  }
});
```

### Step 4: Manually Test API Call

In the browser console:

```javascript
// Test the API call directly
fetch("https://localhost:5000/api/v1/users/me", {
  headers: {
    "Authorization": "Bearer YOUR_TOKEN_HERE",
    "Content-Type": "application/json"
  }
})
.then(r => r.json())
.then(data => {
  console.log("Raw API Response:", data);
  console.log("Has success?", data.success);
  console.log("Has data?", data.data);
  console.log("Data type:", typeof data.data);
})
.catch(err => console.error("API Error:", err));
```

### Step 5: Check Network Tab

1. Open Developer Tools → **Network** tab
2. Try logging in
3. Look for the request to `/users/me` or `/users/profile`
4. Click on it and check:
   - **Headers** tab: Is `Authorization` header present?
   - **Response** tab: What does the server return?
   - **Status**: Is it 200 OK?

---

## Common Issues & Solutions

### Issue 1: Token Not Being Sent

**Symptoms:**
- API returns 401 Unauthorized
- Console shows: "Unauthorized request (401)"

**Solution:**
```typescript
// In api.ts, verify the Authorization header is added
if (token) {
  headers.append("Authorization", `Bearer ${token}`);
} else {
  console.error("No token available!");
}
```

**Fix:** Make sure `tokenOverride` is being passed to `apiGetSelfProfile()` in `AuthContext.tsx`.

---

### Issue 2: API Returns `data: null`

**Symptoms:**
- Console shows: "API returned success=true but no data"
- Server returns `{success: true, data: null}`

**Causes:**
1. User not found in database
2. Token is valid but user ID in token doesn't exist
3. Server-side bug in user lookup

**Solution:**
Check your server code:

```javascript
// In your user controller (server)
exports.getProfile = async (req, res) => {
  try {
    // Make sure req.user exists (from auth middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated"
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // IMPORTANT: Return data with the user object
    res.json({
      success: true,
      statusCode: 200,
      message: "Profile retrieved",
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

---

### Issue 3: Wrong Endpoint

**Symptoms:**
- Console shows: "Failed to fetch from /users/me, trying /users/profile"
- Both endpoints fail

**Solution:**
Check your server routes:

```javascript
// In your server routes file
router.get('/users/me', authMiddleware, userController.getProfile);
// OR
router.get('/users/profile', authMiddleware, userController.getProfile);
```

Make sure the endpoint exists and has the auth middleware!

---

### Issue 4: Response Structure Mismatch

**Symptoms:**
- Console shows: "Response doesn't have 'success' field"
- Server returns different format

**Server Returns This:**
```json
{
  "_id": "123",
  "username": "john",
  "email": "john@example.com"
}
```

**Solution A: Update server to wrap response**
```javascript
res.json({
  success: true,
  data: userObject  // Wrap it!
});
```

**Solution B: Update client to handle unwrapped responses**
```typescript
// In api.ts, the code already handles this:
if (apiResponse.success === undefined) {
  console.warn("Response doesn't have 'success' field, assuming direct data response");
  return apiResponse; // Return as-is
}
```

---

### Issue 5: CORS Errors

**Symptoms:**
- Console shows: "CORS policy: No 'Access-Control-Allow-Origin'"
- Network tab shows request failed

**Solution:**
In your server (Express):

```javascript
const cors = require('cors');

app.use(cors({
  origin: ['https://localhost:3500', 'https://localhost:3000'],
  credentials: true
}));
```

---

## Server-Side Checklist

### ✅ Verify These on Your Server:

1. **Authentication Middleware Works**
   ```javascript
   // Should decode JWT and attach user to req.user
   console.log("Auth middleware - User ID:", req.user?.id);
   ```

2. **User Endpoint Exists**
   ```bash
   # Check your routes
   GET /api/v1/users/me
   # OR
   GET /api/v1/users/profile
   ```

3. **Response Format is Correct**
   ```javascript
   {
     success: true,
     statusCode: 200,
     message: "Success",
     data: { /* user object */ }
   }
   ```

4. **Database Query Works**
   ```javascript
   const user = await User.findById(req.user.id);
   console.log("User found:", user ? "YES" : "NO");
   ```

5. **CORS Configured**
   ```javascript
   // Allow requests from Office add-in
   origin: ['https://localhost:3500']
   ```

6. **HTTPS Certificate Valid**
   ```bash
   # Office add-ins require HTTPS
   # Check certificate is not expired
   ```

---

## Network Debugging

### Enable Verbose Logging

Add this to your code temporarily:

```typescript
// In api.ts, at the top of authenticatedFetch
console.log("🔵 API Request:", {
  url: url,
  method: options.method || "GET",
  hasToken: !!token,
  tokenPreview: token?.substring(0, 20)
});

// After receiving response
console.log("🟢 API Response Status:", response.status, response.statusText);
console.log("🟢 API Response Body:", apiResponse);
```

### Use Network Tab Effectively

1. **Filter by URL:** Type "users" in the filter box
2. **Check Request Headers:**
   - `Authorization: Bearer eyJ...` should be present
3. **Check Response:**
   - Status should be `200 OK`
   - Response should have `{success: true, data: {...}}`
4. **Check Timing:**
   - If request takes too long, server might be timing out

---

## Testing Checklist

Before reporting a bug, verify:

- [ ] Backend server is running on correct port
- [ ] API endpoint URL is correct in `api.ts`
- [ ] Token is being stored after dialog closes
- [ ] Token is being retrieved and sent with request
- [ ] Server receives the token (check server logs)
- [ ] Server validates token successfully
- [ ] Server finds the user in database
- [ ] Server returns correct response format
- [ ] CORS is configured correctly
- [ ] HTTPS certificates are valid
- [ ] Browser console shows detailed logs
- [ ] Network tab shows the request/response

---

## Still Having Issues?

### Collect This Information:

1. **Console Logs** (all messages from AuthProvider)
2. **Network Request** (copy as cURL from Network tab)
3. **Network Response** (full JSON response)
4. **Server Logs** (what does your backend show?)
5. **Token Value** (first 20 characters only!)

### Example Debug Output:

```
Console:
AuthProvider: Step 3 - Fetching user profile...
Attempting to fetch profile from /users/me
🔵 API Request: {url: "https://localhost:5000/api/v1/users/me", ...}
🟢 API Response Status: 200 OK
🟢 API Response Body: {success: true, data: null, message: "..."}
API returned success=true but no data

Network Response:
{
  "success": true,
  "statusCode": 200,
  "message": "Profile retrieved",
  "data": null  <-- THIS IS THE PROBLEM
}

Server Logs:
[AUTH] Token validated for user ID: 507f1f77bcf86cd799439011
[DB] User query: User.findById('507f1f77bcf86cd799439011')
[DB] User found: null  <-- THIS IS THE PROBLEM
```

With this information, you can pinpoint exactly where the flow breaks!

---

## Quick Fixes Summary

| Error | Quick Fix |
|-------|-----------|
| "No token found" | Check dialog polling, verify session ID |
| "401 Unauthorized" | Check token format, verify Authorization header |
| "data is null" | Check server user lookup, verify user exists in DB |
| "Profile is null or undefined" | Check server response structure |
| "CORS error" | Add add-in URL to CORS whitelist |
| "success field missing" | Wrap server response in ApiResponse format |

---

**Last Updated:** 2024
**Version:** 1.0