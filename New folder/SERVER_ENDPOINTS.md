# Server Endpoints Reference - Fishchi Word Add-in

This document lists all the API endpoints that the Fishchi Word Add-in expects to be available on your backend server.

## 📍 Base URL

**Development:** `https://localhost:5000/api/v1`  
**Configure in:** `src/taskpane/services/api.ts` (line 22)

---

## 🔐 Authentication Endpoints

### 1. Poll Login Status
**Endpoint:** `GET /api/v1/auth/poll-login/{sessionId}`  
**Used by:** `src/taskpane/services/authService.ts`

**Request:**
```
GET https://localhost:5000/api/v1/auth/poll-login/{sessionId}
```

**Expected Response (while waiting):**
```json
{
  "status": "success",
  "message": "Login pending",
  "data": {
    "token": null
  }
}
```

**Expected Response (when ready):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 👤 User Endpoints

### 2. Get User Profile
**Endpoint:** `GET /api/v1/users/me` (primary) or `GET /api/v1/users/profile` (fallback)  
**Authentication:** Required (Bearer token)  
**Used by:** Login flow to validate token

**Request:**
```
GET https://localhost:5000/api/v1/users/profile
Authorization: Bearer {token}
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Profile retrieved",
  "data": {
    "_id": "68f3b00b1fa931e649d461b1",
    "name": "کاربر تست",
    "email": "testEmail1@gmail.com",
    "avatar": null,
    "university": null,
    "fieldOfStudy": null,
    "degree": null,
    "bio": null,
    "createdAt": "2025-10-18T15:19:39.953Z"
  }
}
```

**Note:** The add-in will automatically convert `name` to `username` for compatibility.

---

## 📁 Project Endpoints

### 3. Get All Projects
**Endpoint:** `GET /api/v1/projects`  
**Authentication:** Required  
**Used by:** Main workspace to populate project dropdown

**Request:**
```
GET https://localhost:5000/api/v1/projects
Authorization: Bearer {token}
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "لیست پروژه ها با موفقیت دریافت شد",
  "data": [
    {
      "_id": "68f3da6f1394573cdd278c2e",
      "name": "پروژه تست",
      "description": "توضیحات پروژه",
      "user": "68f3b00b1fa931e649d461b1",
      "createdAt": "2025-10-18T16:45:35.123Z",
      "updatedAt": "2025-10-18T16:45:35.123Z"
    }
  ]
}
```

**If no projects:**
```json
{
  "status": "success",
  "message": "No projects found",
  "data": []
}
```

---

## 📚 Source Endpoints

### 4. Get Sources by Project
**Endpoint:** `GET /api/v1/sources/project/{projectId}`  
**Authentication:** Required  
**Used by:** Main workspace when a project is selected

⚠️ **CURRENT ISSUE:** This endpoint returns 404. Please verify the correct endpoint path.

**Expected Request:**
```
GET https://localhost:5000/api/v1/sources/project/68f3da6f1394573cdd278c2e
Authorization: Bearer {token}
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Sources retrieved",
  "data": [
    {
      "_id": "source123",
      "project": "68f3da6f1394573cdd278c2e",
      "user": "68f3b00b1fa931e649d461b1",
      "type": "book",
      "title": "عنوان کتاب",
      "authors": [
        {
          "firstName": "نام",
          "lastName": "نام خانوادگی"
        }
      ],
      "year": "2023",
      "publisher": "نام ناشر",
      "createdAt": "2025-10-18T16:45:35.123Z",
      "updatedAt": "2025-10-18T16:45:35.123Z"
    }
  ]
}
```

**If no sources:**
```json
{
  "status": "success",
  "message": "No sources found",
  "data": []
}
```

**Possible Alternative Endpoints:**
- `GET /api/v1/sources?projectId={projectId}`
- `GET /api/v1/projects/{projectId}/sources`
- `GET /api/v1/source/project/{projectId}` (singular)

---

## 📝 Note Endpoints

### 5. Get Notes by Source
**Endpoint:** `GET /api/v1/notes/source/{sourceId}`  
**Authentication:** Required  
**Used by:** Main workspace when a source is clicked

**Expected Request:**
```
GET https://localhost:5000/api/v1/notes/source/source123
Authorization: Bearer {token}
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Notes retrieved",
  "data": [
    {
      "_id": "note123",
      "source": "source123",
      "project": "68f3da6f1394573cdd278c2e",
      "user": "68f3b00b1fa931e649d461b1",
      "content": "<p>محتوای فیش به صورت HTML</p>",
      "tags": ["تگ1", "تگ2"],
      "createdAt": "2025-10-18T16:45:35.123Z",
      "updatedAt": "2025-10-18T16:45:35.123Z"
    }
  ]
}
```

**If no notes:**
```json
{
  "status": "success",
  "message": "No notes found",
  "data": []
}
```

**Possible Alternative Endpoints:**
- `GET /api/v1/notes?sourceId={sourceId}`
- `GET /api/v1/sources/{sourceId}/notes`
- `GET /api/v1/note/source/{sourceId}` (singular)

---

## 📋 Response Format Requirements

### Standard Success Response
```json
{
  "status": "success",
  "message": "Descriptive message",
  "data": { /* actual data here */ }
}
```

### Standard Error Response
```json
{
  "status": "error",
  "message": "Error description",
  "data": null
}
```

### Alternative Format (Also Supported)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success message",
  "data": { /* actual data here */ }
}
```

---

## 🔍 How to Check Your Server Endpoints

### Method 1: Check Server Routes File
Look for your routes definition file (e.g., `routes/source.routes.js`):

```javascript
// Example of what to look for
router.get('/project/:projectId', authMiddleware, sourceController.getByProject);
// or
router.get('/sources/project/:projectId', authMiddleware, sourceController.getByProject);
```

### Method 2: Test with curl
```bash
# Get your token first (from browser DevTools console)
TOKEN="your-jwt-token-here"

# Test sources endpoint
curl -X GET "https://localhost:5000/api/v1/sources/project/68f3da6f1394573cdd278c2e" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Method 3: Check Server Logs
When the 404 error occurs, check your server console to see:
- Was the request received?
- What route path was requested?
- What routes are registered?

---

## 🐛 Common Issues & Solutions

### Issue 1: 404 Not Found (Current Issue)
**Symptom:** `GET /api/v1/sources/project/{id} 404`

**Possible Causes:**
1. Endpoint path is different (e.g., `/source/` instead of `/sources/`)
2. Route not registered in server
3. Missing `:projectId` parameter definition
4. Wrong HTTP method (GET vs POST)

**How to Fix:**
1. Check your server routes file
2. Update the endpoint in `api.ts` to match your server
3. Or update your server to match the expected endpoint

**Example Fix in Add-in:**
```typescript
// In src/taskpane/services/api.ts, line 168
export async function apiGetSourcesByProject(projectId: string): Promise<Source[]> {
  // Change this line to match your server:
  const response = await authenticatedFetch(`${API_V1_URL}/source/project/${projectId}`);
  // Or whatever your actual endpoint is
}
```

### Issue 2: CORS Error
**Solution:** Enable CORS for `https://localhost:3500` in your server:
```javascript
app.use(cors({
  origin: ['https://localhost:3500', 'https://localhost:3000'],
  credentials: true
}));
```

### Issue 3: 401 Unauthorized
**Solution:** Check that the Authorization header is being sent with the token

### Issue 4: Response Format Mismatch
**Solution:** The add-in now supports multiple formats, but ensure your server returns either:
- `{status: "success", data: {...}}`
- `{success: true, data: {...}}`

---

## ✅ Endpoint Checklist

Use this to verify your server has all required endpoints:

- [x] `GET /api/v1/auth/poll-login/{sessionId}` - Working
- [x] `GET /api/v1/users/profile` - Working
- [x] `GET /api/v1/projects` - Working
- [ ] `GET /api/v1/sources/project/{projectId}` - **Returns 404 - NEEDS FIX**
- [ ] `GET /api/v1/notes/source/{sourceId}` - Not yet tested

---

## 🔧 Quick Fix for Sources Endpoint

### Option A: Update Server (Recommended)
Add this route to your server:
```javascript
// In your routes file
router.get('/sources/project/:projectId', authMiddleware, async (req, res) => {
  try {
    const sources = await Source.find({ 
      project: req.params.projectId,
      user: req.user.id 
    });
    
    res.json({
      status: "success",
      message: "Sources retrieved",
      data: sources
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});
```

### Option B: Update Add-in
If your endpoint is at a different path, update `api.ts`:
```typescript
// Line 168 in src/taskpane/services/api.ts
const response = await authenticatedFetch(`${API_V1_URL}/YOUR_ACTUAL_PATH/${projectId}`);
```

---

## 📞 Need Help?

1. Check server logs when 404 occurs
2. Use `curl` to test endpoints manually
3. Check Network tab in DevTools to see exact request URL
4. Verify route is registered in server
5. Check if authentication middleware is applied

---

**Last Updated:** 2025  
**Status:** Profile & Projects working ✅ | Sources endpoint needs attention ⚠️