# Testing Guide: Infinite Refresh Bug Fix

This guide will help you verify that the infinite refresh bug in the MainWorkspace component has been fixed.

## 📋 Prerequisites

Before testing, ensure you have:

- [ ] Node.js and npm installed
- [ ] Word Desktop or Word Online available
- [ ] Backend API server running at `https://localhost:5000`
- [ ] Valid user account with login credentials
- [ ] Browser DevTools or Office Add-in debugger access

## 🚀 Setup Steps

### 1. Install Dependencies
```bash
cd Fishchi-addin
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Start the Dev Server
```bash
npm run dev-server
```

### 4. Sideload the Add-in
- **Word Desktop:** Run `npm run start:desktop`
- **Word Online:** Run `npm run start:web`

## ✅ Test Case 1: Initial Login Flow

### Steps:
1. Open Word and launch the Fishchi add-in
2. You should see the login screen
3. Click the login button
4. Complete authentication in the dialog
5. Wait for MainWorkspace to load

### Expected Behavior:
- ✅ Login dialog opens successfully
- ✅ After authentication, MainWorkspace loads **ONCE**
- ✅ You see the user avatar and username in the header
- ✅ Project dropdown is populated
- ✅ Sources list loads for the default project
- ✅ **NO FLICKERING or constant reloading**
- ✅ UI remains stable and interactive

### Console Log Pattern (Success):
```
AuthProvider: Token validated. User is logged in: <username>
App: Showing MainWorkspace for user: <username>
MainWorkspace: Component mounted
MainWorkspace: fetchProjects started
MainWorkspace: Projects loaded: X
MainWorkspace: Sources loaded: Y
```

### ❌ If You See This (BUG NOT FIXED):
```
App: Render #1
App: Render #2
App: Render #3
...
⚠️ WARNING: Too many renders detected! Possible infinite loop.
```

---

## ✅ Test Case 2: Project Selection

### Steps:
1. After successful login, open the "انتخاب پروژه" dropdown
2. Select a different project
3. Observe the sources list update

### Expected Behavior:
- ✅ Dropdown opens smoothly
- ✅ Selecting a project updates the sources list
- ✅ Component does NOT fully reload
- ✅ Only the sources section shows a loading spinner briefly
- ✅ Notes list clears (expected behavior)
- ✅ No infinite refresh loop

### Console Log Pattern:
```
MainWorkspace: Project changed to: <project_id>
MainWorkspace: Fetching sources for project: <project_id>
MainWorkspace: Sources loaded: X
```

---

## ✅ Test Case 3: Manual Refresh

### Steps:
1. Click the refresh button (⟳) in the header
2. Wait for data to reload

### Expected Behavior:
- ✅ Refresh button shows a spinner while loading
- ✅ All data (projects, sources, citations) refreshes
- ✅ Refresh completes successfully
- ✅ **NO INFINITE LOOP** after refresh
- ✅ UI returns to stable state

### Console Log Pattern:
```
MainWorkspace: Refreshing data...
MainWorkspace: Projects loaded: X
MainWorkspace: Sources loaded: Y
MainWorkspace: Citations scanned: Z
MainWorkspace: Refresh complete
```

---

## ✅ Test Case 4: Source Selection and Notes

### Steps:
1. From the sources list, click on any source
2. Wait for notes to load
3. Tab should automatically switch to "فیش‌ها"

### Expected Behavior:
- ✅ Source is highlighted
- ✅ Notes load and display
- ✅ Tab switches automatically to notes view
- ✅ No component-wide refresh
- ✅ "درج استناد" button is functional

---

## ✅ Test Case 5: Citation Insertion

### Steps:
1. Select a source from the list
2. Click "درج استناد" button
3. Observe the Word document

### Expected Behavior:
- ✅ Citation is inserted at cursor position
- ✅ Bibliography auto-updates (if enabled)
- ✅ Button shows loading state briefly
- ✅ **NO COMPONENT REFRESH** after insertion
- ✅ Source count updates: "X منبع استناد شده"

---

## ✅ Test Case 6: Session Persistence

### Steps:
1. Successfully log in and load MainWorkspace
2. Close the taskpane
3. Reopen the taskpane

### Expected Behavior:
- ✅ MainWorkspace loads directly (no login required)
- ✅ Previous project selection is maintained
- ✅ No infinite loop on reload
- ✅ Citation tracking is preserved

---

## 🔍 Debugging Checklist

If you encounter issues, check the following:

### Browser Console (F12)

Look for these indicators:

#### ✅ Healthy System:
```
- Render count stays low (< 10 renders on mount)
- No "Too many renders" warnings
- Clear API responses logged
- "Profile validation passed!" message
```

#### ❌ Problem Indicators:
```
- Render count exceeds 50
- "WARNING: Too many renders detected!"
- "Profile validation failed"
- Repeating fetch requests in Network tab
```

### Network Tab

#### ✅ Expected Pattern:
```
1. GET /api/v1/users/me (or /users/profile) - Once on login
2. GET /api/v1/projects - Once on mount
3. GET /api/v1/sources?projectId=... - Once per project change
```

#### ❌ Problem Pattern:
```
- Same requests repeating every second
- Constant 401 errors
- Profile endpoint called repeatedly
```

### React DevTools Profiler

If you have React DevTools installed:

1. Open DevTools → Profiler tab
2. Click "Record"
3. Log in and wait 10 seconds
4. Stop recording

#### ✅ Expected:
- 2-5 renders of MainWorkspace on mount
- No continuous re-renders

#### ❌ Problem:
- Constant re-renders (flame graph shows continuous activity)
- MainWorkspace in every render cycle

---

## 🐛 Common Issues and Solutions

### Issue 1: "Token validation timed out"
**Cause:** Backend API not responding  
**Solution:** 
```bash
# Ensure backend is running
cd fishchi-app
npm start
# Check it's accessible at https://localhost:5000
```

### Issue 2: CORS Errors
**Cause:** Frontend/backend origin mismatch  
**Solution:** Check backend CORS configuration allows add-in origin

### Issue 3: "Profile validation failed"
**Cause:** API response format mismatch  
**Solution:** 
- Check API returns correct profile structure
- Verify `_id`, `username`, or `email` field exists
- See `api.ts` normalization logic (line 331-379)

### Issue 4: Projects show "پروژه‌ای یافت نشد"
**Cause:** No projects exist or API error  
**Solution:**
- Create a project in the web app first
- Check Network tab for API errors
- Verify authentication token is valid

---

## 📊 Performance Benchmarks

After the fix, you should observe:

| Metric | Before Fix | After Fix |
|--------|-----------|-----------|
| Initial renders | 50+ (infinite) | 2-5 |
| Time to stable UI | Never | 1-2 seconds |
| Re-renders on project change | Infinite loop | 2-3 |
| Memory usage | Constantly increasing | Stable |
| CPU usage | High (constant rendering) | Normal |

---

## ✅ Sign-Off Checklist

Before considering the bug fully resolved:

- [ ] Test Case 1: Login flow works without infinite refresh
- [ ] Test Case 2: Project selection works
- [ ] Test Case 3: Manual refresh doesn't cause loop
- [ ] Test Case 4: Source and notes load correctly
- [ ] Test Case 5: Citation insertion works
- [ ] Test Case 6: Session persistence works
- [ ] Console shows no warnings about excessive renders
- [ ] Network tab shows reasonable request count
- [ ] UI is responsive and stable
- [ ] Multiple users can use the add-in simultaneously

---

## 📸 Visual Verification

### ✅ Correct Behavior (After Fix)

**Login → MainWorkspace Flow:**
```
[Login Screen]
     ↓ (click login)
[Loading Spinner: "در حال بارگذاری..."]
     ↓ (1-2 seconds)
[MainWorkspace - STABLE]
   - User avatar visible
   - Project dropdown populated
   - Sources list loaded
   - No flickering
```

### ❌ Bug Behavior (Before Fix)

**Login → Infinite Loop:**
```
[Login Screen]
     ↓ (click login)
[MainWorkspace flashes for 0.1s]
     ↓
[Loading Spinner appears]
     ↓
[MainWorkspace flashes for 0.1s]
     ↓
[Loading Spinner appears]
     ↓ (repeats forever)
```

---

## 🔧 Advanced Debugging

### Enable Verbose Logging

Add this to `MainWorkspace.tsx` temporarily for detailed debugging:

```typescript
React.useEffect(() => {
  console.log('🔵 MainWorkspace RENDER:', {
    projectsCount: projects.length,
    selectedProjectId,
    isLoading,
    isRefreshing,
    sourcesCount: sources.length
  });
});
```

### Monitor State Changes

```typescript
React.useEffect(() => {
  console.log('🟢 selectedProjectId changed:', selectedProjectId);
}, [selectedProjectId]);

React.useEffect(() => {
  console.log('🟡 projects changed:', projects.length);
}, [projects]);
```

---

## 📞 Support

If issues persist after following this guide:

1. Check `BUG_FIX_INFINITE_REFRESH.md` for technical details
2. Review console logs for specific error messages
3. Ensure all dependencies in `package.json` are installed
4. Try clearing browser cache and Office cache
5. Test in a different Word environment (Desktop vs. Online)

---

## ✨ Success Criteria

The bug is considered **FIXED** when:

1. ✅ User can log in and see MainWorkspace
2. ✅ Component remains stable (no infinite refresh)
3. ✅ All features work (project selection, citations, etc.)
4. ✅ Console shows < 10 renders on mount
5. ✅ No performance degradation
6. ✅ Session persists across taskpane reloads

**Test Result:** [ ] PASS  |  [ ] FAIL

**Tester Name:** _____________  
**Date:** _____________  
**Environment:** [ ] Word Desktop  [ ] Word Online  
**Notes:** ______________________________