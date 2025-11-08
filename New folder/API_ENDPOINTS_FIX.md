# API Endpoints Fix - Sources and Notes

## 🐛 Problem Description

After successful login, the add-in was getting **404 errors** when trying to fetch sources and notes:

```
Failed to load resource: the server responded with a status of 404 (Not Found)
https://localhost:5000/api/v1/sources/project/68f3da6f1394573cdd278c2e

No sources found for project 68f3da6f1394573cdd278c2e (404), returning empty array
```

Even though the user had projects with sources and notes, nothing would display in the add-in.

---

## 🔍 Root Cause

**The add-in was using the wrong endpoint pattern.**

### What Was Wrong

The add-in code was calling endpoints with **path parameters**:
- ❌ `GET /api/v1/sources/project/:projectId`
- ❌ `GET /api/v1/notes/source/:sourceId`

### What the Server Actually Expects

The server uses **query parameters** for filtering:
- ✅ `GET /api/v1/sources?projectId=...`
- ✅ `GET /api/v1/notes?projectId=...&sourceId=...`

**Why?** The server's design allows for more flexible filtering:
- Pagination support
- Multiple filter criteria
- Search functionality
- Sorting options

---

## ✅ Solution

Updated the API service to use the correct endpoint patterns with query parameters.

### Changes Made

**File:** `src/taskpane/services/api.ts`

#### 1. Sources Endpoint

**Before:**
```typescript
export async function apiGetSourcesByProject(projectId: string): Promise<Source[]> {
  const response = await authenticatedFetch(
    `${API_V1_URL}/sources/project/${projectId}`
  );
  return response;
}
```

**After:**
```typescript
export async function apiGetSourcesByProject(projectId: string): Promise<Source[]> {
  const response = await authenticatedFetch(
    `${API_V1_URL}/sources?projectId=${projectId}`
  );
  
  // Handle paginated response: { sources: [...], pagination: {...}, ... }
  if (isValidObject(response) && response.sources !== undefined) {
    return response.sources;
  }
  
  // Fallback for direct array response
  if (isValidArray(response)) {
    return response;
  }
  
  throw new Error("Invalid response format");
}
```

#### 2. Notes Endpoint

**Before:**
```typescript
export async function apiGetNotesBySource(sourceId: string): Promise<Note[]> {
  const response = await authenticatedFetch(
    `${API_V1_URL}/notes/source/${sourceId}`
  );
  return response;
}
```

**After:**
```typescript
export async function apiGetNotesBySource(
  projectId: string, 
  sourceId: string
): Promise<Note[]> {
  const response = await authenticatedFetch(
    `${API_V1_URL}/notes?projectId=${projectId}&sourceId=${sourceId}`
  );
  return response;
}
```

**Note:** The notes endpoint **requires** both `projectId` and `sourceId` as query parameters.

---

## 📊 Response Format Handling

### Sources API Response

The sources endpoint returns a **paginated response**:

```json
{
  "status": "success",
  "data": {
    "sources": [
      {
        "_id": "...",
        "title": "...",
        "authors": [...],
        "year": 2024
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 50,
      "hasNextPage": true,
      "hasPrevPage": false,
      "limit": 10
    },
    "search": {...},
    "sort": {...}
  }
}
```

**The fix:**
- Unwraps the outer `data` field (handled by `authenticatedFetch`)
- Extracts the `sources` array from the paginated response
- Returns only the sources array to the component

### Notes API Response

The notes endpoint returns a **direct array**:

```json
{
  "status": "success",
  "data": [
    {
      "_id": "...",
      "content": "<p>فیش محتوا</p>",
      "project": "...",
      "source": "..."
    }
  ]
}
```

**The fix:**
- Unwraps the outer `data` field (handled by `authenticatedFetch`)
- Returns the notes array directly

---

## 🔧 Component Updates

**File:** `src/taskpane/components/MainWorkspace.tsx`

### Updated Notes Fetching

**Before:**
```typescript
const fetchedNotes = await apiGetNotesBySource(selectedSourceId);
```

**After:**
```typescript
const fetchedNotes = await apiGetNotesBySource(selectedProjectId, selectedSourceId);
```

**Why:** The notes API requires both `projectId` (for ownership verification) and `sourceId` (for filtering).

### Updated Dependencies

**Before:**
```typescript
React.useEffect(() => {
  // ...
  fetchNotes();
}, [selectedSourceId]);
```

**After:**
```typescript
React.useEffect(() => {
  if (!selectedSourceId || !selectedProjectId) {
    setNotes([]);
    return;
  }
  fetchNotes();
}, [selectedSourceId, selectedProjectId]);
```

**Why:** Both IDs are now required, so both should trigger a re-fetch.

---

## 📋 API Endpoint Reference

### Complete Endpoint List

| Endpoint | Method | Parameters | Returns |
|----------|--------|------------|---------|
| `/api/v1/projects` | GET | - | Array of projects |
| `/api/v1/sources` | GET | `?projectId=...` | Paginated sources |
| `/api/v1/notes` | GET | `?projectId=...&sourceId=...` | Array of notes |
| `/api/v1/users/profile` | GET | - | User profile |
| `/api/v1/users/me` | GET | - | User profile (alt) |

### Query Parameters for Sources

Optional parameters for filtering and pagination:

```typescript
GET /api/v1/sources?projectId=xxx&page=1&limit=10&sortBy=title&sortOrder=asc&search=...
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `projectId` | string | Yes | - | Filter by project |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 10 | Items per page |
| `sortBy` | string | No | createdAt | Sort field |
| `sortOrder` | string | No | desc | Sort direction |
| `search` | string | No | - | Search query |
| `searchFields` | string | No | title,authors,tags,year | Fields to search |

**Note:** The add-in currently only uses `projectId` parameter. Future enhancements could add pagination and search.

### Query Parameters for Notes

```typescript
GET /api/v1/notes?projectId=xxx&sourceId=yyy
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | string | Yes | Project ID (for ownership check) |
| `sourceId` | string | No | Filter notes by source |

---

## 🧪 Testing

### Verify the Fix

1. **Login to the add-in**
   - Should see your username in the header

2. **Select a project**
   - Dropdown should show all your projects
   - Select one with sources

3. **View sources**
   - Sources tab should display all sources in the project
   - No 404 errors in console
   - Console should show: `Retrieved X sources for project...`

4. **Click on a source**
   - Should fetch notes for that source
   - Should automatically switch to "فیش‌ها" tab
   - Notes count should update in tab label

5. **Click on a note**
   - Should insert the note content into Word document

### Expected Console Output

```
✅ Good - Should see:
API Response received: {success: undefined, hasData: true, ...}
Server uses 'status' field instead of 'success'
Unwrapping 'data' field from response
Retrieved 5 sources for project 68f3da6f1394573cdd278c2e
[Notes API call]
API Response received: {success: undefined, hasData: true, ...}
Retrieved 3 notes for source 68f562cfae5d9ef2d5332cfb
```

### Should NOT See

```
❌ Bad - These should NOT appear:
Failed to load resource: 404 (Not Found)
No sources found for project ... (404)
No notes found for source ... (404)
```

---

## 🔄 Migration Notes

### No Breaking Changes

This fix is **backwards compatible** because:
- ✅ The old endpoints never worked (always returned 404)
- ✅ No data loss or migration needed
- ✅ No changes to data models or types
- ✅ Fallback handling for different response formats

### Deployment

1. **Rebuild the add-in:**
   ```bash
   npm run build:dev
   ```

2. **Refresh in Word:**
   - Close and reopen the task pane
   - Or hard refresh: Ctrl+Shift+R

3. **Test with real data:**
   - Ensure projects have sources and notes in the web app
   - Verify all data displays correctly in the add-in

---

## 📈 Impact

### Before Fix
- ❌ Sources never loaded (404 errors)
- ❌ Notes never loaded (404 errors)
- ❌ Add-in was essentially non-functional
- ❌ Users couldn't access their data

### After Fix
- ✅ Sources load correctly
- ✅ Notes load correctly
- ✅ Proper pagination handling
- ✅ Full functionality restored
- ✅ Users can insert notes into Word

---

## 💡 Why Query Parameters?

The server uses query parameters for several good reasons:

1. **Flexibility:** Easy to add new filters without changing routes
2. **Optional Filters:** Can filter by multiple criteria (project + search + tags)
3. **Pagination:** Built-in support for `page` and `limit` parameters
4. **RESTful:** Query parameters are standard for filtering collections
5. **Caching:** Easier to cache different filter combinations

### Path Parameters vs Query Parameters

**Path Parameters** (for resource identification):
```
GET /api/v1/sources/:id        ← Get a specific source by ID
GET /api/v1/projects/:id       ← Get a specific project by ID
```

**Query Parameters** (for filtering collections):
```
GET /api/v1/sources?projectId=xxx     ← Filter sources by project
GET /api/v1/notes?sourceId=xxx        ← Filter notes by source
```

---

## 🎯 Future Enhancements

Consider implementing these features:

### 1. Pagination Support
```typescript
export async function apiGetSourcesByProject(
  projectId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ sources: Source[]; pagination: PaginationInfo }> {
  const response = await authenticatedFetch(
    `${API_V1_URL}/sources?projectId=${projectId}&page=${page}&limit=${limit}`
  );
  return response;
}
```

### 2. Search Functionality
```typescript
export async function apiSearchSources(
  projectId: string,
  searchQuery: string
): Promise<Source[]> {
  const response = await authenticatedFetch(
    `${API_V1_URL}/sources?projectId=${projectId}&search=${encodeURIComponent(searchQuery)}`
  );
  return response.sources;
}
```

### 3. Sorting Options
```typescript
export async function apiGetSortedSources(
  projectId: string,
  sortBy: 'title' | 'year' | 'createdAt',
  sortOrder: 'asc' | 'desc'
): Promise<Source[]> {
  const response = await authenticatedFetch(
    `${API_V1_URL}/sources?projectId=${projectId}&sortBy=${sortBy}&sortOrder=${sortOrder}`
  );
  return response.sources;
}
```

---

## 📝 Summary

**Bug:** Wrong endpoint patterns causing 404 errors for sources and notes

**Fix:** Updated API calls to use query parameters instead of path parameters

**Files Changed:**
- `src/taskpane/services/api.ts` - Updated endpoint URLs and response handling
- `src/taskpane/components/MainWorkspace.tsx` - Pass projectId to notes API

**Result:** Sources and notes now load correctly, add-in is fully functional

**Status:** ✅ Fixed and tested

---

**Bug ID:** #15  
**Priority:** Critical  
**Severity:** High  
**Fixed:** January 2025